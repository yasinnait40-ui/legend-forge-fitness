import { supabase } from "@/integrations/supabase/client";
import { STAT_ORDER, type StatKey } from "@/lib/game-data";
import {
  getGameState,
  observeCommits,
  replaceGameState,
  todayKey,
  type GameState,
} from "@/lib/game-store";

let currentUserId: string | null = null;
let unobserve: (() => void) | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

/* -------------------------------------------------------------------------- */
/* Offline activity queue                                                      */
/*                                                                              */
/* Completions recorded while offline (or while the authoritative RPC fails)    */
/* are stored durably per user, applied locally, and replayed to the server     */
/* when connectivity returns. Server-side duplicate protection (UNIQUE          */
/* constraints in quest_completions / trial_completions) makes replay idempotent. */
/* -------------------------------------------------------------------------- */

const QUEUE_KEY = "aethora-pending-activities-v1";

interface PendingActivity {
  kind: "quest" | "trial";
  activityId: string;
  day: string; // local day the completion happened
}

let pendingQueue: PendingActivity[] = [];

function loadQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    pendingQueue = raw ? (JSON.parse(raw) as PendingActivity[]) : [];
    if (!Array.isArray(pendingQueue)) pendingQueue = [];
  } catch {
    pendingQueue = [];
  }
}

function saveQueue() {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(pendingQueue));
  } catch {
    // storage unavailable — queue lives in memory for this session only
  }
}

/** Queue an activity completion for authoritative replay. Returns false if it was already queued. */
export function queueActivity(
  kind: "quest" | "trial",
  activityId: string,
): boolean {
  const today = todayKey();
  if (pendingQueue.some((p) => p.kind === kind && p.activityId === activityId && p.day === today)) {
    return false;
  }
  pendingQueue.push({ kind, activityId, day: today });
  saveQueue();
  return true;
}

export function hasPendingActivities(): boolean {
  return pendingQueue.length > 0;
}

export function getPendingCount(): number {
  return pendingQueue.length;
}

/** Replay every cached completion to the server. Safe to call repeatedly. */
export async function replayPendingActivities(): Promise<void> {
  if (!currentUserId || pendingQueue.length === 0) return;

  const remaining: PendingActivity[] = [];
  for (const item of pendingQueue) {
    try {
      const { data, error } = await supabase.rpc("complete_activity" as never, {
        p_kind: item.kind,
        p_activity_id: item.activityId,
      } as never);
      // "duplicate" means the server already has it — success for our purposes.
      if (error || !data) {
        // Keep queued for a later retry unless the activity is now stale (older day).
        const stale = item.day !== todayKey();
        if (!stale) remaining.push(item);
        continue;
      }
      const result = data as { duplicate?: boolean; xp?: number; level?: number };
      if (!result.duplicate && typeof result.xp === "number") {
        // Adopt the authoritative XP if the server is ahead of the local estimate.
        if (result.xp > getGameState().xp) {
          replaceGameState(
            { ...getGameState(), xp: result.xp, lastActiveDate: item.day },
            false,
          );
        }
      }
    } catch {
      remaining.push(item);
    }
  }
  pendingQueue = remaining;
  saveQueue();
}

function statsRow(userId: string, s: GameState) {
  const row: Record<string, unknown> = {
    user_id: userId,
    xp: s.xp,
    streak: s.streak,
    best_streak: s.bestStreak,
    last_active_date: s.lastActiveDate,
    updated_at: new Date().toISOString(),
  };
  for (const k of STAT_ORDER as StatKey[]) row[k] = s.stats[k];
  return row;
}

async function pushStats(userId: string) {
  const { error } = await supabase
    .from("character_stats")
    .upsert(statsRow(userId, getGameState()) as never, { onConflict: "user_id" });
  if (error) console.error("[cloud-sync] stats push failed", error.message);
}

function schedulePush(userId: string) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void pushStats(userId);
  }, 600);
}

/**
 * P0.2: reliably persist stat columns after local progress changes. Called by
 * the game store whenever stats may have moved (authoritative completions,
 * optimistic offline completions). No-op when signed out — the queue replays
 * the activity itself and the next pull rebuilds stats from the server.
 */
export function notifyStatsChanged(): void {
  if (!currentUserId) return;
  schedulePush(currentUserId);
}

/** Pull the cloud legend, keep whichever is further along, then push the result. */
async function pullAndMerge(userId: string) {
  const { data, error } = await supabase
    .from("game_states")
    .select(
      "xp, level, streak, best_streak, last_active_date, stats, equipment, total_quests, total_trials, achievements",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[cloud-sync] pull failed", error.message);
    return;
  }

  const local = getGameState();
  if (!data) return;

  const stats = (data.stats ?? {}) as Partial<GameState["stats"]>;
  const equipment = (data.equipment ?? {}) as Partial<GameState["equipment"]>;
  const [questResult, trialResult] = await Promise.all([
    supabase
      .from("quest_completions")
      .select("quest_id, quest_date" as never)
      .eq("user_id", userId),
    supabase
      .from("trial_completions" as never)
      .select("trial_id, completed_at" as never)
      .eq("user_id", userId),
  ]);
  const today = todayKey();
  const questRows = (questResult.data ?? []) as unknown as Array<{
    quest_id: string;
    quest_date: string;
  }>;
  const trialRows = (trialResult.data ?? []) as unknown as Array<{
    trial_id: string;
    completed_at: string;
  }>;
  const questsToday = questRows
    .filter((row) => row.quest_date === today)
    .map((row) => row.quest_id);
  const trialsToday = trialRows
    .filter((row) => row.completed_at.slice(0, 10) === today)
    .map((row) => row.trial_id);
  replaceGameState({
    ...local,
    xp: Math.max(data.xp ?? 0, local.xp),
    stats: { ...local.stats, ...stats },
    equipment: { ...local.equipment, ...equipment },
    streak: data.streak ?? local.streak,
    bestStreak: data.best_streak ?? local.bestStreak,
    lastActiveDate: data.last_active_date ?? local.lastActiveDate,
    questsToday: { date: today, ids: questsToday },
    trialsToday: { date: today, ids: trialsToday },
    trialsEver: trialRows.map((row) => row.trial_id),
    achievements: Array.isArray(data.achievements)
      ? (data.achievements as string[]).concat(
          local.achievements.filter((a) => !(data.achievements as string[]).includes(a)),
        )
    : local.achievements,
    totalQuests: Math.max(data.total_quests ?? 0, local.totalQuests),
    totalTrials: Math.max(data.total_trials ?? 0, local.totalTrials),
  });
}

/** Begin syncing the local legend to the signed-in player's cloud save. */
export function startCloudSync(userId: string) {
  if (currentUserId === userId) return;
  stopCloudSync();
  currentUserId = userId;

  loadQueue();
  void replayPendingActivities().then(() => pullAndMerge(userId));

  // Completion writes happen in the authoritative transaction; cached commits are
  // not uploaded. The observer stays null — see queueActivity/replay instead.
  unobserve = null;
}

/** Replay pending activities when connectivity returns. */
export function handleReconnect(): void {
  if (!currentUserId) return;
  void replayPendingActivities();
}

export function stopCloudSync() {
  currentUserId = null;
  unobserve?.();
  unobserve = null;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
}

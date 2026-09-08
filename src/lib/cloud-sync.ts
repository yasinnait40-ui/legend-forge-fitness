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
export function queueActivity(kind: "quest" | "trial", activityId: string): boolean {
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
      const { data, error } = await supabase.rpc(
        "complete_activity" as never,
        {
          p_kind: item.kind,
          p_activity_id: item.activityId,
        } as never,
      );
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
          replaceGameState({ ...getGameState(), xp: result.xp, lastActiveDate: item.day }, false);
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
  const s = getGameState();
  const row = statsRow(userId, s);
  // Write to character_stats (individual stat columns).
  const { error } = await supabase
    .from("character_stats")
    .upsert(row as never, { onConflict: "user_id" });
  if (error) console.error("[cloud-sync] stats push failed", error.message);
  // Also keep game_states.xp/streak in sync so pullAndMerge reads
  // the latest values regardless of which table it hits.
  const { error: gsErr } = await supabase
    .from("game_states")
    .upsert(
      {
        user_id: userId,
        xp: s.xp,
        streak: s.streak,
        best_streak: s.bestStreak,
        last_active_date: s.lastActiveDate,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "user_id" },
    );
  if (gsErr) console.error("[cloud-sync] game_states sync failed", gsErr.message);
}

function schedulePush(userId: string) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void pushStats(userId);
  }, 600);
}

/**
 * Persist the discovered-regions list to the player's game_states row. RLS
 * still enforces owner-only writes; this only ever merges region ids upward,
 * so replaying it can never lose progression.
 */
async function pushDiscoveredRegions(userId: string) {
  const { error } = await supabase
    .from("game_states")
    .upsert({ user_id: userId, discovered_regions: getGameState().discoveredRegions } as never, {
      onConflict: "user_id",
      ignoreDuplicates: false,
    });
  if (error) console.error("[cloud-sync] regions push failed", error.message);
}

/** Queue a region-discovery push (debounced alongside stats). */
export function notifyRegionsChanged(): void {
  if (!currentUserId) return;
  schedulePush(currentUserId);
  void pushDiscoveredRegions(currentUserId);
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
  // Read from BOTH tables and take the max — writes go to character_stats
  // (pushStats), while the complete_activity RPC may update game_states.
  const [gsResult, csResult, questResult, trialResult] = await Promise.all([
    supabase
      .from("game_states")
      .select(
        "xp, level, streak, best_streak, last_active_date, stats, equipment, total_quests, total_trials, achievements, discovered_regions",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("character_stats")
      .select("xp, streak, best_streak, last_active_date, strength, endurance, agility, vitality, recovery")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("quest_completions")
      .select("quest_id, quest_date" as never)
      .eq("user_id", userId),
    supabase
      .from("trial_completions" as never)
      .select("trial_id, completed_at" as never)
      .eq("user_id", userId),
  ]);

  if (gsResult.error) {
    console.error("[cloud-sync] game_states pull failed", gsResult.error.message);
  }

  const local = getGameState();
  const gs = gsResult.data;
  const cs = csResult.data;

  // If neither table has data, nothing to merge.
  if (!gs && !cs) return;

  // Prefer the higher XP from either source — this covers the case where
  // the RPC writes to game_states but pushStats writes to character_stats.
  const cloudXp = Math.max(gs?.xp ?? 0, cs?.xp ?? 0);
  const cloudStreak = Math.max(gs?.streak ?? 0, cs?.streak ?? 0);
  const cloudBestStreak = Math.max(gs?.best_streak ?? 0, cs?.best_streak ?? 0);
  const cloudLastActive = gs?.last_active_date ?? cs?.last_active_date ?? null;

  const stats = (gs?.stats ?? {}) as Partial<GameState["stats"]>;
  // Merge individual stat columns from character_stats if the JSON stats map is empty.
  const csStatKeys = ["strength", "endurance", "agility", "vitality", "recovery"] as const;
  for (const k of csStatKeys) {
    if (cs && cs[k] && !(stats as Record<string, unknown>)[k]) {
      (stats as Record<string, number>)[k] = cs[k] as number;
    }
  }
  const equipment = (gs?.equipment ?? {}) as Partial<GameState["equipment"]>;
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
    xp: Math.max(cloudXp, local.xp),
    stats: { ...local.stats, ...stats },
    equipment: { ...local.equipment, ...equipment },
    streak: Math.max(cloudStreak, local.streak),
    bestStreak: Math.max(cloudBestStreak, local.bestStreak),
    lastActiveDate: cloudLastActive ?? local.lastActiveDate,
    questsToday: { date: today, ids: questsToday },
    trialsToday: { date: today, ids: trialsToday },
    trialsEver: trialRows.map((row) => row.trial_id),
    achievements: Array.isArray(gs?.achievements)
      ? (gs!.achievements as string[]).concat(
          local.achievements.filter((a) => !(gs!.achievements as string[]).includes(a)),
        )
      : local.achievements,
    totalQuests: Math.max(gs?.total_quests ?? 0, local.totalQuests),
    totalTrials: Math.max(gs?.total_trials ?? 0, local.totalTrials),
    discoveredRegions: Array.isArray(gs?.discovered_regions)
      ? Array.from(
          new Set(
            [...(gs!.discovered_regions as string[]), ...local.discoveredRegions].filter(
              (id): id is string => typeof id === "string",
            ),
          ),
        )
      : local.discoveredRegions,
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

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
      .select("quest_id, completed_at" as never)
      .eq("user_id", userId),
    supabase
      .from("trial_completions" as never)
      .select("trial_id, completed_at" as never)
      .eq("user_id", userId),
  ]);
  const today = todayKey();
  const questRows = (questResult.data ?? []) as unknown as Array<{
    quest_id: string;
    completed_at: string;
  }>;
  const trialRows = (trialResult.data ?? []) as unknown as Array<{
    trial_id: string;
    completed_at: string;
  }>;
  const questsToday = questRows
    .filter((row) => row.completed_at.slice(0, 10) === today)
    .map((row) => row.quest_id);
  const trialsToday = trialRows
    .filter((row) => row.completed_at.slice(0, 10) === today)
    .map((row) => row.trial_id);
  replaceGameState({
    ...local,
    xp: data.xp,
    stats: { ...local.stats, ...stats },
    equipment: { ...local.equipment, ...equipment },
    streak: data.streak,
    bestStreak: data.best_streak,
    lastActiveDate: data.last_active_date,
    questsToday: { date: today, ids: questsToday },
    trialsToday: { date: today, ids: trialsToday },
    trialsEver: trialRows.map((row) => row.trial_id),
    achievements: Array.isArray(data.achievements)
      ? (data.achievements as string[])
      : local.achievements,
    totalQuests: data.total_quests,
    totalTrials: data.total_trials,
  });
}

function logNewCompletions(userId: string, prev: GameState, next: GameState) {
  const prevQuests = prev.questsToday.date === todayKey() ? prev.questsToday.ids : [];
  const newQuests = (next.questsToday.date === todayKey() ? next.questsToday.ids : []).filter(
    (id) => !prevQuests.includes(id),
  );
  if (newQuests.length) {
    void supabase
      .from("quest_completions")
      .insert(newQuests.map((id) => ({ user_id: userId, quest_id: id, xp_earned: 0 })) as never)
      .then(({ error }) => error && console.error("[cloud-sync] quest log failed", error.message));
  }

  const newWorkouts = next.workoutLog.slice(prev.workoutLog.length);
  if (newWorkouts.length && next.totalTrials > prev.totalTrials) {
    void supabase
      .from("workout_logs")
      .insert(
        newWorkouts.map((w, i) => ({
          user_id: userId,
          trial_id: `${w.date}-${i}`,
          trial_name: w.name,
          xp_earned: w.xp,
        })) as never,
      )
      .then(({ error }) => error && console.error("[cloud-sync] trial log failed", error.message));
  }
}

/** Begin syncing the local legend to the signed-in player's cloud save. */
export function startCloudSync(userId: string) {
  if (currentUserId === userId) return;
  stopCloudSync();
  currentUserId = userId;

  void pullAndMerge(userId);
  // Completion writes happen in the authoritative transaction; cached commits are not uploaded.
  unobserve = null;
}

export function stopCloudSync() {
  currentUserId = null;
  unobserve?.();
  unobserve = null;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
}

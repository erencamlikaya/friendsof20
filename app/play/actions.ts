"use server";

import { createClient } from "@/lib/supabase/server";
import { gameConfig } from "@/config/game";
import type { MistakeFact, QuestionForm } from "@/lib/game/questions";

async function getUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

/** Fetch the player's current mistake facts. */
export async function fetchMistakes(): Promise<MistakeFact[]> {
  const { supabase, userId } = await getUserId();
  if (!userId) return [];
  const { data } = await supabase
    .from("mistakes")
    .select("level, x, form")
    .eq("user_id", userId);
  return (data ?? []) as MistakeFact[];
}

/**
 * Record the outcome of one answered question and keep the mistake list in
 * sync. Returns the refreshed mistake list so the client can re-randomize.
 */
export async function recordAnswer(
  fact: { level: number; x: number; form: QuestionForm },
  correct: boolean,
): Promise<MistakeFact[]> {
  const { supabase, userId } = await getUserId();
  if (!userId) return [];

  const match = {
    user_id: userId,
    level: fact.level,
    x: fact.x,
    form: fact.form,
  };

  if (!correct) {
    // Log/refresh the mistake and reset its progress toward retirement.
    await supabase
      .from("mistakes")
      .upsert(
        { ...match, correct_streak: 0, updated_at: new Date().toISOString() },
        { onConflict: "user_id,level,x,form" },
      );
  } else {
    // A correct answer only matters if this fact is currently logged.
    const { data: existing } = await supabase
      .from("mistakes")
      .select("id, correct_streak")
      .match(match)
      .maybeSingle();

    if (existing) {
      const next = existing.correct_streak + 1;
      if (next >= gameConfig.mistakeClearStreak) {
        await supabase.from("mistakes").delete().eq("id", existing.id);
      } else {
        await supabase
          .from("mistakes")
          .update({ correct_streak: next, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      }
    }
  }

  return fetchMistakes();
}

/** Persist a level-up. Clamps to the configured max and never moves backward. */
export async function advanceLevel(newLevel: number): Promise<number> {
  const { supabase, userId } = await getUserId();
  if (!userId) return gameConfig.startLevel;

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_level")
    .eq("id", userId)
    .single();

  const current = profile?.current_level ?? gameConfig.startLevel;
  const target = Math.min(Math.max(current, newLevel), gameConfig.maxLevel);

  if (target !== current) {
    await supabase
      .from("profiles")
      .update({ current_level: target })
      .eq("id", userId);
  }
  return target;
}

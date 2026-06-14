import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { gameConfig } from "@/config/game";
import type { MistakeFact } from "@/lib/game/questions";
import Game from "./Game";

export default async function PlayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: mistakes }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, current_level")
      .eq("id", user.id)
      .single(),
    supabase
      .from("mistakes")
      .select("level, x, form")
      .eq("user_id", user.id),
  ]);

  return (
    <Game
      username={profile?.username ?? "player"}
      startLevel={profile?.current_level ?? gameConfig.startLevel}
      initialMistakes={(mistakes ?? []) as MistakeFact[]}
    />
  );
}

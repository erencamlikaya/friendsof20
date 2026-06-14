"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { usernameToEmail } from "@/lib/auth";
import { gameConfig } from "@/config/game";

export interface AuthState {
  error?: string;
}

function validate(username: string, password: string): string | null {
  if (username.trim().length < 2) return "Username must be at least 2 letters.";
  if (!/^[a-zA-Z0-9_]+$/.test(username.trim()))
    return "Username can use letters, numbers, and _ only.";
  if (password.length < 4) return "Password must be at least 4 characters.";
  return null;
}

/** Dispatches to login or signup based on the clicked button's `mode` value. */
export async function authenticate(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const mode = String(formData.get("mode") ?? "login");
  return mode === "signup" ? signup(formData) : login(formData);
}

async function login(formData: FormData): Promise<AuthState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  const invalid = validate(username, password);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });

  if (error) return { error: "Wrong username or password." };
  redirect("/play");
}

async function signup(formData: FormData): Promise<AuthState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const invalid = validate(username, password);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: usernameToEmail(username),
    password,
  });

  if (error || !data.user) {
    return { error: "That username may already be taken. Try another." };
  }

  // Create the player's profile row (RLS allows insert for the new session).
  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    username: username.toLowerCase(),
    current_level: gameConfig.startLevel,
  });

  if (profileError) {
    return { error: "Could not finish creating your account. Try again." };
  }

  redirect("/play");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

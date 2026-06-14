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

  if (error) {
    console.error("signup signUp error:", error.status, error.message);
    if (/already registered|already exists/i.test(error.message)) {
      return { error: "That username is taken. Try another." };
    }
    return { error: `Sign up failed: ${error.message}` };
  }
  if (!data.user) {
    return { error: "Sign up failed. Please try again." };
  }

  // Create the player's profile row (RLS allows insert for the new session).
  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    username: username.toLowerCase(),
    current_level: gameConfig.startLevel,
  });

  if (profileError) {
    console.error("signup profile insert error:", profileError);
    return { error: `Could not finish creating your account: ${profileError.message}` };
  }

  redirect("/play");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

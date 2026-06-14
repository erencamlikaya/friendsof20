"use client";

import { useActionState } from "react";
import { authenticate, type AuthState } from "./actions";

const initialState: AuthState = {};

export default function LoginPage() {
  const [state, action, pending] = useActionState(authenticate, initialState);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-sky-50 px-6 py-12 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-sky-600 dark:text-sky-400">
          Friends of 20
        </h1>
        <p className="text-base text-slate-500 dark:text-slate-400">
          Practice your number friends!
        </p>
      </div>

      <form
        action={action}
        className="flex w-full max-w-xs flex-col gap-4"
        autoComplete="off"
      >
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
          Username
          <input
            name="username"
            type="text"
            required
            autoCapitalize="none"
            autoCorrect="off"
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
          Password
          <input
            name="password"
            type="password"
            required
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </label>

        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-600 dark:bg-red-950 dark:text-red-300">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          name="mode"
          value="login"
          disabled={pending}
          className="mt-2 rounded-full bg-sky-500 px-5 py-3 text-lg font-bold text-white transition-colors hover:bg-sky-600 disabled:opacity-50"
        >
          {pending ? "…" : "Log in"}
        </button>

        <button
          type="submit"
          name="mode"
          value="signup"
          disabled={pending}
          className="rounded-full border-2 border-sky-500 px-5 py-3 text-lg font-bold text-sky-600 transition-colors hover:bg-sky-100 disabled:opacity-50 dark:text-sky-400 dark:hover:bg-slate-900"
        >
          Create account
        </button>
      </form>
    </main>
  );
}

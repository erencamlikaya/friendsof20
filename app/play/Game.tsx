"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gameConfig } from "@/config/game";
import {
  nextQuestion,
  questionText,
  type MistakeFact,
  type Question,
} from "@/lib/game/questions";
import { recordAnswer, advanceLevel } from "./actions";
import { logout } from "@/app/login/actions";

type Status = "playing" | "wrong" | "timeout" | "levelup";

interface Props {
  username: string;
  startLevel: number;
  initialMistakes: MistakeFact[];
}

export default function Game({ username, startLevel, initialMistakes }: Props) {
  const [level, setLevel] = useState(startLevel);
  const [streak, setStreak] = useState(0);
  const [mistakes, setMistakes] = useState<MistakeFact[]>(initialMistakes);
  const [question, setQuestion] = useState<Question>(() =>
    nextQuestion(startLevel, initialMistakes),
  );
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("playing");
  const [timeLeft, setTimeLeft] = useState<number>(gameConfig.burstTimeLimitMs);

  // Current values for use inside effects/handlers without stale closures.
  const mistakesRef = useRef(mistakes);
  useEffect(() => {
    mistakesRef.current = mistakes;
  }, [mistakes]);

  // One deadline for the whole burst; it does NOT reset between questions.
  const deadlineRef = useRef(0);

  const atMaxLevel = level >= gameConfig.maxLevel;

  // Begin a fresh burst: reset the streak and restart the single 15s clock.
  const startBurst = useCallback((forLevel: number) => {
    setStreak(0);
    setQuestion(nextQuestion(forLevel, mistakesRef.current));
    setInput("");
    setStatus("playing");
    deadlineRef.current = Date.now() + gameConfig.burstTimeLimitMs;
    setTimeLeft(gameConfig.burstTimeLimitMs);
  }, []);

  // Next question within the SAME burst — the clock keeps running.
  const continueBurst = useCallback((forLevel: number) => {
    setQuestion(nextQuestion(forLevel, mistakesRef.current));
    setInput("");
  }, []);

  // Start the clock for the first burst on mount.
  useEffect(() => {
    deadlineRef.current = Date.now() + gameConfig.burstTimeLimitMs;
  }, []);

  // The burst clock ran out before reaching the target streak.
  const handleTimeout = useCallback(() => {
    setStreak(0);
    setStatus("timeout");
    setTimeout(() => startBurst(level), 1500);
  }, [level, startBurst]);

  // Handle a submitted answer.
  const resolve = useCallback(
    (correct: boolean) => {
      const q = question;

      if (!correct) {
        recordAnswer({ level: q.level, x: q.x, form: q.form }, false)
          .then(setMistakes)
          .catch(() => {});
        setStreak(0);
        setStatus("wrong");
        setTimeout(() => startBurst(level), 1500);
        return;
      }

      // Correct: a logged mistake gets credit toward retirement.
      if (q.fromMistake) {
        recordAnswer({ level: q.level, x: q.x, form: q.form }, true)
          .then(setMistakes)
          .catch(() => {});
      }

      const newStreak = streak + 1;
      if (newStreak >= gameConfig.streakToPass && !atMaxLevel) {
        setStreak(newStreak);
        setStatus("levelup");
        const target = level + 1;
        advanceLevel(target).catch(() => {});
        setTimeout(() => {
          setLevel(target);
          startBurst(target);
        }, 2200);
        return;
      }

      // Keep blasting through — clock keeps ticking.
      setStreak(newStreak);
      continueBurst(level);
    },
    [question, streak, level, atMaxLevel, startBurst, continueBurst],
  );

  // Single burst clock — keeps running across questions while playing.
  useEffect(() => {
    if (status !== "playing") return;
    const id = setInterval(() => {
      const remaining = deadlineRef.current - Date.now();
      if (remaining <= 0) {
        clearInterval(id);
        setTimeLeft(0);
        handleTimeout();
      } else {
        setTimeLeft(remaining);
      }
    }, 100);
    return () => clearInterval(id);
  }, [status, handleTimeout]);

  const submit = useCallback(() => {
    if (status !== "playing" || input === "") return;
    resolve(Number(input) === question.answer);
  }, [status, input, question, resolve]);

  const press = (digit: string) =>
    setInput((v) => (v.length >= 2 ? v : v + digit));
  const backspace = () => setInput((v) => v.slice(0, -1));

  // Physical keyboard support (desktop testing / tablets with keyboards).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") press(e.key);
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Enter") submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submit]);

  const timePct = Math.max(0, (timeLeft / gameConfig.burstTimeLimitMs) * 100);
  const seconds = (timeLeft / 1000).toFixed(1);
  const tokens = questionText(question).split(" ");

  return (
    <main className="flex flex-1 flex-col bg-sky-50 dark:bg-slate-950">
      {/* Top bar: level, player, log out */}
      <header className="flex items-center justify-between px-5 pt-5">
        <span className="rounded-full bg-sky-500 px-4 py-1.5 text-sm font-bold text-white shadow">
          Friends of {level}
        </span>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {username}
        </span>
        <button
          onClick={() => logout()}
          className="text-sm font-medium text-slate-400 underline-offset-2 hover:underline"
        >
          Log out
        </button>
      </header>

      {/* Streak progress + burst clock */}
      <div className="px-5 pt-4">
        <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>
            Streak {streak} / {gameConfig.streakToPass}
          </span>
          <span className={timePct < 30 ? "text-red-500" : undefined}>
            {seconds}s
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-200"
            style={{
              width: `${Math.min(100, (streak / gameConfig.streakToPass) * 100)}%`,
            }}
          />
        </div>
        {/* Burst timer */}
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
              timePct < 30 ? "bg-red-400" : "bg-sky-400"
            }`}
            style={{ width: `${status === "playing" ? timePct : 100}%` }}
          />
        </div>
      </div>

      {/* Equation */}
      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-5">
        {status === "levelup" ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="text-6xl">🎉</div>
            <h2 className="text-3xl font-extrabold text-emerald-500">
              Level up!
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Now you know the friends of {level + 1}!
            </p>
          </div>
        ) : (
          <>
            <div
              className={`flex items-baseline gap-2 text-5xl font-extrabold tracking-tight transition-colors ${
                status === "wrong" || status === "timeout"
                  ? "text-red-500"
                  : "text-slate-800 dark:text-white"
              }`}
            >
              {tokens.map((t, i) =>
                t === "?" ? (
                  <span
                    key={i}
                    className="min-w-14 rounded-xl border-2 border-dashed border-sky-400 px-2 text-center text-sky-500"
                  >
                    {input || "?"}
                  </span>
                ) : (
                  <span key={i}>{t}</span>
                ),
              )}
            </div>

            <div className="h-8 text-center text-lg font-semibold">
              {status === "wrong" && (
                <span className="text-red-500">
                  Oops! The answer was {question.answer}.
                </span>
              )}
              {status === "timeout" && (
                <span className="text-red-500">
                  Time&apos;s up! Try again.
                </span>
              )}
            </div>
          </>
        )}
      </section>

      {/* Numpad */}
      <section className="grid grid-cols-3 gap-3 px-5 pb-8 pt-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <NumKey key={d} onClick={() => press(d)} disabled={status !== "playing"}>
            {d}
          </NumKey>
        ))}
        <NumKey onClick={backspace} disabled={status !== "playing"}>
          ⌫
        </NumKey>
        <NumKey onClick={() => press("0")} disabled={status !== "playing"}>
          0
        </NumKey>
        <button
          onClick={submit}
          disabled={status !== "playing" || input === ""}
          className="rounded-2xl bg-emerald-500 py-5 text-2xl font-bold text-white shadow active:scale-95 disabled:opacity-40"
        >
          ✓
        </button>
      </section>
    </main>
  );
}

function NumKey({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-2xl bg-white py-5 text-2xl font-bold text-slate-800 shadow active:scale-95 disabled:opacity-50 dark:bg-slate-800 dark:text-white"
    >
      {children}
    </button>
  );
}

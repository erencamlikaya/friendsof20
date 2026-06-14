/**
 * Pure question-generation logic for "friends of N".
 *
 * A level N means all pairs of whole numbers that add up to N (its "friends").
 * Every question is `x + y = N` with one term blanked out:
 *   - form "sum":    x + y = ?   -> answer is N
 *   - form "addend": x + ? = N   -> answer is N - x   (doubles as subtraction)
 */
import { gameConfig } from "@/config/game";

export type QuestionForm = "sum" | "addend";

export interface Question {
  /** The level this question belongs to (the target sum). */
  level: number;
  /** The first, always-visible addend. */
  x: number;
  /** Which term is blank. */
  form: QuestionForm;
  /** The correct value the player must type. */
  answer: number;
  /** True when this question was pulled from the player's mistake list. */
  fromMistake: boolean;
}

/** A logged mistake: a specific fact the player got wrong. */
export interface MistakeFact {
  level: number;
  x: number;
  form: QuestionForm;
}

function randomInt(maxInclusive: number): number {
  return Math.floor(Math.random() * (maxInclusive + 1));
}

/** Build the concrete answer for a fact at a given level. */
export function answerFor(level: number, x: number, form: QuestionForm): number {
  return form === "sum" ? level : level - x;
}

/** A stable key for a fact, used to de-duplicate the mistake list. */
export function factKey(f: MistakeFact): string {
  return `${f.level}:${f.x}:${f.form}`;
}

/** Generate a fresh random question for the given level. */
export function freshQuestion(level: number): Question {
  const x = randomInt(level);
  const form: QuestionForm = Math.random() < 0.5 ? "sum" : "addend";
  return { level, x, form, answer: answerFor(level, x, form), fromMistake: false };
}

/**
 * Pick the next question. With probability `mistakeInjectionRate`, and if any
 * mistakes are logged, re-ask one of them; otherwise generate a fresh one.
 */
export function nextQuestion(level: number, mistakes: MistakeFact[]): Question {
  if (mistakes.length > 0 && Math.random() < gameConfig.mistakeInjectionRate) {
    const m = mistakes[randomInt(mistakes.length - 1)];
    return {
      level: m.level,
      x: m.x,
      form: m.form,
      answer: answerFor(m.level, m.x, m.form),
      fromMistake: true,
    };
  }
  return freshQuestion(level);
}

/** Render a question as display tokens, e.g. ["3", "+", "?", "=", "10"]. */
export function questionText(q: Question): string {
  const y = q.level - q.x;
  return q.form === "sum"
    ? `${q.x} + ${y} = ?`
    : `${q.x} + ? = ${q.level}`;
}

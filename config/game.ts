/**
 * Gamification knobs. Everything tunable lives here — keep game logic free of
 * magic numbers so these can be tweaked without touching the engine.
 */
export const gameConfig = {
  /** First level a new player starts on: "friends of 3". */
  startLevel: 3,
  /** Final level: "friends of 20". */
  maxLevel: 20,
  /**
   * Times each number-bond pair should be drilled to pass a level. Combined
   * with the pair count this sets how many correct answers a level needs.
   */
  questionsPerCombo: 3,
  /** Time budget per question (ms). The burst clock = questions × this. */
  msPerQuestion: 2_000,
  /** Consecutive correct answers needed to retire a logged mistake. */
  mistakeClearStreak: 3,
  /** Probability (0..1) that a generated question is pulled from the mistake list. */
  mistakeInjectionRate: 0.4,
} as const;

export type GameConfig = typeof gameConfig;

/**
 * Distinct number-bond pairs of N, including 0+N and the double (e.g. 5+5).
 * combos(N) = floor(N / 2) + 1.
 */
export function combosForLevel(level: number): number {
  return Math.floor(level / 2) + 1;
}

/** Correct answers needed within one burst to pass a level. */
export function questionsToPass(level: number): number {
  return combosForLevel(level) * gameConfig.questionsPerCombo;
}

/** Length of one burst for a level (ms): questionsToPass × msPerQuestion. */
export function burstTimeMs(level: number): number {
  return questionsToPass(level) * gameConfig.msPerQuestion;
}

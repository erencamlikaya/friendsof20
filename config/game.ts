/**
 * Gamification knobs. Everything tunable lives here — keep game logic free of
 * magic numbers so these can be tweaked without touching the engine.
 */
export const gameConfig = {
  /** First level a new player starts on: "friends of 3". */
  startLevel: 3,
  /** Final level: "friends of 20". */
  maxLevel: 20,
  /** Correct answers needed within one burst to pass a level. */
  streakToPass: 10,
  /**
   * Length of a single burst. The player must reach `streakToPass` correct
   * answers before this clock runs out. A wrong answer or the clock expiring
   * ends the burst and resets the streak.
   */
  burstTimeLimitMs: 15_000,
  /** Consecutive correct answers needed to retire a logged mistake. */
  mistakeClearStreak: 3,
  /** Probability (0..1) that a generated question is pulled from the mistake list. */
  mistakeInjectionRate: 0.4,
} as const;

export type GameConfig = typeof gameConfig;

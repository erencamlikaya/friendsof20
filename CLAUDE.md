@AGENTS.md

# Friends of 20

Mobile-first math drill for elementary kids: practice the "friends" (number
bonds) of every integer up to 20 — pairs that add to N. Each level is "friends
of N". Vertical layout with an on-screen numpad; built for phones.

## Gameplay

- Question format `x + y = N` with one term blank:
  - **sum** form: `x + y = ?` (answer `N`)
  - **addend** form: `x + ? = N` (answer `N - x`, doubles as subtraction)
- A **burst** is a single shared clock. Reach the level's question target
  before it runs out to pass. Both the target and the clock scale with the
  level (see formulas in `config/game.ts`):
  `combos(N) = floor(N/2)+1`, `questionsToPass = combos × questionsPerCombo (3)`,
  `burstMs = questionsToPass × msPerQuestion (2000)`. E.g. level 7 → 4 combos →
  12 questions → 24s.
- A wrong answer OR the clock expiring ends the burst (player taps "Try Again");
  a level-up pauses on a "Start friends of N" button. Correct answers advance
  instantly and submit automatically once the typed value matches the answer's
  digit count. The clock keeps ticking across questions within a burst.
- Wrong answers are logged per-user and re-asked (`mistakeInjectionRate`); a
  mistake is retired after `mistakeClearStreak` (3) consecutive correct
  re-answers.

## Key files

- `config/game.ts` — **all** tunable gamification knobs. Keep magic numbers out
  of the engine; add new knobs here.
- `lib/game/questions.ts` — pure question engine + mistake injection (no I/O).
- `lib/supabase/{server,client}.ts` — `@supabase/ssr` clients (cookie auth).
- `proxy.ts` — Next 16's renamed middleware; refreshes the session and gates
  `/play` → `/login`.
- `app/login/` — username/password screen + `authenticate` server action.
- `app/play/` — `page.tsx` (server: loads profile + mistakes) → `Game.tsx`
  (client: timer, numpad, level-up) + `actions.ts` (mistake/level persistence).
- `supabase/schema.sql` — `profiles` + `mistakes` tables, RLS, and grants.
  Idempotent; safe to re-run.

## Auth & Supabase (non-obvious — read before touching auth)

- **Username-only, no email.** `lib/auth.ts` maps `username` →
  `username@friendsof20.com`. The domain TLD matters: Supabase's validator
  **rejects `.local` and `.app`** as invalid emails — use a normal TLD.
- **"Confirm email" MUST stay OFF** (Supabase → Authentication → Sign In /
  Providers → Email). With it on, signup never returns a session and Supabase
  tries to send mail to fake addresses (429 rate limit). It is currently off.
- **Grants are required.** Tables created via raw SQL do NOT inherit Supabase's
  default role grants, so RLS policies alone give `42501 permission denied`.
  `schema.sql` grants `authenticated` (app) and `service_role` (dashboard).
- New-user signup inserts the `profiles` row in the same server action, relying
  on the just-established session for RLS.

## Local dev gotchas (this machine is behind AVG TLS inspection)

- AVG's `avgMonFltProxy` does HTTPS interception. Its root CA is in the Windows
  store (browser trusts it) but not in Node/git CA bundles.
- **Node:** npm scripts set `NODE_OPTIONS=--use-system-ca` (via `cross-env`) so
  server-side `fetch` to Supabase verifies the cert. Harmless on Vercel.
- **git:** repo-local config `http.sslBackend=schannel` +
  `http.schannelCheckRevoke=false` to push over HTTPS. Scoped to this repo.

## Env vars (in `.env.local`, NOT committed)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY`. Add the same three in Vercel project settings before
deploying.

## Test account

`maya` / `candy123` exists in the Supabase project (created during testing).

## Verification status

Verified end-to-end against the real project: signup, profile creation, proxy
gating, question render/input/submit, the burst clock, and wrong-answer →
mistake row. NOT yet exercised visually (logic in place, same DB paths proven):
a full 10-streak **level-up** and **mistake retirement** after 3 correct.

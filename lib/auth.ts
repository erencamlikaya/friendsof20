/**
 * Username-only auth: Supabase Auth requires an email, so we map each username
 * to a synthetic address. Kids only ever see/enter a username.
 */
// Must be a TLD Supabase's validator accepts (`.local`/`.app` are rejected).
// No real email is ever sent because "Confirm email" is disabled in Supabase.
const EMAIL_DOMAIN = "friendsof20.com";

/** Normalize a username (case-insensitive, trimmed) and map it to an email. */
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
}

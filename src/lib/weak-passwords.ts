/**
 * Hard-coded blocklist of the most commonly breached passwords. Defense in
 * depth on top of Supabase's leaked-password protection — immediate client
 * feedback without a round-trip, and consistent behavior regardless of the
 * Supabase project's leak-check toggle state. Supabase's HIBP check still
 * sits behind this as the authoritative coverage for the long tail.
 *
 * Source: Top-25 from SplashData 2023 + NordPass 2024 breach dataset, plus
 * BlackPick-specific obvious guesses. Intentionally small — not meant to
 * replace HIBP, just to catch the worst offenders that show up
 * disproportionately in every breach corpus.
 */

const BLOCKED = new Set<string>([
  "123456",
  "password",
  "123456789",
  "12345",
  "12345678",
  "qwerty",
  "1234567",
  "111111",
  "1234567890",
  "123123",
  "password1",
  "123321",
  "1234",
  "qwerty123",
  "abc123",
  "000000",
  "iloveyou",
  "654321",
  "666666",
  "dragon",
  "monkey",
  "letmein",
  "admin",
  "welcome",
  "master",
  "shadow",
  "qwertyuiop",
  "asdfgh",
  "zxcvbnm",
  "blackpick",
  "blackcombat",
  "1q2w3e4r",
  "1qaz2wsx",
]);

export function isWeakPassword(password: string): boolean {
  if (typeof password !== "string") return false;
  return BLOCKED.has(password.toLowerCase().trim());
}

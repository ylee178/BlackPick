/**
 * Maps an email address to the webmail URL of its provider, so the signup
 * verify card can offer a one-click "Open your inbox" shortcut instead of
 * asking the user to context-switch apps manually. Provider detection is
 * purely by domain suffix — no network call.
 *
 * Covers the big global providers (Gmail, Outlook, Yahoo, iCloud, Proton)
 * plus the Korean majors (Naver, Daum, Kakao) since BlackPick's primary
 * launch market is Korea. Any unknown domain returns null, and the UI
 * falls back to a generic "check your inbox" message.
 */

export type EmailProvider = {
  key: string;
  name: string;
  webmailUrl: string;
};

const PROVIDERS: Array<{ match: RegExp; provider: EmailProvider }> = [
  {
    match: /@(gmail\.com|googlemail\.com)$/i,
    provider: { key: "gmail", name: "Gmail", webmailUrl: "https://mail.google.com/" },
  },
  {
    match: /@(outlook\.com|hotmail\.com|live\.com|msn\.com)$/i,
    provider: { key: "outlook", name: "Outlook", webmailUrl: "https://outlook.live.com/" },
  },
  {
    match: /@(yahoo\.com|yahoo\.co\.[a-z]+|yahoo\.[a-z]{2,3})$/i,
    provider: { key: "yahoo", name: "Yahoo Mail", webmailUrl: "https://mail.yahoo.com/" },
  },
  {
    match: /@(icloud\.com|me\.com|mac\.com)$/i,
    provider: { key: "icloud", name: "iCloud Mail", webmailUrl: "https://www.icloud.com/mail" },
  },
  {
    match: /@(proton\.me|protonmail\.com|proton\.ch|pm\.me)$/i,
    provider: { key: "proton", name: "Proton Mail", webmailUrl: "https://mail.proton.me/" },
  },
  {
    match: /@naver\.com$/i,
    provider: { key: "naver", name: "Naver", webmailUrl: "https://mail.naver.com/" },
  },
  {
    match: /@(daum\.net|hanmail\.net)$/i,
    provider: { key: "daum", name: "Daum", webmailUrl: "https://mail.daum.net/" },
  },
  {
    match: /@kakao\.com$/i,
    provider: { key: "kakao", name: "Kakao Mail", webmailUrl: "https://mail.kakao.com/" },
  },
];

export function detectEmailProvider(email: string): EmailProvider | null {
  if (typeof email !== "string" || email.length === 0) return null;
  for (const { match, provider } of PROVIDERS) {
    if (match.test(email)) return provider;
  }
  return null;
}

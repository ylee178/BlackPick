# Supabase Auth Email Templates

Branded email templates for BlackPick. Paste into Supabase:

- `confirm-signup.html` → `Authentication → Email Templates → Confirm signup`
- `reset-password.html` → `Authentication → Email Templates → Reset password`

## Asset dependencies

The templates reference two kinds of assets, all served from the canonical
site URL:

| URL | Source | Purpose |
|---|---|---|
| `{{ .SiteURL }}/email/bp-logo-email.png` | `public/email/bp-logo-email.png` (static file) | BLACK PICK wordmark in the header |
| `{{ .SiteURL }}/email/icon-shield` | `src/app/email/icon-shield/route.tsx` (dynamic `ImageResponse`) | Confirm-signup body icon |
| `{{ .SiteURL }}/email/icon-key` | `src/app/email/icon-key/route.tsx` (dynamic `ImageResponse`) | Reset-password body icon |

The two icon routes render lucide-style SVG (`shield-check`, `key-round`) on a
dark circle with a gold border, exactly matching the reference design. They
are cached with `Cache-Control: public, max-age=31536000, immutable` so every
email client will hit the CDN once and serve from memory thereafter.

**Supabase Site URL must point at the production host** (`https://blackpick.io`)
for the image URLs to resolve. Check under `Authentication → URL Configuration`.

## Template variables

Both templates use Supabase's Go-templated variables:

- `{{ .SiteURL }}` — configured Site URL (e.g. `https://blackpick.io`)
- `{{ .ConfirmationURL }}` — Supabase-generated action URL for both flows
  (Supabase swaps the underlying action based on template type)

## Client compatibility

These templates are battle-tested for:

- **Apple Mail** / iOS Mail — perfect rendering
- **Gmail web + mobile** — perfect rendering
- **Outlook 365** — perfect rendering
- **Outlook Desktop (MSO)** — graceful degradation:
  - `border-radius` ignored → buttons render square (still usable)
  - `box-shadow` ignored → CTA has no glow (still visible as solid gold)
  - Inline SVG from `ImageResponse` is served as PNG, so the icon routes
    work in Outlook Desktop via the standard `<img>` tag
- **Yahoo Mail** / AOL / Thunderbird — table-based layout + inline styles
  survive any quirks

### Techniques used

- Table-based layout with nested `<table role="presentation">`
- All styles inline (Gmail strips `<style>` blocks)
- Hidden preheader text for inbox preview
- MSO conditional comment forcing Arial on Outlook for consistent typography
- `@media` queries NOT used (not universally supported; design is fixed-width)

## Brand tokens

The templates are hand-kept in sync with `src/lib/brand-tokens.ts`:

| Token | Value | Usage |
|---|---|---|
| Background | `#0a0a0a` | Outer body |
| Card background | `#000000` | Main container |
| Border | `#1a1a1a` / `#141414` | Dividers |
| Accent gold | `#ffba3c` | CTA + icon |
| Icon bg | `#1a1306` | Dark-gold tinted circle fill |
| Text primary | `#ffffff` | Headings |
| Text muted | `#9ca3af` | Body copy |
| Text dim | `#6b7280` | Subtitles |
| Footer text | `#4b5563` / `#3b4048` | Fine print |

If you update brand-tokens.ts, update the hex literals here too. These
templates are hand-written HTML, not generated from the TS module (email
clients cannot run JavaScript).

## Preview

The templates are plain HTML files, so you can open them in a browser:

```bash
open Docs/email-templates/confirm-signup.html
open Docs/email-templates/reset-password.html
```

Note: local previews render `{{ .SiteURL }}` and `{{ .ConfirmationURL }}`
as literal text. To see the fully resolved email, paste into Supabase and
send a real test email.

## Updating the design

1. Edit the HTML file here.
2. Preview in a browser.
3. Copy-paste the full file contents into the Supabase dashboard template box.
4. Use Supabase's "Send test email" feature to verify rendering in your inbox.
5. Commit the HTML change with a descriptive message.

Do NOT edit Supabase templates directly — they get lost on re-provisioning.

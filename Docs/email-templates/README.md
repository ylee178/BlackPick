# Supabase Auth Email Templates

Branded, WCAG-audited email templates for BlackPick auth flows. Replace
the default Supabase plain-text templates with these on Supabase
Dashboard → **Authentication → Email Templates**.

## Files

| File | Supabase template slot |
|---|---|
| `confirm-signup.html` | **Confirm signup** |
| `reset-password.html` | **Reset password** |

Copy the full HTML file contents and paste into the matching template
slot. Do not edit directly in the Supabase dashboard — the in-repo
files are the source of truth, and dashboard edits will be lost on the
next sync.

## Asset dependencies

All image URLs in the templates resolve against `{{ .SiteURL }}` (the
Supabase-configured Site URL — must be `https://blackpick.io` in prod).

| URL pattern | Source | Purpose |
|---|---|---|
| `{{ .SiteURL }}/email/bp-logo-email.png` | `public/email/bp-logo-email.png` (static file) | BLACK PICK wordmark in the header |
| `{{ .SiteURL }}/email/icon-shield` | `src/app/email/icon-shield/route.tsx` (dynamic `ImageResponse`) | Confirm-signup body icon (lucide `shield-check`) |
| `{{ .SiteURL }}/email/icon-key` | `src/app/email/icon-key/route.tsx` (dynamic `ImageResponse`) | Reset-password body icon (lucide `key-round`) |

**The static logo PNG must be committed to `public/email/`** — it is the
only way the email client can fetch it. BlackPick's web UI uses SVG only,
but email clients have poor SVG support (Gmail strips, Outlook partial),
so the PNG is an email-specific exception.

The two icon routes use `next/og`'s `ImageResponse` to render lucide
SVG paths as 120×120 PNGs with `Cache-Control: public, max-age=31536000,
immutable` so email-client image proxies fetch each icon exactly once.

The routes import raw `__iconNode` data from the per-icon module
(`lucide-react/dist/esm/icons/<name>.js`) rather than the top-level
component, because the top-level component is `'use client'` and cannot
be invoked inside an `ImageResponse` server context. The raw node data
is server-safe and produces visually-identical output. See
`src/types/lucide-icons.d.ts` for the TypeScript shim that types the
internal import path. If `lucide-react` refactors the internal module
structure in a future version, the build will fail loudly — pin the
version or update the import path.

### Site URL is security-sensitive

Emails fetch images via `{{ .SiteURL }}/email/...`. If the Supabase
Site URL is misconfigured to a different host, the email fetches
assets from that host — not an open redirect, but a remote content
injection / user-tracking risk under our brand. Always verify under
Supabase **Authentication → URL Configuration** that Site URL is
`https://blackpick.io` before applying templates in prod.

## Supabase template variables used

| Variable | Used in | Purpose |
|---|---|---|
| `{{ .SiteURL }}` | Both | Configured Site URL (logo + icon image fetch) |
| `{{ .ConfirmationURL }}` | Both | Supabase-generated action link (verify / recover) |
| `{{ .Email }}` | `reset-password.html` | Account identification — shows user which account the reset is for (security practice) |

The full variable list is at
<https://supabase.com/docs/guides/auth/auth-email-templates>.

## Design principles

- **Dark canvas, no gradients, no glow effects.** BlackPick brand is
  flat dark + gold. CTAs are solid gold pills, no box-shadow.
- **Table-based layout with `role="presentation"`**, all styles inline.
  Gmail strips `<style>` blocks and modern layout (flex, grid) is not
  universally supported in email clients.
- **Fixed width `width="580"` + CSS `max-width:580px`** for robust
  rendering in older email clients that don't honor CSS max-width
  alone.
- **Hidden preheader** shows inbox preview text different from the
  body. Uses the full hide-bundle (`display:none + visibility:hidden +
  opacity:0 + mso-hide:all + max-heights`) to survive every client.
- **MSO conditional font override** forces Arial on Outlook Desktop
  for consistent typography fallback (system font stack is unreliable
  on MSO).
- **`<meta name="color-scheme" content="dark">`** + supported-color-schemes
  are a best-effort hint that opts out of auto-inversion on clients
  that honor the spec (iOS Mail 13+, Outlook.com 2021+). Clients that
  ignore the meta (older Samsung Email, some Outlook mobile builds,
  some Yahoo builds) fall back to the explicit inline dark background
  colors — those inline values are the primary defense against
  inversion, and the meta is a progressive enhancement on top.

## WCAG AA audit

Every **text** contrast pair in both templates passes WCAG 1.4.3
Contrast (Minimum) AA (4.5:1 normal text, 3:1 large text). All small
text has ≥5:1 contrast for margin.

Non-text contrast (WCAG 1.4.11) is **not** evaluated here — the copy
link panel is a presentational grouping, not a focusable UI control
that conveys state. The 1px `#1e1e21` panel border against `#000000`
is below 3:1 by design and is treated as decorative. If future edits
turn the copy panel into an interactive element, this exclusion no
longer holds.

| Text | Bg | Ratio | Element |
|---|---|---|---|
| `#ffffff` | `#000000` | 21.00:1 ✓ | `<h1>` heading |
| `#a9b0bd` | `#000000` | 9.63:1 ✓ | Body description (15px) |
| `#8a94a3` | `#000000` | 6.85:1 ✓ | Account line label (13px) |
| `#c2c7d0` | `#000000` | 12.37:1 ✓ | Account email value |
| `#8a94a3` | `#0f0f10` | 6.25:1 ✓ | "Or Copy This Link" label (12px) |
| `#c2c7d0` | `#0f0f10` | 11.29:1 ✓ | Copy link URL text (13px) |
| `#8a94a3` | `#000000` | 6.85:1 ✓ | Expiry note (12px) |
| `#8a94a3` | `#050505` | 6.64:1 ✓ | Footer "Black Pick" label |
| `#a9b0bd` | `#050505` | 9.35:1 ✓ | Footer body (12px) |
| `#8a94a3` | `#050505` | 6.64:1 ✓ | Footer fine print (12px) |
| `#ffffff` | `#050505` | 20.38:1 ✓ | Footer `blackpick.io` link |
| `#0a0a0a` | `#ffba3c` | 11.63:1 ✓ | CTA button text |

DESIGN.md §Typography minimum 12px is enforced — no text below 12px in
either template. (Email templates do not use Pretendard — system font
stack is the correct choice for email because Pretendard will not
reliably load in email clients.)

## Client compatibility

| Client | Status |
|---|---|
| Apple Mail / iOS Mail | Perfect |
| Gmail web + mobile | Perfect |
| Outlook 365 | Perfect |
| Outlook Desktop (MSO) | Graceful degradation — `border-radius` ignored (square button, still usable), Arial forced via MSO conditional comment |
| Yahoo Mail / AOL / Thunderbird | Perfect — table layout + inline styles survive any quirks |

## Preview locally

Both templates are plain HTML. Open directly in a browser:

```bash
open Docs/email-templates/confirm-signup.html
open Docs/email-templates/reset-password.html
```

Preview limitations:
- `{{ .SiteURL }}`, `{{ .ConfirmationURL }}`, and `{{ .Email }}` render
  as literal template syntax (not resolved).
- The logo image will 404 locally unless you serve `public/` (the
  `src="/email/..."` is a server-relative path that needs an origin).
  To test fully: paste into Supabase and use the "Send test email"
  button.

## Brand tokens (kept in sync with `src/lib/brand-tokens.ts`)

| Token | Value | Usage |
|---|---|---|
| Background | `#0a0a0a` | Outer body |
| Card | `#000000` | Main container |
| Footer | `#050505` | Footer bg |
| Border | `#1a1a1a` | Card border |
| Divider | `#141414` | Section divider lines |
| Copy panel bg | `#0f0f10` | "Or Copy This Link" panel |
| Copy panel border | `#1e1e21` | Copy panel border |
| Accent gold | `#ffba3c` | CTA button bg |
| Accent gold on | `#0a0a0a` | CTA button text (solid dark) |
| Text primary | `#ffffff` | Headings |
| Text body | `#a9b0bd` | Body copy (WCAG-bumped from `#9ca3af`) |
| Text dim | `#8a94a3` | Muted labels, fine print (WCAG-bumped from `#6b7280`) |
| Text emphasis | `#c2c7d0` | Emphasized inline values |

If you update `src/lib/brand-tokens.ts` (e.g. changing the accent gold),
update the hex literals in both HTML files **and** this table. The
templates are hand-written static HTML, not generated from the TS
module — email clients cannot run JavaScript.

## How to apply to Supabase

1. Verify `public/email/bp-logo-email.png` is committed and deployed
   to prod. Open `https://blackpick.io/email/bp-logo-email.png` in a
   browser and confirm it returns the logo (not 404).
2. Verify the icon routes are deployed. Open
   `https://blackpick.io/email/icon-shield` and
   `https://blackpick.io/email/icon-key` — each should return a
   120×120 PNG of the icon.
3. Verify Supabase Site URL is `https://blackpick.io` under
   **Authentication → URL Configuration**.
4. Go to Supabase **Authentication → Email Templates**.
5. Select **Confirm signup**. Replace the entire HTML body with the
   contents of `confirm-signup.html`. Save.
6. Select **Reset password**. Replace the entire HTML body with the
   contents of `reset-password.html`. Save.
7. Use the "Send test email" feature to verify rendering in your
   own inbox across at least one of: Apple Mail, Gmail web, Outlook
   web. Check that the logo + icon images load and the button links
   are not broken.

## Updating the design

1. Edit the HTML file in this repo.
2. Preview in a browser (`open Docs/email-templates/*.html`).
3. Copy-paste the full file contents into the Supabase dashboard.
4. Send a test email to verify.
5. Commit the HTML change with a descriptive message.

Never edit Supabase dashboard templates directly — changes there are
not under version control and will be lost on the next sync.

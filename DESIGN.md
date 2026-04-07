# Design Rules

## Principles
- UI should be self-explanatory without text labels. Use color, size, and position to convey meaning.
- Don't over-list information. Show only what's essential.
- Intuitive over explanatory.

## Icons
- All icons MUST use the `lucide-react` library. No inline SVGs, no unicode symbols (✓ ✗ ✕ ✔ etc.) for icons.
- Brand assets (Google logo, country flags) are the only exception.
- Icons next to text: always left side first, then text.

## Accessibility & Interaction
- All interactive elements (buttons, links, clickable cards) MUST have `cursor: pointer` and visible hover states (border/background change).
- Selected/active states should NOT have hover background changes — only unselected items get hover feedback.
- Color contrast MUST meet WCAG AA (4.5:1 for normal text, 3:1 for large text). Use darker shades for colored buttons with white text (e.g. `#2563eb` not `#3b82f6` for blue buttons).
- Disabled elements use `cursor: not-allowed` and reduced opacity.

## Typography
- No serif fonts. Use Pretendard (sans-serif) everywhere.
- No `font-title` or `font-display` inline styles referencing serif fonts.
- Minimum font size: 12px (`text-xs`). Exception: 11px allowed for tight captions (e.g. "공식 대중예측"). No `text-[9px]`, `text-[10px]`.
- Type scale: 32px page title, 24px section header, 20px card title, 18px stat numbers, 16px body, 14px labels, 12px captions.

## Alignment
- Icons and text side-by-side MUST be vertically centered (`items-center` on flex container).
- Labels with icons (RetroLabel, badges, inline icon+text) always use `inline-flex items-center gap-*`.
- This applies everywhere: buttons, nav links, stat rows, breadcrumbs, delta indicators, chips.

## Spacing
- Use 4px multiples as default: 4, 8, 12, 16, 20, 24, 32, 40, 48px.
- Use 2px multiples only for tight spots (icon gaps, inline padding).
- Section gap (between major blocks): 40px (`gap-10`).
- Card gap (between cards in a list): 24px (`gap-6`).
- Inner card padding: 16px (`p-4`), 24px on desktop (`sm:p-6`).
- Row gap (ranking rows, list items): 4-8px (`space-y-1` or `gap-2`).
- CSS custom properties: `--sp-1` (2px) through `--sp-10` (48px) defined in globals.css.

## Color Patterns
- W/L display: W is always green (`#4ade80`), L is always red (`#f87171`). Apply everywhere W/L appears.
- Positive scores: green (`#4ade80` or `--bp-success`). Negative scores: red (`#f87171` or `--bp-danger`).
- Current streak flame icon: muted color. Best streak flame icon: gold (`--bp-accent`).
- Win rate percentage: use `--bp-ink` (white).

## Design System Usage
- All new UI MUST use the design system components in `src/components/ui/retro.tsx` and CSS tokens in `globals.css`.
- Panels/cards: use `retroPanelClassName()` — never raw `bg-[#0d0d0d] border border-[...]`.
- Buttons: use `retroButtonClassName({ variant, size })` — never hand-rolled button styles.
- Input fields: use `retroFieldClassName()` — never raw input styling.
- Badges/labels: use `RetroLabel` or `RetroStatusBadge` — never raw span badges.
- Stat tiles: use `RetroStatTile` for key-value stat displays.
- Empty states: use `RetroEmptyState`.
- Segments/tabs: use `retroSegmentClassName()`.
- Colors: use CSS custom properties (`--bp-ink`, `--bp-muted`, `--bp-accent`, `--bp-danger`, `--bp-success`, `--bp-line`, `--bp-card`, `--bp-card-inset`, `--bp-bg`) — never hardcoded hex values for theme colors. Exception: W/L green/red (`#4ade80`, `#f87171`) are allowed as fixed semantic colors.
- Points/score: always gold (`--bp-accent`).

## Visual Style
- Dark flat cards, no glassmorphism (no gradient overlays, no `::before` decorative layers).
- Exception: sticky headers/sub-headers use `backdrop-blur` for functional transparency.
- Border radius: 16px panels, 12px cards/buttons, 8px chips/badges.
- Minimal shadows — rely on borders and background differences for depth.

@AGENTS.md

# Design Rules

## Accessibility & Interaction
- All interactive elements (buttons, links, clickable cards) MUST have `cursor: pointer` and visible hover states (border/background change).
- Selected/active states should NOT have hover background changes — only unselected items get hover feedback.
- Color contrast MUST meet WCAG AA (4.5:1 for normal text, 3:1 for large text). Use darker shades for colored buttons with white text (e.g. `#2563eb` not `#3b82f6` for blue buttons).
- Disabled elements use `cursor: not-allowed` and reduced opacity.

## Typography
- No serif fonts. Use Pretendard (sans-serif) everywhere.
- No `font-title` or `font-display` inline styles referencing serif fonts.

## Spacing
- Use 4px multiples as default: 4, 8, 12, 16, 20, 24, 32, 40, 48px.
- Use 2px multiples only for tight spots (icon gaps, inline padding).
- Section gap (between major blocks): 40px (`gap-10`).
- Card gap (between cards in a list): 24px (`gap-6`).
- Inner card padding: 16px (`p-4`), 24px on desktop (`sm:p-6`).
- Row gap (ranking rows, list items): 4-8px (`space-y-1` or `gap-2`).
- CSS custom properties: `--sp-1` (2px) through `--sp-10` (48px) defined in globals.css.

## Visual Style
- Dark flat cards, no glassmorphism (no gradient overlays, no `::before` decorative layers).
- Exception: sticky headers/sub-headers use `backdrop-blur` for functional transparency.
- Border radius: 16px panels, 12px cards/buttons, 8px chips/badges.
- Minimal shadows — rely on borders and background differences for depth.

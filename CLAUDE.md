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

## Visual Style
- Dark flat cards, no glassmorphism (no backdrop-blur, no gradient overlays, no `::before` decorative layers).
- Border radius: 16px panels, 12px cards/buttons, 8px chips/badges.
- Minimal shadows — rely on borders and background differences for depth.

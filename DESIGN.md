# Design Direction — MOCHI SkillMap

## Character
Human, calm, practical developer tool. Clear visual hierarchy; minimal ornament; slightly tactile surfaces allowed. Implement with MUI primitives; if an actually installed Taste Engine claymorphism skill is available, follow it without sacrificing usability. No gradients, animation clutter or trendy badges just to fill space.

## Screen structure
- Header with product title and concise purpose.
- Skill inventory: search/filter, count derived from real scan results, each item with title, optional description, and safe origin label.
- Project matcher: multiline project brief, Match action, ordered recommendations with reasons.
- Helpful empty state explaining configuration; errors state what can be fixed without leaking sensitive paths.

## Required states
Loading; no SKILLS_ROOT; root exists but no skills; malformed metadata warning; query returns no match; successful results; API failure. No hardcoded cards or metrics with synthetic data.

## Accessibility
Keyboard-operable controls, visible focus, labeled inputs, semantic headings, sufficient contrast, minimum comfortable touch targets, readable long descriptions, avoid motion that prevents use.

## Responsive behavior
Desktop can show catalog and match panel side by side if space permits; mobile should stack them. No overflow, controls remain usable at narrow widths. Do not force a decorative bottom nav for an MVP with a single view.

## Motion
Subtle transitions only, respect prefers-reduced-motion. No bounce/overshoot or perpetual animation.

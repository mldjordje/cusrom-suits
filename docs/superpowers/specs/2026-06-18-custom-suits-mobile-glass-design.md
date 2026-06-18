# Custom Suits Mobile Glass Panel

## Goal

Replace the opaque/basic mobile bottom controls with a modern Apple-inspired glass surface while preserving layout, actions, safe-area spacing, and accessibility.

## Design

- Use one floating dark-tinted translucent shell with layered gradients, backdrop blur, saturation, a bright top reflection, a subtle inner rim, and a soft elevated shadow.
- Keep the three navigation controls in the existing positions. Active controls receive an interactive glass capsule; inactive controls remain legible without separate heavy surfaces.
- Keep price and primary actions in the lower row. The primary action uses a brighter frosted capsule; the secondary action uses a transparent outlined glass capsule.
- Preserve the current 24px radius, mobile safe-area inset, touch targets, and panel dimensions so the suit preview remains unobstructed.
- Provide a darker translucent fallback when `backdrop-filter` is unavailable.

## Verification

- Render at a 390x844 mobile viewport and inspect the bottom panel against the suit preview.
- Confirm all three tabs and both action buttons remain present and usable.
- Run TypeScript, the full test suite, and a production build before pushing.

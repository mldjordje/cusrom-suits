# Custom Suits Mobile Glass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the basic mobile bottom controls with a modern Apple-inspired glass panel without changing behavior or layout.

**Architecture:** Keep `MobileControls` behavior intact and isolate the glass surface class contract in a small style module. The component consumes those classes while preserving the user's existing control changes.

**Tech Stack:** React 19, Next.js 15, Tailwind CSS, Vitest, Playwright.

---

### Task 1: Glass style contract

**Files:**
- Create: `lib/custom-suits/mobileGlass.ts`
- Test: `__tests__/custom-suits-mobile-glass.test.ts`

- [ ] Write a test asserting that the panel class uses translucency, backdrop blur/saturation, rounded floating geometry, and a non-opaque fallback.
- [ ] Run `npx vitest run __tests__/custom-suits-mobile-glass.test.ts` and confirm it fails because the style module does not exist.
- [ ] Add exported panel, active-control, primary-action, and secondary-action class constants containing the approved glass treatments.
- [ ] Re-run the targeted test and confirm it passes.

### Task 2: Mobile controls integration

**Files:**
- Modify: `app/custom-suits/components/MobileControls.tsx:786-840`

- [ ] Import the glass class constants and replace only the current bottom-panel presentation classes.
- [ ] Add a non-interactive reflection/gradient layer inside the shell while keeping controls above it.
- [ ] Preserve all handlers, labels, prices, safe-area spacing, and touch targets.
- [ ] Run `npx vitest run`, `npx tsc --noEmit`, and `npm run build`; expect exit code 0.
- [ ] Render `/custom-suits` at 390x844 and confirm the panel is translucent, readable, floating, and all five controls remain visible.
- [ ] Commit only the intended custom-suits changes and push `main`.

# HUSHAE ADMIN — DESIGN BRIEF (Boss ki requirements, binding spec)

> Status: **§6 (Analytics R0–R8) DONE + LIVE — 2026-08-28, commit `2640143`.**
> Baaki sections (§1–§5) har admin UI kaam ke liye **binding acceptance criteria** hain.

---

## 1. Core demand (exact words)

> "Mujhe sirf functional admin panel nahi chahiye, balkeh **premium, luxury, modern admin
> panel** chahiye. Iska UI aur UX completely redesign karo, latest tech aur best practices
> use karke. Premium typography, luxury color palette, modern icons, rounded cards,
> glassmorphism jahaan suit kare, subtle gradients, soft shadows, proper spacing.
> Har button, card, aur input ko premium look do. Smooth micro-interactions, hover effects,
> page transitions, aur high-quality animations add karo. Code maintainable, reusable,
> aur optimized."

## 2. Stack he named (must use where it fits)

| Need | Tech |
|---|---|
| Base styling | Advanced CSS — animations, transitions, `@keyframes` |
| Layout / utilities | Tailwind CSS (utility-first, consistent spacing) |
| Complex motion | GSAP (timelines, scroll/entrance choreography) **or** Framer Motion (React) |
| Icons | Modern icon set (line icons, consistent stroke) |

## 3. Non-negotiables (checklist har PR mein)

- [ ] **Premium typography** — display face (Fraunces) for headings, tabular numerals for
      all money/percent/count columns, tight tracking on large numbers, proper scale
      (12 / 13 / 14 / 16 / 20 / 28 / 34).
- [ ] **Luxury palette** — restrained. Neutrals + 1 accent family. Status colors only for
      status. No rainbow dashboards.
- [ ] **Modern icons** — one set, one stroke weight, aligned to text baseline.
- [ ] **Rounded cards** — consistent radius scale (sm 10 / md 14 / lg 18), never mixed
      randomly on one screen.
- [ ] **Glassmorphism — sirf jahaan suit kare** (sticky headers, seg controls, overlays).
      Body content = solid surfaces. Glass on everything = cheap, not luxury.
- [ ] **Subtle gradients** — backgrounds and primary buttons only. Never on text-heavy panels.
- [ ] **Soft, layered shadows** — 2-layer ambient + key. Elevation consistent by depth.
- [ ] **Proper spacing** — 4/8-based rhythm, generous padding (cards ≥ 20px), breathing room
      between sections. Alignment on a grid.
- [ ] **Every control looks premium** — buttons (hover lift, press scale), inputs (focus ring,
      smooth border transition), toggles, pills, selects, empty states.
- [ ] **Micro-interactions** — hover, focus-visible, active, row hover, count-up numbers,
      progress fill, tooltip fade. 120–220ms, ease-out.
- [ ] **Page transitions & entrance animation** — staggered fade/rise on section mount.
- [ ] **Respect `prefers-reduced-motion`** — all motion disabled behind the media query.
- [ ] **Mobile-friendly & responsive** — tables → stacked cards, nav collapses, no horizontal
      scroll.
- [ ] **Cohesive** — one screen must look like it came from one designer. Same card, same
      header, same table, everywhere.
- [ ] **Maintainable / reusable / optimized** — shared components + design tokens, no
      copy-pasted inline styles, no dead CSS, no layout thrash in animations
      (transform/opacity only).

## 4. Definition of "luxury" for this project

Luxury = **restraint + consistency + craft**, NOT more effects.
- Fewer colors, more whitespace.
- One accent per context.
- Motion that explains, never motion that decorates.
- Numbers must be instantly scannable: aligned columns, right-aligned money, muted labels,
  bold values.

## 5. Standing constraints

- **Storefront is OFF-LIMITS.** Admin panel only (`/admin/*`).
- Never delete/remove anything without an explicit order.
- Preserve existing architecture (`--admin-*` tokens, `od-*` classes, `admin-shell.css`).
- Verify live after deploy before reporting done.

---

## 6. OPEN ISSUE — Analytics R1–R8 "organized nahi lag rahay"

Boss ne Analytics ke lower sections ka data paste kiya aur kaha **ye organized nahi lag
rahe**. Diagnosis (jo fix karna hai, jab order mile):

**Problem:**
1. Sections ka **order random** hai — R1, R2a, R2b, R3, R4, R0, R5, R6, R7, R8.
   Benchmarks (R0) sab se neeche dab gaya hai jabke wo sab se pehle hona chahiye.
2. Sections ek hi column mein **stack of raw tables** hain — koi visual grouping, hierarchy,
   ya 2-column grid nahi. Har section same weight ka lagta hai.
3. **Numbers aligned nahi** — views / conv% / orders / revenue / returns ek line mein
   jam gaye hain, money right-align nahi, conv% ka color coding nahi.
4. **R7 variant rows** lambay product+variant strings hain — truncate/2-line layout chahiye,
   qty/revenue right-aligned.
5. **Empty states inconsistent** — R2a text, R4 text, R6 text — sab alag wording/layout.
   Ek hi reusable `EmptyState` component chahiye.
6. **R2b (cart recovery)** teen bare number boxes + ek line — isko ek compact stat strip
   hona chahiye, teen giant cards nahi.
7. **R8 custom report** — dimension pills + bare table; koi total row, sorting, ya export nahi.
8. Section **headers** (`R0 —`, `R1 —`) internal codes hain — boss ke liye plain labels
   chahiye, code chhupa hua.

**Fix plan (jab green light mile):**
- Reorder → Scorecard/benchmarks → Product conversion → Customer value → Recovery/Coupon ROI
  → Variants → Cohorts/At-risk → Quality → Custom report.
- Har section = same `<SectionCard>` component (title + subtitle + optional chip + body).
- Reusable `<DataTable>`: sticky head, right-aligned numeric, row hover, zebra-free,
  rank pill, delta chips, skeleton loading, `EmptyState`.
- 12-col responsive grid: heavy sections full width, light ones 2-up.
- Conv% color scale (low/ok/great), revenue tabular-nums, returns as warning chip.
- Staggered entrance per section + count-up on visible numbers.

> **Do not start until boss says "start karo".**

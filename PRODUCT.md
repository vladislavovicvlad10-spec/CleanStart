# Product

## Register

product

## Users

Windows users who want their PC kept tidy without trusting a shady "booster".
They are in a task (clean temp files, audit startup, find what eats disk space)
and they are skeptical by default — cleaner apps have a bad reputation.

## Product Purpose

CleanStart is a transparent, safety-first Windows cleaner built on Tauri.
Preview-first, Recycle Bin only, read-only disk analysis, reversible startup
toggles, local-only logging. Success = the user always knows exactly what will
happen before it happens, and the app feels precise enough to deserve trust.

## Brand Personality

Calm, precise, protective. The UI should feel like a well-machined instrument:
quiet surfaces, exact motion, data presented as data. Never salesy, never
gamified, no fear-mongering ("12,431 PROBLEMS FOUND!" is the anti-pattern).

## Anti-references

- CCleaner-style alarm UI: red badges, problem counts, upsell banners.
- Generic AI dashboard slop: gradient text, glass cards everywhere, hero-metric
  templates, identical card grids with no internal hierarchy.
- "Gamer RGB" utility skins: neon glows on everything, oversaturated accents.

## Design Principles

1. **Trust through transparency** — every destructive-looking action shows a
   preview, a count, and an exit (Recycle Bin, reversible toggle) before it runs.
2. **Data looks like data** — tabular numerals, aligned columns, real units;
   numbers are the product, treat them typographically.
3. **One signature, everything else quiet** — the Dashboard hero carries the
   personality; tables, settings, and logs stay disciplined and fast.
4. **Motion conveys state** — entrances orient, hover confirms interactivity,
   press confirms input; nothing loops for decoration, everything respects
   `prefers-reduced-motion`.
5. **Module identity via light, not paint** — each module owns an accent
   (teal / violet / amber / slate) expressed as ambient light and colored
   shadow, not flat colored rectangles.

## Accessibility & Inclusion

WCAG AA contrast for body text in both themes, visible `:focus-visible` rings,
full keyboard operation of cards/toggles/modals, `prefers-reduced-motion`
fallbacks for every animation, hover effects gated behind `(hover: hover)`.

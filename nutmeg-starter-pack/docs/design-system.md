# Design direction — Nutmeg mobile editorial / Ultra Club

Reference: `design/mobile-card-layout.png` is the chosen updated mobile mockup. `design/mobile-editorial-reference.png` is the earlier design reference. Mockup factual labels/player faces are illustrative only.

## Identity

Modern football newspaper that behaves like a native mobile browser game. Warm paper surfaces, nearly-black ink, vibrant orange for Nutmeg editorial marks, cobalt for Game 2, and lime as a rare positive/reward highlight. Football match programmes, ticket stubs, pitch diagrams, halftone photography, tears, printed edition numbers.

## Approximate palette

- Paper `#F5F0E6`
- Ink `#1D1D1B`
- Burnt orange `#EF5A1B`
- Cobalt `#3456CD`
- Lime `#C9F254`
- Soft green `#DDEBCF`
- Wrong peach `#F5CDC1`
- Neutral grey `#CFCBC2`

Avoid body-wide heavy noise and excessive photo backgrounds. Use CSS-based subtle grain and precise outlines. WCAG color contrast must be checked; the exact palette may need accessible variants.

## Typography

Expressive editorial serif/italic headlines (e.g. open-license editorial face or system fallback), clean sans body (Inter or system stack). Avoid loading expensive paid fonts and avoid overusing serif in small controls.

## Mobile layout

- Design baseline 390x844 CSS px, then test 320 width and safe-area bottom.
- Standard app-like header (back, masthead, context icon). Primary navigation simple and touch friendly.
- 44–48px minimum tap targets where practicable, readable 14–16px body, visible focus states, `prefers-reduced-motion` support.
- Search anchored comfortably above keyboard, with scroll and autocomplete behavior tested on mobile Safari and Chrome.
- **Lineup: stack individual guessed-player cards**; each card includes name, optional licensed portrait/silhouette, compact 2x3 attribute chips (club, league, nation, position, age, foot). No wide comparison table.
- Mystery: tactile paper-cutting clue cards, clean remaining-questions/guesses counters, question bank and player lookup as bottom sheet.
- Leaderboard: editorial numbered rankings, personal highlight, tabs Today/Week/All Time.
- Results: large football-stamp moment, player reveal, compact clue/guess summary, share-without-spoilers.

## Motion

Subtle stamped-on correctness, slide-in card, ink-line underline, small success burst, pitch-marking orbits; restrained animations under 300ms typical; reduced motion variant. Respect performance on low-end devices.

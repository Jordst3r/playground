# Hex Pressure — Roadmap & Deferred Decisions

This document tracks decisions we have **intentionally deferred** so they
don’t get lost or re-litigated. If something is deferred, it belongs here. If something is completed it should be struck out using `~~` format. Add notes as sub-bullets to completed items as necessary to preserve decision history. 

---

## Guiding Principles (Locked)

- Solve is binary; mastery is graded
- Teach mechanics through play, not explanation
- Early game is failure-safe and confidence-building
- Visual clarity > ornamentation
- Accessibility features are additive, not stigmatized

---

## Current MVP Scope

- React + Canvas prototype
- Rotate-only gameplay
- Tile types: DIRECTIONAL, NEUTRAL, SINK
- Local pressure only (+1 per accepted neighbor)
- Atomic moves with settle phase
- Undo allowed, not counted
- Faithful replay model
- Engine-only tests (Vitest)

---

## Paper Cuts / Bugs (UI)

- ~~Add **Back** button to solved panel (disabled on first level)~~
- ~~Show **Retry** button at all times (outside solved panel)~~
- ~~Star colors: gold for normal solve, pink only for ascension~~
- ~~Disable/grey **Undo** when undo stack is empty~~
- Track **star totals per section** (representation TBD)
- **Optional polish:** render 3 stars with unearned stars dimmed
- ~~Lock rotations after solve; re-enable on Retry~~
- ~~Undo should not count toward moveCount~~
- Undo is not reducing move count but should be
- if the puzzle is solved, Undo should be disabled for that puzzle

---

## Scoring & Progression (Deferred)

### Ideal vs Par
- Current issue: if `idealMoves` is the true minimum, pink is often impossible
- Proposed split:
  - `idealMoves` = solver minimum (objective)
  - `parMoves` = designer target for “perfect”
- Stars and ascension rules to be revisited after solver exists

### Section Progress
- Persist best stars per level
- Compute per-section totals
- Unlock rules + UI representation TBD

### Replaying Completed Levels
- Current behavior: reloads fresh
- Options to decide later:
  - Always fresh + show best score
  - Continue / Replay / Practice modes
  - Watch best replay

---

## Replay (Deferred)

- Step-through replay
- Continuous “flow” replay
- Scrubbing
- Branching from replay point
- Visualization polish (later)

---

## Solver (Deferred, High Value)

- Rotate-only BFS to compute minimum moves
- Deterministic tie-breaking
- Auto-derive `idealMoves`
- Enables meaningful ascension at scale

---

## Tile Set Expansion (Deferred)

- ANCHOR tile (locks after N stable moves)
- Material variants (different pressure contributions)
- Directional modifiers
- Cascading / propagation mechanics (explicit tiles only)

---

## Aesthetic / Experiential (Deferred)

- Section “boss” levels designed as light/sound replays
- Beauty must emerge from system behavior, not scripting
- Theme packs (color, texture, sound)
- Accessibility overrides (contrast, reduced motion)

---

## Testing / TDD

- Engine tests established (Vitest)
- Priorities:
  - Pressure math
  - Rotation semantics
  - Undo correctness
  - Level validator rules
- UI/Canvas tests deferred

---

## Extraction Plan (If Project Graduates)

- Currently lives under `playground/hex-pressure`
- If promoted to standalone:
  - Use `git subtree split`
  - Preserve full history

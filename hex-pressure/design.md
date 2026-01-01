# Hex Pressure — Design

Hex Pressure is a rotate-only hex-grid puzzle prototype focused on pressure,
adjacency, and local constraint management. The design emphasizes teaching
through play, mechanical clarity, and confidence-building before complexity.

This document captures **locked rules and assumptions**. If something changes,
it should be updated here.

---

## Core Gameplay Loop

- Player rotates tiles to change how they accept pressure from neighbors.
- A level is **solved** when no tiles are overstressed.
- Solving is binary; **mastery is graded** via stars.

---

## Tile Types (MVP)

### DIRECTIONAL
- Has an orientation (`orient ∈ [0..5]`)
- Accepts pressure from **exactly 3 consecutive sides**:
  - `orient`, `orient + 1`, `orient + 2` (mod 6)
- Pressure = +1 per accepted occupied neighbor
- **Only tile type that rotates in MVP**

### NEUTRAL
- Accepts pressure from all 6 sides
- Orientation is meaningless
- Used as stable structure or density filler
- Must never start overstressed in rotate-only levels

### SINK
- Accepts pressure but effectively never overstresses
- Used as a stabilizer / safe neighbor
- Never rotatable
- Reintroduced intentionally (World 1, Level 5)

---

## Pressure & State

- Pressure is **purely local**
- No cascading or propagation (yet)
- Pressure contribution:
  - +1 per accepted, occupied adjacent hex
- Tile states:
  - `STABLE` (pressure < limit)
  - `TENSE` (pressure == limit)
  - `OVERSTRESSED` (pressure > limit)

---

## Movement & Timing

- All moves are **atomic**
- Rotation is 60° per move
- Visuals may animate, but state updates are instant
- After a move:
  - Game enters `SETTLING`
  - Input is gated during settling
  - After settling, phase becomes `IDLE` or `SOLVED`

---

## Input Gating Rules

- `SETTLING`: block all input
- `SOLVED`:
  - Block ROTATE
  - Allow UNDO (so players can optimize without Retry)
- `REPLAYING`: block all input

---

## Undo & Replay

- Undo is allowed in MVP
- Undo **does NOT count toward moveCount**
- Undo **is recorded in the tape** to preserve faithful replay
- Replay should reproduce the exact sequence of player actions

---

## Scoring

- Solve is binary
- Stars are awarded by move count:
  - ⭐⭐⭐ = moves ≤ idealMoves
  - ⭐⭐ = moves ≤ twoStarMax
  - ⭐ = otherwise
- Normal solves render stars in **gold**
- Pink ⭐⭐⭐ (“ascension”) occurs **only when moves < idealMoves**
- Undo does not affect scoring

---

## Numbers Overlay

- Pressure numbers are **ON by default** in early levels
- Numbers are always toggleable (accessibility)
- Later worlds may default them OFF

---

## Rotate-Only Level Constraints (Important)

For rotate-only levels:
- Only orientation-sensitive tiles may start overstressed
- NEUTRAL and SINK tiles must start within limits
- At least one overstressed DIRECTIONAL must exist, or the level is pointless
- Levels must not load already solved

A dev-only level validator enforces these rules.

---

## Non-Goals (for now)

- No tile movement
- No cascading pressure
- No global constraints
- No randomness
- No time pressure

These may be introduced later as explicit mechanics.

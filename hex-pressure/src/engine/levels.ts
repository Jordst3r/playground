// src/engine/levels.ts
import type { LevelDef } from "./types";

/**
 * Standard board for World 1 (rotate-only MVP)
 * 7-cell "flower": center + 6 neighbors.
 *
 * Axial coords with DIRS assumed as:
 * 0 E  (1, 0)
 * 1 NE (1,-1)
 * 2 NW (0,-1)
 * 3 W  (-1,0)
 * 4 SW (-1,1)
 * 5 SE (0, 1)
 */
const FLOWER_CELLS: Array<{ q: number; r: number }> = [
  { q: 0, r: 0 },
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export const LEVELS: LevelDef[] = [
  {
    // Teaches: Red tiles are problems; rotation changes how many neighbors a DIRECTIONAL counts.
    // Goal: Make the single overstressed tile stable by rotating it (1–2 moves).
    // Failure mode: Rotating non-directional tiles (no-op) / guessing without watching counts.
    // Intended ideal moves: 1
    id: "w1-01",
    name: "Warmup",
    board: { cells: FLOWER_CELLS },
    tiles: [
      // Problem tile: counts 2 neighbors initially (E + NE) but limit is 1.
      { id: "A", type: "DIRECTIONAL", q: 0, r: 0, orient: 0, limit: 1 },

      // Neighbors (stable, non-rotatable, high limits)
      { id: "B", type: "NEUTRAL", q: 1, r: 0, limit: 6 }, // E of A
      { id: "C", type: "NEUTRAL", q: 1, r: -1, limit: 6 }, // NE of A
    ],
    scoring: { idealMoves: 1, twoStarMax: 3 },
    rules: { allowRotate: true, allowUndo: true, defaultShowNumbers: true },
  },

  {
    // Teaches: DIRECTIONAL tiles can be "tight" (limit 0); one rotation can fully relieve pressure.
    // Goal: Reduce a 1/0 overstress to 0/0 by rotating away from its only neighbor.
    // Failure mode: Rotating the wrong direction; assuming “0 limit” is impossible.
    // Intended ideal moves: 1
    id: "w1-02",
    name: "Zero Tolerance",
    board: { cells: FLOWER_CELLS },
    tiles: [
      // Anchor neighbor (stable)
      { id: "A", type: "NEUTRAL", q: 0, r: 0, limit: 6 },

      // Problem tile: has exactly one adjacent occupied neighbor (W = A).
      // With orient 3 it accepts W, so starts 1/0 (OVERSTRESSED).
      // Rotate once to stop accepting W.
      { id: "B", type: "DIRECTIONAL", q: 1, r: 0, orient: 3, limit: 0 },
    ],
    scoring: { idealMoves: 1, twoStarMax: 3 },
    rules: { allowRotate: true, allowUndo: true, defaultShowNumbers: true },
  },

  {
    // Teaches: Decompose: sometimes multiple tiles must be fixed; each may require multiple 60° steps.
    // Goal: Fix two independent overstressed tiles; observe that 1 turn may reduce pressure but not enough.
    // Failure mode: Over-undoing / oscillating without committing to a plan.
    // Intended ideal moves: 4
    id: "w1-03",
    name: "Two Knobs",
    board: { cells: FLOWER_CELLS },
    tiles: [
      // Problem tile A: has 3 occupied neighbors (E=B, NE=C, NW=D).
      // Starts counting all 3 (orient 0 => accepts 0,1,2), limit 1 => 3/1 (OVER).
      // Needs 2 clockwise turns to accept only one of those neighbors.
      { id: "A", type: "DIRECTIONAL", q: 0, r: 0, orient: 0, limit: 1 },

      // Problem tile B: has 3 occupied neighbors (W=A, NW=C, SW=E).
      // Starts counting all 3 (orient 2 => accepts 2,3,4), limit 1 => 3/1 (OVER).
      // Needs 2 clockwise turns to accept only one of those neighbors.
      { id: "B", type: "DIRECTIONAL", q: 1, r: 0, orient: 2, limit: 1 },

      // Supporting tiles (stable neutrals)
      { id: "C", type: "NEUTRAL", q: 1, r: -1, limit: 6 },
      { id: "D", type: "NEUTRAL", q: 0, r: -1, limit: 6 },
      { id: "E", type: "NEUTRAL", q: 0, r: 1, limit: 6 },
    ],
    scoring: { idealMoves: 4, twoStarMax: 7 },
    rules: { allowRotate: true, allowUndo: true, defaultShowNumbers: true },
  },

  {
    // Teaches: Rotation direction matters; a “wrong way” turn can make pressure worse.
    // Goal: Use the shortest rotation direction for each problem tile (introduces intentional choice: Q vs E).
    // Failure mode: Always rotating the same direction; not noticing that CCW can worsen (counts the “wrap” neighbor).
    // Intended ideal moves: 2
    id: "w1-04",
    name: "Wrong Way",
    board: { cells: FLOWER_CELLS },
    tiles: [
      // A is red because it counts E (B) + NE (C) with limit 1.
      // CW once removes E and stabilizes.
      // CCW once includes SE (D) too, making it worse.
      { id: "A", type: "DIRECTIONAL", q: 0, r: 0, orient: 0, limit: 1 },

      // B is also red: it counts NW (C) + W (A) with limit 1.
      // CCW once removes W (A) while still counting NW (C) => stable.
      // CW once *adds* SW (D) => worse.
      { id: "B", type: "DIRECTIONAL", q: 1, r: 0, orient: 1, limit: 1 },

      // Supporting neutrals that create the “wrap” trap
      { id: "C", type: "NEUTRAL", q: 1, r: -1, limit: 6 }, // NE of A, NW of B
      { id: "D", type: "NEUTRAL", q: 0, r: 1, limit: 6 }, // SE of A, SW of B
    ],
    scoring: { idealMoves: 2, twoStarMax: 5 },
    rules: { allowRotate: true, allowUndo: true, defaultShowNumbers: true },
  },

  {
    // Teaches: Sink returns as a stabilizer. Treat it as a “safe neighbor” and solve a denser cluster.
    // Goal: Stabilize multiple directionals around a sink; practice planning across 3 tiles.
    // Failure mode: Treating the sink as a “problem” (it never is) / random spinning instead of targeting which neighbor to ignore.
    // Intended ideal moves: 5 (subject to adjustment once solver exists)
    id: "w1-05",
    name: "Safety Valve",
    board: { cells: FLOWER_CELLS },
    tiles: [
      // Sink is always calm (limit huge); it increases local density without becoming a constraint.
      { id: "S", type: "SINK", q: 0, r: 0, orient: 0, limit: 999 },

      // Three directionals in a dense cluster. Orients chosen to start with multiple OVER tiles.
      // This one tends to need ~2 turns.
      { id: "A", type: "DIRECTIONAL", q: 1, r: 0, orient: 2, limit: 1 },

      // This one tends to need ~2 turns.
      { id: "B", type: "DIRECTIONAL", q: 1, r: -1, orient: 3, limit: 1 },

      // This one starts more constrained; typically needs ~1–2 turns.
      { id: "C", type: "DIRECTIONAL", q: 0, r: -1, orient: 5, limit: 1 },

      // One neutral to complete the “feel” of the cluster without adding unsolvable constraints.
      { id: "N", type: "NEUTRAL", q: 0, r: 1, limit: 6 },
    ],
    scoring: { idealMoves: 5, twoStarMax: 9 },
    rules: { allowRotate: true, allowUndo: true, defaultShowNumbers: true },
  },
];

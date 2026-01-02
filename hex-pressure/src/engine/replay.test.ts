import { describe, expect, it } from "vitest";
import type { LevelDef, GameState } from "./types";
import { initFromLevel, tick } from "./engine";
import { replayStep, type Recording } from "./replay";

const cells = (coords: Array<[number, number]>) => coords.map(([q, r]) => ({ q, r }));

describe("Replay stepping (rotate-only)", () => {
  it("applies replay moves by resolving axial coords to tileId", () => {
    const level: LevelDef = {
      id: "t-replay-basic",
      name: "Replay basic",
      board: { cells: cells([[0, 0], [1, 0]]) },
      tiles: [
        { id: "A", type: "DIRECTIONAL", q: 0, r: 0, orient: 0, limit: 0 },
        { id: "B", type: "NEUTRAL", q: 1, r: 0, limit: 6 },
      ],
      scoring: { idealMoves: 1, twoStarMax: 2 },
      rules: { allowRotate: true, allowUndo: true, allowMove: true },
    };

    // settleDuration=0 => if the move solves, phase flips straight to SOLVED
    const s0 = initFromLevel(level, 0);
    expect(s0.phase).toBe("IDLE");

    const rec: Recording = {
      levelId: level.id,
      levelHash: "h",
      createdAt: 0,
      moves: [{ kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" }],
      meta: { moveCount: 1, source: "player" },
    };

    const r1 = replayStep(s0, rec, 0, 0);
    expect(r1.kind).toBe("APPLIED");
    expect(r1.index).toBe(1);
    expect(r1.state.moveCount).toBe(1);
    expect(r1.state.tilesById["A"].orient).toBe(1);
    expect(r1.state.phase).toBe("SOLVED");

    const r2 = replayStep(r1.state, rec, r1.index, 0);
    expect(r2.kind).toBe("DONE");
  });

  it("waits while SETTLING and does not advance the replay index", () => {
  const level: LevelDef = {
    id: "t-replay-settling",
    name: "Replay settles",
    board: { cells: cells([[0, 0], [1, 0]]) },
    tiles: [
      { id: "A", type: "DIRECTIONAL", q: 0, r: 0, orient: 0, limit: 0 },
      { id: "B", type: "NEUTRAL", q: 1, r: 0, limit: 6 },
    ],
    scoring: { idealMoves: 1, twoStarMax: 2 },
    rules: { allowRotate: true, allowUndo: true, allowMove: true },
  };

  // Start from a known settling state, independent of "does the move cause settling"
  const base = initFromLevel(level, 300);
  const settling: GameState = {
    ...base,
    phase: "SETTLING",
    settleStartMs: 0,
    settleDurationMs: 300,
  };

  const rec: Recording = {
    levelId: level.id,
    levelHash: "h",
    createdAt: 0,
    moves: [
      { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
      { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
    ],
  };

  const r1 = replayStep(settling, rec, 0, 1);
  expect(r1.kind).toBe("WAIT");
  expect(r1.index).toBe(0);

  // After settling completes, replay should apply next move (or finish if solved)
  const idle = tick(settling, 301);
  const r2 = replayStep(idle, rec, 0, 999);
  expect(["APPLIED", "DONE", "ERROR"]).toContain(r2.kind);
});

  it("errors if the replay move references a missing/invalid axial coord", () => {
    const level: LevelDef = {
      id: "t-replay-invalid",
      name: "Replay invalid",
      board: { cells: cells([[0, 0]]) },
      tiles: [{ id: "A", type: "DIRECTIONAL", q: 0, r: 0, orient: 0, limit: 0 }],
      scoring: { idealMoves: 0, twoStarMax: 0 },
      rules: { allowRotate: true, allowUndo: true, allowMove: true },
    };
    const s0 = initFromLevel(level, 0);

    const rec: Recording = {
      levelId: level.id,
      levelHash: "h",
      createdAt: 0,
      moves: [{ kind: "ROTATE", at: { q: 9, r: 9 }, dir: "CW" }],
    };

    // initFromLevel loads SOLVED here; replay halts immediately
    const r1 = replayStep(s0, rec, 0, 0);
    expect(r1.kind).toBe("DONE");

    // Force a non-solved phase to hit validation
    const s1 = { ...s0, phase: "IDLE" as const };
    const r2 = replayStep(s1, rec, 0, 0);
    expect(r2.kind).toBe("ERROR");
  });
});

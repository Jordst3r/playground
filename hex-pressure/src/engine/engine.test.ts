import { describe, expect, it } from "vitest";
import { initFromLevel, applyMove } from "./engine";
import type { LevelDef } from "./types";
import { validateLevel } from "./validate";
import { initFromLevel, applyMove, tick } from "./engine"; // make sure tick is imported

const cells = (coords: Array<[number, number]>) => coords.map(([q, r]) => ({ q, r }));

describe("Hex Pressure engine (rotate-only MVP)", () => {
  it("computeDerived+init: solved if no tiles are OVERSTRESSED", () => {
    const level: LevelDef = {
      id: "t-solved",
      name: "Solved on load",
      board: { cells: cells([[0, 0], [1, 0]]) },
      tiles: [
        { id: "A", type: "NEUTRAL", q: 0, r: 0, limit: 6 },
        { id: "B", type: "NEUTRAL", q: 1, r: 0, limit: 6 },
      ],
      scoring: { idealMoves: 0, twoStarMax: 0 },
      rules: { allowRotate: true, allowUndo: true },
    };

    const state = initFromLevel(level, 0);
    expect(state.phase).toBe("SOLVED");
  });

  it("applyMove: rotating a NON-DIRECTIONAL tile should be a no-op (does not count)", () => {
    const level: LevelDef = {
      id: "t-noop-rotate",
      name: "No-op rotate",
      board: { cells: cells([[0, 0], [1, 0]]) },
      tiles: [
        { id: "A", type: "NEUTRAL", q: 0, r: 0, orient: 0, limit: 6 },
        { id: "B", type: "NEUTRAL", q: 1, r: 0, orient: 0, limit: 6 },
      ],
      scoring: { idealMoves: 0, twoStarMax: 0 },
      rules: { allowRotate: true, allowUndo: true },
    };

    const s0 = initFromLevel(level, 0);
    const s1 = applyMove(s0, { kind: "ROTATE", tileId: "A", dir: "CW" }, 0);

    expect(s1.moveCount).toBe(s0.moveCount); // still 0
    expect(s1.tape.length).toBe(s0.tape.length); // still 0
    expect(s1.tilesById["A"].orient).toBe(s0.tilesById["A"].orient); // unchanged
  });

  it("applyMove: rotating a DIRECTIONAL tile changes orientation and counts as 1 move", () => {
	  const level: LevelDef = {
		id: "t-rotate-dir",
		name: "Directional rotates",
		board: { cells: cells([[0, 0], [1, 0]]) },
		tiles: [
		  // A accepts side 0 at orient 0, so it counts neighbor B at (1,0).
		  // limit 0 => starts 1/0 OVERSTRESSED => not SOLVED => input allowed.
		  { id: "A", type: "DIRECTIONAL", q: 0, r: 0, orient: 0, limit: 0 },
		  { id: "B", type: "NEUTRAL", q: 1, r: 0, limit: 6 },
		],
		scoring: { idealMoves: 0, twoStarMax: 0 },
		rules: { allowRotate: true, allowUndo: true },
	  };

	  const s0 = initFromLevel(level, 0);
	  expect(s0.phase).not.toBe("SOLVED");

	  const s1 = applyMove(s0, { kind: "ROTATE", tileId: "A", dir: "CW" }, 0);

	  expect(s1.moveCount).toBe(1);
	  expect(s1.tape.length).toBe(1);
	  expect(s1.tilesById["A"].orient).toBe(1);
	});

  it("undo: UNDO restores the previous snapshot and does NOT count as a move", () => {
	  const level: LevelDef = {
		id: "t-undo",
		name: "Undo test",
		board: { cells: cells([[0, 0], [1, 0]]) },
		tiles: [
		  { id: "A", type: "DIRECTIONAL", q: 0, r: 0, orient: 0, limit: 0 },
		  { id: "B", type: "NEUTRAL", q: 1, r: 0, limit: 6 },
		],
		scoring: { idealMoves: 0, twoStarMax: 0 },
		rules: { allowRotate: true, allowUndo: true },
	  };

		const s0 = initFromLevel(level, 0);
		const s1 = applyMove(s0, { kind: "ROTATE", tileId: "A", dir: "CW" }, 0);

		// advance time past settle duration
		const s1done = tick(s1, s1.settleStartMs + s1.settleDurationMs + 1);

		const s2 = applyMove(s1done, { kind: "UNDO" }, 0);

		expect(s2.tilesById["A"].orient).toBe(0);
		expect(s2.moveCount).toBe(1);
		expect(s2.tape.map(m => m.kind)).toEqual(["ROTATE", "UNDO"]);
	});

  
  it("DIRECTIONAL tiles accept exactly 3 consecutive sides", () => {
	  const level: LevelDef = {
		id: "t-dir-accept",
		name: "Directional accept",
		board: { cells: cells([[0,0],[1,0],[1,-1],[0,-1]]) },
		tiles: [
		  // center tile with 3 neighbors
		  { id: "A", type: "DIRECTIONAL", q: 0, r: 0, orient: 0, limit: 2 },
		  { id: "B", type: "NEUTRAL", q: 1, r: 0, limit: 6 },
		  { id: "C", type: "NEUTRAL", q: 1, r: -1, limit: 6 },
		  { id: "D", type: "NEUTRAL", q: 0, r: -1, limit: 6 },
		],
		scoring: { idealMoves: 0, twoStarMax: 0 },
		rules: { allowRotate: true, allowUndo: true },
	  };

	  const s0 = initFromLevel(level, 0);
	  const p0 = s0.derivedById["A"].pressure;

	  const s1 = applyMove(s0, { kind: "ROTATE", tileId: "A", dir: "CW" }, 0);
	  const p1 = s1.derivedById["A"].pressure;

	  expect(p0).not.toBe(p1);
	  expect([0,1,2,3]).toContain(p0);
	  expect([0,1,2,3]).toContain(p1);
	});
	
	it("orientation wraps correctly when rotating past 5", () => {
	  const level: LevelDef = {
		id: "t-wrap",
		name: "Wrap",
		board: { cells: cells([[0, 0], [1, 0]]) },
		tiles: [
		  // orient 5 accepts sides 5,0,1 => includes side 0 (E) so it counts neighbor B.
		  // limit 0 => starts unsolved => rotation permitted.
		  { id: "A", type: "DIRECTIONAL", q: 0, r: 0, orient: 5, limit: 0 },
		  { id: "B", type: "NEUTRAL", q: 1, r: 0, limit: 6 },
		],
		scoring: { idealMoves: 0, twoStarMax: 0 },
		rules: { allowRotate: true, allowUndo: true },
	  };

	  const s0 = initFromLevel(level, 0);
	  expect(s0.phase).not.toBe("SOLVED");

	  const s1 = applyMove(s0, { kind: "ROTATE", tileId: "A", dir: "CW" }, 0);

	  expect(s1.tilesById["A"].orient).toBe(0);
	});
	
	it("locks input after solve (ROTATE/UNDO are ignored when phase is SOLVED)", () => {
	  const level: LevelDef = {
		id: "t-lock-solved",
		name: "Lock after solve",
		board: { cells: cells([[0,0]]) },
		tiles: [{ id: "A", type: "DIRECTIONAL", q: 0, r: 0, orient: 0, limit: 0 }],
		scoring: { idealMoves: 0, twoStarMax: 0 },
		rules: { allowRotate: true, allowUndo: true },
	  };

	  // This level loads solved (no neighbors => 0/0), so phase should be SOLVED.
	  const s0 = initFromLevel(level, 0);
	  expect(s0.phase).toBe("SOLVED");

	  const s1 = applyMove(s0, { kind: "ROTATE", tileId: "A", dir: "CW" }, 0);
	  expect(s1.tilesById["A"].orient).toBe(0);
	  expect(s1.moveCount).toBe(0);
	  expect(s1.tape.length).toBe(0);

	  const s2 = applyMove(s0, { kind: "UNDO" }, 0);
	  expect(s2.moveCount).toBe(0);
	  expect(s2.tape.length).toBe(0);
	});
});

describe("Level validator (rotate-only guardrails)", () => {
  it("warns if a level loads already solved", () => {
    const level: LevelDef = {
      id: "t-val-solved",
      name: "Solved on load",
      board: { cells: cells([[0, 0]]) },
      tiles: [{ id: "A", type: "NEUTRAL", q: 0, r: 0, limit: 6 }],
      scoring: { idealMoves: 0, twoStarMax: 0 },
      rules: { allowRotate: true, allowUndo: true },
    };

    const issues = validateLevel(level);
    expect(issues.some(i => i.msg.includes("already solved"))).toBe(true);
  });

  it("errors if a NEUTRAL tile starts OVERSTRESSED (unsolvable in rotate-only)", () => {
    const level: LevelDef = {
      id: "t-val-neutral-red",
      name: "Neutral red",
      board: { cells: cells([[0, 0], [1, 0], [0, 1]]) },
      tiles: [
        // A has 2 neighbors (B and C). limit 1 -> overstressed.
        { id: "A", type: "NEUTRAL", q: 0, r: 0, limit: 1 },
        { id: "B", type: "NEUTRAL", q: 1, r: 0, limit: 6 },
        { id: "C", type: "NEUTRAL", q: 0, r: 1, limit: 6 },
      ],
      scoring: { idealMoves: 0, twoStarMax: 0 },
      rules: { allowRotate: true, allowUndo: true },
    };

    const issues = validateLevel(level);
    expect(issues.some(i => i.severity === "ERROR" && i.msg.includes("NEUTRAL tile"))).toBe(true);
  });
});

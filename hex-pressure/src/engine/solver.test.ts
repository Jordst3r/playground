import { describe, expect, it } from "vitest";
import type { LevelDef } from "./types";
import { solveRotateOnly } from "./solver";

const cells = (coords: Array<[number, number]>) => coords.map(([q, r]) => ({ q, r }));

describe("Rotate-only solver", () => {
  // solver tests go here
    it("solver returns 0 moves when level is already solved", () => {
    const level: LevelDef = {
        id: "t-solve0",
        name: "Solved",
        board: { cells: cells([[0,0]]) },
        tiles: [{ id: "A", type: "NEUTRAL", q: 0, r: 0, limit: 6 }],
        scoring: { idealMoves: 0, twoStarMax: 0 },
        rules: { allowRotate: true, allowUndo: true, allowMove: false },
    };

    const res = solveRotateOnly(level);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.minMoves).toBe(0);
    });

    it("solver finds a 1-move solution for a simple overstressed directional", () => {
    const level: LevelDef = {
        id: "t-solve1",
        name: "One move",
        board: { cells: cells([[0,0],[1,0]]) },
        tiles: [
        { id: "A", type: "DIRECTIONAL", q: 0, r: 0, orient: 0, limit: 0 },
        { id: "B", type: "NEUTRAL", q: 1, r: 0, limit: 6 },
        ],
        scoring: { idealMoves: 0, twoStarMax: 0 },
        rules: { allowRotate: true, allowUndo: true, allowMove: false },
    };

    const res = solveRotateOnly(level);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.minMoves).toBe(1);
    });
});

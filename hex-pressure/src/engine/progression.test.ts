import { describe, expect, it } from "vitest";
import type { LevelDef } from "./types";
import type { LevelReplays } from "./storage";
import { groupLevelsBySection, getSectionStats, isSectionUnlocked } from "./progression";

const cells = (coords: Array<[number, number]>) => coords.map(([q, r]) => ({ q, r }));

describe("Progression System", () => {
  describe("groupLevelsBySection", () => {
    it("should group levels by section and preserve order", () => {
      const levels: LevelDef[] = [
        {
          id: "l1",
          name: "Level 1",
          section: "Intro",
          board: { cells: cells([[0, 0]]) },
          tiles: [{ id: "A", type: "NEUTRAL", q: 0, r: 0, limit: 6 }],
          scoring: { idealMoves: 0, twoStarMax: 0 },
          rules: { allowRotate: true, allowUndo: true, allowMove: false },
        },
        {
          id: "l2",
          name: "Level 2",
          section: "Intro",
          board: { cells: cells([[0, 0]]) },
          tiles: [{ id: "A", type: "NEUTRAL", q: 0, r: 0, limit: 6 }],
          scoring: { idealMoves: 0, twoStarMax: 0 },
          rules: { allowRotate: true, allowUndo: true, allowMove: false },
        },
        {
          id: "l3",
          name: "Level 3",
          section: "Advanced",
          board: { cells: cells([[0, 0]]) },
          tiles: [{ id: "A", type: "NEUTRAL", q: 0, r: 0, limit: 6 }],
          scoring: { idealMoves: 0, twoStarMax: 0 },
          rules: { allowRotate: true, allowUndo: true, allowMove: false },
        },
      ];

      const result = groupLevelsBySection(levels);

      expect(result.sectionOrder).toEqual(["Intro", "Advanced"]);
      expect(result.groups["Intro"]).toHaveLength(2);
      expect(result.groups["Advanced"]).toHaveLength(1);
      expect(result.groups["Intro"][0].level.id).toBe("l1");
      expect(result.groups["Intro"][1].level.id).toBe("l2");
      expect(result.groups["Advanced"][0].level.id).toBe("l3");
    });

    it("should handle levels without section property (grouped as 'Other')", () => {
      const levels: LevelDef[] = [
        {
          id: "l1",
          name: "Level 1",
          board: { cells: cells([[0, 0]]) },
          tiles: [{ id: "A", type: "NEUTRAL", q: 0, r: 0, limit: 6 }],
          scoring: { idealMoves: 0, twoStarMax: 0 },
          rules: { allowRotate: true, allowUndo: true, allowMove: false },
        },
      ];

      const result = groupLevelsBySection(levels);

      expect(result.sectionOrder).toEqual(["Other"]);
      expect(result.groups["Other"]).toHaveLength(1);
    });

    it("should handle empty level array", () => {
      const result = groupLevelsBySection([]);

      expect(result.sectionOrder).toEqual([]);
      expect(Object.keys(result.groups)).toHaveLength(0);
    });

    it("should preserve level indices", () => {
      const levels: LevelDef[] = [
        {
          id: "l1",
          name: "Level 1",
          section: "A",
          board: { cells: cells([[0, 0]]) },
          tiles: [{ id: "A", type: "NEUTRAL", q: 0, r: 0, limit: 6 }],
          scoring: { idealMoves: 0, twoStarMax: 0 },
          rules: { allowRotate: true, allowUndo: true, allowMove: false },
        },
        {
          id: "l2",
          name: "Level 2",
          section: "B",
          board: { cells: cells([[0, 0]]) },
          tiles: [{ id: "A", type: "NEUTRAL", q: 0, r: 0, limit: 6 }],
          scoring: { idealMoves: 0, twoStarMax: 0 },
          rules: { allowRotate: true, allowUndo: true, allowMove: false },
        },
      ];

      const result = groupLevelsBySection(levels);

      expect(result.groups["A"][0].index).toBe(0);
      expect(result.groups["B"][0].index).toBe(1);
    });
  });

  describe("getSectionStats", () => {
    const levels: LevelDef[] = [
      {
        id: "l1",
        name: "Level 1",
        section: "Test",
        board: { cells: cells([[0, 0]]) },
        tiles: [{ id: "A", type: "NEUTRAL", q: 0, r: 0, limit: 6 }],
        scoring: { idealMoves: 1, twoStarMax: 3 },
        rules: { allowRotate: true, allowUndo: true, allowMove: false },
      },
      {
        id: "l2",
        name: "Level 2",
        section: "Test",
        board: { cells: cells([[0, 0]]) },
        tiles: [{ id: "A", type: "NEUTRAL", q: 0, r: 0, limit: 6 }],
        scoring: { idealMoves: 2, twoStarMax: 5 },
        rules: { allowRotate: true, allowUndo: true, allowMove: false },
      },
    ];

    it("should calculate stats for section with no completions", () => {
      const levelsBySection = groupLevelsBySection(levels);
      const replays: Record<string, LevelReplays> = {};

      const stats = getSectionStats("Test", levelsBySection, replays);

      expect(stats.earnedStars).toBe(0);
      expect(stats.maxStars).toBe(6); // 2 levels × 3 stars
      expect(stats.completionPercent).toBe(0);
    });

    it("should calculate stats for fully completed section (all 3-star)", () => {
      const levelsBySection = groupLevelsBySection(levels);
      const replays: Record<string, LevelReplays> = {
        l1: {
          best: {
            levelId: "l1",
            levelHash: "hash1",
            createdAt: Date.now(),
            moves: [{ kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" }], // 1 move = 3 stars (ideal)
            meta: { moveCount: 1 },
          },
        },
        l2: {
          best: {
            levelId: "l2",
            levelHash: "hash2",
            createdAt: Date.now(),
            moves: [
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
            ], // 2 moves = 3 stars (ideal)
            meta: { moveCount: 2 },
          },
        },
      };

      const stats = getSectionStats("Test", levelsBySection, replays);

      expect(stats.earnedStars).toBe(6); // 3 + 3
      expect(stats.maxStars).toBe(6);
      expect(stats.completionPercent).toBe(100);
    });

    it("should calculate stats for partially completed section", () => {
      const levelsBySection = groupLevelsBySection(levels);
      const replays: Record<string, LevelReplays> = {
        l1: {
          best: {
            levelId: "l1",
            levelHash: "hash1",
            createdAt: Date.now(),
            moves: [
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
            ], // 2 moves, ideal 1, twoStarMax 3 = 2 stars
            meta: { moveCount: 2 },
          },
        },
        // l2 not completed
      };

      const stats = getSectionStats("Test", levelsBySection, replays);

      expect(stats.earnedStars).toBe(2);
      expect(stats.maxStars).toBe(6);
      expect(stats.completionPercent).toBe(33); // floor(2/6 * 100)
    });

    it("should handle section with 1-star completions", () => {
      const levelsBySection = groupLevelsBySection(levels);
      const replays: Record<string, LevelReplays> = {
        l1: {
          best: {
            levelId: "l1",
            levelHash: "hash1",
            createdAt: Date.now(),
            moves: [
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
            ], // 4 moves, ideal 1, twoStarMax 3 = 1 star
            meta: { moveCount: 4 },
          },
        },
        l2: {
          best: {
            levelId: "l2",
            levelHash: "hash2",
            createdAt: Date.now(),
            moves: [
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
            ], // 6 moves, ideal 2, twoStarMax 5 = 1 star
            meta: { moveCount: 6 },
          },
        },
      };

      const stats = getSectionStats("Test", levelsBySection, replays);

      expect(stats.earnedStars).toBe(2); // 1 + 1
      expect(stats.maxStars).toBe(6);
      expect(stats.completionPercent).toBe(33);
    });

    it("should handle non-existent section", () => {
      const levelsBySection = groupLevelsBySection(levels);
      const replays: Record<string, LevelReplays> = {};

      const stats = getSectionStats("NonExistent", levelsBySection, replays);

      expect(stats.earnedStars).toBe(0);
      expect(stats.maxStars).toBe(0);
      expect(stats.completionPercent).toBe(0);
    });

    it("should prefer best replay over latest when calculating stars", () => {
      const levelsBySection = groupLevelsBySection(levels);
      const replays: Record<string, LevelReplays> = {
        l1: {
          latest: {
            levelId: "l1",
            levelHash: "hash1",
            createdAt: Date.now(),
            moves: [
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
            ], // 4 moves = 1 star
            meta: { moveCount: 4 },
          },
          best: {
            levelId: "l1",
            levelHash: "hash1",
            createdAt: Date.now(),
            moves: [{ kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" }], // 1 move = 3 stars
            meta: { moveCount: 1 },
          },
        },
      };

      const stats = getSectionStats("Test", levelsBySection, replays);

      expect(stats.earnedStars).toBe(3); // Uses best, not latest
    });
  });

  describe("isSectionUnlocked", () => {
    const levels: LevelDef[] = [
      {
        id: "l1",
        name: "Level 1",
        section: "First",
        board: { cells: cells([[0, 0]]) },
        tiles: [{ id: "A", type: "NEUTRAL", q: 0, r: 0, limit: 6 }],
        scoring: { idealMoves: 1, twoStarMax: 3 },
        rules: { allowRotate: true, allowUndo: true, allowMove: false },
      },
      {
        id: "l2",
        name: "Level 2",
        section: "Second",
        unlockThreshold: 80,
        board: { cells: cells([[0, 0]]) },
        tiles: [{ id: "A", type: "NEUTRAL", q: 0, r: 0, limit: 6 }],
        scoring: { idealMoves: 1, twoStarMax: 3 },
        rules: { allowRotate: true, allowUndo: true, allowMove: false },
      },
      {
        id: "l3",
        name: "Level 3",
        section: "Third",
        unlockThreshold: 100,
        board: { cells: cells([[0, 0]]) },
        tiles: [{ id: "A", type: "NEUTRAL", q: 0, r: 0, limit: 6 }],
        scoring: { idealMoves: 1, twoStarMax: 3 },
        rules: { allowRotate: true, allowUndo: true, allowMove: false },
      },
    ];

    it("should always unlock first section", () => {
      const levelsBySection = groupLevelsBySection(levels);
      const replays: Record<string, LevelReplays> = {};

      const status = isSectionUnlocked("First", levelsBySection, replays);

      expect(status.unlocked).toBe(true);
      expect(status.reason).toBeUndefined();
    });

    it("should lock second section when first section is incomplete", () => {
      const levelsBySection = groupLevelsBySection(levels);
      const replays: Record<string, LevelReplays> = {};

      const status = isSectionUnlocked("Second", levelsBySection, replays);

      expect(status.unlocked).toBe(false);
      expect(status.reason).toBe("Complete 80% of First (3/3 ★) to unlock");
    });

    it("should unlock second section when first section meets 80% threshold", () => {
      const levelsBySection = groupLevelsBySection(levels);
      const replays: Record<string, LevelReplays> = {
        l1: {
          best: {
            levelId: "l1",
            levelHash: "hash1",
            createdAt: Date.now(),
            moves: [
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
            ], // 3 moves = 1 star (but only need 80% = 2.4 stars, rounds up to 3)
            meta: { moveCount: 3 },
          },
        },
      };

      const status = isSectionUnlocked("Second", levelsBySection, replays);

      // 1 star out of 3 = 33% completion, should be locked
      expect(status.unlocked).toBe(false);
    });

    it("should unlock second section when first section exceeds 80% threshold", () => {
      const levelsBySection = groupLevelsBySection([
        ...levels.slice(0, 1),
        ...levels.slice(0, 1).map((l) => ({ ...l, id: "l1b" })),
        ...levels.slice(0, 1).map((l) => ({ ...l, id: "l1c" })),
        ...levels.slice(1),
      ]);
      const replays: Record<string, LevelReplays> = {
        l1: {
          best: {
            levelId: "l1",
            levelHash: "hash1",
            createdAt: Date.now(),
            moves: [{ kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" }], // 3 stars
            meta: { moveCount: 1 },
          },
        },
        l1b: {
          best: {
            levelId: "l1b",
            levelHash: "hash1b",
            createdAt: Date.now(),
            moves: [{ kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" }], // 3 stars
            meta: { moveCount: 1 },
          },
        },
        l1c: {
          best: {
            levelId: "l1c",
            levelHash: "hash1c",
            createdAt: Date.now(),
            moves: [{ kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" }], // 3 stars
            meta: { moveCount: 1 },
          },
        },
      };

      const status = isSectionUnlocked("Second", levelsBySection, replays);

      // 9 stars out of 9 = 100% completion
      expect(status.unlocked).toBe(true);
    });

    it("should respect custom unlock threshold (100%)", () => {
      const levelsBySection = groupLevelsBySection(levels);
      const replays: Record<string, LevelReplays> = {
        l2: {
          best: {
            levelId: "l2",
            levelHash: "hash2",
            createdAt: Date.now(),
            moves: [
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
              { kind: "ROTATE", at: { q: 0, r: 0 }, dir: "CW" },
            ], // 2 moves = 2 stars
            meta: { moveCount: 2 },
          },
        },
      };

      const status = isSectionUnlocked("Third", levelsBySection, replays);

      // 2 stars out of 3 = 66% completion, but threshold is 100%
      expect(status.unlocked).toBe(false);
      expect(status.reason).toBe("Complete 100% of Second (3/3 ★) to unlock");
    });

    it("should apply default 80% threshold when not specified", () => {
      const customLevels: LevelDef[] = [
        {
          id: "l1",
          name: "Level 1",
          section: "First",
          board: { cells: cells([[0, 0]]) },
          tiles: [{ id: "A", type: "NEUTRAL", q: 0, r: 0, limit: 6 }],
          scoring: { idealMoves: 1, twoStarMax: 3 },
          rules: { allowRotate: true, allowUndo: true, allowMove: false },
        },
        {
          id: "l2",
          name: "Level 2",
          section: "Second",
          // No unlockThreshold specified
          board: { cells: cells([[0, 0]]) },
          tiles: [{ id: "A", type: "NEUTRAL", q: 0, r: 0, limit: 6 }],
          scoring: { idealMoves: 1, twoStarMax: 3 },
          rules: { allowRotate: true, allowUndo: true, allowMove: false },
        },
      ];

      const levelsBySection = groupLevelsBySection(customLevels);
      const replays: Record<string, LevelReplays> = {};

      const status = isSectionUnlocked("Second", levelsBySection, replays);

      expect(status.unlocked).toBe(false);
      expect(status.reason).toBe("Complete 80% of First (3/3 ★) to unlock"); // Default 80%
    });

    it("should handle section with no levels (edge case)", () => {
      const levelsBySection = groupLevelsBySection(levels);
      const replays: Record<string, LevelReplays> = {};

      const status = isSectionUnlocked("NonExistent", levelsBySection, replays);

      expect(status.unlocked).toBe(true); // Section not found = unlocked
    });

    it("should calculate stars needed correctly for various thresholds", () => {
      const customLevels: LevelDef[] = [
        ...Array.from({ length: 5 }, (_, i): LevelDef => ({
          id: `l${i + 1}`,
          name: `Level ${i + 1}`,
          section: "First",
          board: { cells: cells([[0, 0]]) },
          tiles: [{ id: "A", type: "NEUTRAL" as const, q: 0, r: 0, limit: 6 }],
          scoring: { idealMoves: 1, twoStarMax: 3 },
          rules: { allowRotate: true, allowUndo: true, allowMove: false },
        })),
        {
          id: "l6",
          name: "Level 6",
          section: "Second",
          unlockThreshold: 80,
          board: { cells: cells([[0, 0]]) },
          tiles: [{ id: "A", type: "NEUTRAL" as const, q: 0, r: 0, limit: 6 }],
          scoring: { idealMoves: 1, twoStarMax: 3 },
          rules: { allowRotate: true, allowUndo: true, allowMove: false },
        },
      ];

      const levelsBySection = groupLevelsBySection(customLevels);
      const replays: Record<string, LevelReplays> = {};

      const status = isSectionUnlocked("Second", levelsBySection, replays);

      // 5 levels × 3 stars = 15 max stars
      // 80% of 15 = 12 stars needed (ceil)
      expect(status.unlocked).toBe(false);
      expect(status.reason).toBe("Complete 80% of First (12/15 ★) to unlock");
    });
  });
});

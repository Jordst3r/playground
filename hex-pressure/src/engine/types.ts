export type TileType = "NEUTRAL" | "DIRECTIONAL" | "SINK" | "ANCHOR";

export type Tile = {
  id: string;
  type: TileType;
  q: number;
  r: number;
  orient: 0 | 1 | 2 | 3 | 4 | 5;
  locked: boolean;
  stableStreak: number;
  limit: number; // SINK can be 999
};

export type TileState = "CALM" | "TENSE" | "OVERSTRESSED";

export type TileDerived = {
  pressure: number;
  state: TileState;
};

export type Move =
  | { kind: "ROTATE"; tileId: string; dir: "CW" | "CCW" }
  | { kind: "UNDO" };

export type LevelDef = {
  id: string;
  name: string;
  section?: string; // Optional section identifier for grouping levels
  board: { cells: Array<{ q: number; r: number }> };
  tiles: Array<{
    id: string;
    type: TileType;
    q: number;
    r: number;
    orient?: number;
    limit: number;
  }>;
  scoring: {
    // For now, hand-fill while prototyping; later compute via solver.
    idealMoves: number;
    twoStarMax: number;
  };
  rules: {
	  allowRotate: boolean;
	  allowUndo: boolean;
    allowMove: boolean
	  defaultShowNumbers?: boolean;
	};
};

export type GamePhase = "IDLE" | "SETTLING" | "SOLVED" | "REPLAYING";

export type GameState = {
  levelId: string;
  tilesById: Record<string, Tile>;
  occupied: Record<string, string>; // "q,r" -> tileId
  derivedById: Record<string, TileDerived>;
  prevDerivedById: Record<string, TileDerived>;

  tape: Move[];
  undoStack: Array<{
    tilesById: Record<string, Tile>;
    occupied: Record<string, string>;
    derivedById: Record<string, TileDerived>;
  }>;

  moveCount: number;
  phase: GamePhase;

  settleStartMs: number;
  settleDurationMs: number;
};

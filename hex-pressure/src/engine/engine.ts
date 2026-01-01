import { DIRS, key } from "./hex";
import type { GameState, LevelDef, Move, Tile, TileDerived, TileState } from "./types";

function clampOrient(o: number): 0|1|2|3|4|5 {
  return (((o % 6) + 6) % 6) as any;
}

function acceptedSides(tile: Tile): boolean[] {
  if (tile.type === "DIRECTIONAL") {
    const a = Array(6).fill(false);
    a[tile.orient] = true;
    a[(tile.orient + 1) % 6] = true;
    a[(tile.orient + 2) % 6] = true;
    return a;
  }
  return Array(6).fill(true);
}

export function computeDerived(
  tilesById: Record<string, Tile>,
  occupied: Record<string, string>
): Record<string, TileDerived> {
  const derived: Record<string, TileDerived> = {};

  for (const tileId of Object.keys(tilesById)) {
    const t = tilesById[tileId];
    const accept = acceptedSides(t);
    let p = 0;

    for (let d = 0; d < 6; d++) {
      if (!accept[d]) continue;
      const nq = t.q + DIRS[d].dq;
      const nr = t.r + DIRS[d].dr;
      const nid = occupied[key(nq, nr)];
      if (nid) p += 1; // base +1 everywhere
    }

    const limit = t.limit;
    let state: TileState;
    if (p > limit) state = "OVERSTRESSED";
    else if (p === limit) state = "TENSE";
    else state = "CALM";

    derived[tileId] = { pressure: p, state };
  }

  return derived;
}

export function isSolved(derivedById: Record<string, TileDerived>): boolean {
  return Object.values(derivedById).every(d => d.state !== "OVERSTRESSED");
}

export function initFromLevel(level: LevelDef, settleDurationMs = 300): GameState {
  const tilesById: Record<string, Tile> = {};
  const occupied: Record<string, string> = {};

  for (const td of level.tiles) {
    const tile: Tile = {
      id: td.id,
      type: td.type,
      q: td.q,
      r: td.r,
      orient: clampOrient(td.orient ?? 0),
      locked: false,
      stableStreak: 0,
      limit: td.limit,
    };
    tilesById[tile.id] = tile;
    occupied[key(tile.q, tile.r)] = tile.id;
  }

  const derived = computeDerived(tilesById, occupied);

  return {
    levelId: level.id,
    tilesById,
    occupied,
    derivedById: derived,
    prevDerivedById: derived,
    tape: [],
    undoStack: [],
    moveCount: 0,
    phase: isSolved(derived) ? "SOLVED" : "IDLE",
    settleStartMs: 0,
    settleDurationMs,
  };
}

function beginSettle(state: GameState, now: number): GameState {
  const solved = isSolved(state.derivedById);
  return {
    ...state,
    phase: solved ? "SOLVED" : "SETTLING",
    settleStartMs: now,
  };
}

export function tick(state: GameState, now: number): GameState {
  if (state.phase !== "SETTLING") return state;
  if (now - state.settleStartMs >= state.settleDurationMs) {
    const solved = isSolved(state.derivedById);
    return { ...state, phase: solved ? "SOLVED" : "IDLE" };
  }
  return state;
}

function snapshot(state: GameState) {
  return {
    tilesById: structuredClone(state.tilesById),
    occupied: structuredClone(state.occupied),
    derivedById: structuredClone(state.derivedById),
  };
}

export function applyMove(state: GameState, move: Move, now: number): GameState {
  // gate input (lock board after solve; Retry reloads level)
	if (state.phase === "REPLAYING") return state;
	if (state.phase === "SETTLING") return state;

	// After solve: allow UNDO only
	if (state.phase === "SOLVED" && move.kind !== "UNDO") return state;

  // record undo as a move that counts
  if (move.kind === "UNDO") {
    if (state.undoStack.length === 0) return state;
    const prev = state.undoStack[state.undoStack.length - 1];
    const newUndoStack = state.undoStack.slice(0, -1);
    const next: GameState = {
	  ...state,
	  tilesById: prev.tilesById,
	  occupied: prev.occupied,
	  prevDerivedById: state.derivedById,
	  derivedById: prev.derivedById,
	  undoStack: newUndoStack,
	  tape: [...state.tape, move], // keep recording for faithful replay
	  moveCount: state.moveCount,  // undo does NOT count
	};

    return beginSettle(next, now);
  }

  // forward move: snapshot for undo
  const undoStack = [...state.undoStack, snapshot(state)];

  if (move.kind === "ROTATE") {
	  const t = state.tilesById[move.tileId];
	  if (!t || t.locked) return state;

	  // v1: only DIRECTIONAL tiles have meaningful orientation
	  if (t.type !== "DIRECTIONAL") return state;

	  // Save a pre-move snapshot for UNDO
	  const undoStack = [
		...state.undoStack,
		{
		  tilesById: state.tilesById,
		  occupied: state.occupied,
		  derivedById: state.derivedById,
		},
	  ];

	  const delta = move.dir === "CW" ? 1 : -1;
	  const nt: Tile = { ...t, orient: clampOrient(t.orient + delta) };

	  const tilesById = { ...state.tilesById, [nt.id]: nt };

	  const prevDerivedById = state.derivedById;
	  const derivedById = computeDerived(tilesById, state.occupied);

	  const next: GameState = {
		...state,
		tilesById,
		prevDerivedById,
		derivedById,
		undoStack,                 // <-- now correct
		tape: [...state.tape, move],
		moveCount: state.moveCount + 1,
	  };

	  return beginSettle(next, now);
	}

  return state;
}

import type { GameState } from "./types";
import { applyMove, canRotateAt, tileIdAt } from "./engine";

export type Axial = { q: number; r: number };
export type ReplayMove = { kind: "ROTATE"; at: Axial; dir: "CW" | "CCW" };

export type Recording = {
  levelId: string;
  levelHash: string;
  createdAt: number;
  moves: ReplayMove[];
  meta?: { moveCount: number; source?: "player" | "solver" };
};

export type ReplayStepResult =
  | { kind: "WAIT"; index: number; state: GameState }
  | { kind: "APPLIED"; index: number; state: GameState }
  | { kind: "DONE"; index: number; state: GameState }
  | { kind: "ERROR"; index: number; state: GameState; message: string };

/**
 * Pure stepping helper for replays.
 * - Never advances while SETTLING.
 * - Stops early if SOLVED.
 * - Validates axial coords resolve to a rotatable tile.
 */
export function replayStep(
  state: GameState,
  recording: Recording,
  index: number,
  now: number
): ReplayStepResult {
  if (state.phase === "SETTLING") return { kind: "WAIT", index, state };
  if (state.phase === "SOLVED") return { kind: "DONE", index, state };
  if (index >= recording.moves.length) return { kind: "DONE", index, state };

  const m = recording.moves[index];
  const { q, r } = m.at;

  if (!canRotateAt(state, q, r)) {
    return { kind: "ERROR", index, state, message: `Invalid replay move at (${q},${r}) dir=${m.dir}` };
  }

  const tileId = tileIdAt(state, q, r);
  if (!tileId) {
    return { kind: "ERROR", index, state, message: `No tile at (${q},${r})` };
  }

  const nextState = applyMove(state, { kind: "ROTATE", tileId, dir: m.dir }, now);
  return { kind: "APPLIED", index: index + 1, state: nextState };
}

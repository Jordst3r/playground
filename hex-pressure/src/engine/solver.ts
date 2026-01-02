import type { LevelDef, Move, Tile } from "./types";
import { computeDerived, isSolved, clampOrient } from "./engine";

type SolveResult =
  | { ok: true; minMoves: number; path: Move[]; visited: number }
  | { ok: false; reason: "UNSOLVABLE" | "TOO_LARGE"; visited: number };

function encode(orients: number[]): string {
  // orients are 0..5
  return orients.join("");
}

export function solveRotateOnly(level: LevelDef, maxVisited = 250_000): SolveResult {
  // collect directionals in deterministic order
  const dirs = level.tiles
    .filter(t => t.type === "DIRECTIONAL")
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));

  // If no directionals, either solved on load or unsolvable by rotation.
  // We'll just check solved and return.
  {
    const tilesById: Record<string, Tile> = {};
    const occupied: Record<string, string> = {};
    for (const t of level.tiles) {
      tilesById[t.id] = {
        id: t.id,
        type: t.type,
        q: t.q,
        r: t.r,
        orient: clampOrient(t.orient ?? 0),
        locked: false,
        stableStreak: 0,
        limit: t.limit,
      };
      occupied[`${t.q},${t.r}`] = t.id;
    }
    const derived = computeDerived(tilesById, occupied);
    if (isSolved(derived)) return { ok: true, minMoves: 0, path: [], visited: 1 };
  }

  const startOrients = dirs.map(t => clampOrient(t.orient ?? 0));
  const startKey = encode(startOrients);

  // BFS queue holds orientation vectors + path
  const q: { orients: number[]; path: Move[] }[] = [{ orients: startOrients, path: [] }];
  const seen = new Set<string>([startKey]);

  // Pre-build static occupied + base tiles (we’ll swap orient values only)
  const baseTilesById: Record<string, Tile> = {};
  const occupied: Record<string, string> = {};
  for (const t of level.tiles) {
    baseTilesById[t.id] = {
      id: t.id,
      type: t.type,
      q: t.q,
      r: t.r,
      orient: clampOrient(t.orient ?? 0),
      locked: false,
      stableStreak: 0,
      limit: t.limit,
    };
    occupied[`${t.q},${t.r}`] = t.id;
  }

  let visited = 0;

  while (q.length > 0) {
    const cur = q.shift()!;
    visited++;
    if (visited > maxVisited) return { ok: false, reason: "TOO_LARGE", visited };

    // Build tilesById for this state by copying base and applying orients for directionals
    const tilesById: Record<string, Tile> = { ...baseTilesById };
    for (let i = 0; i < dirs.length; i++) {
      const id = dirs[i].id;
      tilesById[id] = { ...tilesById[id], orient: cur.orients[i] as 0 | 1 | 2 | 3 | 4 | 5 };
    }

    const derived = computeDerived(tilesById, occupied);
    if (isSolved(derived)) {
      return { ok: true, minMoves: cur.path.length, path: cur.path, visited };
    }

    // Explore neighbors in deterministic order:
    // tile-id order (dirs array) then CW then CCW
    for (let i = 0; i < dirs.length; i++) {
      const tileId = dirs[i].id;

      for (const dir of ["CW", "CCW"] as const) {
        const nextOrients = cur.orients.slice();
        const delta = dir === "CW" ? 1 : -1;
        nextOrients[i] = clampOrient(nextOrients[i] + delta);

        const k = encode(nextOrients);
        if (seen.has(k)) continue;
        seen.add(k);

        q.push({
          orients: nextOrients,
          path: [...cur.path, { kind: "ROTATE", tileId, dir }],
        });
      }
    }
  }

  return { ok: false, reason: "UNSOLVABLE", visited };
}

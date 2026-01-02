import type { LevelDef, Tile } from "./types";
import { computeDerived, isSolved } from "./engine";

type ValidationIssue = { levelId: string; severity: "WARN" | "ERROR"; msg: string };

export function validateLevel(level: LevelDef): ValidationIssue[] {
  const tilesById: Record<string, Tile> = {};
  const occupied: Record<string, string> = {};

  const key = (q: number, r: number) => `${q},${r}`;

  for (const td of level.tiles) {
    tilesById[td.id] = {
      id: td.id,
      type: td.type,
      q: td.q,
      r: td.r,
      orient: ((td.orient ?? 0) % 6 + 6) % 6 as 0 | 1 | 2 | 3 | 4 | 5,
      locked: false,
      stableStreak: 0,
      limit: td.limit,
    };
    occupied[key(td.q, td.r)] = td.id;
  }

  const derived = computeDerived(tilesById, occupied);
  const solved = isSolved(derived);

  const issues: ValidationIssue[] = [];

  if (solved) {
    issues.push({
      levelId: level.id,
      severity: "WARN",
      msg: "Level loads already solved (no OVERSTRESSED tiles).",
    });
  }

  // Rotate-only assumptions for MVP (since we haven't added movement yet)
  const rotateOnly = level.rules.allowRotate && level.rules.allowMove !== true;
  // (We treat current MVP as rotate-only; adjust later when movement is added.)

  if (rotateOnly) {
    // Any NEUTRAL overstressed is unsolvable in rotate-only.
    for (const t of level.tiles) {
      if (t.type === "NEUTRAL") {
        const st = derived[t.id]?.state;
        if (st === "OVERSTRESSED") {
          issues.push({
            levelId: level.id,
            severity: "ERROR",
            msg: `NEUTRAL tile '${t.id}' starts OVERSTRESSED — unsolvable in rotate-only.`,
          });
        }
      }
    }

    // If we have overstressed tiles but none are directional, no actionable fix.
    const overstressed = level.tiles.filter(t => derived[t.id]?.state === "OVERSTRESSED");
    if (overstressed.length > 0) {
      const actionable = overstressed.some(t => t.type === "DIRECTIONAL");
      if (!actionable) {
        issues.push({
          levelId: level.id,
          severity: "ERROR",
          msg: "Overstressed tiles exist but none are DIRECTIONAL — likely unsolvable in rotate-only.",
        });
      }
    }
  }

  return issues;
}

export function logValidation(level: LevelDef) {
  const issues = validateLevel(level);
  if (issues.length === 0) return;

  console.groupCollapsed(`Level validation: ${level.id} (${issues.length} issue${issues.length === 1 ? "" : "s"})`);
  for (const i of issues) {
    const fn = i.severity === "ERROR" ? console.error : console.warn;
    fn(`[${i.severity}] ${i.msg}`);
  }
  console.groupEnd();
}

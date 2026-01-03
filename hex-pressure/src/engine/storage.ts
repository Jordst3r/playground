/**
 * LocalStorage persistence layer for replay recordings.
 * Handles serialization, versioning, and error recovery.
 */

/** Axial coordinate for hex grid */
export type Axial = { q: number; r: number };

/** A single replay move (rotate at axial coords in a direction) */
export type ReplayMove = { kind: "ROTATE"; at: Axial; dir: "CW" | "CCW" };

/**
 * A replay recording for a single level attempt.
 * Contains all moves and metadata needed to replay the solution.
 */
export type Recording = {
  levelId: string;
  levelHash: string;
  createdAt: number;
  moves: ReplayMove[];
  meta?: { moveCount: number; source?: "player" | "solver" };
};

/**
 * Storage container for a single level's replays.
 * Tracks both the latest and best (fewest moves) recordings.
 */
export type LevelReplays = {
  latest?: Recording;
  best?: Recording;
};

/**
 * Complete replay storage structure.
 * Maps level IDs to their replay data.
 */
type ReplayStorage = {
  version: number;
  replays: Record<string, LevelReplays>;
};

const STORAGE_KEY = "hex-pressure:replays";
const STORAGE_VERSION = 1;

/**
 * Loads all replay data from localStorage.
 * Returns an empty map if storage is unavailable, corrupted, or from an incompatible version.
 *
 * @returns Map of level IDs to their replay recordings
 */
export function loadReplays(): Record<string, LevelReplays> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const data = JSON.parse(raw) as ReplayStorage;

    // Version check: discard if incompatible
    if (data.version !== STORAGE_VERSION) {
      console.warn(`[storage] Version mismatch: expected ${STORAGE_VERSION}, got ${data.version}. Clearing storage.`);
      return {};
    }

    return data.replays ?? {};
  } catch (err) {
    console.error("[storage] Failed to load replays:", err);
    return {};
  }
}

/**
 * Saves all replay data to localStorage.
 * Silently fails if storage is unavailable (e.g., quota exceeded, private mode).
 *
 * @param replays - Map of level IDs to their replay recordings
 */
export function saveReplays(replays: Record<string, LevelReplays>): void {
  try {
    const data: ReplayStorage = {
      version: STORAGE_VERSION,
      replays,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("[storage] Failed to save replays:", err);
  }
}

/**
 * Clears all replay data from localStorage.
 * Used for debugging or user-initiated reset.
 */
export function clearReplays(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("[storage] Failed to clear replays:", err);
  }
}

/**
 * Clears replay data for a specific level.
 * Returns the updated replays object with the specified level removed.
 *
 * @param replays - Current replay data
 * @param levelId - ID of the level to clear
 * @returns Updated replays object without the specified level
 */
export function clearReplaysByLevel(
  replays: Record<string, LevelReplays>,
  levelId: string
): Record<string, LevelReplays> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [levelId]: _, ...rest } = replays;
  console.log(`[storage] Cleared replays for level: ${levelId}`);
  return rest;
}

/**
 * Clears replay data for all levels in a specific section.
 * Returns the updated replays object with all section levels removed.
 *
 * @param replays - Current replay data
 * @param sectionId - ID of the section to clear
 * @param levels - Array of all level definitions to determine which belong to the section
 * @returns Updated replays object without any levels from the specified section
 */
export function clearReplaysBySection(
  replays: Record<string, LevelReplays>,
  sectionId: string,
  levels: Array<{ id: string; section?: string }>
): Record<string, LevelReplays> {
  const levelIdsInSection = levels
    .filter(lvl => lvl.section === sectionId)
    .map(lvl => lvl.id);

  const updated = { ...replays };
  for (const levelId of levelIdsInSection) {
    delete updated[levelId];
  }

  console.log(`[storage] Cleared replays for section "${sectionId}": ${levelIdsInSection.length} levels`);
  return updated;
}

/**
 * Clears all replay data.
 * Returns an empty replays object.
 *
 * @returns Empty replays object
 */
export function clearAllReplays(): Record<string, LevelReplays> {
  console.log("[storage] Cleared all replays");
  return {};
}

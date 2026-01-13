/**
 * Progression and unlocking logic for level sections.
 * Handles section statistics, unlock thresholds, and completion tracking.
 */

import type { LevelDef } from "./types";
import type { LevelReplays } from "./storage";
import { starsForMoves } from "./scoring";

/**
 * Statistics for a level section.
 */
export type SectionStats = {
  earnedStars: number;
  maxStars: number;
  completionPercent: number;
};

/**
 * Unlock status for a section.
 */
export type UnlockStatus = {
  unlocked: boolean;
  reason?: string;
};

/**
 * Groups levels by section and tracks section order.
 */
export type LevelsBySection = {
  groups: Record<string, Array<{ level: LevelDef; index: number }>>;
  sectionOrder: string[];
};

/**
 * Groups levels by their section property.
 * Levels without a section are grouped under "Other".
 *
 * @param levels - Array of level definitions
 * @returns Grouped levels with section order preserved
 */
export function groupLevelsBySection(levels: LevelDef[]): LevelsBySection {
  const groups: Record<string, Array<{ level: LevelDef; index: number }>> = {};
  const sectionOrder: string[] = [];

  levels.forEach((lvl, idx) => {
    const sectionName = lvl.section ?? "Other";
    if (!groups[sectionName]) {
      groups[sectionName] = [];
      sectionOrder.push(sectionName);
    }
    groups[sectionName].push({ level: lvl, index: idx });
  });

  return { groups, sectionOrder };
}

/**
 * Calculates statistics for a level section.
 *
 * @param sectionName - Name of the section to calculate stats for
 * @param levelsBySection - Grouped levels by section
 * @param replaysByLevel - Replay data for all levels
 * @returns Section statistics including earned stars, max stars, and completion percentage
 */
export function getSectionStats(
  sectionName: string,
  levelsBySection: LevelsBySection,
  replaysByLevel: Record<string, LevelReplays>
): SectionStats {
  const levels = levelsBySection.groups[sectionName] || [];

  const earnedStars = levels.reduce((acc, { level: l }) => {
    const slots = replaysByLevel[l.id];
    const rec = slots?.best ?? slots?.latest;
    if (!rec) return acc; // Level not completed

    const stars = starsForMoves(rec.moves.length, l.scoring.idealMoves, l.scoring.twoStarMax);
    return acc + stars;
  }, 0);

  const maxStars = levels.length * 3;
  const completionPercent = maxStars > 0 ? Math.floor((earnedStars / maxStars) * 100) : 0;

  return { earnedStars, maxStars, completionPercent };
}

/**
 * Determines if a section is unlocked based on previous section completion.
 * The first section is always unlocked.
 *
 * @param sectionName - Name of the section to check
 * @param levelsBySection - Grouped levels by section
 * @param replaysByLevel - Replay data for all levels
 * @returns Unlock status with optional reason message
 */
export function isSectionUnlocked(
  sectionName: string,
  levelsBySection: LevelsBySection,
  replaysByLevel: Record<string, LevelReplays>
): UnlockStatus {
  const sectionIndex = levelsBySection.sectionOrder.indexOf(sectionName);

  // First section is always unlocked
  if (sectionIndex === 0) {
    return { unlocked: true };
  }

  // Section not found - consider unlocked (edge case)
  if (sectionIndex === -1) {
    return { unlocked: true };
  }

  // Get the first level of this section to check unlock threshold
  const firstLevelInSection = levelsBySection.groups[sectionName]?.[0]?.level;
  if (!firstLevelInSection) {
    return { unlocked: true }; // No levels, consider unlocked
  }

  const threshold = firstLevelInSection.unlockThreshold ?? 80; // Default to 80%

  // Check previous section completion
  const previousSectionName = levelsBySection.sectionOrder[sectionIndex - 1];
  const prevStats = getSectionStats(previousSectionName, levelsBySection, replaysByLevel);

  if (prevStats.completionPercent >= threshold) {
    return { unlocked: true };
  }

  const starsNeeded = Math.ceil((threshold / 100) * prevStats.maxStars);
  return {
    unlocked: false,
    reason: `Complete ${threshold}% of ${previousSectionName} (${starsNeeded}/${prevStats.maxStars} ★) to unlock`,
  };
}

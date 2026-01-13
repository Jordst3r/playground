/**
 * Scoring logic for level completion.
 */

/**
 * Calculates the star rating (1-3) for a level completion based on move count.
 *
 * @param moves - Number of moves taken to complete the level
 * @param ideal - Ideal move count (3-star threshold)
 * @param twoStarMax - Maximum moves for 2-star rating
 * @returns Star rating: 3 stars (ideal or better), 2 stars (under twoStarMax), or 1 star
 */
export function starsForMoves(moves: number, ideal: number, twoStarMax: number): number {
  if (moves <= ideal) return 3;
  if (moves <= twoStarMax) return 2;
  return 1;
}

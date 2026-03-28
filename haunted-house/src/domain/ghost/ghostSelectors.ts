/** Ghost selectors. */

import type { GhostProfile, Player } from '../../core/types.js';

/** Score a player for possession affinity based on trait overlap. */
export function possessionAffinity(ghost: GhostProfile, player: Player): number {
  return player.traits.filter(t => ghost.traits.includes(t)).length;
}

/** Select the best possession target. */
export function selectPossessionTarget(
  ghost: GhostProfile,
  players: Player[],
  rng: () => number,
): Player {
  const scored = players.map(p => ({ player: p, score: possessionAffinity(ghost, p) }));
  scored.sort((a, b) => b.score - a.score);
  const maxScore = scored[0]?.score ?? 0;
  const topCandidates = scored.filter(s => s.score === maxScore);
  const idx = Math.floor(rng() * topCandidates.length);
  return topCandidates[idx]!.player;
}

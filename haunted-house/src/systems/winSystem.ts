/** Win condition system. */

import type { GameState, WinCondition } from '../core/types.js';
import { alivePlayers } from '../domain/player/playerSelectors.js';

export function checkWinConditions(state: GameState): WinCondition | null {
  const alive = alivePlayers(state);
  const possessed = alive.find(p => p.id === state.possessedPlayerId);

  // Possessed eliminated by vote
  if (!possessed || !possessed.alive || possessed.eliminatedByVote) {
    return 'possessed-eliminated';
  }

  // Innocents escaped
  if (state.escapeTasksCompleted >= state.escapeTasksRequired) {
    return 'innocents-escape';
  }

  // Timer expired — possessed wins
  if (state.round >= state.maxRounds) {
    return 'timer-expired';
  }

  // Too few innocents to escape
  const innocentsAlive = alive.filter(p => p.role === 'innocent').length;
  if (innocentsAlive <= 1) {
    return 'survivors-insufficient';
  }

  return null;
}

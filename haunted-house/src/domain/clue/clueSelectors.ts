/** Clue selectors. */

import type { Clue, GameState } from '../../core/types.js';

export function cluesForPlayer(state: GameState, playerId: string): Clue[] {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return [];
  return state.clues.filter(c => player.knownClues.includes(c.id));
}

export function cluesByType(state: GameState, type: string): Clue[] {
  return state.clues.filter(c => c.type === type);
}

export function getClueById(state: GameState, id: string): Clue | undefined {
  return state.clues.find(c => c.id === id);
}

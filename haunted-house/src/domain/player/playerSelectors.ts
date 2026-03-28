/** Player selectors. */

import type { Player, GameState } from '../../core/types.js';

export function alivePlayers(state: GameState): Player[] {
  return state.players.filter(p => p.alive && !p.eliminatedByVote);
}

export function deadPlayers(state: GameState): Player[] {
  return state.players.filter(p => !p.alive || p.eliminatedByVote);
}

export function possessedPlayer(state: GameState): Player | undefined {
  return state.players.find(p => p.id === state.possessedPlayerId);
}

export function playersInRoom(state: GameState, roomId: string): Player[] {
  return alivePlayers(state).filter(p => p.roomId === roomId);
}

export function isPlayerIsolated(state: GameState, playerId: string): boolean {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return false;
  const others = playersInRoom(state, player.roomId).filter(p => p.id !== playerId);
  return others.length === 1; // only the possessed is with them
}

export function getPlayerById(state: GameState, id: string): Player | undefined {
  return state.players.find(p => p.id === id);
}

/** Kill system. */

import type { GameState } from '../core/types.js';
import type { KillAction } from '../actions/actionTypes.js';
import { playersInRoom } from '../domain/player/playerSelectors.js';

export interface KillResult {
  killedPlayerIds: string[];
  events: string[];
  privateEvents: Record<string, string[]>;
}

/** Check isolation: kill succeeds if only possessed + target in room. */
export function canKill(state: GameState, killerId: string, targetId: string): boolean {
  const killer = state.players.find(p => p.id === killerId);
  const target = state.players.find(p => p.id === targetId);
  if (!killer || !target) return false;
  if (killer.roomId !== target.roomId) return false;
  if (!target.alive) return false;

  const inRoom = playersInRoom(state, killer.roomId);
  // Isolated = only the killer and target in the room
  return inRoom.length <= 2;
}

export function resolveKills(state: GameState, actions: KillAction[]): KillResult {
  const killedPlayerIds: string[] = [];
  const events: string[] = [];
  const privateEvents: Record<string, string[]> = {};

  for (const action of actions) {
    if (!canKill(state, action.playerId, action.targetPlayerId)) {
      const killer = state.players.find(p => p.id === action.playerId);
      if (killer) {
        (privateEvents[killer.id] ??= []).push('Kill failed — too many witnesses.');
      }
      continue;
    }

    const target = state.players.find(p => p.id === action.targetPlayerId);
    if (!target) continue;

    target.alive = false;
    killedPlayerIds.push(target.id);

    // Place body in room
    const room = state.rooms.find(r => r.id === target.roomId);
    if (room) {
      room.bodyIds.push(target.id);
    }

    events.push(`A terrible scream echoes through the house...`);
    (privateEvents[action.playerId] ??= []).push(`You killed ${target.name}.`);
  }

  return { killedPlayerIds, events, privateEvents };
}

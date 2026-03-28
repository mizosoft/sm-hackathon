/** Movement system — delayed movement model.
 *  Movement is declared this round, applied at the start of the next round.
 */

import type { GameState } from '../core/types.js';
import type { MoveAction } from '../actions/actionTypes.js';

export interface MovementResult {
  movedPlayers: { playerId: string; from: string; to: string }[];
  events: string[];
}

/** Schedule movement: store as pendingMove, don't actually move yet. */
export function scheduleMovement(state: GameState, actions: MoveAction[]): string[] {
  const events: string[] = [];

  for (const action of actions) {
    const player = state.players.find(p => p.id === action.playerId);
    if (!player || !player.alive) continue;

    const targetRoom = state.rooms.find(r => r.id === action.targetRoomId);
    if (!targetRoom) continue;

    const currentRoom = state.rooms.find(r => r.id === player.roomId);
    if (!currentRoom?.connectedRoomIds.includes(action.targetRoomId)) continue;

    player.pendingMove = action.targetRoomId;
    events.push(`${player.name} prepares to move to ${targetRoom.name}.`);
  }

  return events;
}

/** Apply pending moves from the previous round. */
export function applyPendingMoves(state: GameState): MovementResult {
  const moved: MovementResult['movedPlayers'] = [];
  const events: string[] = [];

  for (const player of state.players) {
    if (!player.alive || !player.pendingMove) continue;

    const targetRoom = state.rooms.find(r => r.id === player.pendingMove);
    if (!targetRoom) {
      player.pendingMove = undefined;
      continue;
    }

    const from = player.roomId;
    player.roomId = player.pendingMove;
    player.pendingMove = undefined;
    moved.push({ playerId: player.id, from, to: player.roomId });
    events.push(`${player.name} moved to ${targetRoom.name}.`);
  }

  return { movedPlayers: moved, events };
}

/** Legacy immediate movement (used only in Round 0 for initial dispersion). */
export function resolveMovement(state: GameState, actions: MoveAction[]): MovementResult {
  const moved: MovementResult['movedPlayers'] = [];
  const events: string[] = [];

  for (const action of actions) {
    const player = state.players.find(p => p.id === action.playerId);
    if (!player || !player.alive) continue;

    const targetRoom = state.rooms.find(r => r.id === action.targetRoomId);
    if (!targetRoom) continue;

    const currentRoom = state.rooms.find(r => r.id === player.roomId);
    if (!currentRoom?.connectedRoomIds.includes(action.targetRoomId)) continue;

    const from = player.roomId;
    player.roomId = action.targetRoomId;
    moved.push({ playerId: player.id, from, to: action.targetRoomId });
    events.push(`${player.name} moved to ${targetRoom.name}.`);
  }

  return { movedPlayers: moved, events };
}

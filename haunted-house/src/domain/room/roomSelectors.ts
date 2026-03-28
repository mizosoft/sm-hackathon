/** Room selectors. */

import type { Room, GameState } from '../../core/types.js';

export function getRoomById(state: GameState, id: string): Room | undefined {
  return state.rooms.find(r => r.id === id);
}

export function roomsWithBodies(state: GameState): Room[] {
  return state.rooms.filter(r => r.bodyIds.length > 0);
}

export function connectedRooms(state: GameState, roomId: string): Room[] {
  const room = getRoomById(state, roomId);
  if (!room) return [];
  return room.connectedRoomIds
    .map(id => getRoomById(state, id))
    .filter((r): r is Room => r !== undefined);
}

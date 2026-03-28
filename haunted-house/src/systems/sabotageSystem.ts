/** Sabotage system. */

import type { GameState } from '../core/types.js';
import type { SabotageAction } from '../actions/actionTypes.js';

export interface SabotageResult {
  sabotagedRoomIds: string[];
  events: string[];
}

export function resolveSabotage(state: GameState, actions: SabotageAction[]): SabotageResult {
  const sabotagedRoomIds: string[] = [];
  const events: string[] = [];

  for (const action of actions) {
    const room = state.rooms.find(r => r.id === action.targetRoomId);
    if (!room) continue;

    room.sabotaged = true;
    sabotagedRoomIds.push(room.id);
    events.push(`The ${room.name} has been sabotaged!`);
  }

  return { sabotagedRoomIds, events };
}

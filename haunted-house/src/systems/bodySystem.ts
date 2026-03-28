/** Body detection system. */

import type { GameState, MeetingTrigger } from '../core/types.js';
import { playersInRoom } from '../domain/player/playerSelectors.js';

export interface BodyDiscoveryResult {
  discoveredBodyIds: string[];
  triggerMeeting: boolean;
  meetingTrigger?: MeetingTrigger;
  discoveredBy?: string;
  events: string[];
}

export function detectBodies(state: GameState): BodyDiscoveryResult {
  const discoveredBodyIds: string[] = [];
  const events: string[] = [];
  let triggerMeeting = false;
  let discoveredBy: string | undefined;

  for (const room of state.rooms) {
    if (room.bodyIds.length === 0) continue;

    const alive = playersInRoom(state, room.id);
    // If any alive player is in a room with a body, they discover it
    const innocentWitness = alive.find(p => p.id !== state.possessedPlayerId);
    if (innocentWitness) {
      discoveredBodyIds.push(...room.bodyIds);
      triggerMeeting = true;
      discoveredBy = innocentWitness.id;
      for (const bodyId of room.bodyIds) {
        const victim = state.players.find(p => p.id === bodyId);
        events.push(`${innocentWitness.name} discovered ${victim?.name ?? 'a body'} in ${room.name}!`);
      }
      // Clear bodies from room after discovery
      room.bodyIds = [];
    }
  }

  return {
    discoveredBodyIds,
    triggerMeeting,
    meetingTrigger: triggerMeeting ? 'body-discovery' : undefined,
    discoveredBy,
    events,
  };
}

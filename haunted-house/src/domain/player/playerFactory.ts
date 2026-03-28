/** Player factory. */

import type { Player, Role } from '../../core/types.js';
import { playerId } from '../../infra/ids.js';
import { STARTING_ROOM_ID } from '../../core/constants.js';

export function createPlayer(name: string, role: Role, traits: string[]): Player {
  return {
    id: playerId(),
    name,
    role,
    alive: true,
    roomId: STARTING_ROOM_ID,
    traits,
    completedTasks: [],
    knownClues: [],
    lastEmergencyMeetingRound: -1,
    eliminatedByVote: false,
  };
}

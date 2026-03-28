/** Room factory. */

import type { Room } from '../../core/types.js';
import type { RoomDefinition } from '../../content/rooms.js';

export function createRoom(def: RoomDefinition): Room {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    connectedRoomIds: [...def.connectedRoomIds],
    taskIds: [],
    bodyIds: [],
    sabotaged: false,
  };
}

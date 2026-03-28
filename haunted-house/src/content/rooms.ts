/** Static room definitions for the mansion. */

export interface RoomDefinition {
  id: string;
  name: string;
  description: string;
  connectedRoomIds: string[];
}

export const ROOM_DEFINITIONS: RoomDefinition[] = [
  {
    id: 'foyer',
    name: 'Foyer',
    description: 'The grand entrance hall. Dusty chandeliers hang overhead.',
    connectedRoomIds: ['library', 'kitchen', 'hallway'],
  },
  {
    id: 'library',
    name: 'Library',
    description: 'Towering shelves of ancient books. A cold draft slips between the pages.',
    connectedRoomIds: ['foyer', 'study', 'hallway'],
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    description: 'Rusted pots and pans. Something bubbles on the stove, though no one lit the fire.',
    connectedRoomIds: ['foyer', 'cellar', 'dining-room'],
  },
  {
    id: 'cellar',
    name: 'Cellar',
    description: 'Dark and damp. Old wine barrels line the walls. Scratching sounds echo.',
    connectedRoomIds: ['kitchen'],
  },
  {
    id: 'hallway',
    name: 'Hallway',
    description: 'A long corridor with flickering sconces and portraits whose eyes seem to follow you.',
    connectedRoomIds: ['foyer', 'library', 'master-bedroom', 'attic'],
  },
  {
    id: 'master-bedroom',
    name: 'Master Bedroom',
    description: 'A four-poster bed with moth-eaten curtains. The mirror reflects things that aren\'t there.',
    connectedRoomIds: ['hallway', 'attic'],
  },
  {
    id: 'attic',
    name: 'Attic',
    description: 'Cramped and full of forgotten belongings. Whispers drift from the rafters.',
    connectedRoomIds: ['hallway', 'master-bedroom'],
  },
  {
    id: 'study',
    name: 'Study',
    description: 'A cluttered desk, scattered papers, and a typewriter that occasionally types by itself.',
    connectedRoomIds: ['library'],
  },
  {
    id: 'dining-room',
    name: 'Dining Room',
    description: 'A long table set for a feast that never happened. Candles flicker without wind.',
    connectedRoomIds: ['kitchen'],
  },
];

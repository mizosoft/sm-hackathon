/** Optional passive supernatural events. */

export interface GameEvent {
  id: string;
  text: string;
  roomId?: string;
}

export const FLAVOR_EVENTS: GameEvent[] = [
  { id: 'flicker', text: 'The lights flicker violently for a moment, then return to normal.' },
  { id: 'whisper', text: 'A faint whisper echoes through the halls: "Get out..."' },
  { id: 'coldspot', text: 'The temperature drops suddenly. Your breath turns to mist.' },
  { id: 'door-slam', text: 'A door slams shut somewhere in the house.' },
  { id: 'piano', text: 'A single piano note rings out from an empty room.' },
  { id: 'portrait', text: 'You could swear the portrait on the wall just blinked.' },
];

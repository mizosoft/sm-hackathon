/** Clue generator contract. */

import type { GhostProfile } from '../../core/types.js';

export interface ClueInput {
  ghostProfile: GhostProfile;
  roomName: string;
  taskName: string;
  round: number;
  /** Traits of the possessed player (for deduction-oriented clues). */
  possessedTraits: string[];
  /** Traits of the player receiving the clue. */
  playerTraits: string[];
  /** Names of all players in the same room this round. */
  playersInRoom: string[];
}

export interface ClueOutput {
  text: string;
  pointsToPossessed: boolean;
  type: 'behavioral' | 'environmental' | 'ghostly' | 'task-reward';
}

export interface ClueGenerator {
  generate(input: ClueInput): Promise<ClueOutput>;
}

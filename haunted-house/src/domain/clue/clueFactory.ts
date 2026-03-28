/** Clue factory. */

import type { Clue, ClueType } from '../../core/types.js';
import { clueId } from '../../infra/ids.js';

export function createClue(
  text: string,
  type: ClueType,
  round: number,
  pointsToPossessed: boolean,
  roomId?: string,
): Clue {
  return {
    id: clueId(),
    type,
    text,
    roomId,
    round,
    pointsToPossessed,
  };
}

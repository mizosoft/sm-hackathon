/** Validate an action's legality. */

import type { GameState } from '../core/types.js';
import type { GameAction } from './actionTypes.js';
import { buildActionMenu } from './buildActionMenu.js';
import { getPlayerById } from '../domain/player/playerSelectors.js';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateAction(state: GameState, action: GameAction): ValidationResult {
  const player = getPlayerById(state, action.playerId);
  if (!player) return { valid: false, reason: 'Player not found.' };
  if (!player.alive || player.eliminatedByVote) return { valid: false, reason: 'Player is dead.' };

  const menu = buildActionMenu(state, player);

  switch (action.kind) {
    case 'MOVE':
      if (!menu.some(m => m.kind === 'MOVE' && m.targetId === action.targetRoomId))
        return { valid: false, reason: 'Cannot move to that room.' };
      break;
    case 'DO_TASK':
      if (!menu.some(m => m.kind === 'DO_TASK' && m.targetId === action.taskId))
        return { valid: false, reason: 'Task not available.' };
      break;
    case 'FOLLOW':
      if (!menu.some(m => m.kind === 'FOLLOW' && m.targetId === action.targetPlayerId))
        return { valid: false, reason: 'Cannot follow that player.' };
      break;
    case 'KILL':
      if (player.role !== 'possessed') return { valid: false, reason: 'Only possessed can kill.' };
      if (!menu.some(m => m.kind === 'KILL' && m.targetId === action.targetPlayerId))
        return { valid: false, reason: 'Cannot kill that player.' };
      break;
    case 'SABOTAGE':
      if (player.role !== 'possessed') return { valid: false, reason: 'Only possessed can sabotage.' };
      break;
    case 'PRETEND_TASK':
      if (player.role !== 'possessed') return { valid: false, reason: 'Only possessed can pretend.' };
      break;
    case 'EMERGENCY_MEETING':
      if (!menu.some(m => m.kind === 'EMERGENCY_MEETING'))
        return { valid: false, reason: 'Cannot call a meeting now.' };
      break;
  }

  return { valid: true };
}

/** Follow system — delayed model.
 *  FOLLOW sets followingPlayerId. On next round's movement resolution,
 *  the follower ends up in the target's resolved room.
 */

import type { GameState } from '../core/types.js';
import type { FollowAction } from '../actions/actionTypes.js';

export interface FollowResult {
  events: string[];
}

/** Schedule follow: store target, don't move yet. */
export function scheduleFollows(state: GameState, actions: FollowAction[]): string[] {
  const events: string[] = [];

  for (const action of actions) {
    const follower = state.players.find(p => p.id === action.playerId);
    const target = state.players.find(p => p.id === action.targetPlayerId);
    if (!follower || !target || !follower.alive || !target.alive) continue;

    follower.followingPlayerId = action.targetPlayerId;
    // Clear any pending move — follow overrides
    follower.pendingMove = undefined;
    events.push(`${follower.name} is tracking ${target.name}.`);
  }

  return events;
}

/** Apply pending follows after movement is resolved. */
export function applyPendingFollows(state: GameState): FollowResult {
  const events: string[] = [];

  for (const follower of state.players) {
    if (!follower.alive || !follower.followingPlayerId) continue;

    const target = state.players.find(p => p.id === follower.followingPlayerId);
    follower.followingPlayerId = undefined;

    if (!target || !target.alive) {
      events.push(`${follower.name} lost track of their target.`);
      continue;
    }

    if (follower.roomId !== target.roomId) {
      const room = state.rooms.find(r => r.id === target.roomId);
      follower.roomId = target.roomId;
      events.push(`${follower.name} followed ${target.name} to ${room?.name ?? 'unknown'}.`);
    } else {
      events.push(`${follower.name} stayed with ${target.name}.`);
    }
  }

  return { events };
}

/** Legacy immediate follow (kept for backward compatibility). */
export function resolveFollows(state: GameState, actions: FollowAction[]): FollowResult {
  const events: string[] = [];

  for (const action of actions) {
    const follower = state.players.find(p => p.id === action.playerId);
    const target = state.players.find(p => p.id === action.targetPlayerId);
    if (!follower || !target || !follower.alive || !target.alive) continue;

    if (follower.roomId !== target.roomId) {
      follower.roomId = target.roomId;
      const room = state.rooms.find(r => r.id === target.roomId);
      events.push(`${follower.name} followed ${target.name} to ${room?.name ?? 'unknown'}.`);
    } else {
      events.push(`${follower.name} stayed with ${target.name}.`);
    }
  }

  return { events };
}

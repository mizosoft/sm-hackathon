/** Meeting and voting system. */

import type { GameState, MeetingRecord, MeetingTrigger } from '../core/types.js';
import { alivePlayers } from '../domain/player/playerSelectors.js';
import { MEETING_COOLDOWN_ROUNDS } from '../core/constants.js';

export interface MeetingResult {
  record: MeetingRecord;
  events: string[];
}

/** Run a meeting with the given votes. */
export function resolveMeeting(
  state: GameState,
  trigger: MeetingTrigger,
  calledBy: string,
  votes: Record<string, string | null>,
): MeetingResult {
  const events: string[] = [];
  const alive = alivePlayers(state);

  // Tally votes
  const tally: Record<string, number> = {};
  let skipCount = 0;

  for (const [_voterId, targetId] of Object.entries(votes)) {
    if (targetId === null) {
      skipCount++;
    } else {
      tally[targetId] = (tally[targetId] ?? 0) + 1;
    }
  }

  // Find maximum vote
  let maxVotes = skipCount;
  let eliminatedId: string | null = null;
  let tied = false;

  for (const [targetId, count] of Object.entries(tally)) {
    if (count > maxVotes) {
      maxVotes = count;
      eliminatedId = targetId;
      tied = false;
    } else if (count === maxVotes && eliminatedId !== null) {
      tied = true;
      eliminatedId = null;
    }
  }

  // If skip has most votes, no elimination
  if (eliminatedId === null && !tied) {
    events.push('The group voted to skip. No one was eliminated.');
  } else if (tied) {
    events.push('The vote was tied. No one was eliminated.');
    eliminatedId = null;
  } else if (eliminatedId) {
    const eliminated = state.players.find(p => p.id === eliminatedId);
    if (eliminated) {
      eliminated.alive = false;
      eliminated.eliminatedByVote = true;
      events.push(`${eliminated.name} was voted out!`);
      if (eliminated.role === 'possessed') {
        events.push(`${eliminated.name} was the possessed one!`);
      } else {
        events.push(`${eliminated.name} was innocent...`);
      }
    }
  }

  // Update meeting cooldown
  state.meetingCooldownUntilRound = state.round + MEETING_COOLDOWN_ROUNDS;

  const record: MeetingRecord = {
    round: state.round,
    trigger,
    calledBy,
    votes,
    eliminatedPlayerId: eliminatedId,
    tied,
  };

  state.meetingHistory.push(record);

  // Move all alive players back to foyer after meeting
  // and clear any pending movement/follow state
  for (const p of alive) {
    if (p.alive && !p.eliminatedByVote) {
      p.roomId = 'foyer';
      p.pendingMove = undefined;
      p.followingPlayerId = undefined;
    }
  }

  return { record, events };
}

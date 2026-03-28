/** Main game engine orchestration. */

import type { GameState } from './types.js';
import type { GameContext } from './gameContext.js';
import type { GameAction } from '../actions/actionTypes.js';
import { resolveRound } from './phaseResolver.js';
import { resolveMeeting } from '../systems/meetingSystem.js';
import { checkWinConditions } from '../systems/winSystem.js';
import type { MeetingTrigger } from './types.js';

export interface EngineResult {
  state: GameState;
  meetingTriggered: boolean;
  meetingTrigger?: MeetingTrigger;
  meetingCalledBy?: string;
}

/** Process one round of actions. */
export async function processRound(
  state: GameState,
  actions: GameAction[],
  ctx: GameContext,
): Promise<EngineResult> {
  ctx.logger.info(`Processing round ${state.round}...`);

  const result = await resolveRound(state, actions, ctx);

  return {
    state,
    meetingTriggered: result.meetingTriggered,
    meetingTrigger: result.meetingTrigger,
    meetingCalledBy: result.meetingCalledBy,
  };
}

/** Process a meeting (called separately after votes are collected by CLI). */
export function processMeeting(
  state: GameState,
  trigger: MeetingTrigger,
  calledBy: string,
  votes: Record<string, string | null>,
): { events: string[] } {
  const result = resolveMeeting(state, trigger, calledBy, votes);

  // Re-check win after meeting
  const winner = checkWinConditions(state);
  if (winner) {
    state.winner = winner;
    state.phase = 'ended';
  }

  return { events: result.events };
}

/** Advance to next round. */
export function advanceRound(state: GameState): void {
  state.round++;
}

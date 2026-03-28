/** Deterministic round pipeline. */

import type { GameState, RoundSummary, MeetingTrigger, PendingClue } from './types.js';
import type { GameContext } from './gameContext.js';
import type { GameAction, MoveAction, FollowAction, DoTaskAction, KillAction, SabotageAction, EmergencyMeetingAction, PretendTaskAction } from '../actions/actionTypes.js';
import { resolveMovement, scheduleMovement, applyPendingMoves } from '../systems/movementSystem.js';
import { resolveFollows, scheduleFollows, applyPendingFollows } from '../systems/followSystem.js';
import { resolveSabotage } from '../systems/sabotageSystem.js';
import { resolveTasks } from '../systems/taskSystem.js';
import { resolveKills } from '../systems/killSystem.js';
import { detectBodies } from '../systems/bodySystem.js';
import { resolveClues } from '../systems/clueSystem.js';
import { checkWinConditions } from '../systems/winSystem.js';
import { KILL_COOLDOWN_ROUNDS } from './constants.js';
import { FLAVOR_EVENTS } from '../content/events.js';
import { TRAIT_DEFINITIONS } from '../content/traits.js';
import { createClue } from '../domain/clue/clueFactory.js';
import { pickRandom } from './utils.js';

export interface RoundResult {
  summary: RoundSummary;
  meetingTriggered: boolean;
  meetingTrigger?: MeetingTrigger;
  meetingCalledBy?: string;
}

export async function resolveRound(
  state: GameState,
  actions: GameAction[],
  ctx: GameContext,
): Promise<RoundResult> {
  const publicEvents: string[] = [];
  const privateMessages: Record<string, string[]> = {};

  const addPrivate = (playerId: string, msgs: string[]) => {
    (privateMessages[playerId] ??= []).push(...msgs);
  };

  // ── Phase 1: Apply pending movement/follows from PREVIOUS round ──
  // Round 0 uses immediate movement for initial dispersion.
  // Round 1+ applies pending moves scheduled last round.
  if (state.round > 0) {
    const moveResult = applyPendingMoves(state);
    publicEvents.push(...moveResult.events);

    const followResult = applyPendingFollows(state);
    publicEvents.push(...followResult.events);
  }

  // ── Phase 1b: Deliver pending clues from last round ──
  const deliveredClueIds: string[] = [];
  for (let i = state.pendingClues.length - 1; i >= 0; i--) {
    const pc = state.pendingClues[i]!;
    if (pc.deliverOnRound <= state.round) {
      const player = state.players.find(p => p.id === pc.playerId);
      if (player && player.alive) {
        const clue = createClue(pc.clueText, pc.clueType, pc.deliverOnRound, pc.pointsToPossessed, pc.roomId);
        state.clues.push(clue);
        player.knownClues.push(clue.id);
        deliveredClueIds.push(clue.id);
        addPrivate(player.id, [`🔍 Clue delivered: ${pc.clueText}`]);
      }
      state.pendingClues.splice(i, 1);
    }
  }
  if (deliveredClueIds.length > 0) {
    publicEvents.push(`${deliveredClueIds.length} clue(s) were delivered from previous investigations.`);
  }

  // ── Phase 2: Schedule movement/follows for next round (or immediate for R0) ──
  const moveActions = actions.filter((a): a is MoveAction => a.kind === 'MOVE');
  const followActions = actions.filter((a): a is FollowAction => a.kind === 'FOLLOW');

  if (state.round === 0) {
    // Round 0: immediate movement for initial dispersion
    const moveResult = resolveMovement(state, moveActions);
    publicEvents.push(...moveResult.events);
    const followResult = resolveFollows(state, followActions);
    publicEvents.push(...followResult.events);
  } else {
    // Schedule for next round
    const moveEvents = scheduleMovement(state, moveActions);
    publicEvents.push(...moveEvents);
    const followEvents = scheduleFollows(state, followActions);
    publicEvents.push(...followEvents);
  }

  // ── Phase 3: Apply sabotage ──
  const sabotageActions = actions.filter((a): a is SabotageAction => a.kind === 'SABOTAGE');
  resolveSabotage(state, sabotageActions);
  // Sabotage events are hidden from public

  // ── Phase 3b: Resolve PRETEND_TASK — fake activity for possessed ──
  const pretendActions = actions.filter((a): a is PretendTaskAction => a.kind === 'PRETEND_TASK');
  for (const action of pretendActions) {
    const player = state.players.find(p => p.id === action.playerId);
    if (player) {
      // Public event looks like a task attempt (deception)
      const room = state.rooms.find(r => r.id === player.roomId);
      publicEvents.push(`${player.name} worked on something in ${room?.name ?? 'the room'}.`);
      addPrivate(player.id, ['You pretended to work on a task.']);
    }
  }

  // ── Phase 4: Resolve tasks and queue clue rewards ──
  const taskActions = actions.filter((a): a is DoTaskAction => a.kind === 'DO_TASK');
  const taskResult = resolveTasks(state, taskActions);
  publicEvents.push(...taskResult.events);

  // ── Phase 4b: Apply trait effects on task completion ──
  for (const playerId of taskResult.clueRewardPlayerIds) {
    const player = state.players.find(p => p.id === playerId);
    if (!player) continue;

    // 'curious' trait: extra environmental flavor when completing tasks
    if (player.traits.includes('curious')) {
      addPrivate(player.id, ['💡 Your curiosity reveals something extra about this room...']);
    }

    // 'methodical' trait: task counts as slightly more progress
    // (already gets +1 from task, this is narrative only)
    if (player.traits.includes('methodical')) {
      addPrivate(player.id, ['📋 Your methodical nature ensures thorough work.']);
    }
  }

  // ── Phase 5: Resolve kills (with cooldown check) ──
  const killActions = actions.filter((a): a is KillAction => a.kind === 'KILL');
  const validKillActions = killActions.filter(() => {
    return state.round - state.lastKillRound >= KILL_COOLDOWN_ROUNDS;
  });

  if (validKillActions.length > 0) {
    const killResult = resolveKills(state, validKillActions);
    publicEvents.push(...killResult.events);
    for (const [pid, msgs] of Object.entries(killResult.privateEvents)) {
      addPrivate(pid, msgs);
    }
    if (killResult.killedPlayerIds.length > 0) {
      state.lastKillRound = state.round;
    }
  } else if (killActions.length > 0) {
    // Kill was attempted but on cooldown
    const possessed = state.players.find(p => p.id === state.possessedPlayerId);
    if (possessed) {
      addPrivate(possessed.id, ['The ghost\'s power hasn\'t recharged yet. You cannot kill this round.']);
    }
  }

  // ── Phase 6: Detect bodies / check for meetings ──
  let meetingTriggered = false;
  let meetingTrigger: MeetingTrigger | undefined;
  let meetingCalledBy: string | undefined;

  const bodyResult = detectBodies(state);
  publicEvents.push(...bodyResult.events);
  if (bodyResult.triggerMeeting) {
    meetingTriggered = true;
    meetingTrigger = 'body-discovery';
    meetingCalledBy = bodyResult.discoveredBy;
  }

  // ── Phase 6b: Check emergency meeting actions ──
  if (!meetingTriggered) {
    const emActions = actions.filter((a): a is EmergencyMeetingAction => a.kind === 'EMERGENCY_MEETING');
    if (emActions.length > 0) {
      const caller = emActions[0]!;
      const player = state.players.find(p => p.id === caller.playerId);
      if (player) {
        player.lastEmergencyMeetingRound = state.round;
        meetingTriggered = true;
        meetingTrigger = 'emergency';
        meetingCalledBy = caller.playerId;
        publicEvents.push(`${player.name} called an emergency meeting!`);
      }
    }
  }

  // ── Phase 7: Generate clues (queued for next round delivery) ──
  if (taskResult.clueRewardPlayerIds.length > 0) {
    const clueResult = await resolveClues(state, taskResult.clueRewardPlayerIds, taskResult.completedTaskIds, ctx);
    // Instead of immediately delivering, queue for next round
    for (const clue of clueResult.generatedClues ?? []) {
      state.pendingClues.push({
        playerId: clue.playerId,
        deliverOnRound: state.round + 1,
        clueText: clue.text,
        clueType: clue.type,
        pointsToPossessed: clue.pointsToPossessed,
        roomId: clue.roomId,
      });
    }
    if (taskResult.clueRewardPlayerIds.length > 0) {
      publicEvents.push('New clues are being investigated... they will be revealed next round.');
    }
  }

  // ── Phase 7b: Trait-based passive clue generation ──
  for (const player of state.players) {
    if (!player.alive) continue;

    // 'analytical' trait: small chance of environmental clue each round
    if (player.traits.includes('analytical') && ctx.rng.next() < 0.15) {
      const room = state.rooms.find(r => r.id === player.roomId);
      if (room) {
        addPrivate(player.id, [`🔬 Your analytical mind notices something in ${room.name}...`]);
      }
    }

    // 'nervous' trait: reveals if possessed is in the same room (sometimes)
    if (player.traits.includes('nervous') && ctx.rng.next() < 0.2) {
      const possessed = state.players.find(p => p.id === state.possessedPlayerId);
      if (possessed && possessed.alive && possessed.roomId === player.roomId) {
        addPrivate(player.id, ['😰 Something feels deeply wrong about someone near you...']);
      }
    }

    // 'empathetic' trait: sense emotional echoes in rooms where kills happened
    if (player.traits.includes('empathetic')) {
      const room = state.rooms.find(r => r.id === player.roomId);
      if (room && room.bodyIds.length > 0) {
        addPrivate(player.id, ['💔 You sense lingering anguish in this place...']);
      }
    }

    // 'brave' trait: reduces isolation vulnerability narrative
    if (player.traits.includes('brave')) {
      const playersHere = state.players.filter(p => p.alive && p.roomId === player.roomId);
      if (playersHere.length === 1) {
        addPrivate(player.id, ['🛡️ Your bravery steadies your nerves, even alone.']);
      }
    }

    // 'cautious' trait: warning when moving to a room with few people
    if (player.traits.includes('cautious') && player.pendingMove) {
      const destPlayers = state.players.filter(p => p.alive && p.roomId === player.pendingMove);
      if (destPlayers.length === 0) {
        addPrivate(player.id, ['⚠️ Your cautious nature warns you: the room ahead seems empty.']);
      }
    }
  }

  // ── Phase 8: Check win conditions ──
  const winner = checkWinConditions(state);
  if (winner) {
    state.winner = winner;
    state.phase = 'ended';
  }

  // ── Phase 9: Random flavor event ──
  if (!meetingTriggered && (state.phase as string) !== 'ended' && ctx.rng.next() < 0.35) {
    const event = pickRandom(FLAVOR_EVENTS, ctx.rng.next.bind(ctx.rng));
    publicEvents.push(`🕯️ ${event.text}`);
  }

  // ── Cleanup: clear sabotage flags ──
  for (const room of state.rooms) {
    room.sabotaged = false;
  }

  const summary: RoundSummary = {
    round: state.round,
    publicEvents,
    privateMessages,
  };

  state.roundSummaries.push(summary);

  return {
    summary,
    meetingTriggered,
    meetingTrigger,
    meetingCalledBy,
  };
}

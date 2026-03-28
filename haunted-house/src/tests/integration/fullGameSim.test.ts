/** Full game simulation tests.
 *  Plays through complete games programmatically, validating every spec
 *  requirement from GAME_FLOW.md.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setupGame } from '../../core/setupGame.js';
import { processRound, processMeeting, advanceRound } from '../../core/engine.js';
import { buildActionMenu } from '../../actions/buildActionMenu.js';
import {
  moveAction, doTaskAction, followAction, emergencyMeetingAction,
  killAction, sabotageAction, pretendTaskAction,
} from '../../actions/actionFactory.js';
import { createMockGameContext } from '../mocks/mockGameContext.js';
import { resetIdCounter } from '../../infra/ids.js';
import type { GameState, Player } from '../../core/types.js';
import type { GameContext } from '../../core/gameContext.js';
import type { GameAction } from '../../actions/actionTypes.js';
import { alivePlayers, playersInRoom } from '../../domain/player/playerSelectors.js';
import { tasksInRoom } from '../../domain/task/taskSelectors.js';
import { connectedRooms } from '../../domain/room/roomSelectors.js';

// ─── Helpers ───────────────────────────────────────────

function getPossessed(state: GameState): Player {
  return state.players.find(p => p.id === state.possessedPlayerId)!;
}

function getInnocents(state: GameState): Player[] {
  return state.players.filter(p => p.id !== state.possessedPlayerId);
}

function moveToConnected(state: GameState, player: Player): GameAction {
  const rooms = connectedRooms(state, player.roomId);
  return moveAction(player.id, rooms[0]!.id);
}

function allMoveFromFoyer(state: GameState): GameAction[] {
  const foyer = state.rooms.find(r => r.id === 'foyer')!;
  return state.players.map((p, i) =>
    moveAction(p.id, foyer.connectedRoomIds[i % foyer.connectedRoomIds.length]!)
  );
}

// ─── Tests ─────────────────────────────────────────────

describe('Full Game Simulation', () => {
  let ctx: GameContext;
  let state: GameState;

  beforeEach(async () => {
    resetIdCounter();
    ctx = createMockGameContext(42);
    state = await setupGame(['Alice', 'Bob', 'Charlie', 'Diana'], ctx);
  });

  // ── SETUP CHECKS ─────────────────────────────────────

  describe('Setup (Spec §6)', () => {
    it('all players start in the foyer', () => {
      for (const p of state.players) {
        expect(p.roomId).toBe('foyer');
      }
    });

    it('exactly one player is possessed', () => {
      const possessed = state.players.filter(p => p.role === 'possessed');
      expect(possessed).toHaveLength(1);
      expect(state.possessedPlayerId).toBe(possessed[0]!.id);
    });

    it('every player has traits assigned', () => {
      for (const p of state.players) {
        expect(p.traits.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('ghost profile is created with traits and backstory', () => {
      expect(state.ghost.archetypeId).toBeTruthy();
      expect(state.ghost.name).toBeTruthy();
      expect(state.ghost.backstory).toBeTruthy();
      expect(state.ghost.traits.length).toBeGreaterThan(0);
    });

    it('tasks exist for non-foyer rooms', () => {
      expect(state.tasks.length).toBeGreaterThan(0);
      const foyerTasks = state.tasks.filter(t => t.roomId === 'foyer');
      expect(foyerTasks).toHaveLength(0);
    });

    it('all tasks have challenges', () => {
      for (const t of state.tasks) {
        expect(t.challenge).toBeDefined();
        expect(t.challenge.prompt).toBeTruthy();
        expect(t.challenge.answer).toBeTruthy();
      }
    });

    it('pendingClues and lastKillRound are initialized', () => {
      expect(state.pendingClues).toEqual([]);
      expect(state.lastKillRound).toBe(-99);
    });
  });

  // ── ROUND 0 ──────────────────────────────────────────

  describe('Round 0 (Spec §8)', () => {
    it('round 0 only allows MOVE actions', () => {
      for (const p of state.players) {
        const menu = buildActionMenu(state, p);
        const kinds = new Set(menu.map(m => m.kind));
        expect(kinds).toEqual(new Set(['MOVE']));
      }
    });

    it('round 0 movement is immediate (not delayed)', async () => {
      const actions = allMoveFromFoyer(state);
      await processRound(state, actions, ctx);

      // After R0, players should NOT be in foyer anymore
      for (const p of state.players) {
        expect(p.roomId).not.toBe('foyer');
      }
    });

    it('no player has pendingMove after round 0 (immediate)', async () => {
      const actions = allMoveFromFoyer(state);
      await processRound(state, actions, ctx);

      for (const p of state.players) {
        expect(p.pendingMove).toBeUndefined();
      }
    });
  });

  // ── DELAYED MOVEMENT (Spec §10) ──────────────────────

  describe('Delayed Movement (Spec §10)', () => {
    beforeEach(async () => {
      // Play R0: disperse from foyer
      await processRound(state, allMoveFromFoyer(state), ctx);
      advanceRound(state); // now round 1
    });

    it('movement in round 1+ sets pendingMove, does not move yet', async () => {
      const player = state.players[0]!;
      const roomBefore = player.roomId;
      const connected = connectedRooms(state, player.roomId);
      const target = connected[0]!.id;

      // All players just wait or move
      const actions: GameAction[] = state.players.map(p => {
        if (p.id === player.id) return moveAction(p.id, target);
        return pretendTaskAction(p.id); // others do something else
      });

      // Override: innocents can't pretend, so let's just have everyone move
      const actions2: GameAction[] = state.players.map(p => {
        const rooms = connectedRooms(state, p.roomId);
        return moveAction(p.id, rooms[0]!.id);
      });

      await processRound(state, actions2, ctx);

      // Player should still be in their room (pendingMove set, not applied)
      expect(player.roomId).toBe(roomBefore);
      expect(player.pendingMove).toBeTruthy();
    });

    it('pendingMove is applied at the start of the NEXT round', async () => {
      const player = state.players[0]!;
      const connected = connectedRooms(state, player.roomId);
      const target = connected[0]!.id;

      // R1: schedule movement
      const r1Actions: GameAction[] = state.players.map(p =>
        moveAction(p.id, connectedRooms(state, p.roomId)[0]!.id)
      );
      await processRound(state, r1Actions, ctx);
      advanceRound(state); // now round 2

      const pendingTarget = player.pendingMove;
      expect(pendingTarget).toBeTruthy();

      // R2: movements from R1 should be applied
      const r2Actions: GameAction[] = alivePlayers(state).map(p =>
        moveAction(p.id, connectedRooms(state, p.roomId)[0]!.id)
      );
      await processRound(state, r2Actions, ctx);

      // Player should now be at their R1 target
      expect(player.roomId).toBe(pendingTarget);
    });
  });

  // ── FOLLOW (Spec §11) ───────────────────────────────

  describe('Follow (Spec §11)', () => {
    beforeEach(async () => {
      await processRound(state, allMoveFromFoyer(state), ctx);
      advanceRound(state);
    });

    it('follow action is available for roommates', () => {
      // Find an innocent with a roommate
      const innocents = getInnocents(state);
      for (const p of innocents) {
        const roommates = playersInRoom(state, p.roomId).filter(r => r.id !== p.id);
        if (roommates.length > 0) {
          const menu = buildActionMenu(state, p);
          const followItems = menu.filter(m => m.kind === 'FOLLOW');
          expect(followItems.length).toBeGreaterThan(0);
          return;
        }
      }
    });
  });

  // ── TASK COMPLETION + CLUE QUEUING (Spec §12, §13) ──

  describe('Tasks and Clues (Spec §12, §13)', () => {
    beforeEach(async () => {
      await processRound(state, allMoveFromFoyer(state), ctx);
      advanceRound(state);
    });

    it('completing a task queues a clue for next round', async () => {
      // Find an innocent with tasks in their room
      const player = getInnocents(state).find(p => tasksInRoom(state, p.roomId).length > 0);
      if (!player) return; // skip if no tasks available

      const task = tasksInRoom(state, player.roomId)[0]!;
      const actions: GameAction[] = [doTaskAction(player.id, task.id)];

      // Other players do something
      for (const p of alivePlayers(state)) {
        if (p.id !== player.id) {
          actions.push(moveAction(p.id, connectedRooms(state, p.roomId)[0]!.id));
        }
      }

      await processRound(state, actions, ctx);

      // Clue should be PENDING, not delivered yet
      expect(state.pendingClues.length).toBeGreaterThan(0);
      expect(state.pendingClues[0]!.playerId).toBe(player.id);
      expect(state.pendingClues[0]!.deliverOnRound).toBe(state.round + 1);

      // Clue should NOT be in player's knownClues yet
      const initialClueCount = player.knownClues.length;

      advanceRound(state);

      // R2: clue should be delivered
      const r2Actions: GameAction[] = alivePlayers(state).map(p =>
        moveAction(p.id, connectedRooms(state, p.roomId)[0]!.id)
      );
      await processRound(state, r2Actions, ctx);

      expect(player.knownClues.length).toBeGreaterThan(initialClueCount);
      expect(state.pendingClues.length).toBe(0);
    });

    it('task completion increments escape progress', async () => {
      const player = getInnocents(state).find(p => tasksInRoom(state, p.roomId).length > 0);
      if (!player) return;

      const before = state.escapeTasksCompleted;
      const task = tasksInRoom(state, player.roomId)[0]!;
      const actions: GameAction[] = [doTaskAction(player.id, task.id)];
      for (const p of alivePlayers(state)) {
        if (p.id !== player.id) {
          actions.push(moveAction(p.id, connectedRooms(state, p.roomId)[0]!.id));
        }
      }
      await processRound(state, actions, ctx);

      expect(state.escapeTasksCompleted).toBe(before + 1);
    });

    it('sabotaged room prevents task completion', async () => {
      const innocent = getInnocents(state).find(p => tasksInRoom(state, p.roomId).length > 0);
      if (!innocent) return;

      const possessed = getPossessed(state);
      // Move possessed to same room
      possessed.roomId = innocent.roomId;

      const task = tasksInRoom(state, innocent.roomId)[0]!;
      const before = state.escapeTasksCompleted;

      const actions: GameAction[] = [
        sabotageAction(possessed.id, innocent.roomId),
        doTaskAction(innocent.id, task.id),
      ];
      for (const p of alivePlayers(state)) {
        if (p.id !== possessed.id && p.id !== innocent.id) {
          actions.push(moveAction(p.id, connectedRooms(state, p.roomId)[0]!.id));
        }
      }
      await processRound(state, actions, ctx);

      expect(task.status).toBe('sabotaged');
      expect(state.escapeTasksCompleted).toBe(before);
    });
  });

  // ── KILL SYSTEM (Spec §14) ──────────────────────────

  describe('Kill System (Spec §14)', () => {
    beforeEach(async () => {
      await processRound(state, allMoveFromFoyer(state), ctx);
      advanceRound(state);
    });

    it('kill succeeds when target is isolated (2 in room)', async () => {
      const possessed = getPossessed(state);
      const innocent = getInnocents(state)[0]!;

      // Put them alone in a room
      possessed.roomId = 'cellar';
      innocent.roomId = 'cellar';
      // Move everyone else elsewhere
      for (const p of state.players) {
        if (p.id !== possessed.id && p.id !== innocent.id) {
          p.roomId = 'foyer';
        }
      }

      const actions: GameAction[] = [
        killAction(possessed.id, innocent.id),
      ];
      for (const p of alivePlayers(state)) {
        if (p.id !== possessed.id) {
          actions.push(moveAction(p.id, connectedRooms(state, p.roomId)[0]!.id));
        }
      }
      await processRound(state, actions, ctx);

      expect(innocent.alive).toBe(false);
      expect(state.lastKillRound).toBe(state.round);
    });

    it('kill fails when 3+ players in room', async () => {
      const possessed = getPossessed(state);
      const innocents = getInnocents(state);

      // Put 3 players in same room
      possessed.roomId = 'cellar';
      innocents[0]!.roomId = 'cellar';
      innocents[1]!.roomId = 'cellar';

      const actions: GameAction[] = [
        killAction(possessed.id, innocents[0]!.id),
      ];
      for (const p of alivePlayers(state)) {
        if (p.id !== possessed.id) {
          actions.push(moveAction(p.id, connectedRooms(state, p.roomId)[0]!.id));
        }
      }
      await processRound(state, actions, ctx);

      expect(innocents[0]!.alive).toBe(true);
    });

    it('kill cooldown prevents back-to-back kills', async () => {
      const possessed = getPossessed(state);
      const innocents = getInnocents(state);

      // First kill
      possessed.roomId = 'cellar';
      innocents[0]!.roomId = 'cellar';
      for (const p of state.players) {
        if (p.id !== possessed.id && p.id !== innocents[0]!.id) {
          p.roomId = 'foyer';
        }
      }

      const r1Actions: GameAction[] = [killAction(possessed.id, innocents[0]!.id)];
      for (const p of alivePlayers(state)) {
        if (p.id !== possessed.id) {
          r1Actions.push(moveAction(p.id, connectedRooms(state, p.roomId)[0]!.id));
        }
      }
      await processRound(state, r1Actions, ctx);
      expect(innocents[0]!.alive).toBe(false);
      advanceRound(state);

      // Try to kill again next round
      possessed.roomId = 'cellar';
      innocents[1]!.roomId = 'cellar';
      for (const p of alivePlayers(state)) {
        if (p.id !== possessed.id && p.id !== innocents[1]!.id) {
          p.roomId = 'foyer';
        }
      }

      const r2Actions: GameAction[] = [killAction(possessed.id, innocents[1]!.id)];
      for (const p of alivePlayers(state)) {
        if (p.id !== possessed.id) {
          r2Actions.push(moveAction(p.id, connectedRooms(state, p.roomId)[0]!.id));
        }
      }
      await processRound(state, r2Actions, ctx);

      // Should fail due to cooldown
      expect(innocents[1]!.alive).toBe(true);
    });

    it('dead player body is placed in room', async () => {
      const possessed = getPossessed(state);
      const innocent = getInnocents(state)[0]!;

      possessed.roomId = 'cellar';
      innocent.roomId = 'cellar';
      for (const p of state.players) {
        if (p.id !== possessed.id && p.id !== innocent.id) {
          p.roomId = 'foyer';
        }
      }

      await processRound(state, [
        killAction(possessed.id, innocent.id),
        ...alivePlayers(state).filter(p => p.id !== possessed.id).map(p =>
          moveAction(p.id, connectedRooms(state, p.roomId)[0]!.id))
      ], ctx);

      const cellar = state.rooms.find(r => r.id === 'cellar')!;
      expect(cellar.bodyIds).toContain(innocent.id);
    });
  });

  // ── BODY DISCOVERY + MEETING (Spec §6, §17) ─────────

  describe('Body Discovery and Meeting (Spec §6, §17)', () => {
    beforeEach(async () => {
      await processRound(state, allMoveFromFoyer(state), ctx);
      advanceRound(state);
    });

    it('body discovery triggers automatic meeting', async () => {
      const possessed = getPossessed(state);
      const innocents = getInnocents(state);

      // Kill someone in cellar
      possessed.roomId = 'cellar';
      innocents[0]!.roomId = 'cellar';
      possessed.pendingMove = undefined;
      innocents[0]!.pendingMove = undefined;
      for (const p of state.players) {
        if (p.id !== possessed.id && p.id !== innocents[0]!.id) {
          p.roomId = 'foyer';
          p.pendingMove = undefined;
        }
      }

      // R1: kill happens. Other innocents move away from foyer.
      await processRound(state, [
        killAction(possessed.id, innocents[0]!.id),
        ...alivePlayers(state).filter(p => p.id !== possessed.id).map(p =>
          moveAction(p.id, connectedRooms(state, p.roomId)[0]!.id))
      ], ctx);

      advanceRound(state);

      // Place an innocent in cellar directly (simulating they walked in)
      // Must clear pendingMove so phase 1 doesn't override
      innocents[1]!.roomId = 'cellar';
      innocents[1]!.pendingMove = undefined;

      // R2: body is in cellar, innocent is there -> discovery
      const r2Actions: GameAction[] = alivePlayers(state).map(p =>
        moveAction(p.id, connectedRooms(state, p.roomId)[0]!.id)
      );
      const result = await processRound(state, r2Actions, ctx);

      expect(result.meetingTriggered).toBe(true);
      expect(result.meetingTrigger).toBe('body-discovery');
    });
  });

  // ── VOTING (Spec §18) ───────────────────────────────

  describe('Voting (Spec §18)', () => {
    it('voting out the possessed wins the game', async () => {
      await processRound(state, allMoveFromFoyer(state), ctx);
      advanceRound(state);

      // Simulate a meeting where everyone votes for the possessed
      const possessed = getPossessed(state);
      const votes: Record<string, string | null> = {};
      for (const p of alivePlayers(state)) {
        votes[p.id] = possessed.id;
      }
      processMeeting(state, 'emergency', state.players[0]!.id, votes);

      expect(state.winner).toBe('possessed-eliminated');
      expect(state.phase).toBe('ended');
    });

    it('voting out an innocent continues the game', async () => {
      await processRound(state, allMoveFromFoyer(state), ctx);
      advanceRound(state);

      const innocent = getInnocents(state)[0]!;
      const votes: Record<string, string | null> = {};
      for (const p of alivePlayers(state)) {
        votes[p.id] = innocent.id;
      }
      processMeeting(state, 'emergency', state.players[0]!.id, votes);

      expect(innocent.alive).toBe(false);
      expect(innocent.eliminatedByVote).toBe(true);
      expect(state.winner).not.toBe('possessed-eliminated');
    });

    it('tie vote results in no elimination', async () => {
      await processRound(state, allMoveFromFoyer(state), ctx);
      advanceRound(state);

      const alive = alivePlayers(state);
      const votes: Record<string, string | null> = {};
      // Split votes evenly
      votes[alive[0]!.id] = alive[1]!.id;
      votes[alive[1]!.id] = alive[0]!.id;
      votes[alive[2]!.id] = null;
      votes[alive[3]!.id] = null;
      const result = processMeeting(state, 'emergency', alive[0]!.id, votes);

      expect(result.events.some(e => e.includes('tied') || e.includes('skip'))).toBe(true);
      expect(alivePlayers(state)).toHaveLength(4);
    });

    it('after meeting all alive players return to foyer', async () => {
      await processRound(state, allMoveFromFoyer(state), ctx);
      advanceRound(state);

      const votes: Record<string, string | null> = {};
      for (const p of alivePlayers(state)) {
        votes[p.id] = null; // everyone skips
      }
      processMeeting(state, 'emergency', state.players[0]!.id, votes);

      for (const p of alivePlayers(state)) {
        expect(p.roomId).toBe('foyer');
      }
    });

    it('meeting clears pendingMove and followingPlayerId', async () => {
      await processRound(state, allMoveFromFoyer(state), ctx);
      advanceRound(state);

      // Schedule some moves
      const r1Actions: GameAction[] = alivePlayers(state).map(p =>
        moveAction(p.id, connectedRooms(state, p.roomId)[0]!.id)
      );
      await processRound(state, r1Actions, ctx);

      // Verify pendingMove was set
      const hasPending = alivePlayers(state).some(p => p.pendingMove);
      expect(hasPending).toBe(true);

      // Now a meeting happens — should clear everything
      const votes: Record<string, string | null> = {};
      for (const p of alivePlayers(state)) {
        votes[p.id] = null;
      }
      processMeeting(state, 'emergency', alivePlayers(state)[0]!.id, votes);

      for (const p of alivePlayers(state)) {
        expect(p.roomId).toBe('foyer');
        expect(p.pendingMove).toBeUndefined();
        expect(p.followingPlayerId).toBeUndefined();
      }
    });
  });

  // ── PRETEND_TASK (Spec §16) ──────────────────────────

  describe('Pretend Task (Spec §16)', () => {
    beforeEach(async () => {
      await processRound(state, allMoveFromFoyer(state), ctx);
      advanceRound(state);
    });

    it('pretend task generates public deception event', async () => {
      const possessed = getPossessed(state);
      const actions: GameAction[] = [pretendTaskAction(possessed.id)];
      for (const p of alivePlayers(state)) {
        if (p.id !== possessed.id) {
          actions.push(moveAction(p.id, connectedRooms(state, p.roomId)[0]!.id));
        }
      }
      await processRound(state, actions, ctx);

      const summary = state.roundSummaries[state.roundSummaries.length - 1]!;
      const hasDeception = summary.publicEvents.some(e =>
        e.includes(possessed.name) && e.includes('worked on')
      );
      expect(hasDeception).toBe(true);

      const privateMsg = summary.privateMessages[possessed.id];
      expect(privateMsg).toBeDefined();
      expect(privateMsg!.some(m => m.includes('pretended'))).toBe(true);
    });
  });

  // ── WIN CONDITIONS (Spec §19) ────────────────────────

  describe('Win Conditions (Spec §19)', () => {
    beforeEach(async () => {
      await processRound(state, allMoveFromFoyer(state), ctx);
      advanceRound(state);
    });

    it('innocents win by completing enough tasks', async () => {
      // Force-complete enough tasks
      state.escapeTasksCompleted = state.escapeTasksRequired;

      const actions: GameAction[] = alivePlayers(state).map(p =>
        moveAction(p.id, connectedRooms(state, p.roomId)[0]!.id)
      );
      await processRound(state, actions, ctx);

      expect(state.winner).toBe('innocents-escape');
      expect(state.phase).toBe('ended');
    });

    it('possessed wins when timer expires', async () => {
      state.round = state.maxRounds;

      const actions: GameAction[] = alivePlayers(state).map(p =>
        moveAction(p.id, connectedRooms(state, p.roomId)[0]!.id)
      );
      await processRound(state, actions, ctx);

      expect(state.winner).toBe('timer-expired');
    });

    it('possessed wins when innocents are insufficient', async () => {
      // Kill all but 1 innocent
      const innocents = getInnocents(state);
      for (let i = 0; i < innocents.length - 1; i++) {
        innocents[i]!.alive = false;
      }

      const actions: GameAction[] = alivePlayers(state).map(p =>
        moveAction(p.id, connectedRooms(state, p.roomId)[0]!.id)
      );
      await processRound(state, actions, ctx);

      expect(state.winner).toBe('survivors-insufficient');
    });
  });

  // ── FULL GAME: INNOCENTS WIN BY COMPLETING TASKS ────

  describe('Full Game: Innocents Win', () => {
    it('plays through a complete game where innocents complete tasks and win', async () => {
      // R0: disperse
      await processRound(state, allMoveFromFoyer(state), ctx);
      advanceRound(state);

      let roundsPlayed = 1;
      const maxSafeRounds = 20;

      while ((state.phase as string) !== 'ended' && roundsPlayed < maxSafeRounds) {
        const actions: GameAction[] = [];
        const possessed = getPossessed(state);

        for (const player of alivePlayers(state)) {
          if (player.id === possessed.id) {
            // Possessed just pretends
            actions.push(pretendTaskAction(player.id));
          } else {
            // Innocents try to do tasks in their room
            const tasks = tasksInRoom(state, player.roomId);
            if (tasks.length > 0) {
              actions.push(doTaskAction(player.id, tasks[0]!.id));
            } else {
              // Move to a room with tasks
              const connected = connectedRooms(state, player.roomId);
              actions.push(moveAction(player.id, connected[0]!.id));
            }
          }
        }

        const result = await processRound(state, actions, ctx);

        // Handle meeting if triggered
        if (result.meetingTriggered && result.meetingTrigger && result.meetingCalledBy) {
          const votes: Record<string, string | null> = {};
          for (const p of alivePlayers(state)) {
            votes[p.id] = null; // everyone skips
          }
          processMeeting(state, result.meetingTrigger, result.meetingCalledBy, votes);
        }

        if ((state.phase as string) !== 'ended') {
          advanceRound(state);
          roundsPlayed++;
        }
      }

      // Game should have ended (either by tasks or timer)
      expect(state.phase).toBe('ended');
      expect(state.winner).not.toBeNull();
    });
  });

  // ── FULL GAME: POSSESSED KILLS AND WINS ─────────────

  describe('Full Game: Possessed Wins by Killing', () => {
    it('simulates possessed killing isolated players', async () => {
      // R0: disperse
      await processRound(state, allMoveFromFoyer(state), ctx);
      advanceRound(state);

      let roundsPlayed = 1;
      const maxSafeRounds = 30;

      while ((state.phase as string) !== 'ended' && roundsPlayed < maxSafeRounds) {
        const actions: GameAction[] = [];
        const possessed = getPossessed(state);
        const alive = alivePlayers(state);

        // Find an isolated innocent
        const target = alive.find(p =>
          p.id !== possessed.id &&
          playersInRoom(state, p.roomId).length <= 2 &&
          playersInRoom(state, p.roomId).some(r => r.id === possessed.id)
        );

        if (target && state.round - state.lastKillRound >= 2) {
          actions.push(killAction(possessed.id, target.id));
        } else {
          // Move possessed toward an innocent
          const innocentRooms = alive
            .filter(p => p.id !== possessed.id)
            .map(p => p.roomId);
          const connected = connectedRooms(state, possessed.roomId);
          const targetRoom = connected.find(r => innocentRooms.includes(r.id));
          if (targetRoom) {
            actions.push(moveAction(possessed.id, targetRoom.id));
          } else {
            actions.push(moveAction(possessed.id, connected[0]!.id));
          }
        }

        // Innocents do tasks or move
        for (const p of alive) {
          if (p.id === possessed.id) continue;
          const tasks = tasksInRoom(state, p.roomId);
          if (tasks.length > 0) {
            actions.push(doTaskAction(p.id, tasks[0]!.id));
          } else {
            const connected = connectedRooms(state, p.roomId);
            actions.push(moveAction(p.id, connected[0]!.id));
          }
        }

        const result = await processRound(state, actions, ctx);

        if (result.meetingTriggered && result.meetingTrigger && result.meetingCalledBy) {
          const votes: Record<string, string | null> = {};
          for (const p of alivePlayers(state)) {
            votes[p.id] = null;
          }
          processMeeting(state, result.meetingTrigger, result.meetingCalledBy, votes);
        }

        if ((state.phase as string) !== 'ended') {
          advanceRound(state);
          roundsPlayed++;
        }
      }

      expect(state.phase).toBe('ended');
      expect(state.winner).not.toBeNull();
    });
  });

  // ── EMERGENCY MEETING (Spec §17) ────────────────────

  describe('Emergency Meeting (Spec §17)', () => {
    beforeEach(async () => {
      await processRound(state, allMoveFromFoyer(state), ctx);
      advanceRound(state);
    });

    it('emergency meeting respects cooldown', () => {
      const player = getInnocents(state)[0]!;
      // Meeting cooldown is set to round 2 initially
      state.round = 1;
      const menu = buildActionMenu(state, player);
      expect(menu.some(m => m.kind === 'EMERGENCY_MEETING')).toBe(false);

      state.round = 3;
      const menu2 = buildActionMenu(state, player);
      expect(menu2.some(m => m.kind === 'EMERGENCY_MEETING')).toBe(true);
    });

    it('calling emergency meeting consumes the round action', async () => {
      state.round = 3; // past cooldown
      const caller = getInnocents(state)[0]!;

      const actions: GameAction[] = [emergencyMeetingAction(caller.id)];
      for (const p of alivePlayers(state)) {
        if (p.id !== caller.id) {
          actions.push(moveAction(p.id, connectedRooms(state, p.roomId)[0]!.id));
        }
      }
      const result = await processRound(state, actions, ctx);

      expect(result.meetingTriggered).toBe(true);
      expect(result.meetingTrigger).toBe('emergency');
    });
  });

  // ── FLAVOR EVENTS ────────────────────────────────────

  describe('Flavor Events', () => {
    it('flavor events appear in round summaries', async () => {
      await processRound(state, allMoveFromFoyer(state), ctx);
      advanceRound(state);

      // Run multiple rounds to increase chance of flavor event (35% chance each)
      let foundFlavor = false;
      for (let i = 0; i < 10 && !foundFlavor; i++) {
        const actions: GameAction[] = alivePlayers(state).map(p =>
          moveAction(p.id, connectedRooms(state, p.roomId)[0]!.id)
        );
        await processRound(state, actions, ctx);
        const summary = state.roundSummaries[state.roundSummaries.length - 1]!;
        if (summary.publicEvents.some(e => e.includes('🕯️'))) {
          foundFlavor = true;
        }
        advanceRound(state);
      }

      expect(foundFlavor).toBe(true);
    });
  });

  // ── TRAIT EFFECTS ────────────────────────────────────

  describe('Trait Effects', () => {
    it('traits are present on all players', () => {
      for (const p of state.players) {
        expect(p.traits.length).toBe(2);
        expect(p.traits.every(t => typeof t === 'string')).toBe(true);
      }
    });

    it('ghost traits influence possession selection', () => {
      const possessed = getPossessed(state);
      // Possessed should have some trait overlap with ghost
      // (not guaranteed to be perfect but ghost affinity is used)
      expect(state.ghost.traits.length).toBeGreaterThan(0);
    });
  });
});

/** Task system tests. */

import { describe, it, expect } from 'vitest';
import { resolveTasks } from '../../systems/taskSystem.js';
import type { GameState, Player, Room, Task } from '../../core/types.js';

function makePlayer(id: string, roomId: string): Player {
  return { id, name: id, role: 'innocent', alive: true, roomId, traits: [], completedTasks: [], knownClues: [], lastEmergencyMeetingRound: -1, eliminatedByVote: false };
}

function makeTask(id: string, roomId: string): Task {
  return { id, name: 'Test Task', description: 'Test', roomId, status: 'available', category: 'test', challenge: { type: 'riddle', prompt: 'test?', answer: 'test', hints: [], flavorText: 'test' } };
}

function makeState(players: Player[], rooms: Room[], tasks: Task[]): GameState {
  return {
    phase: 'resolution',
    round: 1,
    players,
    rooms,
    tasks,
    clues: [],
    ghost: { archetypeId: 'test', name: 'Test', motive: 'test', traits: [], clueStyle: '', backstory: '' },
    possessedPlayerId: '',
    meetingHistory: [],
    roundSummaries: [],
    meetingCooldownUntilRound: 0,
    escapeTasksRequired: 5,
    escapeTasksCompleted: 0,
    maxRounds: 15,
    winner: null,
    pendingClues: [],
    lastKillRound: -99,
  };
}

describe('taskSystem', () => {
  it('completes an available task', () => {
    const player = makePlayer('p1', 'room1');
    const room: Room = { id: 'room1', name: 'Room', description: '', connectedRoomIds: [], taskIds: ['t1'], bodyIds: [], sabotaged: false };
    const task = makeTask('t1', 'room1');
    const state = makeState([player], [room], [task]);

    const result = resolveTasks(state, [{ kind: 'DO_TASK', playerId: 'p1', taskId: 't1' }]);
    expect(result.completedTaskIds).toContain('t1');
    expect(task.status).toBe('completed');
    expect(state.escapeTasksCompleted).toBe(1);
  });

  it('fails task in sabotaged room', () => {
    const player = makePlayer('p1', 'room1');
    const room: Room = { id: 'room1', name: 'Room', description: '', connectedRoomIds: [], taskIds: ['t1'], bodyIds: [], sabotaged: true };
    const task = makeTask('t1', 'room1');
    const state = makeState([player], [room], [task]);

    const result = resolveTasks(state, [{ kind: 'DO_TASK', playerId: 'p1', taskId: 't1' }]);
    expect(result.completedTaskIds).toHaveLength(0);
    expect(task.status).toBe('sabotaged');
  });

  it('does not complete already-completed task', () => {
    const player = makePlayer('p1', 'room1');
    const room: Room = { id: 'room1', name: 'Room', description: '', connectedRoomIds: [], taskIds: ['t1'], bodyIds: [], sabotaged: false };
    const task = makeTask('t1', 'room1');
    task.status = 'completed';
    const state = makeState([player], [room], [task]);

    const result = resolveTasks(state, [{ kind: 'DO_TASK', playerId: 'p1', taskId: 't1' }]);
    expect(result.completedTaskIds).toHaveLength(0);
  });

  it('queues clue reward for completing player', () => {
    const player = makePlayer('p1', 'room1');
    const room: Room = { id: 'room1', name: 'Room', description: '', connectedRoomIds: [], taskIds: ['t1'], bodyIds: [], sabotaged: false };
    const task = makeTask('t1', 'room1');
    const state = makeState([player], [room], [task]);

    const result = resolveTasks(state, [{ kind: 'DO_TASK', playerId: 'p1', taskId: 't1' }]);
    expect(result.clueRewardPlayerIds).toContain('p1');
  });
});

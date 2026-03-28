/** Kill system tests. */

import { describe, it, expect } from 'vitest';
import { canKill, resolveKills } from '../../systems/killSystem.js';
import type { GameState, Player, Room, GhostProfile } from '../../core/types.js';

function makeState(players: Player[], rooms: Room[]): GameState {
  return {
    phase: 'resolution',
    round: 1,
    players,
    rooms,
    tasks: [],
    clues: [],
    ghost: { archetypeId: 'test', name: 'Test Ghost', motive: 'test', traits: [], clueStyle: '', backstory: '' },
    possessedPlayerId: players.find(p => p.role === 'possessed')?.id ?? '',
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

function makePlayer(id: string, name: string, role: 'innocent' | 'possessed', roomId: string): Player {
  return { id, name, role, alive: true, roomId, traits: [], completedTasks: [], knownClues: [], lastEmergencyMeetingRound: -1, eliminatedByVote: false };
}

describe('killSystem', () => {
  it('allows kill when only two players in room', () => {
    const killer = makePlayer('p1', 'Killer', 'possessed', 'room1');
    const victim = makePlayer('p2', 'Victim', 'innocent', 'room1');
    const room: Room = { id: 'room1', name: 'Room', description: '', connectedRoomIds: [], taskIds: [], bodyIds: [], sabotaged: false };
    const state = makeState([killer, victim], [room]);

    expect(canKill(state, 'p1', 'p2')).toBe(true);
  });

  it('prevents kill when three or more players in room', () => {
    const killer = makePlayer('p1', 'Killer', 'possessed', 'room1');
    const victim = makePlayer('p2', 'Victim', 'innocent', 'room1');
    const witness = makePlayer('p3', 'Witness', 'innocent', 'room1');
    const room: Room = { id: 'room1', name: 'Room', description: '', connectedRoomIds: [], taskIds: [], bodyIds: [], sabotaged: false };
    const state = makeState([killer, victim, witness], [room]);

    expect(canKill(state, 'p1', 'p2')).toBe(false);
  });

  it('resolves a successful kill', () => {
    const killer = makePlayer('p1', 'Killer', 'possessed', 'room1');
    const victim = makePlayer('p2', 'Victim', 'innocent', 'room1');
    const room: Room = { id: 'room1', name: 'Room', description: '', connectedRoomIds: [], taskIds: [], bodyIds: [], sabotaged: false };
    const state = makeState([killer, victim], [room]);

    const result = resolveKills(state, [{ kind: 'KILL', playerId: 'p1', targetPlayerId: 'p2' }]);
    expect(result.killedPlayerIds).toContain('p2');
    expect(victim.alive).toBe(false);
    expect(room.bodyIds).toContain('p2');
  });
});

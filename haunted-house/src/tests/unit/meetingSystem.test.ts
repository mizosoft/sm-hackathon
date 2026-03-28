/** Meeting system tests. */

import { describe, it, expect } from 'vitest';
import { resolveMeeting } from '../../systems/meetingSystem.js';
import type { GameState, Player, Room } from '../../core/types.js';

function makePlayer(id: string, name: string, role: 'innocent' | 'possessed'): Player {
  return { id, name, role, alive: true, roomId: 'room1', traits: [], completedTasks: [], knownClues: [], lastEmergencyMeetingRound: -1, eliminatedByVote: false };
}

function makeState(players: Player[]): GameState {
  return {
    phase: 'meeting',
    round: 3,
    players,
    rooms: [{ id: 'foyer', name: 'Foyer', description: '', connectedRoomIds: [], taskIds: [], bodyIds: [], sabotaged: false }],
    tasks: [],
    clues: [],
    ghost: { archetypeId: 'test', name: 'Test', motive: 'test', traits: [], clueStyle: '', backstory: '' },
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

describe('meetingSystem', () => {
  it('eliminates player with most votes', () => {
    const players = [
      makePlayer('p1', 'Alice', 'innocent'),
      makePlayer('p2', 'Bob', 'possessed'),
      makePlayer('p3', 'Carol', 'innocent'),
      makePlayer('p4', 'Dave', 'innocent'),
    ];
    const state = makeState(players);
    const votes = { p1: 'p2', p3: 'p2', p4: 'p2', p2: 'p1' };

    const result = resolveMeeting(state, 'emergency', 'p1', votes);
    expect(result.record.eliminatedPlayerId).toBe('p2');
    expect(players[1]!.alive).toBe(false);
  });

  it('does not eliminate on tie', () => {
    const players = [
      makePlayer('p1', 'Alice', 'innocent'),
      makePlayer('p2', 'Bob', 'possessed'),
      makePlayer('p3', 'Carol', 'innocent'),
      makePlayer('p4', 'Dave', 'innocent'),
    ];
    const state = makeState(players);
    const votes = { p1: 'p2', p2: 'p1', p3: 'p2', p4: 'p1' };

    const result = resolveMeeting(state, 'emergency', 'p1', votes);
    expect(result.record.tied).toBe(true);
    expect(result.record.eliminatedPlayerId).toBeNull();
  });

  it('handles skip votes', () => {
    const players = [
      makePlayer('p1', 'Alice', 'innocent'),
      makePlayer('p2', 'Bob', 'possessed'),
      makePlayer('p3', 'Carol', 'innocent'),
      makePlayer('p4', 'Dave', 'innocent'),
    ];
    const state = makeState(players);
    const votes: Record<string, string | null> = { p1: null, p2: null, p3: null, p4: 'p2' };

    const result = resolveMeeting(state, 'emergency', 'p1', votes);
    expect(result.record.eliminatedPlayerId).toBeNull();
  });

  it('moves all alive players to foyer after meeting', () => {
    const players = [
      makePlayer('p1', 'Alice', 'innocent'),
      makePlayer('p2', 'Bob', 'possessed'),
    ];
    players[0]!.roomId = 'library';
    players[1]!.roomId = 'kitchen';
    const state = makeState(players);
    const votes: Record<string, string | null> = { p1: null, p2: null };

    resolveMeeting(state, 'emergency', 'p1', votes);
    for (const p of state.players) {
      if (p.alive && !p.eliminatedByVote) {
        expect(p.roomId).toBe('foyer');
      }
    }
  });
});

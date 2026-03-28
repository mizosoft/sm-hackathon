/** Movement system tests. */

import { describe, it, expect } from 'vitest';
import { resolveMovement } from '../../systems/movementSystem.js';
import type { GameState, Player, Room } from '../../core/types.js';

function makePlayer(id: string, roomId: string): Player {
  return { id, name: id, role: 'innocent', alive: true, roomId, traits: [], completedTasks: [], knownClues: [], lastEmergencyMeetingRound: -1, eliminatedByVote: false };
}

function makeState(players: Player[], rooms: Room[]): GameState {
  return {
    phase: 'resolution',
    round: 0,
    players,
    rooms,
    tasks: [],
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

describe('movementSystem', () => {
  const rooms: Room[] = [
    { id: 'foyer', name: 'Foyer', description: '', connectedRoomIds: ['library'], taskIds: [], bodyIds: [], sabotaged: false },
    { id: 'library', name: 'Library', description: '', connectedRoomIds: ['foyer'], taskIds: [], bodyIds: [], sabotaged: false },
  ];

  it('moves player to connected room', () => {
    const player = makePlayer('p1', 'foyer');
    const state = makeState([player], rooms);

    const result = resolveMovement(state, [{ kind: 'MOVE', playerId: 'p1', targetRoomId: 'library' }]);
    expect(result.movedPlayers).toHaveLength(1);
    expect(player.roomId).toBe('library');
  });

  it('does not move player to unconnected room', () => {
    const extraRoom: Room = { id: 'attic', name: 'Attic', description: '', connectedRoomIds: [], taskIds: [], bodyIds: [], sabotaged: false };
    const player = makePlayer('p1', 'foyer');
    const state = makeState([player], [...rooms, extraRoom]);

    const result = resolveMovement(state, [{ kind: 'MOVE', playerId: 'p1', targetRoomId: 'attic' }]);
    expect(result.movedPlayers).toHaveLength(0);
    expect(player.roomId).toBe('foyer');
  });

  it('does not move dead player', () => {
    const player = makePlayer('p1', 'foyer');
    player.alive = false;
    const state = makeState([player], rooms);

    const result = resolveMovement(state, [{ kind: 'MOVE', playerId: 'p1', targetRoomId: 'library' }]);
    expect(result.movedPlayers).toHaveLength(0);
  });
});

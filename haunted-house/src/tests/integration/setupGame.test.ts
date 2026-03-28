/** Setup integration tests. */

import { describe, it, expect, beforeEach } from 'vitest';
import { setupGame } from '../../core/setupGame.js';
import { createMockGameContext } from '../mocks/mockGameContext.js';
import { resetIdCounter } from '../../infra/ids.js';
import type { GameContext } from '../../core/gameContext.js';

describe('setupGame', () => {
  let ctx: GameContext;

  beforeEach(() => {
    resetIdCounter();
    ctx = createMockGameContext();
  });

  it('creates a game with correct number of players', async () => {
    const state = await setupGame(['Alice', 'Bob', 'Carol', 'Dave'], ctx);
    expect(state.players).toHaveLength(4);
  });

  it('assigns exactly one possessed player', async () => {
    const state = await setupGame(['Alice', 'Bob', 'Carol', 'Dave'], ctx);
    const possessed = state.players.filter(p => p.role === 'possessed');
    expect(possessed).toHaveLength(1);
    expect(state.possessedPlayerId).toBe(possessed[0]!.id);
  });

  it('creates rooms from definitions', async () => {
    const state = await setupGame(['Alice', 'Bob', 'Carol', 'Dave'], ctx);
    expect(state.rooms.length).toBeGreaterThan(0);
    expect(state.rooms.find(r => r.id === 'foyer')).toBeDefined();
  });

  it('generates initial tasks', async () => {
    const state = await setupGame(['Alice', 'Bob', 'Carol', 'Dave'], ctx);
    expect(state.tasks.length).toBeGreaterThan(0);
  });

  it('starts all players in the foyer', async () => {
    const state = await setupGame(['Alice', 'Bob', 'Carol', 'Dave'], ctx);
    for (const p of state.players) {
      expect(p.roomId).toBe('foyer');
    }
  });

  it('creates a ghost profile', async () => {
    const state = await setupGame(['Alice', 'Bob', 'Carol', 'Dave'], ctx);
    expect(state.ghost).toBeDefined();
    expect(state.ghost.name).toBeTruthy();
    expect(state.ghost.backstory).toBeTruthy();
  });

  it('sets phase to action and round to 0', async () => {
    const state = await setupGame(['Alice', 'Bob', 'Carol', 'Dave'], ctx);
    expect(state.phase).toBe('action');
    expect(state.round).toBe(0);
  });
});

/** Engine integration tests. */

import { describe, it, expect, beforeEach } from 'vitest';
import { setupGame } from '../../core/setupGame.js';
import { processRound, advanceRound } from '../../core/engine.js';
import { moveAction } from '../../actions/actionFactory.js';
import { createMockGameContext } from '../mocks/mockGameContext.js';
import { resetIdCounter } from '../../infra/ids.js';
import type { GameState } from '../../core/types.js';
import type { GameContext } from '../../core/gameContext.js';

describe('engine', () => {
  let state: GameState;
  let ctx: GameContext;

  beforeEach(async () => {
    resetIdCounter();
    ctx = createMockGameContext();
    state = await setupGame(['Alice', 'Bob', 'Carol', 'Dave'], ctx);
  });

  it('processes round 0 with movement actions', async () => {
    // All players move from foyer
    const actions = state.players.map(p => {
      const room = state.rooms.find(r => r.id === 'foyer');
      const targetId = room!.connectedRoomIds[0]!;
      return moveAction(p.id, targetId);
    });

    const result = await processRound(state, actions, ctx);
    expect(result.state.roundSummaries).toHaveLength(1);
  });

  it('advances round correctly', async () => {
    expect(state.round).toBe(0);
    advanceRound(state);
    expect(state.round).toBe(1);
  });

  it('does not end game on round 0', async () => {
    const actions = state.players.map(p => {
      const room = state.rooms.find(r => r.id === 'foyer');
      const targetId = room!.connectedRoomIds[0]!;
      return moveAction(p.id, targetId);
    });

    await processRound(state, actions, ctx);
    expect(state.phase).not.toBe('ended');
  });
});

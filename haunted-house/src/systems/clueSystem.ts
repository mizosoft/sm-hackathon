/** Clue delivery system. */

import type { GameState, ClueType } from '../core/types.js';
import type { GameContext } from '../core/gameContext.js';
import { createClue } from '../domain/clue/clueFactory.js';

export interface GeneratedClueData {
  playerId: string;
  text: string;
  type: ClueType;
  pointsToPossessed: boolean;
  roomId?: string;
}

export interface ClueResult {
  newClueIds: string[];
  events: string[];
  privateEvents: Record<string, string[]>;
  generatedClues: GeneratedClueData[];
}

/** Generate clues for players who completed tasks.
 *  Clues are returned as data — the caller decides whether to deliver
 *  immediately or queue them for the next round.
 */
export async function resolveClues(
  state: GameState,
  clueRewardPlayerIds: string[],
  completedTaskIds: string[],
  ctx: GameContext,
): Promise<ClueResult> {
  const newClueIds: string[] = [];
  const events: string[] = [];
  const privateEvents: Record<string, string[]> = {};
  const generatedClues: GeneratedClueData[] = [];

  const possessed = state.players.find(p => p.id === state.possessedPlayerId);

  for (let idx = 0; idx < clueRewardPlayerIds.length; idx++) {
    const playerId = clueRewardPlayerIds[idx]!;
    const player = state.players.find(p => p.id === playerId);
    if (!player) continue;

    const room = state.rooms.find(r => r.id === player.roomId);
    const roomName = room?.name ?? 'unknown room';

    // Find the actual task name
    const taskId = completedTaskIds[idx];
    const task = taskId ? state.tasks.find(t => t.id === taskId) : undefined;
    const taskName = task?.name ?? 'a mysterious task';

    // Players in the same room
    const playersInRoom = state.players
      .filter(p => p.alive && p.roomId === player.roomId)
      .map(p => p.name);

    try {
      const output = await ctx.clueGenerator.generate({
        ghostProfile: state.ghost,
        roomName,
        taskName,
        round: state.round,
        possessedTraits: possessed?.traits ?? [],
        playerTraits: player.traits,
        playersInRoom,
      });

      generatedClues.push({
        playerId,
        text: output.text,
        type: output.type,
        pointsToPossessed: output.pointsToPossessed,
        roomId: room?.id,
      });
    } catch {
      ctx.logger.error(`Failed to generate clue for player ${playerId}`);
    }
  }

  return { newClueIds, events, privateEvents, generatedClues };
}

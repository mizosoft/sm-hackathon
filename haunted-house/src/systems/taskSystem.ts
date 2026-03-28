/** Task system. */

import type { GameState } from '../core/types.js';
import type { DoTaskAction } from '../actions/actionTypes.js';

export interface TaskResult {
  completedTaskIds: string[];
  clueRewardPlayerIds: string[];
  events: string[];
}

export function resolveTasks(state: GameState, actions: DoTaskAction[]): TaskResult {
  const completedTaskIds: string[] = [];
  const clueRewardPlayerIds: string[] = [];
  const events: string[] = [];

  for (const action of actions) {
    const player = state.players.find(p => p.id === action.playerId);
    const task = state.tasks.find(t => t.id === action.taskId);
    if (!player || !task || task.status !== 'available') continue;

    // Check if room is sabotaged
    const room = state.rooms.find(r => r.id === task.roomId);
    if (room?.sabotaged) {
      task.status = 'sabotaged';
      events.push(`${player.name} tried to work on "${task.name}" but the room was sabotaged!`);
      continue;
    }

    task.status = 'completed';
    task.assignedPlayerId = player.id;
    player.completedTasks.push(task.id);
    state.escapeTasksCompleted++;
    completedTaskIds.push(task.id);
    clueRewardPlayerIds.push(player.id);
    events.push(`${player.name} completed "${task.name}".`);
  }

  return { completedTaskIds, clueRewardPlayerIds, events };
}

/** Task selectors. */

import type { Task, GameState } from '../../core/types.js';

export function availableTasks(state: GameState): Task[] {
  return state.tasks.filter(t => t.status === 'available');
}

export function tasksInRoom(state: GameState, roomId: string): Task[] {
  return state.tasks.filter(t => t.roomId === roomId && t.status === 'available');
}

export function completedTasks(state: GameState): Task[] {
  return state.tasks.filter(t => t.status === 'completed');
}

export function getTaskById(state: GameState, id: string): Task | undefined {
  return state.tasks.find(t => t.id === id);
}

export function escapeProgress(state: GameState): { completed: number; required: number } {
  return {
    completed: state.escapeTasksCompleted,
    required: state.escapeTasksRequired,
  };
}

/** Task factory. */

import type { Task, TaskChallenge } from '../../core/types.js';
import { taskId } from '../../infra/ids.js';

export function createTask(
  name: string,
  description: string,
  roomId: string,
  category: string,
  challenge: TaskChallenge,
): Task {
  return {
    id: taskId(),
    name,
    description,
    roomId,
    status: 'available',
    category,
    challenge,
  };
}

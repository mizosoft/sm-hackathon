/** Runtime dependency container. */

import type { ClueGenerator } from '../ai/contracts/ClueGenerator.js';
import type { GhostStoryGenerator } from '../ai/contracts/GhostStoryGenerator.js';
import type { TaskGenerator } from '../ai/contracts/TaskGenerator.js';
import type { Logger } from '../infra/logger.js';
import type { RandomService } from '../infra/random.js';

export interface GameContext {
  clueGenerator: ClueGenerator;
  ghostStoryGenerator: GhostStoryGenerator;
  taskGenerator: TaskGenerator;
  logger: Logger;
  rng: RandomService;
}

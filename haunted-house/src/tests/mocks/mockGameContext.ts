/** Mock game context for tests. */

import type { GameContext } from '../../core/gameContext.js';
import { createMockClueGenerator, createMockGhostStoryGenerator, createMockTaskGenerator } from '../../ai/providers/mockAIProvider.js';
import { createSilentLogger } from '../../infra/logger.js';
import { createSeededRandom } from '../../infra/random.js';

export function createMockGameContext(seed = 42): GameContext {
  return {
    clueGenerator: createMockClueGenerator(),
    ghostStoryGenerator: createMockGhostStoryGenerator(),
    taskGenerator: createMockTaskGenerator(),
    logger: createSilentLogger(),
    rng: createSeededRandom(seed),
  };
}

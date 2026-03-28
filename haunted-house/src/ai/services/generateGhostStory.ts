/** Ghost story generation service. */

import type { GhostStoryGenerator, GhostStoryInput, GhostStoryOutput } from '../contracts/GhostStoryGenerator.js';

export async function generateGhostStory(
  generator: GhostStoryGenerator,
  input: GhostStoryInput,
): Promise<GhostStoryOutput> {
  return generator.generate(input);
}

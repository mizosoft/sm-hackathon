/** Clue generation service. */

import type { ClueGenerator, ClueInput, ClueOutput } from '../contracts/ClueGenerator.js';

export async function generateClue(
  generator: ClueGenerator,
  input: ClueInput,
): Promise<ClueOutput> {
  return generator.generate(input);
}

/** Task generation service. */

import type { TaskGenerator, TaskInput, TaskOutput } from '../contracts/TaskGenerator.js';

export async function generateTask(
  generator: TaskGenerator,
  input: TaskInput,
): Promise<TaskOutput> {
  return generator.generate(input);
}

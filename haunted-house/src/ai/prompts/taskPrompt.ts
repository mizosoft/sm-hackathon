/** Build task generation prompts. */

import type { TaskInput } from '../contracts/TaskGenerator.js';
import type { AIGatewayRequest } from '../contracts/AIGateway.js';

export function buildTaskPrompt(input: TaskInput): AIGatewayRequest {
  return {
    systemPrompt: `You are designing interactive tasks for a haunted house mystery game. Each task must include a mini-challenge puzzle the player solves.

Challenge types: riddle, word-puzzle, sequence, choice, unscramble.
Keep the challenge spooky/atmospheric but solvable.
Return ONLY valid JSON, no markdown.`,
    userPrompt: `Room: ${input.roomName}. Category: ${input.category}. Player: ${input.playerName}.

Generate a task with a challenge. Return JSON:
{
  "name": "task name",
  "description": "brief atmospheric description",
  "challenge": {
    "type": "riddle|word-puzzle|sequence|choice|unscramble",
    "prompt": "the puzzle/question the player sees",
    "answer": "the correct answer (single word or short phrase, lowercase)",
    "hints": ["hint 1", "hint 2"],
    "flavorText": "atmospheric intro text shown before the puzzle"
  }
}`,
    temperature: 0.8,
    maxTokens: 300,
  };
}

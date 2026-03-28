/** Build clue generation prompts. */

import type { ClueInput } from '../contracts/ClueGenerator.js';
import type { AIGatewayRequest } from '../contracts/AIGateway.js';

export function buildCluePrompt(input: ClueInput): AIGatewayRequest {
  const traitList = input.possessedTraits.length > 0
    ? input.possessedTraits.join(', ')
    : input.ghostProfile.traits.join(', ');

  return {
    systemPrompt: `You are a spooky narrator for a haunted house social-deduction game.
Generate a SHORT atmospheric clue (1-2 sentences) that helps players deduce which player is possessed by the ghost.
The possessed player shares traits with the ghost. Weave references to those traits into the clue so players can narrow down suspects.
Do NOT name the possessed player directly. Be cryptic but fair.`,
    userPrompt: `Ghost: ${input.ghostProfile.name} (motive: ${input.ghostProfile.motive}).
Ghost preferred traits: ${input.ghostProfile.traits.join(', ')}.
The possessed player's traits: ${traitList}.
Room: ${input.roomName}. Task just completed: ${input.taskName}. Round: ${input.round}.
Players present: ${input.playersInRoom.join(', ')}.

Generate a clue as JSON: {"text": "...", "pointsToPossessed": true, "type": "task-reward"}
The "text" should hint at one of the possessed player's traits (${traitList}) without revealing the player's name.
"pointsToPossessed" should be true ~70% of the time, false for misdirection.`,
    temperature: 0.8,
    maxTokens: 200,
  };
}

/** Build ghost story generation prompts. */

import type { GhostStoryInput } from '../contracts/GhostStoryGenerator.js';
import type { AIGatewayRequest } from '../contracts/AIGateway.js';

export function buildGhostStoryPrompt(input: GhostStoryInput): AIGatewayRequest {
  return {
    systemPrompt: 'You are a horror story writer. Create a brief ghost backstory for a haunted house game.',
    userPrompt: `Ghost archetype: ${input.archetypeName}. Motive: ${input.motive}. Traits: ${input.traits.join(', ')}. Generate JSON: {"backstory": "...", "clueStyle": "..."}`,
    temperature: 0.9,
    maxTokens: 200,
  };
}

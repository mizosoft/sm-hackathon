/** Mock AI provider for tests and dev. */

import type { AIGateway, AIGatewayRequest, AIGatewayResponse } from '../contracts/AIGateway.js';
import type { ClueGenerator, ClueInput, ClueOutput } from '../contracts/ClueGenerator.js';
import type { GhostStoryGenerator, GhostStoryInput, GhostStoryOutput } from '../contracts/GhostStoryGenerator.js';
import type { TaskGenerator, TaskInput, TaskOutput } from '../contracts/TaskGenerator.js';

export function createMockGateway(): AIGateway {
  return {
    async complete(_req: AIGatewayRequest): Promise<AIGatewayResponse> {
      return { text: '{"mock": true}' };
    },
  };
}

export function createMockClueGenerator(): ClueGenerator {
  let callCount = 0;
  const mockClues = [
    { text: 'The ghost whispers: "My vessel is {trait}…"', pts: true, type: 'behavioral' as const },
    { text: 'Cold air in {room} follows someone {trait}.', pts: true, type: 'environmental' as const },
    { text: 'A note surfaces: "The possessed one is {trait}."', pts: true, type: 'task-reward' as const },
    { text: '{ghost} reaches toward the {trait} soul.', pts: true, type: 'ghostly' as const },
    { text: 'The room feels safe. Perhaps the danger is elsewhere.', pts: false, type: 'environmental' as const },
  ];
  return {
    async generate(input: ClueInput): Promise<ClueOutput> {
      const tpl = mockClues[callCount % mockClues.length]!;
      callCount++;
      const trait = input.possessedTraits?.[0] ?? input.ghostProfile.traits[0] ?? 'restless';
      return {
        text: tpl.text
          .replace(/{room}/g, input.roomName)
          .replace(/{ghost}/g, input.ghostProfile.name)
          .replace(/{trait}/g, trait),
        pointsToPossessed: tpl.pts,
        type: tpl.type,
      };
    },
  };
}

export function createMockGhostStoryGenerator(): GhostStoryGenerator {
  return {
    async generate(input: GhostStoryInput): Promise<GhostStoryOutput> {
      return {
        backstory: `The ghost ${input.archetypeName} was once a living soul, driven by ${input.motive}. Now it haunts these halls.`,
        clueStyle: 'cold whispers and flickering lights',
      };
    },
  };
}

export function createMockTaskGenerator(): TaskGenerator {
  return {
    async generate(input: TaskInput): Promise<TaskOutput> {
      return {
        name: `Investigate the ${input.roomName}`,
        description: `Search the ${input.roomName} for anything unusual. Category: ${input.category}.`,
        challenge: {
          type: 'riddle',
          prompt: 'A test riddle: What has hands but cannot clap?',
          answer: 'clock',
          hints: ['It tells time', 'It hangs on the wall'],
          flavorText: 'A ghostly voice poses a question...',
        },
      };
    },
  };
}

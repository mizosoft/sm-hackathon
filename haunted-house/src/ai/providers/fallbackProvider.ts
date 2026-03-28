/** Fallback provider using local templates. */

import type { ClueGenerator, ClueInput, ClueOutput } from '../contracts/ClueGenerator.js';
import type { GhostStoryGenerator, GhostStoryInput, GhostStoryOutput } from '../contracts/GhostStoryGenerator.js';
import type { TaskGenerator, TaskInput, TaskOutput } from '../contracts/TaskGenerator.js';
import { CLUE_TEMPLATES } from '../../content/clueTemplates.js';
import { TASK_TEMPLATES } from '../../content/taskTemplates.js';
import { pickRandom } from '../../core/utils.js';

export function createFallbackClueGenerator(rng: () => number): ClueGenerator {
  let lastIndex = -1;
  return {
    async generate(input: ClueInput): Promise<ClueOutput> {
      // Avoid repeating the same template consecutively
      let template;
      let idx;
      let attempts = 0;
      do {
        idx = Math.floor(rng() * CLUE_TEMPLATES.length);
        template = CLUE_TEMPLATES[idx]!;
        attempts++;
      } while (idx === lastIndex && CLUE_TEMPLATES.length > 1 && attempts < 5);
      lastIndex = idx;

      // Pick a trait from the possessed (ghost-preferred ∩ possessed) for the {trait} placeholder
      const ghostTraits = input.ghostProfile.traits;
      const possessedTraits = input.possessedTraits ?? [];
      const sharedTraits = possessedTraits.filter(t => ghostTraits.includes(t));
      const traitPool = sharedTraits.length > 0 ? sharedTraits : possessedTraits.length > 0 ? possessedTraits : ghostTraits;
      const trait = traitPool[Math.floor(rng() * traitPool.length)] ?? 'restless';

      return {
        text: template.text
          .replace(/{room}/g, input.roomName)
          .replace(/{ghost}/g, input.ghostProfile.name)
          .replace(/{trait}/g, trait)
          .replace(/{task}/g, input.taskName),
        pointsToPossessed: template.pointsToPossessed,
        type: template.type,
      };
    },
  };
}

export function createFallbackGhostStoryGenerator(): GhostStoryGenerator {
  return {
    async generate(input: GhostStoryInput): Promise<GhostStoryOutput> {
      return {
        backstory: `${input.archetypeName} was a tormented soul driven by ${input.motive}. Their presence still lingers, felt by those who dare enter.`,
        clueStyle: 'subtle environmental disturbances',
      };
    },
  };
}

export function createFallbackTaskGenerator(rng: () => number): TaskGenerator {
  return {
    async generate(input: TaskInput): Promise<TaskOutput> {
      const matching = TASK_TEMPLATES.filter(t => t.category === input.category);
      const pool = matching.length > 0 ? matching : TASK_TEMPLATES;
      const template = pickRandom(pool, rng);
      return {
        name: template.name.replace('{room}', input.roomName),
        description: template.description.replace('{room}', input.roomName),
        challenge: {
          ...template.challenge,
          flavorText: template.challenge.flavorText.replace('{room}', input.roomName),
        },
      };
    },
  };
}

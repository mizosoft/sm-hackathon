/** Ghost factory. */

import type { GhostProfile } from '../../core/types.js';
import type { GhostArchetype } from '../../content/ghostArchetypes.js';
import type { GhostStoryOutput } from '../../ai/contracts/GhostStoryGenerator.js';

export function createGhostProfile(
  archetype: GhostArchetype,
  story: GhostStoryOutput,
): GhostProfile {
  return {
    archetypeId: archetype.id,
    name: archetype.name,
    motive: archetype.motive,
    traits: archetype.preferredTraits,
    clueStyle: story.clueStyle || archetype.clueStyle,
    backstory: story.backstory,
  };
}

/** Ghost archetype definitions. */

export interface GhostArchetype {
  id: string;
  name: string;
  motive: string;
  preferredTraits: string[];
  clueStyle: string;
}

export const GHOST_ARCHETYPES: GhostArchetype[] = [
  {
    id: 'vengeful-lady',
    name: 'The Vengeful Lady',
    motive: 'revenge for a betrayal in life',
    preferredTraits: ['curious', 'reckless'],
    clueStyle: 'emotional echoes and cold spots',
  },
  {
    id: 'lost-child',
    name: 'The Lost Child',
    motive: 'seeking companionship in death',
    preferredTraits: ['empathetic', 'nervous'],
    clueStyle: 'toys moving and childish laughter',
  },
  {
    id: 'mad-scholar',
    name: 'The Mad Scholar',
    motive: 'protecting forbidden knowledge',
    preferredTraits: ['analytical', 'stubborn'],
    clueStyle: 'cryptic writings and book rearrangements',
  },
  {
    id: 'butler',
    name: 'The Loyal Butler',
    motive: 'maintaining order even in death',
    preferredTraits: ['cautious', 'methodical'],
    clueStyle: 'objects returned to their proper place',
  },
];

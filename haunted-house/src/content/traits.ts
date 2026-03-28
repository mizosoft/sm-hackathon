/** Player trait definitions. */

export interface TraitDefinition {
  id: string;
  label: string;
  description: string;
}

export const TRAIT_DEFINITIONS: TraitDefinition[] = [
  { id: 'curious', label: 'Curious', description: 'Drawn to investigate the unknown.' },
  { id: 'cautious', label: 'Cautious', description: 'Prefers to stay safe and observe.' },
  { id: 'reckless', label: 'Reckless', description: 'Acts first, thinks later.' },
  { id: 'empathetic', label: 'Empathetic', description: 'Sensitive to the emotions of others.' },
  { id: 'analytical', label: 'Analytical', description: 'Seeks logical explanations.' },
  { id: 'nervous', label: 'Nervous', description: 'Easily spooked and on edge.' },
  { id: 'stubborn', label: 'Stubborn', description: 'Refuses to back down once committed.' },
  { id: 'methodical', label: 'Methodical', description: 'Follows a plan step by step.' },
];

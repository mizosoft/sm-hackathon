/** Ghost story generator contract. */

export interface GhostStoryInput {
  archetypeId: string;
  archetypeName: string;
  motive: string;
  traits: string[];
}

export interface GhostStoryOutput {
  backstory: string;
  clueStyle: string;
}

export interface GhostStoryGenerator {
  generate(input: GhostStoryInput): Promise<GhostStoryOutput>;
}

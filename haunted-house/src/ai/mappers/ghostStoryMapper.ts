/** Map raw AI output to GhostStoryOutput. */

import type { GhostStoryOutput } from '../contracts/GhostStoryGenerator.js';

export function mapGhostStoryResponse(raw: string): GhostStoryOutput {
  try {
    const parsed = JSON.parse(raw);
    return {
      backstory: String(parsed.backstory ?? 'A restless spirit haunts these halls.'),
      clueStyle: String(parsed.clueStyle ?? 'cryptic whispers'),
    };
  } catch {
    return {
      backstory: 'A restless spirit haunts these halls.',
      clueStyle: 'cryptic whispers',
    };
  }
}

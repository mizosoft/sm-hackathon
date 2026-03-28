/** Map raw AI output to ClueOutput. */

import type { ClueOutput } from '../contracts/ClueGenerator.js';

export function mapClueResponse(raw: string): ClueOutput {
  try {
    // Strip markdown code fences (```json ... ```) that Gemini may wrap around responses
    const stripped = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const parsed = JSON.parse(stripped);
    return {
      text: String(parsed.text ?? 'A strange feeling lingers...'),
      pointsToPossessed: Boolean(parsed.pointsToPossessed),
      type: parsed.type ?? 'task-reward',
    };
  } catch {
    return {
      text: raw.trim() || 'A strange feeling lingers...',
      pointsToPossessed: true,
      type: 'task-reward',
    };
  }
}

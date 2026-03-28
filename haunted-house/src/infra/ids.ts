/** ID generation helpers. */

let counter = 0;

export function generateId(prefix: string): string {
  counter++;
  return `${prefix}_${counter.toString(36)}_${Date.now().toString(36)}`;
}

export function playerId(): string { return generateId('player'); }
export function roomId(slug: string): string { return slug; }
export function taskId(): string { return generateId('task'); }
export function clueId(): string { return generateId('clue'); }

/** Reset counter (for tests). */
export function resetIdCounter(): void { counter = 0; }

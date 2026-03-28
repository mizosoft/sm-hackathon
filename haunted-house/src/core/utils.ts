/** Shared pure helpers. */

/** Assert a condition; throw if false. */
export function invariant(condition: boolean, msg: string): asserts condition {
  if (!condition) throw new Error(`Invariant violation: ${msg}`);
}

/** Shuffle an array (Fisher-Yates) using provided rng. */
export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Pick a random element. */
export function pickRandom<T>(arr: readonly T[], rng: () => number): T {
  invariant(arr.length > 0, 'pickRandom called on empty array');
  return arr[Math.floor(rng() * arr.length)]!;
}

/** Group items by key. */
export function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    (result[k] ??= []).push(item);
  }
  return result;
}

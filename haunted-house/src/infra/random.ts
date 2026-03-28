/** Centralized RNG. */

export interface RandomService {
  next(): number; // 0..1
}

/** Default RNG using Math.random. */
export function createDefaultRandom(): RandomService {
  return { next: () => Math.random() };
}

/** Seedable RNG (simple LCG for deterministic tests). */
export function createSeededRandom(seed: number): RandomService {
  let s = seed;
  return {
    next() {
      s = (s * 1664525 + 1013904223) & 0x7fffffff;
      return s / 0x7fffffff;
    },
  };
}

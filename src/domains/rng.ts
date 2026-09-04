/** Small deterministic PRNG so every reload produces the same sample. */
export function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pickOne<T>(rand: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]
}

/** How far a spotlight item is through the pipeline (0..1), for the detail view reveal. */
export function stageReveal(stage: string, progress: number, stageIds: string[]): number {
  if (stage === 'done') return 1
  const i = stageIds.indexOf(stage)
  if (i < 0) return 0
  return Math.min(1, (i + progress / 100) / stageIds.length)
}

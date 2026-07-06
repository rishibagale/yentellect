import { randomVector } from './vsa';
import type { Vector } from './vsa';

const DIM = 512;

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x5bd1e995);
    h ^= h >>> 15;
  }
  return h >>> 0;
}

const MODE_NAMES = ['CONVERGENT', 'DIVERGENT', 'ANALOGICAL', 'METACOGNITIVE', 'SYSTEMS', 'DMN'];

export const modeVectors: Record<string, Vector> = {};
for (const name of MODE_NAMES) {
  modeVectors[name] = randomVector(DIM, hashSeed(name));
}

export function getModeVector(mode: string): Vector {
  const key = mode.toUpperCase();
  if (!(key in modeVectors)) {
    throw new Error(`Unknown mode: ${mode}`);
  }
  return modeVectors[key];
}
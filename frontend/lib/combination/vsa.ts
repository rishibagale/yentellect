export type Vector = number[];

export function randomVector(dim: number, seed = 42): Vector {
  const vec: number[] = new Array(dim);
  let s = seed | 0;
  const rand = () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < dim; i++) {
    const u1 = rand();
    const u2 = rand();
    vec[i] = Math.sqrt(-2 * Math.log(u1 || 1e-12)) * Math.cos(2 * Math.PI * u2);
  }
  const norm = Math.sqrt(vec.reduce((a, b) => a + b * b, 0)) || 1;
  return vec.map((x) => x / norm);
}

export function bind(a: Vector, b: Vector): Vector {
  if (a.length !== b.length) throw new Error('dim mismatch');
  const n = a.length;
  const c: Vector = new Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) {
      const k = (i - j + n) % n;
      s += a[j] * b[k];
    }
    c[i] = s / n;
  }
  return c;
}

export function unbind(c: Vector, a: Vector): Vector {
  if (a.length !== c.length) throw new Error('dim mismatch');
  const n = a.length;
  const b: Vector = new Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) {
      const k = (j - i + n) % n;
      s += c[j] * a[k];
    }
    b[i] = s / n;
  }
  return b;
}

export function bundle(a: Vector, b: Vector): Vector {
  if (a.length !== b.length) throw new Error('dim mismatch');
  return a.map((v, i) => v + b[i]);
}

export function similarity(a: Vector, b: Vector): number {
  if (a.length !== b.length) throw new Error('dim mismatch');
  let dot = 0;
  let nA = 0;
  let nB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    nA += a[i] * a[i];
    nB += b[i] * b[i];
  }
  const d = Math.sqrt(nA) * Math.sqrt(nB);
  return d === 0 ? 0 : dot / d;
}

export function cleanup(query: Vector, vocabulary: Vector[]): { vector: Vector; index: number; score: number } | null {
  let bestIdx = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < vocabulary.length; i++) {
    const score = similarity(query, vocabulary[i]);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  if (bestIdx === -1 || bestScore < 0.1) return null;
  return { vector: vocabulary[bestIdx], index: bestIdx, score: bestScore };
}
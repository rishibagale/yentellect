"""
Vector Symbolic Architecture (VSA) / Holographic Reduced Representations
Pure Python implementation matching the TypeScript version.
Circular convolution binding with deterministic seeded vectors.
"""

import math
import struct
from typing import List, Optional, Tuple

Vector = List[float]


def _hash_seed(name: str) -> int:
    """Deterministic integer seed from string name (Jenkins one-at-a-time)."""
    h = 0
    for c in name:
        h = (h ^ ord(c)) & 0xFFFFFFFF
        h = (h ^ (h >> 15)) & 0xFFFFFFFF
        h = (h * 0x5bd1e995) & 0xFFFFFFFF
        h = h ^ (h >> 15)
    return h


def _rand(seed: int):
    """Mulberry32 PRNG seeded generator."""
    s = seed | 0
    while True:
        s = (s + 0x6D2B79F5) & 0xFFFFFFFF
        t = (s ^ (s >> 15)) & 0xFFFFFFFF
        t = (t ^ (t << 1)) & 0xFFFFFFFF
        t = (t + (t >> 7)) & 0xFFFFFFFF
        yield ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0


def random_vector(dim: int, seed: int = 42) -> Vector:
    """Generate a normalized random vector using seeded PRNG."""
    gen = _rand(seed)
    vec: Vector = []
    for _ in range(dim):
        u1 = next(gen)
        u2 = next(gen)
        val = math.sqrt(-2.0 * math.log(max(u1, 1e-12))) * math.cos(2.0 * math.pi * u2)
        vec.append(val)
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


def bind(a: Vector, b: Vector) -> Vector:
    """Circular convolution binding."""
    n = len(a)
    if len(b) != n:
        raise ValueError(f"Dimension mismatch: {len(a)} != {len(b)}")
    c: Vector = [0.0] * n
    for i in range(n):
        s = 0.0
        for j in range(n):
            k = (i - j) % n
            s += a[j] * b[k]
        c[i] = s / n
    return c


def unbind(c: Vector, a: Vector) -> Vector:
    """Correlation unbinding."""
    n = len(a)
    if len(c) != n:
        raise ValueError(f"Dimension mismatch: {len(c)} != {len(a)}")
    b: Vector = [0.0] * n
    for i in range(n):
        s = 0.0
        for j in range(n):
            k = (j - i) % n
            s += c[j] * a[k]
        b[i] = s / n
    return b


def bundle(a: Vector, b: Vector) -> Vector:
    """Element-wise addition."""
    if len(a) != len(b):
        raise ValueError(f"Dimension mismatch: {len(a)} != {len(b)}")
    return [x + y for x, y in zip(a, b)]


def similarity(a: Vector, b: Vector) -> float:
    """Cosine similarity."""
    if len(a) != len(b):
        raise ValueError(f"Dimension mismatch: {len(a)} != {len(b)}")
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    denom = norm_a * norm_b
    if denom == 0:
        return 0.0
    return dot / denom


# Mode vectors (deterministic, 512 dim each)
MODE_NAMES = ["CONVERGENT", "DIVERGENT", "ANALOGICAL", "METACOGNITIVE", "SYSTEMS", "DMN"]
MODE_VECTORS: dict[str, Vector] = {}
for name in MODE_NAMES:
    MODE_VECTORS[name] = random_vector(512, _hash_seed(name))


def get_mode_vector(mode: str) -> Vector:
    """Return the fixed vector for a cognitive mode."""
    key = mode.upper()
    if key not in MODE_VECTORS:
        raise ValueError(f"Unknown mode: {mode}")
    return MODE_VECTORS[key]


def compute_session_vector(modes_activated: List[str]) -> Vector:
    """
    Compute a single composite vector for a session.
    If 2+ modes are activated, bind the top two.
    If only one mode, use that mode's vector directly.
    """
    modes = [m.upper() for m in modes_activated if m.upper() in MODE_VECTORS]
    modes = modes[:2]  # only top 1 or 2
    if len(modes) == 0:
        return get_mode_vector("CONVERGENT")
    if len(modes) == 1:
        return get_mode_vector(modes[0])
    return bind(get_mode_vector(modes[0]), get_mode_vector(modes[1]))


# Maps each thinking mode to its characteristic signal dimension
_MODE_SIGNAL_MAP: dict[str, str] = {
    "CONVERGENT": "sentence_complexity",
    "DIVERGENT": "ideational_fluency",
    "ANALOGICAL": "cross_domain_refs",
    "METACOGNITIVE": "hedge_word_rate",
    "SYSTEMS": "sentence_complexity",
    "DMN": "first_person_rate",
}


def compute_enriched_session_vector(
    modes_activated: List[str],
    signal_history: Optional[List[dict]] = None,
) -> Vector:
    """
    Compute a session vector weighted by average signal strength per mode.

    Each mode's contribution is scaled by its characteristic behavioral signal
    intensity across turns, giving a richer representation than binary activation.
    Falls back to the basic ``compute_session_vector`` when no signal history
    is available.
    """
    if not signal_history:
        return compute_session_vector(modes_activated)

    modes = [m.upper() for m in modes_activated if m.upper() in MODE_VECTORS][:2]
    if not modes:
        return get_mode_vector("CONVERGENT")

    weighted: list[Vector] = []
    for mode in modes:
        signal_key = _MODE_SIGNAL_MAP.get(mode, "type_token_ratio")
        avg_signal = sum(s.get(signal_key, 0.5) for s in signal_history) / max(len(signal_history), 1)
        weight = max(0.3, min(1.0, avg_signal))
        weighted.append([x * weight for x in MODE_VECTORS[mode]])

    if len(weighted) == 1:
        return weighted[0]
    return bundle(weighted[0], weighted[1])
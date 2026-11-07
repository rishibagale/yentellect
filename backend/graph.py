"""
Mathematical Graph Observables and Operators on Active Support V+.

Implements:
1. Active Support and Stub-Weight Adjacency (W_uu = 2 * w_loop(u))
2. Multiscale Random-Walk Observables (H_c, h_rate, lambda_2, lambda_2..5)
3. Degree-Preserving Graph Coarsening Operator (u (+) v)
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Hashable, Sequence
import math
import networkx as nx
import numpy as np
from scipy.linalg import eigh


@dataclass(frozen=True)
class GraphObservables:
    """Multiscale random-walk observables on active support V+."""
    m: int                     # Number of active nodes |V^+|
    D: float                   # Total volume / weighted degree sum
    H_c: float                 # Stationary entropy (salience concentration)
    h_rate: float              # Entropy rate (local transition complexity)
    lambda_2: float            # Normalized spectral gap of L_sym
    lambda_2_5: list[float]    # Up to 4 eigenvalues [lambda_2, ..., lambda_min(m, 5)]


def adjacency_with_self_loop_stubs(
    G: nx.Graph,
    active_nodes: Sequence[Hashable],
) -> np.ndarray:
    """
    Construct symmetric weight matrix W on active nodes using stub-weight convention:
    - For u != v: W[u, v] = w_{uv}
    - For u == v: W[u, u] = 2 * w_{loop}(u) (two incident stubs per undirected self-loop)
    """
    m = len(active_nodes)
    node_to_idx = {node: i for i, node in enumerate(active_nodes)}
    W = np.zeros((m, m), dtype=np.float64)

    for i, u in enumerate(active_nodes):
        for v, edge_data in G[u].items():
            if v in node_to_idx:
                j = node_to_idx[v]
                weight = float(edge_data.get("weight", 1.0))
                if i == j:
                    W[i, i] = 2.0 * weight
                else:
                    W[i, j] = weight
                    W[j, i] = weight

    return W


def compute_observables(G: nx.Graph) -> GraphObservables:
    """
    Compute multiscale random-walk observables on active support V+:
    - V^+ = {u in V : d(u) > 0}
    - Stationary Distributional Complexity: H_c(G) = -sum_{u in V^+} pi(u) log2 pi(u)
    - Local Transition Complexity: h_rate(G) = -sum_{u in V^+} pi(u) sum_{v in V^+} P_{uv} log2 P_{uv}
    - Normalized Spectral Gap: lambda_2(L_sym) and multi-cluster vector (lambda_2..5)
    """
    # Active support: nodes with weighted degree > 0
    active_nodes = [n for n, deg in G.degree(weight="weight") if deg > 0]
    m = len(active_nodes)

    if m == 0:
        return GraphObservables(
            m=0, D=0.0, H_c=0.0, h_rate=0.0, lambda_2=0.0, lambda_2_5=[]
        )

    W = adjacency_with_self_loop_stubs(G, active_nodes)
    d = W.sum(axis=1)
    D = float(d.sum())

    if D <= 0.0 or m == 1:
        return GraphObservables(
            m=m, D=D, H_c=0.0, h_rate=0.0, lambda_2=0.0, lambda_2_5=[]
        )

    # Stationary distribution pi(u) = d(u) / D
    pi = d / D

    # 1. Stationary Distributional Complexity H_c
    H_c = float(-np.sum([p * math.log2(p) for p in pi if p > 0.0]))

    # 2. Local Transition Complexity (Entropy rate)
    # h_rate = -sum_{u} pi(u) sum_{v} P_{uv} log2(P_{uv}), where P_{uv} = W_{uv} / d(u)
    h_rate = 0.0
    for i in range(m):
        d_i = d[i]
        if d_i > 0.0 and pi[i] > 0.0:
            row = W[i]
            row_entropy = 0.0
            for w in row:
                if w > 0.0:
                    p_uv = w / d_i
                    row_entropy -= p_uv * math.log2(p_uv)
            h_rate += pi[i] * row_entropy

    # 3. Global Mixing Bottleneck / Spectral Gap
    # L_sym = I - D^{-1/2} W D^{-1/2}
    inv_sqrt_d = 1.0 / np.sqrt(d)
    L_sym = np.eye(m) - (inv_sqrt_d[:, None] * W * inv_sqrt_d[None, :])
    # Enforce exact symmetry numerically
    L_sym = 0.5 * (L_sym + L_sym.T)

    evals = eigh(L_sym, eigvals_only=True)
    evals = np.sort(evals)

    lambda_2 = float(np.clip(evals[1], 0.0, 2.0)) if m >= 2 else 0.0
    lambda_2_5 = [float(np.clip(ev, 0.0, 2.0)) for ev in evals[1:min(m, 5)]]

    return GraphObservables(
        m=m,
        D=D,
        H_c=H_c,
        h_rate=h_rate,
        lambda_2=lambda_2,
        lambda_2_5=lambda_2_5,
    )


def coarsen_nodes(
    G: nx.Graph,
    u: Hashable,
    v: Hashable,
    merged_node: Hashable | None = None,
) -> nx.Graph:
    """
    Degree-preserving coarsening operator (u (+) v).
    - Merges u and v into z = merged_node (or u if None).
    - External edges: w_{zx} = w_{ux} + w_{vx}.
    - Internal edge and self-loops: w_{loop}(z) = w_{loop}(u) + w_{loop}(v) + w_{uv}.
    - Preserves degrees: d'(z) = d(u) + d(v), D' = D.
    """
    G_out = G.copy()
    if u not in G_out or v not in G_out:
        return G_out
    if u == v:
        return G_out

    z = merged_node if merged_node is not None else u

    # Calculate internal loop weight
    w_loop_u = float(G_out.get_edge_data(u, u, {}).get("weight", 0.0))
    w_loop_v = float(G_out.get_edge_data(v, v, {}).get("weight", 0.0))
    w_uv = float(G_out.get_edge_data(u, v, {}).get("weight", 0.0))
    w_loop_z = w_loop_u + w_loop_v + w_uv

    # Calculate external edge weights
    external_weights: dict[Hashable, float] = {}
    for nbr, dat in G_out[u].items():
        if nbr not in (u, v):
            external_weights[nbr] = external_weights.get(nbr, 0.0) + float(dat.get("weight", 1.0))
    for nbr, dat in G_out[v].items():
        if nbr not in (u, v):
            external_weights[nbr] = external_weights.get(nbr, 0.0) + float(dat.get("weight", 1.0))

    # Remove u and v from G_out
    G_out.remove_node(u)
    if v != u and v in G_out:
        G_out.remove_node(v)

    # Add merged node z
    G_out.add_node(z)
    for nbr, w in external_weights.items():
        G_out.add_edge(z, nbr, weight=w)

    if w_loop_z > 0.0:
        G_out.add_edge(z, z, weight=w_loop_z)

    return G_out


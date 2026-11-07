"""
Cognitive Graph Orchestrator and Dynamic Regime Classifier.

Tracks temporal derivatives (Delta H_t, Delta h_rate, Delta lambda_2),
classifies cognitive regimes (INACTIVE, FIXATED, COMPARTMENTALIZED, RIGID_ROUTINE, INTEGRATED),
and discovers spectral bridges using the harmonic Fiedler potential.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Hashable
import math
import networkx as nx
import numpy as np
try:
    from scipy.linalg import eigh
except ImportError:
    from numpy.linalg import eigh  # type: ignore

from backend.graph import (
    GraphObservables,
    adjacency_with_self_loop_stubs,
    coarsen_nodes,
    compute_observables,
)


class CognitiveRegime(str, Enum):
    INACTIVE = "INACTIVE"
    FIXATED = "FIXATED"                           # Low normalized H_c: salience concentrated in few hubs
    COMPARTMENTALIZED = "COMPARTMENTALIZED"       # Low lambda_2: disconnected or weakly bridged silos
    RIGID_ROUTINE = "RIGID_ROUTINE"               # High H_c, high lambda_2, but low h_rate (deterministic paths)
    INTEGRATED = "INTEGRATED"                     # Balanced salience, strong mixing (lambda_2), rich transitions


@dataclass(frozen=True)
class StepDiagnostics:
    step: int
    observables: GraphObservables
    H_c_norm: float
    h_rate_norm: float
    delta_H_c: float
    delta_h_rate: float
    delta_lambda_2: float
    num_components: int
    regime: CognitiveRegime


@dataclass(frozen=True)
class BridgeRecommendation:
    node_u: Hashable
    node_v: Hashable
    fiedler_gap: float


@dataclass
class OrchestratorConfig:
    decay_gamma: float = 1.0            # Multiplicative weight persistence per step (1.0 = no decay)
    fixation_threshold: float = 0.55    # H_c / log2(m) below this -> FIXATED
    bottleneck_threshold: float = 0.15  # lambda_2 below this -> COMPARTMENTALIZED
    rigidity_threshold: float = 0.35    # h_rate / log2(m) below this -> RIGID_ROUTINE


class CognitiveGraphOrchestrator:
    """
    Stateful orchestrator managing the lifecycle of the cognitive graph G = (V, E, W),
    computing multiscale random-walk observables (H_c, h_rate, lambda_2, lambda_2..5),
    tracking temporal derivatives (Delta H_t), classifying cognitive regimes, and
    executing degree-preserving coarsening or spectral bridge discovery.
    """

    def __init__(
        self,
        initial_graph: nx.Graph | None = None,
        config: OrchestratorConfig | None = None,
    ) -> None:
        self.G: nx.Graph = initial_graph.copy() if initial_graph is not None else nx.Graph()
        self.config: OrchestratorConfig = config or OrchestratorConfig()
        self.history: list[StepDiagnostics] = []
        self._step: int = 0

    def apply_decay(self) -> None:
        """Scale all edge weights by gamma in (0, 1]. By C-1.7, uniform scaling alone preserves H_c, h_rate, lambda_2."""
        gamma = self.config.decay_gamma
        if gamma == 1.0:
            return
        if gamma <= 0.0 or gamma > 1.0:
            raise ValueError("decay_gamma must be in (0, 1].")
        for _, _, data in self.G.edges(data=True):
            data["weight"] = float(data.get("weight", 1.0)) * gamma

    def record_interaction(
        self,
        u: Hashable,
        v: Hashable,
        delta_w: float = 1.0,
    ) -> None:
        """
        Add or reinforce an undirected association weight w_{uv} <- w_{uv} + delta_w.
        """
        if delta_w < 0.0:
            raise ValueError("Association weight increment delta_w must be non-negative.")
        if delta_w == 0.0:
            return
        if self.G.has_edge(u, v):
            self.G[u][v]["weight"] = float(self.G[u][v].get("weight", 0.0)) + delta_w
        else:
            self.G.add_edge(u, v, weight=float(delta_w))

    def ingest_cooccurrence_window(
        self,
        concepts: list[Hashable],
        window_size: int = 2,
        base_weight: float = 1.0,
    ) -> StepDiagnostics:
        """
        Ingest an ordered sequence of activated concepts within a sliding window,
        update edge weights, and record a diagnostic snapshot.
        """
        self.apply_decay()
        n = len(concepts)
        for i in range(n):
            for j in range(i + 1, min(i + 1 + window_size, n)):
                u, v = concepts[i], concepts[j]
                if u != v:
                    dist = j - i
                    self.record_interaction(u, v, delta_w=base_weight / dist)
        return self.snapshot()

    def merge_concepts(
        self,
        u: Hashable,
        v: Hashable,
        merged_node: Hashable | None = None,
    ) -> tuple[StepDiagnostics, float]:
        """
        Execute the degree-preserving coarsening operator (u (+) v) from Claim C-1.3b
        and return (new_diagnostics, theoretical_entropy_drop_bits).
        """
        active_nodes = [n for n, deg in self.G.degree(weight="weight") if deg > 0]
        if u in active_nodes and v in active_nodes and u != v:
            W = adjacency_with_self_loop_stubs(self.G, active_nodes)
            d = W.sum(axis=1)
            D = float(d.sum())
            idx_u = active_nodes.index(u)
            idx_v = active_nodes.index(v)
            pi_u = float(d[idx_u] / D)
            pi_v = float(d[idx_v] / D)
            q = pi_u / (pi_u + pi_v)
            h2_q = -q * math.log2(q) - (1.0 - q) * math.log2(1.0 - q) if 0.0 < q < 1.0 else 0.0
            theoretical_drop = (pi_u + pi_v) * h2_q
        else:
            theoretical_drop = 0.0

        self.G = coarsen_nodes(self.G, u, v, merged_node=merged_node)
        diag = self.snapshot()
        return diag, theoretical_drop

    def classify_regime(
        self,
        obs: GraphObservables,
        H_c_norm: float,
        h_rate_norm: float,
        num_components: int,
    ) -> CognitiveRegime:
        if obs.m < 2:
            return CognitiveRegime.INACTIVE
        if num_components > 1 or obs.lambda_2 < self.config.bottleneck_threshold:
            return CognitiveRegime.COMPARTMENTALIZED
        if H_c_norm < self.config.fixation_threshold:
            return CognitiveRegime.FIXATED
        if h_rate_norm < self.config.rigidity_threshold:
            return CognitiveRegime.RIGID_ROUTINE
        return CognitiveRegime.INTEGRATED

    def snapshot(self) -> StepDiagnostics:
        """Compute current graph observables, temporal deltas, and cognitive regime."""
        self._step += 1
        obs = compute_observables(self.G)

        active_nodes = [u for u, deg in self.G.degree(weight="weight") if deg > 0]
        if len(active_nodes) > 0:
            G_act = self.G.subgraph(active_nodes)
            num_components = nx.number_connected_components(G_act)
        else:
            num_components = 0

        if obs.m >= 2:
            log2_m = math.log2(obs.m)
            H_c_norm = obs.H_c / log2_m
            h_rate_norm = obs.h_rate / log2_m
        else:
            H_c_norm = 0.0
            h_rate_norm = 0.0

        if self.history:
            prev = self.history[-1].observables
            delta_H_c = obs.H_c - prev.H_c
            delta_h_rate = obs.h_rate - prev.h_rate
            delta_lambda_2 = obs.lambda_2 - prev.lambda_2
        else:
            delta_H_c = 0.0
            delta_h_rate = 0.0
            delta_lambda_2 = 0.0

        regime = self.classify_regime(obs, H_c_norm, h_rate_norm, num_components)
        diag = StepDiagnostics(
            step=self._step,
            observables=obs,
            H_c_norm=H_c_norm,
            h_rate_norm=h_rate_norm,
            delta_H_c=delta_H_c,
            delta_h_rate=delta_h_rate,
            delta_lambda_2=delta_lambda_2,
            num_components=num_components,
            regime=regime,
        )
        self.history.append(diag)
        return diag

    def recommend_spectral_bridge(self) -> BridgeRecommendation | None:
        """
        Identify the pair of non-adjacent concepts (u, v) in V+ that maximally
        increases the spectral gap lambda_2(L_sym) to heal a bottleneck cut,
        using the Fiedler vector (eigenvector of lambda_2).
        """
        active_nodes = [u for u, deg in self.G.degree(weight="weight") if deg > 0]
        m = len(active_nodes)
        if m < 3:
            return None

        W = adjacency_with_self_loop_stubs(self.G, active_nodes)
        d = W.sum(axis=1)
        inv_sqrt_d = np.diag(1.0 / np.sqrt(d))
        L_sym = np.eye(m) - inv_sqrt_d @ W @ inv_sqrt_d

        evals, evecs = eigh(L_sym)
        # Fiedler potential f = D^{-1/2} psi_2
        psi_2 = evecs[:, 1]
        f_pot = psi_2 / np.sqrt(d)

        # Find non-adjacent nodes at opposite extremes of the Fiedler potential
        best_pair = None
        best_gap = -1.0
        for i in range(m):
            for j in range(i + 1, m):
                if W[i, j] == 0.0:
                    gap = float(abs(f_pot[i] - f_pot[j]))
                    if gap > best_gap:
                        best_gap = gap
                        best_pair = (active_nodes[i], active_nodes[j])

        if best_pair is None:
            return None
        return BridgeRecommendation(node_u=best_pair[0], node_v=best_pair[1], fiedler_gap=best_gap)


import math
import networkx as nx
import numpy as np
import pytest

from backend.graph import coarsen_nodes, compute_observables
from backend.orchestrator import (
    CognitiveGraphOrchestrator,
    CognitiveRegime,
    OrchestratorConfig,
)


def binary_entropy(q: float) -> float:
    if q <= 0.0 or q >= 1.0:
        return 0.0
    return -q * math.log2(q) - (1.0 - q) * math.log2(1.0 - q)


class TestSpectralGapLambda2:
    def test_k5_spectral_gap(self):
        G = nx.complete_graph(5)
        obs = compute_observables(G)
        assert obs.lambda_2 == pytest.approx(1.25, abs=1e-12)
        assert all(lam == pytest.approx(1.25, abs=1e-12) for lam in obs.lambda_2_5)

    def test_c6_spectral_gap(self):
        G = nx.cycle_graph(6)
        obs = compute_observables(G)
        assert obs.lambda_2 == pytest.approx(0.5, abs=1e-12)

    def test_p3_spectral_gap(self):
        G = nx.path_graph(["a", "b", "c"])
        obs = compute_observables(G)
        assert obs.lambda_2 == pytest.approx(1.0, abs=1e-12)


class TestP3CoarseningAndEntropyIdentities:
    @pytest.fixture
    def p3_graph(self) -> nx.Graph:
        G = nx.Graph()
        G.add_edge("a", "b", weight=1.0)
        G.add_edge("b", "c", weight=1.0)
        return G

    def test_p3_before_merge(self, p3_graph: nx.Graph):
        obs = compute_observables(p3_graph)
        assert obs.m == 3
        assert obs.D == pytest.approx(4.0, abs=1e-12)
        assert obs.H_c == pytest.approx(1.5, abs=1e-12)
        assert obs.h_rate == pytest.approx(0.5, abs=1e-12)
        assert obs.lambda_2 == pytest.approx(1.0, abs=1e-12)

    def test_p3_after_merging_b_and_c(self, p3_graph: nx.Graph):
        before = compute_observables(p3_graph)
        merged_G = coarsen_nodes(p3_graph, "b", "c", merged_node="bc")
        after = compute_observables(merged_G)

        assert after.m == 2
        assert after.D == pytest.approx(4.0, abs=1e-12)
        assert merged_G.degree("a", weight="weight") == pytest.approx(1.0, abs=1e-12)
        assert merged_G.degree("bc", weight="weight") == pytest.approx(3.0, abs=1e-12)

        expected_Hc = 2.0 - 0.75 * math.log2(3.0)
        assert after.H_c == pytest.approx(expected_Hc, abs=1e-12)
        assert after.H_c == pytest.approx(0.8113, abs=1e-4)

        expected_hrate = 0.75 * binary_entropy(1.0 / 3.0)
        assert after.h_rate == pytest.approx(expected_hrate, abs=1e-12)
        assert after.h_rate == pytest.approx(0.6887, abs=1e-4)

        pi_b, pi_c = 0.5, 0.25
        expected_drop = (pi_b + pi_c) * binary_entropy(pi_b / (pi_b + pi_c))
        assert (before.H_c - after.H_c) == pytest.approx(expected_drop, abs=1e-12)


class TestStarAndRegularTopologySeparation:
    @pytest.mark.parametrize("n_leaves", [2, 3, 4, 8, 16, 32])
    def test_star_graph_with_n_leaves(self, n_leaves: int):
        G = nx.star_graph(n_leaves)
        obs = compute_observables(G)

        expected_Hc = 1.0 + 0.5 * math.log2(n_leaves)
        expected_hrate = 0.5 * math.log2(n_leaves)

        assert obs.D == pytest.approx(2.0 * n_leaves, abs=1e-12)
        assert obs.H_c == pytest.approx(expected_Hc, abs=1e-12)
        assert obs.h_rate == pytest.approx(expected_hrate, abs=1e-12)
        assert obs.lambda_2 == pytest.approx(1.0, abs=1e-12)

    def test_c6_vs_k6_same_Hc_different_hrate(self):
        obs_c6 = compute_observables(nx.cycle_graph(6))
        obs_k6 = compute_observables(nx.complete_graph(6))

        expected_Hc = math.log2(6.0)
        assert obs_c6.H_c == pytest.approx(expected_Hc, abs=1e-12)
        assert obs_k6.H_c == pytest.approx(expected_Hc, abs=1e-12)
        assert obs_c6.h_rate == pytest.approx(1.0, abs=1e-12)
        assert obs_k6.h_rate == pytest.approx(math.log2(5.0), abs=1e-12)
        assert obs_c6.lambda_2 == pytest.approx(0.5, abs=1e-12)
        assert obs_k6.lambda_2 == pytest.approx(1.2, abs=1e-12)


class TestActiveSupportAndScaleInvariance:
    def test_isolated_ghost_nodes_do_not_change_observables(self):
        G = nx.cycle_graph(6)
        obs_clean = compute_observables(G)

        G_ghost = G.copy()
        for g_id in range(100, 150):
            G_ghost.add_node(g_id)

        obs_ghost = compute_observables(G_ghost)
        assert obs_ghost.m == obs_clean.m == 6
        assert obs_ghost.D == pytest.approx(obs_clean.D, abs=1e-12)
        assert obs_ghost.H_c == pytest.approx(obs_clean.H_c, abs=1e-12)
        assert obs_ghost.h_rate == pytest.approx(obs_clean.h_rate, abs=1e-12)
        assert obs_ghost.lambda_2 == pytest.approx(obs_clean.lambda_2, abs=1e-12)

    @pytest.mark.parametrize("scale_c", [0.05, 2.5, 13.7])
    def test_positive_weight_scaling_invariance(self, scale_c: float):
        rng = np.random.default_rng(7)
        G = nx.karate_club_graph()
        G_scaled = nx.Graph()
        for u, v in G.edges():
            w = float(rng.uniform(0.5, 4.0))
            G[u][v]["weight"] = w
            G_scaled.add_edge(u, v, weight=scale_c * w)

        obs_base = compute_observables(G)
        obs_scaled = compute_observables(G_scaled)

        assert obs_scaled.D == pytest.approx(scale_c * obs_base.D, rel=1e-12)
        assert obs_scaled.H_c == pytest.approx(obs_base.H_c, abs=1e-12)
        assert obs_scaled.h_rate == pytest.approx(obs_base.h_rate, abs=1e-12)
        assert obs_scaled.lambda_2 == pytest.approx(obs_base.lambda_2, abs=1e-12)


class TestOrchestratorLifecycle:
    def test_barbell_bottleneck_bridge_and_coarsening(self):
        G_barbell = nx.Graph()
        for i in range(4):
            for j in range(i + 1, 4):
                G_barbell.add_edge(f"A{i}", f"A{j}", weight=2.0)
                G_barbell.add_edge(f"B{i}", f"B{j}", weight=2.0)
        G_barbell.add_edge("A0", "B0", weight=0.05)

        orch = CognitiveGraphOrchestrator(G_barbell)
        diag1 = orch.snapshot()
        assert diag1.regime == CognitiveRegime.COMPARTMENTALIZED
        assert diag1.observables.lambda_2 < 0.01

        bridge = orch.recommend_spectral_bridge()
        assert bridge is not None
        orch.record_interaction(bridge.node_u, bridge.node_v, delta_w=4.0)
        diag2 = orch.snapshot()
        assert diag2.regime == CognitiveRegime.INTEGRATED
        assert diag2.delta_lambda_2 > 0.15

        diag3, expected_drop = orch.merge_concepts("A2", "A3", merged_node="A2_3")
        assert diag3.observables.D == pytest.approx(diag2.observables.D, abs=1e-12)
        assert diag3.delta_H_c == pytest.approx(-expected_drop, abs=1e-12)


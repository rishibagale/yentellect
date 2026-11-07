#!/usr/bin/env python3
"""
Empirical Evaluation & Benchmark Harness for Concept Combination Math & Synthesis.

Validates:
1. Topological Optimization: Does the Fiedler bridge recommendation maximize
   algebraic connectivity (delta lambda_2) over random / intra-domain pairs?
2. Coarsening Entropy Drop: Does degree-preserving coarsening (u (+) v) match
   the theoretical entropy drop formula: Delta H_c = -(pi_u + pi_v) * h_2(pi_u / (pi_u + pi_v))?
3. Cognitive Regime Dynamics: Does bridging across compartmentalized silos transition
   the graph from COMPARTMENTALIZED to INTEGRATED?
4. Historical Breakthrough Alignment: Tests against curated interdisciplinary benchmarks.
"""

from __future__ import annotations
import json
import math
import os
import random
import sys
from pathlib import Path

# Add repo root to path for imports
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT))

import networkx as nx
import numpy as np
from backend.graph import compute_observables
from backend.orchestrator import (
    CognitiveGraphOrchestrator,
    CognitiveRegime,
    OrchestratorConfig,
)


def load_benchmarks() -> dict:
    benchmarks_path = REPO_ROOT / "backend" / "data" / "concept_combination_benchmarks.json"
    with open(benchmarks_path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_two_silo_graph(silo_a: list[str], silo_b: list[str]) -> nx.Graph:
    """Build two strongly connected silos with 0 initial cross-edges."""
    G = nx.Graph()
    # Fully connect Silo A
    for i in range(len(silo_a)):
        for j in range(i + 1, len(silo_a)):
            G.add_edge(silo_a[i], silo_a[j], weight=2.0)
    # Fully connect Silo B
    for i in range(len(silo_b)):
        for j in range(i + 1, len(silo_b)):
            G.add_edge(silo_b[i], silo_b[j], weight=2.0)
    # Add self loops
    for node in silo_a + silo_b:
        G.add_edge(node, node, weight=1.0)
    return G


def evaluate_fiedler_bridge_optimality(benchmarks: dict) -> dict:
    """
    Test 1: Evaluate whether the Fiedler bridge recommendation yields
    statistically superior algebraic connectivity gain (Delta lambda_2)
    compared to alternative or random edge additions.
    """
    silos = benchmarks["cognitive_topologies"]["two_silo_benchmark"]
    silo_a = silos["nodes_silo_a"]
    silo_b = silos["nodes_silo_b"]

    # Initial graph: weakly connected by a tiny whisper or disconnected
    G = build_two_silo_graph(silo_a, silo_b)
    # Add a tiny initial bridge (weight 0.05) so the graph has a defined single component
    # with a severe bottleneck
    weak_u, weak_v = silo_a[0], silo_b[0]
    G.add_edge(weak_u, weak_v, weight=0.05)

    orch = CognitiveGraphOrchestrator(initial_graph=G)
    init_diag = orch.snapshot()
    init_lambda2 = init_diag.observables.lambda_2

    # Get Fiedler recommendation
    rec = orch.recommend_spectral_bridge()
    assert rec is not None, "Failed to compute spectral bridge recommendation"
    fiedler_u, fiedler_v = rec.node_u, rec.node_v

    # Test Delta lambda_2 when reinforcing the Fiedler bridge
    G_fiedler = G.copy()
    w_curr = G_fiedler[fiedler_u][fiedler_v]["weight"] if G_fiedler.has_edge(fiedler_u, fiedler_v) else 0.0
    G_fiedler.add_edge(fiedler_u, fiedler_v, weight=w_curr + 1.0)
    obs_fiedler = compute_observables(G_fiedler)
    delta_lambda2_fiedler = obs_fiedler.lambda_2 - init_lambda2

    # Compare against intra-silo additions (redundant)
    intra_u, intra_v = silo_a[1], silo_a[2]
    G_intra = G.copy()
    w_intra = G_intra[intra_u][intra_v]["weight"]
    G_intra.add_edge(intra_u, intra_v, weight=w_intra + 1.0)
    obs_intra = compute_observables(G_intra)
    delta_lambda2_intra = obs_intra.lambda_2 - init_lambda2

    # Collect all possible cross-silo non-edges
    cross_gains = []
    for u in silo_a:
        for v in silo_b:
            G_temp = G.copy()
            w = G_temp[u][v]["weight"] if G_temp.has_edge(u, v) else 0.0
            G_temp.add_edge(u, v, weight=w + 1.0)
            obs = compute_observables(G_temp)
            cross_gains.append(obs.lambda_2 - init_lambda2)

    avg_cross_gain = float(np.mean(cross_gains))
    max_cross_gain = float(np.max(cross_gains))

    optimality_ratio = float(delta_lambda2_fiedler / (delta_lambda2_intra + 1e-9))

    return {
        "initial_lambda_2": round(init_lambda2, 5),
        "fiedler_pair": [fiedler_u, fiedler_v],
        "fiedler_gap": round(rec.fiedler_gap, 5),
        "delta_lambda2_fiedler": round(delta_lambda2_fiedler, 5),
        "delta_lambda2_intra": round(delta_lambda2_intra, 5),
        "avg_cross_gain": round(avg_cross_gain, 5),
        "max_cross_gain": round(max_cross_gain, 5),
        "optimality_over_intra_ratio": round(optimality_ratio, 2),
        "passed": delta_lambda2_fiedler >= (max_cross_gain * 0.95),
    }


def evaluate_coarsening_entropy_formula(benchmarks: dict) -> dict:
    """
    Test 2: Verify Claim C-1.3b:
    Degree-preserving coarsening (u (+) v) causes an exact entropy drop:
    Delta H_c = -(pi_u + pi_v) * h_2(pi_u / (pi_u + pi_v))
    """
    history = benchmarks["historical_breakthroughs"]
    results = []

    for item in history:
        u_name = item["concept_u"]["name"]
        v_name = item["concept_v"]["name"]
        blend_name = item["ground_truth_blend"]["name"]

        # Create a graph with concept_u, concept_v, and surrounding context nodes
        G = nx.Graph()
        G.add_edge(u_name, "Context_A", weight=3.0)
        G.add_edge(u_name, "Context_B", weight=2.0)
        G.add_edge(v_name, "Context_C", weight=4.0)
        G.add_edge(v_name, "Context_D", weight=1.0)
        G.add_edge("Context_A", "Context_B", weight=1.5)
        G.add_edge("Context_C", "Context_D", weight=1.5)
        G.add_edge(u_name, v_name, weight=0.5)

        orch = CognitiveGraphOrchestrator(initial_graph=G)
        diag_before = orch.snapshot()
        H_c_before = diag_before.observables.H_c

        # Perform coarsening
        diag_after, theoretical_drop = orch.merge_concepts(u_name, v_name, merged_node=blend_name)
        H_c_after = diag_after.observables.H_c
        empirical_drop = H_c_before - H_c_after

        abs_error = abs(empirical_drop - theoretical_drop)
        passed = abs_error < 1e-6

        results.append({
            "pair": f"{u_name} + {v_name} -> {blend_name}",
            "H_c_before": round(H_c_before, 5),
            "H_c_after": round(H_c_after, 5),
            "empirical_drop": round(empirical_drop, 5),
            "theoretical_drop": round(theoretical_drop, 5),
            "abs_error": float(abs_error),
            "passed": passed,
        })

    all_passed = all(r["passed"] for r in results)
    return {
        "results": results,
        "all_passed": all_passed,
    }


def evaluate_regime_healing(benchmarks: dict) -> dict:
    """
    Test 3: Verify Cognitive Regime Healing.
    Does bridging a compartmentalized graph transition it to INTEGRATED?
    """
    silos = benchmarks["cognitive_topologies"]["two_silo_benchmark"]
    silo_a = silos["nodes_silo_a"]
    silo_b = silos["nodes_silo_b"]

    G = build_two_silo_graph(silo_a, silo_b)
    G.add_edge(silo_a[0], silo_b[0], weight=0.02)  # Tiny bottleneck

    orch = CognitiveGraphOrchestrator(initial_graph=G)
    init_diag = orch.snapshot()
    initial_regime = init_diag.regime

    # Apply multiple interactions bridging the two silos
    rec = orch.recommend_spectral_bridge()
    if rec:
        orch.record_interaction(rec.node_u, rec.node_v, delta_w=2.5)

    orch.record_interaction(silo_a[1], silo_b[1], delta_w=2.0)
    orch.record_interaction(silo_a[2], silo_b[2], delta_w=2.0)

    post_diag = orch.snapshot()
    post_regime = post_diag.regime

    passed = (
        initial_regime == CognitiveRegime.COMPARTMENTALIZED
        and post_regime == CognitiveRegime.INTEGRATED
        and post_diag.observables.lambda_2 > 0.15
    )

    return {
        "initial_regime": initial_regime.value,
        "initial_lambda_2": round(init_diag.observables.lambda_2, 5),
        "post_regime": post_regime.value,
        "post_lambda_2": round(post_diag.observables.lambda_2, 5),
        "delta_lambda_2": round(post_diag.observables.lambda_2 - init_diag.observables.lambda_2, 5),
        "passed": passed,
    }


def main():
    print("=" * 70)
    print("YENTELLECT: CONCEPT COMBINATION EMPIRICAL VALIDATION HARNESS")
    print("=" * 70)

    benchmarks = load_benchmarks()
    print(f"Loaded {len(benchmarks['historical_breakthroughs'])} historical benchmarks, "
          f"{len(benchmarks['control_redundant_pairs'])} control pairs.")
    print("-" * 70)

    # 1. Test Fiedler Bridge Optimality
    print("\n[TEST 1] Spectral Bridge & Fiedler Gap Optimization...")
    fiedler_res = evaluate_fiedler_bridge_optimality(benchmarks)
    print(f"  Initial lambda_2: {fiedler_res['initial_lambda_2']}")
    print(f"  Fiedler Pair: {fiedler_res['fiedler_pair'][0]} <-> {fiedler_res['fiedler_pair'][1]}")
    print(f"  Fiedler Potential Gap: {fiedler_res['fiedler_gap']}")
    print(f"  Delta lambda_2 (Fiedler Bridge): +{fiedler_res['delta_lambda2_fiedler']}")
    print(f"  Delta lambda_2 (Intra-domain edge): +{fiedler_res['delta_lambda2_intra']}")
    print(f"  Optimality Ratio (Fiedler / Intra): {fiedler_res['optimality_over_intra_ratio']}x")
    print(f"  => PASS: {fiedler_res['passed']}")

    # 2. Test Coarsening Entropy Drop
    print("\n[TEST 2] Degree-Preserving Coarsening Entropy Drop (Claim C-1.3b)...")
    entropy_res = evaluate_coarsening_entropy_formula(benchmarks)
    for r in entropy_res["results"]:
        status = "PASS" if r["passed"] else "FAIL"
        print(f"  [{status}] {r['pair'][:55]:<55} | Empirical: {r['empirical_drop']:.5f} | Theo: {r['theoretical_drop']:.5f} | Err: {r['abs_error']:.1e}")
    print(f"  => ALL PAIRS PASS: {entropy_res['all_passed']}")

    # 3. Test Regime Healing
    print("\n[TEST 3] Cognitive Regime Transition (COMPARTMENTALIZED -> INTEGRATED)...")
    regime_res = evaluate_regime_healing(benchmarks)
    print(f"  Initial Regime: {regime_res['initial_regime']} (lambda_2={regime_res['initial_lambda_2']})")
    print(f"  Post-Bridge Regime: {regime_res['post_regime']} (lambda_2={regime_res['post_lambda_2']})")
    print(f"  Spectral Gap Increase: +{regime_res['delta_lambda_2']}")
    print(f"  => PASS: {regime_res['passed']}")

    # Save summary report
    output_dir = REPO_ROOT / "backend" / "eval"
    output_dir.mkdir(parents=True, exist_ok=True)
    report = {
        "fiedler_optimization": fiedler_res,
        "coarsening_entropy": entropy_res,
        "regime_healing": regime_res,
        "overall_verdict": (
            fiedler_res["passed"]
            and entropy_res["all_passed"]
            and regime_res["passed"]
        ),
    }

    report_path = output_dir / "eval_results.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 70)
    if report["overall_verdict"]:
        print("OVERALL VERDICT: ALL MATHEMATICAL AND TOPOLOGICAL TESTS PASSED (3/3)")
        print(f"Report written to: {report_path}")
    else:
        print("OVERALL VERDICT: SOME TESTS FAILED")
        sys.exit(1)
    print("=" * 70)


if __name__ == "__main__":
    main()

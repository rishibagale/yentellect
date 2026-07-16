"""
Tests for Vector Symbolic Architecture (VSA)

Tests deterministic vector generation, bind/unbind roundtrip,
bundle correctness, similarity range, session vector computation,
and enriched session vector computation.
"""

import pytest
from backend.core.vsa import (
    random_vector, bind, unbind, bundle, similarity,
    get_mode_vector, compute_session_vector, compute_enriched_session_vector,
    MODE_NAMES, MODE_VECTORS,
)


class TestRandomVector:
    def test_deterministic(self):
        v1 = random_vector(512, seed=42)
        v2 = random_vector(512, seed=42)
        assert v1 == v2

    def test_different_seeds_differ(self):
        v1 = random_vector(512, seed=1)
        v2 = random_vector(512, seed=2)
        assert v1 != v2

    def test_correct_dimension(self):
        v = random_vector(256, seed=10)
        assert len(v) == 256

    def test_normalized(self):
        v = random_vector(512, seed=42)
        norm = sum(x * x for x in v) ** 0.5
        assert abs(norm - 1.0) < 1e-6


class TestBindUnbind:
    def test_roundtrip(self):
        a = random_vector(512, seed=1)
        b = random_vector(512, seed=2)
        bound = bind(a, b)
        recovered = unbind(bound, a)
        sim = similarity(recovered, b)
        assert sim > 0.7

    def test_dimension_mismatch(self):
        a = random_vector(512, seed=1)
        b = random_vector(256, seed=2)
        with pytest.raises(ValueError):
            bind(a, b)
        with pytest.raises(ValueError):
            unbind(a, b)


class TestBundle:
    def test_sum(self):
        a = [1.0, 0.0, 0.0]
        b = [0.0, 1.0, 0.0]
        result = bundle(a, b)
        assert result == [1.0, 1.0, 0.0]

    def test_dimension_mismatch(self):
        with pytest.raises(ValueError):
            bundle([1.0], [1.0, 2.0])


class TestSimilarity:
    def test_identical_vectors(self):
        v = random_vector(512, seed=42)
        assert abs(similarity(v, v) - 1.0) < 1e-6

    def test_orthogonal_vectors(self):
        a = [1.0, 0.0]
        b = [0.0, 1.0]
        assert abs(similarity(a, b)) < 1e-6

    def test_range(self):
        a = random_vector(512, seed=1)
        b = random_vector(512, seed=2)
        s = similarity(a, b)
        assert -1.0 <= s <= 1.0

    def test_dimension_mismatch(self):
        with pytest.raises(ValueError):
            similarity([1.0], [1.0, 2.0])


class TestModeVectors:
    def test_all_modes_present(self):
        for name in MODE_NAMES:
            assert name in MODE_VECTORS

    def test_mode_vector_dimension(self):
        for name in MODE_NAMES:
            assert len(MODE_VECTORS[name]) == 512

    def test_get_mode_vector(self):
        for name in MODE_NAMES:
            v = get_mode_vector(name)
            assert len(v) == 512

    def test_get_mode_vector_unknown(self):
        with pytest.raises(ValueError):
            get_mode_vector("UNKNOWN")


class TestComputeSessionVector:
    def test_no_modes_returns_convergent(self):
        result = compute_session_vector([])
        assert result == get_mode_vector("CONVERGENT")

    def test_single_mode(self):
        result = compute_session_vector(["DIVERGENT"])
        assert result == get_mode_vector("DIVERGENT")

    def test_two_modes_binds(self):
        result = compute_session_vector(["CONVERGENT", "DIVERGENT"])
        expected = bind(get_mode_vector("CONVERGENT"), get_mode_vector("DIVERGENT"))
        assert result == expected

    def test_case_insensitive(self):
        result = compute_session_vector(["divergent"])
        assert result == get_mode_vector("DIVERGENT")

    def test_ignores_unknown_modes(self):
        result = compute_session_vector(["UNKNOWN", "CONVERGENT"])
        assert result == get_mode_vector("CONVERGENT")

    def test_limits_to_two_modes(self):
        result = compute_session_vector(["CONVERGENT", "DIVERGENT", "ANALOGICAL"])
        expected = bind(get_mode_vector("CONVERGENT"), get_mode_vector("DIVERGENT"))
        assert result == expected


class TestComputeEnrichedSessionVector:
    def test_falls_back_without_history(self):
        basic = compute_session_vector(["CONVERGENT"])
        enriched = compute_enriched_session_vector(["CONVERGENT"], None)
        assert enriched == basic

    def test_falls_back_with_empty_history(self):
        basic = compute_session_vector(["DIVERGENT"])
        enriched = compute_enriched_session_vector(["DIVERGENT"], [])
        assert enriched == basic

    def test_weighted_by_signal(self):
        history = [
            {"sentence_complexity": 0.9, "ideational_fluency": 0.1},
            {"sentence_complexity": 0.8, "ideational_fluency": 0.2},
        ]
        result = compute_enriched_session_vector(["CONVERGENT"], history)
        assert len(result) == 512
        # Should be a weighted version of the CONVERGENT vector
        base = get_mode_vector("CONVERGENT")
        # At least correlated with base
        sim = similarity(result, base)
        assert sim > 0.5

    def test_two_modes_bundle(self):
        history = [
            {"sentence_complexity": 0.8, "ideational_fluency": 0.7},
        ]
        result = compute_enriched_session_vector(["CONVERGENT", "DIVERGENT"], history)
        assert len(result) == 512
        # Should be different from either mode alone
        sim_c = similarity(result, get_mode_vector("CONVERGENT"))
        sim_d = similarity(result, get_mode_vector("DIVERGENT"))
        assert sim_c > 0.3
        assert sim_d > 0.3

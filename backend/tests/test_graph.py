"""
Tests for Knowledge Graph Engine

Tests concept add/dedup, edge strengthening, isolated concept detection,
weak bridge detection, conceptual entropy, and decay.
"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta
from backend.core.graph import KnowledgeGraph
from backend.core.models import ThinkingMode


@pytest.fixture
def mock_db():
    db = MagicMock()
    db.get_user_concepts.return_value = []
    db.get_user_edges.return_value = []
    return db


@pytest.fixture
def graph(mock_db):
    return KnowledgeGraph("test-user-001", db_manager=mock_db)


class TestAddConcept:
    def test_add_new_concept(self, graph):
        node = graph.add_concept("Neural Networks", "CS", ThinkingMode.CONVERGENT)
        assert node.name == "Neural Networks"
        assert node.domain == "CS"
        assert node.thinking_mode_association == ThinkingMode.CONVERGENT
        assert str(node.id) in graph._nodes

    def test_add_duplicate_reinforces(self, graph):
        n1 = graph.add_concept("Quantum Mechanics", "Physics", ThinkingMode.DIVERGENT)
        n2 = graph.add_concept("Quantum Mechanics", "Physics", ThinkingMode.DIVERGENT)
        assert str(n1.id) == str(n2.id)
        assert n2.session_count == 1

    def test_add_different_concepts(self, graph):
        n1 = graph.add_concept("Concept A", "Domain1")
        n2 = graph.add_concept("Concept B", "Domain2")
        assert str(n1.id) != str(n2.id)
        assert len(graph._nodes) == 2

    def test_case_insensitive_dedup(self, graph):
        n1 = graph.add_concept("test concept", "domain")
        n2 = graph.add_concept("Test Concept", "domain")
        assert str(n1.id) == str(n2.id)


class TestStrengthenEdge:
    def test_create_new_edge(self, graph):
        n1 = graph.add_concept("A", "d1")
        n2 = graph.add_concept("B", "d2")
        edge = graph.strengthen_edge(str(n1.id), str(n2.id), 0.2)
        assert edge.weight > 0
        assert edge.connection_count == 1
        assert len(graph._edges) == 1

    def test_strengthen_existing_edge(self, graph):
        n1 = graph.add_concept("A", "d1")
        n2 = graph.add_concept("B", "d2")
        e = graph.strengthen_edge(str(n1.id), str(n2.id), 0.2)
        first_weight = e.weight
        first_count = e.connection_count
        e2 = graph.strengthen_edge(str(n1.id), str(n2.id), 0.3)
        assert e2.connection_count == first_count + 1
        assert e2.weight >= first_weight

    def test_reverse_key_lookup(self, graph):
        n1 = graph.add_concept("A", "d1")
        n2 = graph.add_concept("B", "d2")
        e1 = graph.strengthen_edge(str(n1.id), str(n2.id), 0.2)
        first_count = e1.connection_count
        e2 = graph.strengthen_edge(str(n2.id), str(n1.id), 0.2)
        assert e2.connection_count == first_count + 1

    def test_weight_capped_at_1(self, graph):
        n1 = graph.add_concept("A", "d1")
        n2 = graph.add_concept("B", "d2")
        for _ in range(20):
            graph.strengthen_edge(str(n1.id), str(n2.id), 0.5)
        edges = list(graph._edges.values())
        assert all(e.weight <= 1.0 for e in edges)

    def test_missing_concept_raises(self, graph):
        with pytest.raises(ValueError):
            graph.strengthen_edge("nonexistent-a", "nonexistent-b")


class TestFindIsolatedConcepts:
    def test_no_isolated_when_well_connected(self, graph):
        n1 = graph.add_concept("A", "d1")
        n2 = graph.add_concept("B", "d2")
        n3 = graph.add_concept("C", "d3")
        graph.strengthen_edge(str(n1.id), str(n2.id))
        graph.strengthen_edge(str(n2.id), str(n3.id))
        isolated = graph.find_isolated_concepts()
        assert len(isolated) == 0

    def test_isolated_concept_detected(self, graph):
        n1 = graph.add_concept("A", "d1")
        n2 = graph.add_concept("B", "d2")
        n3 = graph.add_concept("C", "d3")
        graph.strengthen_edge(str(n1.id), str(n2.id))
        # n3 has no edges, reinforce it 8+ days ago
        n3.last_reinforced = datetime.utcnow() - timedelta(days=10)
        graph._nodes[str(n3.id)] = n3
        isolated = graph.find_isolated_concepts()
        assert len(isolated) == 1
        assert str(isolated[0].id) == str(n3.id)

    def test_single_node_not_isolated_if_recent(self, graph):
        n1 = graph.add_concept("A", "d1")
        # Recently reinforced, no edges — should NOT be isolated (< 7 days)
        isolated = graph.find_isolated_concepts()
        assert len(isolated) == 0


class TestConceptualEntropy:
    def test_empty_graph(self, graph):
        assert graph.get_conceptual_entropy() == 0.0

    def test_single_domain(self, graph):
        for i in range(5):
            graph.add_concept(f"Concept {i}", "physics")
        entropy = graph.get_conceptual_entropy()
        assert entropy == 0.0

    def test_diverse_domains(self, graph):
        domains = ["physics", "psychology", "philosophy", "cs", "math"]
        for i, d in enumerate(domains):
            graph.add_concept(f"Concept {i}", d)
        entropy = graph.get_conceptual_entropy()
        assert entropy > 0.0
        # Max entropy for 5 equal domains = log2(5) ~ 2.32
        assert entropy <= 2.5


class TestDecay:
    def test_confidence_decays(self, graph):
        node = graph.add_concept("Test", "domain")
        original_confidence = node.confidence_score
        node.last_reinforced = datetime.utcnow() - timedelta(days=30)
        graph._nodes[str(node.id)] = node
        graph.update_confidence_decay()
        updated = graph._nodes[str(node.id)]
        assert updated.confidence_score < original_confidence

    def test_confidence_floor(self, graph):
        node = graph.add_concept("Test", "domain")
        node.last_reinforced = datetime.utcnow() - timedelta(days=365)
        graph._nodes[str(node.id)] = node
        graph.update_confidence_decay()
        updated = graph._nodes[str(node.id)]
        assert updated.confidence_score >= 0.01


class TestD3Export:
    def test_export_format(self, graph):
        n1 = graph.add_concept("A", "d1", ThinkingMode.CONVERGENT)
        n2 = graph.add_concept("B", "d2", ThinkingMode.DIVERGENT)
        graph.strengthen_edge(str(n1.id), str(n2.id))
        d3 = graph.to_d3_json()
        assert "nodes" in d3
        assert "links" in d3
        assert len(d3["nodes"]) == 2
        assert len(d3["links"]) == 1
        assert d3["nodes"][0]["thinkingMode"] == "CONVERGENT"

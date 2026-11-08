"""
Unit tests for the healed session lifecycle, concept persistence, VSA embeddings,
and cross-modal graph edge formation.
"""

import json
import uuid
import pytest
from unittest.mock import MagicMock, patch

from backend.core.session import SessionManager, _parse_llm_json
from backend.core.models import ThinkingMode
from backend.core.graph import KnowledgeGraph
from backend.core.vsa import similarity
from backend.db.database import DatabaseManager
from backend.api.routes.dashboard import _build_recent_sessions


@pytest.fixture
def test_db(tmp_path):
    """Provide a fresh SQLite test database."""
    db_file = str(tmp_path / "test_lifecycle.db")
    db = DatabaseManager(db_path=db_file)
    db.init_db()
    return db


def test_parse_llm_json_variants():
    """Verify JSON parsing handles raw objects, markdown fences, and thinking prefixes."""
    # Standard JSON
    res1 = _parse_llm_json('{"session_summary": {"title": "Test Title"}}')
    assert res1 is not None and res1["session_summary"]["title"] == "Test Title"

    # Markdown code fence with json tag
    raw2 = """Here is my analysis:
```json
{
  "session_summary": {"title": "Quantum Attention", "narrative": "Synthesized quantum models."},
  "new_concepts": [{"name": "Quantum Attention", "domain": "Physics", "thinking_mode": "ANALOGICAL"}]
}
```
Hope this helps!"""
    res2 = _parse_llm_json(raw2)
    assert res2 is not None
    assert res2["session_summary"]["title"] == "Quantum Attention"
    assert len(res2["new_concepts"]) == 1

    # Code fence without tag
    raw3 = """```
{"session_summary": {"title": "Entropy"}, "new_concepts": []}
```"""
    res3 = _parse_llm_json(raw3)
    assert res3 is not None
    assert res3["session_summary"]["title"] == "Entropy"

    # Invalid input
    assert _parse_llm_json("not json at all") is None
    assert _parse_llm_json("") is None


def test_session_lifecycle_turn1_and_persistence(test_db):
    """Verify session starts with genuine opening thought, records Turn 1, and persists."""
    user_id = str(uuid.uuid4())
    test_db.create_user(user_id, "Test User")

    mock_llm = MagicMock()
    mock_llm.chat_completion.return_value = "Socratic exploration response on graph neural networks."

    machine = SessionManager(db_manager=test_db)
    machine.llm = mock_llm
    opening_thought = "How do graph neural networks capture hierarchical symmetries?"

    # Start session
    start_res = machine.start_session(user_id, opening_thought)
    session_id = start_res["session_id"]
    assert start_res["turn_count"] == 1
    assert "response" in start_res

    # Check DB turn 1
    turns = test_db.get_session_turns(session_id)
    assert len(turns) == 1
    assert turns[0]["user_input"] == opening_thought
    assert turns[0]["response"] == "Socratic exploration response on graph neural networks."
    assert turns[0]["turn_number"] == 1

    # Check session record
    session_rec = test_db.get_session(session_id)
    assert session_rec is not None
    assert session_rec["status"] == "active"
    summary_data = json.loads(session_rec["summary"])
    assert opening_thought in summary_data["title"]


def test_session_multi_turn_and_end_concept_storage(test_db):
    """
    Verify full multi-turn dialogue, complete transcript reconstruction,
    VSA concept embedding, concept node saving, and cross-mode edge formation.
    """
    user_id = str(uuid.uuid4())
    test_db.create_user(user_id, "Researcher")

    # Seed an existing concept in the graph (CONVERGENT)
    init_graph = KnowledgeGraph(user_id, test_db)
    existing_node = init_graph.add_concept(
        name="Thermodynamic Entropy",
        domain="Physics",
        thinking_mode=ThinkingMode.CONVERGENT
    )

    mock_llm = MagicMock()
    # Turn 1 response
    mock_llm.chat_completion.side_effect = [
        "Welcome. How do you view information compression in thermodynamic terms?",
        "Indeed, Landauer's principle establishes a minimum heat dissipation.",
        # end_session extraction response
        """```json
        {
          "session_summary": {
            "title": "Thermodynamics of Neural Compression",
            "narrative": "Explored the equivalence between free energy minimization and neural representations."
          },
          "new_concepts": [
            {"name": "Neural Free Energy", "domain": "Machine Learning", "thinking_mode": "SYSTEMS"},
            {"name": "Landauer Bound in Attention", "domain": "Physics", "thinking_mode": "ANALOGICAL"}
          ]
        }
        ```"""
    ]

    machine = SessionManager(db_manager=test_db)
    machine.llm = mock_llm

    # 1. Turn 1
    start_res = machine.start_session(user_id, "Can we model neural networks as heat engines?")
    session_id = start_res["session_id"]

    # 2. Turn 2
    turn2_res = machine.process_turn(session_id, "Consider Landauer's bound on parameter updates.")
    assert turn2_res["turn_count"] == 2

    # 3. End Session
    end_res = machine.end_session(session_id)

    # Verify return payload
    assert end_res["summary"]["title"] if "title" in end_res["summary"] else end_res["concepts_added"] >= 2
    assert end_res["concepts_added"] >= 2
    assert end_res["bridges_formed"] >= 1

    # Verify session completed in DB
    completed_session = test_db.get_session(session_id)
    assert completed_session["status"] == "completed"
    session_summary = json.loads(completed_session["summary"])
    assert session_summary["title"] == "Thermodynamics of Neural Compression"

    # Reload graph from DB and verify nodes loaded
    reloaded_graph = KnowledgeGraph(user_id, test_db)
    assert "Neural Free Energy" in [c.name for c in reloaded_graph._nodes.values()]

    # Verify concept nodes in DB
    saved_concepts = test_db.get_user_concepts(user_id)
    concept_names = [c["name"] for c in saved_concepts]
    assert "Neural Free Energy" in concept_names
    assert "Landauer Bound in Attention" in concept_names

    # Verify every new concept has a 512-dim VSA vector and session_id
    for c in saved_concepts:
        if c["name"] in ["Neural Free Energy", "Landauer Bound in Attention"]:
            assert c["session_id"] == session_id
            assert c["vector"] is not None
            vec = json.loads(c["vector"])
            assert len(vec) == 512

    # Verify graph edges in DB
    edges = test_db.get_user_edges(user_id)
    assert len(edges) >= 2  # Intra-session edge + bridge to existing node

    # Verify metrics saved for >= 2 turns
    metrics = test_db.get_session_metrics(user_id)
    assert len(metrics) == 1
    assert metrics[0]["session_id"] == session_id
    assert metrics[0]["concepts_added"] >= 2


def test_ghost_session_filtering_in_history():
    """Verify abandoned 1-turn ghost sessions are filtered from recent sessions."""
    sessions = [
        # Abandoned ghost session (turn_count = 1, status = active, no metrics)
        {
            "session_id": "ghost-1",
            "turn_count": 1,
            "status": "active",
            "mode_target": "CONVERGENT",
            "created_at": "2026-11-08T10:00:00",
            "summary": json.dumps({"title": "Convergent Exploration"}),
        },
        # Real completed session
        {
            "session_id": "real-1",
            "turn_count": 5,
            "status": "completed",
            "mode_target": "DIVERGENT",
            "created_at": "2026-11-08T11:00:00",
            "summary": json.dumps({
                "title": "Quantum Memory Consolidation",
                "narrative": "Detailed exploration of quantum biological analogies."
            }),
        },
    ]

    metrics = [
        {
            "metric_id": "m-1",
            "session_id": "real-1",
            "overall_score": 0.85,
            "concepts_added": 2,
            "bridges_formed": 3,
            "session_duration_seconds": 320,
            "modes_activated": json.dumps(["DIVERGENT", "ANALOGICAL"]),
        }
    ]

    recent = _build_recent_sessions(sessions, metrics)
    assert len(recent) == 1
    assert recent[0]["session_id"] == "real-1"
    assert recent[0]["title"] == "Quantum Memory Consolidation"

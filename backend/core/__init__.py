"""
Yentellect Core Package

Core cognitive modeling components:
- models: Pydantic data models
- signals: Behavioral signal extraction
- classifier: Thinking mode classification
- graph: Knowledge graph engine
- session: LangGraph session state machine
- prompts: Thinking mode system prompts
"""

from .models import (
    ThinkingMode,
    SignalVector,
    ConceptNode,
    GraphEdge,
    CognitiveProfile,
    SessionState,
    TurnRecord,
)
from backend.graph import (
    GraphObservables,
    adjacency_with_self_loop_stubs,
    compute_observables,
    coarsen_nodes,
)
from backend.orchestrator import (
    CognitiveRegime,
    StepDiagnostics,
    BridgeRecommendation,
    OrchestratorConfig,
    CognitiveGraphOrchestrator,
)
from .synthesizer import (
    ConceptSynthesizer,
    SynthesizedConceptResult,
)

__all__ = [
    "ThinkingMode",
    "SignalVector",
    "ConceptNode",
    "GraphEdge",
    "CognitiveProfile",
    "SessionState",
    "TurnRecord",
    "GraphObservables",
    "adjacency_with_self_loop_stubs",
    "compute_observables",
    "coarsen_nodes",
    "CognitiveRegime",
    "StepDiagnostics",
    "BridgeRecommendation",
    "OrchestratorConfig",
    "CognitiveGraphOrchestrator",
    "ConceptSynthesizer",
    "SynthesizedConceptResult",
]
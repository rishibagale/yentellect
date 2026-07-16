"""
Yentellect Core Data Models

Pydantic v2 models for the cognitive development platform.
All data structures are strictly typed with Field descriptions.
References to neuroscience concepts are documented in comments.
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, ConfigDict


class ThinkingMode(str, Enum):
    """
    Six thinking modes based on cognitive neuroscience research.
    
    CONVERGENT: Executive control, focused problem-solving (DLPFC)
    DIVERGENT: Ideational fluency, creative generation (DMN-DLPFC coupling)
    ANALOGICAL: Cross-domain structural mapping (frontopolar cortex)
    METACOGNITIVE: Reasoning about reasoning (anterior PFC / Brodmann 10)
    SYSTEMS: Causal chains, feedback loops (inferior parietal + DLPFC)
    DMN: Default Mode Network - open wandering, insight incubation (PCC + mPFC)
    """
    CONVERGENT = "CONVERGENT"
    DIVERGENT = "DIVERGENT"
    ANALOGICAL = "ANALOGICAL"
    METACOGNITIVE = "METACOGNITIVE"
    SYSTEMS = "SYSTEMS"
    DMN = "DMN"


class SignalVector(BaseModel):
    """
    Behavioral signal vector extracted from user text.
    
    Each feature is normalized to [0, 1] range.
    Based on linguistic markers of thinking modes (neuroscience-informed):
    - type_token_ratio: lexical diversity (vocabulary breadth)
    - question_density: inquiry orientation (curiosity marker)
    - hedge_word_rate: uncertainty expression (metacognitive awareness)
    - self_correction_rate: online monitoring (executive function)
    - cross_domain_refs: conceptual distance (analogical thinking)
    - first_person_rate: self-referential processing (DMN engagement)
    - sentence_complexity: syntactic embedding depth (working memory load)
    - ideational_fluency: unique concept density (divergent generation)
    """
    model_config = ConfigDict(extra="forbid")
    
    type_token_ratio: float = Field(
        default=0.0,
        ge=0.0, le=1.0,
        description="Unique word types / total tokens. Higher = more diverse vocabulary."
    )
    question_density: float = Field(
        default=0.0,
        ge=0.0, le=1.0,
        description="Question marks per 100 words. Higher = more inquiry-driven."
    )
    hedge_word_rate: float = Field(
        default=0.0,
        ge=0.0, le=1.0,
        description="Hedge words (maybe/perhaps/possibly/I think/might) per 100 words. Higher = more uncertainty calibration."
    )
    self_correction_rate: float = Field(
        default=0.0,
        ge=0.0, le=1.0,
        description="Self-correction markers (wait/actually/no/I mean) per 100 words. Higher = more online monitoring."
    )
    cross_domain_refs: float = Field(
        default=0.0,
        ge=0.0, le=1.0,
        description="Named entity type diversity. Higher = more cross-domain concept bridging."
    )
    first_person_rate: float = Field(
        default=0.0,
        ge=0.0, le=1.0,
        description="First-person pronouns (I/me/my) per 100 words. Higher = more self-referential/DMN."
    )
    sentence_complexity: float = Field(
        default=0.0,
        ge=0.0, le=1.0,
        description="Average dependency tree depth. Higher = more complex syntactic embedding."
    )
    ideational_fluency: float = Field(
        default=0.0,
        ge=0.0, le=1.0,
        description="Unique noun concept density. Higher = more distinct ideas per unit text."
    )


class ConceptNode(BaseModel):
    """
    A concept in the user's knowledge graph.
    
    Ebbinghaus forgetting curve applied via confidence decay.
    Thinking mode association links concept to cognitive training target.
    """
    model_config = ConfigDict(extra="forbid")
    
    id: UUID = Field(default_factory=uuid4)
    name: str = Field(..., min_length=1, max_length=200)
    domain: str = Field(..., min_length=1, max_length=100)
    confidence_score: float = Field(default=1.0, ge=0.0, le=1.0)
    last_reinforced: datetime = Field(default_factory=datetime.utcnow)
    session_count: int = Field(default=0, ge=0)
    thinking_mode_association: ThinkingMode = Field(default=ThinkingMode.CONVERGENT)
    session_id: Optional[str] = Field(default=None, description="Session that created this concept")
    vector: Optional[List[float]] = Field(default=None, description="512-dim VSA vector for this concept")
    is_fusion: bool = Field(default=False, description="True if this concept was created by fusing two sessions")
    fusion_parent_ids: Optional[List[str]] = Field(default=None, description="Session IDs that were fused to create this concept")


class GraphEdge(BaseModel):
    """
    Connection between two concepts in the knowledge graph.
    
    Weight represents association strength.
    Connection count tracks reinforcement frequency.
    Last activated enables temporal decay (Ebbinghaus).
    """
    model_config = ConfigDict(extra="forbid")
    
    source_id: UUID
    target_id: UUID
    weight: float = Field(default=0.5, ge=0.0, le=1.0)
    connection_count: int = Field(default=0, ge=0)
    last_activated: datetime = Field(default_factory=datetime.utcnow)


class CognitiveProfile(BaseModel):
    """
    Persistent cognitive model of the user across sessions.
    
    Dominant/weakest modes derived from session performance history.
    Knowledge graph captures user's conceptual landscape.
    """
    model_config = ConfigDict(extra="forbid")
    
    user_id: str
    name: str = Field(default="", max_length=100)
    nodes: List[ConceptNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)
    dominant_mode: Optional[ThinkingMode] = None
    weakest_mode: Optional[ThinkingMode] = None
    session_count: int = Field(default=0, ge=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SessionState(BaseModel):
    """
    Mutable state for a single training session.
    
    Mode target selected by policy (weakest mode, isolated concepts, etc.)
    Signal history accumulates for within-session mode classification.
    Graph updates batched for end-of-session application.
    """
    model_config = ConfigDict(extra="forbid")
    
    session_id: UUID = Field(default_factory=uuid4)
    user_id: str
    mode_target: ThinkingMode
    turn_count: int = Field(default=0, ge=0)
    signal_history: List[SignalVector] = Field(default_factory=list)
    graph_updates_pending: List[Dict[str, Any]] = Field(default_factory=list)


class TurnRecord(BaseModel):
    """
    Immutable record of a single conversational turn.
    
    Predicted mode from classifier + confidence.
    Signal vector for offline analysis and model improvement.
    Stored in DB for longitudinal tracking.
    """
    model_config = ConfigDict(extra="forbid")
    
    session_id: UUID
    turn_number: int = Field(ge=1)
    user_input: str
    signal_vector: SignalVector
    predicted_mode: ThinkingMode
    confidence: float = Field(ge=0.0, le=1.0)
    response: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
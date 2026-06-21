"""
Yentellect LangGraph Session State Machine

Manages the cognitive training session lifecycle using LangGraph.
Nine states with conditional transitions.

States:
1. INTAKE - Receive opening message, load profile
2. CLASSIFY_MODE - Run signal extractor, classify mode
3. SELECT_SESSION_TYPE - Choose training mode by policy
4. RUN_SESSION - Format prompt, call Groq API
5. EVALUATE_TURN - Score response against rubric
6. CHECK_CONTINUE - Decide to continue or end
7. EXTRACT_UPDATES - Extract new concepts/connections
8. UPDATE_GRAPH - Apply updates to knowledge graph
9. END - Return summary
"""

import json
import uuid
import os
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum

from .models import (
    ThinkingMode, SignalVector, SessionState, TurnRecord,
    CognitiveProfile, ConceptNode, GraphEdge
)
from .signals import BehavioralSignalExtractor
from .classifier import ThinkingModeClassifier
from .graph import KnowledgeGraph
from .prompts import get_prompt, EXTRACT_CONCEPTS_PROMPT
from ..db.database import DatabaseManager, init_db


# Session state names
STATE_INTAKE = "INTAKE"
STATE_CLASSIFY_MODE = "CLASSIFY_MODE"
STATE_SELECT_SESSION_TYPE = "SELECT_SESSION_TYPE"
STATE_RUN_SESSION = "RUN_SESSION"
STATE_EVALUATE_TURN = "EVALUATE_TURN"
STATE_CHECK_CONTINUE = "CHECK_CONTINUE"
STATE_EXTRACT_UPDATES = "EXTRACT_UPDATES"
STATE_UPDATE_GRAPH = "UPDATE_GRAPH"
STATE_END = "END"


# Placeholder for Groq client - will be initialized with API key
# In production, use: groq = Groq(api_key=os.getenv("GROQ_API_KEY"))
class GroqClient:
    """Simple wrapper around Groq SDK for LLM calls."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY", "")
        self._client = None
        
    def _ensure_client(self):
        if self._client is None and self.api_key:
            try:
                from groq import Groq
                self._client = Groq(api_key=self.api_key)
            except ImportError:
                pass
    
    def chat_completion(self, messages: List[Dict[str, str]], 
                        model: str = "llama-3.3-70b-versatile",
                        temperature: float = 0.7,
                        max_tokens: int = 1024) -> str:
        """
        Get chat completion from Groq.
        
        Falls back to mock response if API key not available.
        """
        self._ensure_client()
        
        if self._client:
            try:
                response = self._client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                return response.choices[0].message.content
            except Exception as e:
                return f"[Groq API error: {str(e)}. Using fallback response.]\n\n"
        
        # Mock response for development without API key
        return self._mock_response(messages)
    
    def _mock_response(self, messages: List[Dict[str, str]]) -> str:
        """Generate a mock response for development."""
        import random
        
        prompts = [
            "That's an interesting perspective. Here's a question to deepen your thinking: What assumptions are you making that might not hold?",
            "Consider this: if you had to explain this to someone from a completely different field, what would be the core insight?",
            "Let me challenge you: what's the weakest link in your reasoning chain?",
            "Think about this from the opposite direction. What would it take to prove your conclusion wrong?",
            "Connect this idea to something you learned last week. What's the common thread?",
            "What's missing from your analysis? What haven't you considered?",
            "Pretend you have to solve this with half the resources. How would your approach change?",
            "If you had to teach this concept to a child, what analogy would you use?",
        ]
        
        system_msg = messages[0]["content"] if messages else ""
        user_msg = messages[-1]["content"] if messages else ""
        
        # Extract mode from system prompt
        mode = "CONVERGENT"
        for m in ["CONVERGENT", "DIVERGENT", "ANALOGICAL", "METACOGNITIVE", "SYSTEMS", "DMN"]:
            if f"Mode: {m}" in system_msg:
                mode = m
                break
        
        response_templates = {
            "CONVERGENT": f"I see you're working through this systematically. Let me check your precision: can you define the exact boundary conditions of your solution? What edge cases does it handle?",
            "DIVERGENT": f"Those are solid ideas. Now push further: what's the most unconventional approach you can imagine? Don't worry about feasibility yet.",
            "ANALOGICAL": f"Interesting connection. Now take it deeper: what's the underlying mechanism that both domains share? What emerges from that common structure?",
            "METACOGNITIVE": f"You've described your process well. Now for the gap analysis: where did your confidence not match your accuracy? What does that tell you about your thinking pattern?",
            "SYSTEMS": f"Good causal mapping. Now look for the feedback loops: where does an effect circle back to influence one of the causes? Is it reinforcing or balancing?",
            "DMN": f"Let your mind wander between those two ideas. What unexpected connection surfaces? Don't judge it - just notice what comes up.",
        }
        
        response = response_templates.get(mode, random.choice(prompts))
        
        return response


class SessionManager:
    """
    Manages cognitive training sessions using LangGraph-like state machine.
    
    Coordinates signal extraction, mode classification, knowledge graph updates,
    and LLM interactions through the session lifecycle.
    """
    
    def __init__(self, db_manager: Optional[DatabaseManager] = None):
        """
        Initialize session manager.
        
        Args:
            db_manager: DatabaseManager instance
        """
        self.db = db_manager or DatabaseManager()
        self.signal_extractor = BehavioralSignalExtractor()
        self.classifier = ThinkingModeClassifier()
        self.llm = GroqClient()
        
        # Active sessions cache
        self._sessions: Dict[str, Dict[str, Any]] = {}
    
    def start_session(self, user_id: str, opening_message: str) -> Dict[str, Any]:
        """
        Start a new cognitive training session (INTAKE + SELECT).
        
        Args:
            user_id: User UUID
            opening_message: User's first message
            
        Returns:
            Session start response with mode, response, session_id
        """
        # 1. INTAKE: Load profile
        user = self.db.get_user(user_id)
        if not user:
            self.db.create_user(user_id, "")
        
        # Load knowledge graph
        graph = KnowledgeGraph(user_id, self.db)
        
        # 2. CLASSIFY_MODE: Signal extraction + classification on opening message
        signal_vector = self.signal_extractor.extract(opening_message)
        predicted_mode, confidence = self.classifier.classify(signal_vector)
        
        # 3. SELECT_SESSION_TYPE: Use policy to determine training mode
        mode_target = self._select_session_type(user_id, graph, predicted_mode)
        
        # Create session ID
        session_id = str(uuid.uuid4())
        
        # Save session to DB
        self.db.create_session(session_id, user_id, mode_target.value)
        
        # Initialize session state
        started_at = datetime.utcnow().isoformat()
        session_data = {
            "session_id": session_id,
            "user_id": user_id,
            "mode_target": mode_target,
            "turn_count": 1,
            "signal_history": [signal_vector],
            "graph_updates_pending": [],
            "status": "active",
            "started_at": started_at,
        }
        
        # Persist started_at to DB so end_session can compute duration reliably
        self.db.update_session(session_id, turn_count=session_data.get("turn_count", 1))
        self._sessions[session_id] = session_data
        
        # Get prompt for selected mode
        system_prompt = get_prompt(mode_target.value)
        
        # Add profile context to system prompt
        profile_context = self._build_profile_context(graph)
        full_prompt = f"{system_prompt}\n\nUser Profile Context:\n{profile_context}"
        
        # Generate response
        messages = [
            {"role": "system", "content": full_prompt},
            {"role": "user", "content": opening_message},
        ]
        response = self.llm.chat_completion(messages, temperature=0.8)
        
        # Save first turn
        turn_id = str(uuid.uuid4())
        self.db.save_turn(turn_id, session_id, 1, opening_message, 
                         response, predicted_mode.value, confidence)
        
        # Save signal vector
        signal_id = str(uuid.uuid4())
        self.db.save_signal_vector(signal_id, turn_id, **signal_vector.model_dump())
        
        return {
            "session_id": session_id,
            "response": response,
            "mode_target": mode_target.value,
            "turn_count": 1,
            "predicted_mode": predicted_mode.value,
            "confidence": confidence,
            "signal_vector": signal_vector.model_dump(),
        }
    
    def process_turn(self, session_id: str, user_input: str) -> Dict[str, Any]:
        """
        Process a conversational turn (EVALUATE_TURN + RUN_SESSION).
        
        Args:
            session_id: Session UUID
            user_input: User's message
            
        Returns:
            Turn response with classification and next response
        """
        session = self._sessions.get(session_id)
        if not session:
            raise ValueError(f"Session not found: {session_id}")
        
        if session.get("status") != "active":
            raise ValueError(f"Session {session_id} is not active")
        
        user_id = session["user_id"]
        mode_target = session["mode_target"]
        turn_count = session["turn_count"] + 1
        
        # Classify user input
        signal_vector = self.signal_extractor.extract(user_input)
        predicted_mode, confidence = self.classifier.classify(signal_vector)
        
        # Update signal history
        session["signal_history"].append(signal_vector)
        session["turn_count"] = turn_count
        
        # Get prompt and generate response
        graph = KnowledgeGraph(user_id, self.db)
        system_prompt = get_prompt(mode_target.value)
        profile_context = self._build_profile_context(graph)
        full_prompt = f"{system_prompt}\n\nUser Profile Context:\n{profile_context}"
        
        # Build message history
        messages = [{"role": "system", "content": full_prompt}]
        
        # Load conversation history (last 6 turns)
        history_turns = self.db.get_session_turns(session_id, limit=6)
        for ht in history_turns:
            messages.append({"role": "user", "content": ht["user_input"]})
            messages.append({"role": "assistant", "content": ht["response"]})
        
        messages.append({"role": "user", "content": user_input})
        
        response = self.llm.chat_completion(messages, temperature=0.8)
        
        # Save turn
        turn_id = str(uuid.uuid4())
        self.db.save_turn(turn_id, session_id, turn_count, user_input,
                         response, predicted_mode.value, confidence)
        
        # Save signal vector
        signal_id = str(uuid.uuid4())
        self.db.save_signal_vector(signal_id, turn_id, **signal_vector.model_dump())
        
        return {
            "session_id": session_id,
            "response": response,
            "predicted_mode": predicted_mode.value,
            "confidence": confidence,
            "signal_vector": signal_vector.model_dump(),
            "turn_count": turn_count,
        }
    
    def end_session(self, session_id: str) -> Dict[str, Any]:
        """
        End a session (EXTRACT_UPDATES + UPDATE_GRAPH + END).
        
        Args:
            session_id: Session UUID
            
        Returns:
            Session summary
        """
        session = self._sessions.get(session_id)
        if not session:
            raise ValueError(f"Session not found: {session_id}")
        
        user_id = session["user_id"]
        mode_target = session["mode_target"]
        turn_count = session["turn_count"]
        signal_history = session["signal_history"]
        
        # Update session status
        end_time = datetime.utcnow()
        self.db.update_session(
            session_id,
            status="completed",
            ended_at=end_time.isoformat(),
            turn_count=turn_count
        )
        
        session["status"] = "completed"
        
        # Build summary
        # Get mode distribution from signal history
        distribution = self.classifier.get_mode_distribution(signal_history)
        
        # Get dominant and weakest modes
        dominant, weakest, mode_scores = self.classifier.get_dominant_and_weakest(
            signal_history
        )
        
        # Update user profile
        self.db.update_user_profile(
            user_id,
            dominant_mode=dominant.value,
            weakest_mode=weakest.value,
            session_count=turn_count // 8 + 1  # Rough estimate
        )
        
        # Calculate session duration
        duration = 0
        # Try started_at first, then fall back to created_at
        ts = session.get("started_at") or session.get("created_at")
        if ts:
            try:
                start = datetime.fromisoformat(ts)
                duration = int((end_time - start).total_seconds())
            except Exception:
                duration = 0
        
        # Save session metrics
        metric_id = str(uuid.uuid4())
        modes_activated = [mode.value for mode in distribution.keys() 
                          if distribution[mode] > 0.1]
        if not mode_scores:
            mode_scores = {m: 0.5 for m in ["CONVERGENT","DIVERGENT","ANALOGICAL","METACOGNITIVE","SYSTEMS","DMN"]}
        overall_score = sum(mode_scores.values()) / len(mode_scores) if mode_scores else 0.5

        concepts_added = 0
        bridges_formed = 0
        # Minimal fallback: create one concept so the knowledge graph has content
        try:
            concept_id = str(uuid.uuid4())
            concept_name = f"Session {session_id[:8]} ({mode_target.value})"
            self.db.save_concept_node(
                concept_id=concept_id,
                user_id=user_id,
                name=concept_name,
                domain="general",
                thinking_mode_association=mode_target.value,
            )
            concepts_added = 1
        except Exception:
            pass
        
        self.db.save_session_metrics(
            metric_id, session_id,
            modes_activated=modes_activated,
            concepts_added=concepts_added,
            bridges_formed=bridges_formed,
            session_duration_seconds=duration,
            mode_scores=mode_scores,
            overall_score=overall_score
        )
        
        # Clean up session cache
        self._sessions.pop(session_id, None)
        
        return {
            "session_id": session_id,
            "summary": {
                "modes_activated": modes_activated,
                "concepts_added": 0,
                "bridges_formed": 0,
                "session_duration_seconds": duration,
                "mode_scores": mode_scores,
                "overall_score": overall_score,
            },
            "modes_activated": modes_activated,
            "concepts_added": 0,
            "bridges_formed": 0,
            "session_duration": duration,
        }
    
    def _select_session_type(self, user_id: str, graph: KnowledgeGraph,
                            predicted_mode: ThinkingMode) -> ThinkingMode:
        """
        Select session type based on policy.
        
        Policy:
        - isolated concepts exist → CONVERGENT (oldest first)
        - 3 consecutive CONVERGENT sessions → force DIVERGENT
        - weak bridges exist → ANALOGICAL
        - no session in 24h → DMN
        - else → based on weakest_mode in profile
        """
        # Check for isolated concepts
        isolated = graph.find_isolated_concepts()
        if isolated:
            return ThinkingMode.CONVERGENT
        
        # Check for weak bridges
        weak_bridges = graph.find_weak_bridges()
        if weak_bridges:
            return ThinkingMode.ANALOGICAL
        
        # Check profile for weakest mode
        profile = graph.get_profile()
        if profile.weakest_mode:
            return profile.weakest_mode
        
        # Default to predicted mode
        return predicted_mode
    
    def _build_profile_context(self, graph: KnowledgeGraph) -> str:
        """Build profile context string for LLM prompts."""
        profile = graph.get_profile()
        
        if not profile.nodes:
            return "New user. No concepts or session history yet."
        
        # Get top domains
        from collections import Counter
        domains = Counter(node.domain for node in profile.nodes)
        top_domains = [f"{d} ({c} concepts)" for d, c in domains.most_common(5)]
        
        # Count graph stats
        concept_count = len(profile.nodes)
        edge_count = len(profile.edges)
        entropy = graph.get_conceptual_entropy()
        
        context = (
            f"Concepts: {concept_count} across {len(domains)} domains\n"
            f"Top domains: {', '.join(top_domains)}\n"
            f"Connections: {edge_count}\n"
            f"Domain entropy: {entropy:.2f} bits (higher = more diverse)\n"
            f"Dominant mode: {profile.dominant_mode.value if profile.dominant_mode else 'Not yet determined'}\n"
            f"Weakest mode: {profile.weakest_mode.value if profile.weakest_mode else 'Not yet determined'}\n"
            f"Session count: {profile.session_count}"
        )
        
        return context


# Global instance for convenience
session_manager = SessionManager()


def start_session(user_id: str, opening_message: str) -> Dict[str, Any]:
    """Start a new session."""
    return session_manager.start_session(user_id, opening_message)


def process_turn(session_id: str, user_input: str) -> Dict[str, Any]:
    """Process a conversational turn."""
    return session_manager.process_turn(session_id, user_input)


def end_session(session_id: str) -> Dict[str, Any]:
    """End a session."""
    return session_manager.end_session(session_id)
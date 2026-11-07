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
import logging
import time
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
from .vsa import compute_session_vector, compute_enriched_session_vector
from ..db.database import DatabaseManager, init_db


logger = logging.getLogger(__name__)


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
        if self.api_key and len(self.api_key) > 512:
            raise ValueError("Invalid API key format")
        self._client = None
        
    def _ensure_client(self):
        if self._client is None and self.api_key:
            try:
                from groq import Groq
                self._client = Groq(api_key=self.api_key)
            except ImportError:
                pass
    
    def chat_completion(self, messages: List[Dict[str, str]], 
                        model: Optional[str] = None,
                        temperature: float = 0.7,
                        max_tokens: int = 1500) -> str:
        """
        Get chat completion from Groq.
        
        Falls back to available models or mock response if API key not available.
        """
        self._ensure_client()
        target_model = model or os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
        
        if self._client:
            # Candidate models in preference order
            candidate_models = [target_model]
            for fallback in ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "llama-3.3-70b-versatile"]:
                if fallback not in candidate_models:
                    candidate_models.append(fallback)

            last_err = None
            for m in candidate_models:
                try:
                    response = self._client.chat.completions.create(
                        model=m,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                    )
                    content = response.choices[0].message.content
                    if content:
                        return content
                except Exception as exc:
                    last_err = exc
                    continue

            logger.warning(f"Groq API call failed across candidate models ({last_err}); using fallback response", exc_info=True)
            return self._mock_response(messages)
        
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
        
        # Active sessions cache with TTL tracking
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self._session_ttl: Dict[str, float] = {}  # session_id -> expiry timestamp
        self._max_sessions = 1000  # Hard limit to prevent memory exhaustion
    
    def _cleanup_expired_sessions(self) -> None:
        """Remove expired sessions from cache to prevent memory exhaustion."""
        now = time.monotonic()
        expired = [sid for sid, expiry in self._session_ttl.items() if now > expiry]
        for sid in expired:
            self._sessions.pop(sid, None)
            self._session_ttl.pop(sid, None)
        
        # If still over limit, evict oldest
        if len(self._sessions) > self._max_sessions:
            # Sort by TTL (oldest expiry first) and remove excess
            sorted_sessions = sorted(self._session_ttl.items(), key=lambda x: x[1])
            to_remove = len(self._sessions) - self._max_sessions
            for sid, _ in sorted_sessions[:to_remove]:
                self._sessions.pop(sid, None)
                self._session_ttl.pop(sid, None)
    
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
        
        # Persist started_at and initial clean title to DB
        initial_title = opening_message.split("\n")[0].strip()[:80] if opening_message else f"{mode_target.value.capitalize()} Session"
        self.db.update_session(
            session_id,
            turn_count=session_data.get("turn_count", 1),
            summary=json.dumps({"title": initial_title, "topic": initial_title})
        )
        self._sessions[session_id] = session_data
        # Set TTL: sessions expire after 30 minutes of inactivity
        self._session_ttl[session_id] = time.monotonic() + 1800
        
        # Cleanup expired sessions periodically
        if len(self._sessions) % 50 == 0:
            self._cleanup_expired_sessions()
        
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
        narrative_summary = ""

        # Generate LLM summary and extract concepts from session transcript
        try:
            turns = self.db.get_session_turns(session_id)
            transcript = "\n".join(
                f"{'User' if i % 2 == 0 else 'Assistant'}: {t['user_input'] if i % 2 == 0 else t.get('response', '')}"
                for i, t in enumerate(turns[-10:])
            )
            extraction_response = self.llm.chat_completion(
                messages=[
                    {"role": "system", "content": EXTRACT_CONCEPTS_PROMPT},
                    {"role": "user", "content": f"Session mode: {mode_target.value}\n\nTranscript:\n{transcript}"},
                ],
                temperature=0.3,
                max_tokens=800,
            )
            import re
            json_match = re.search(r'\{[\s\S]*\}', extraction_response)
            if json_match:
                extraction = json.loads(json_match.group())
                session_summary_obj = extraction.get("session_summary", {})
                narrative_summary = session_summary_obj.get("narrative", "")
                session_title = session_summary_obj.get("title", "")
                extracted_concepts = extraction.get("new_concepts", [])
            else:
                extracted_concepts = []
        except Exception:
            logger.warning("LLM concept extraction failed; using fallback", exc_info=True)
            extracted_concepts = []

        # Determine clean session title
        if not session_title:
            turns = self.db.get_session_turns(session_id, limit=1)
            if turns:
                session_title = turns[0]["user_input"].split("\n")[0].strip()[:80]
        if not session_title:
            session_title = f"{mode_target.value.capitalize()} Exploration"

        # Create concept nodes via KnowledgeGraph
        graph = KnowledgeGraph(user_id, self.db)
        try:
            if extracted_concepts:
                for ec in extracted_concepts[:3]:
                    raw_name = ec.get("name", "").strip()
                    for m in ["CONVERGENT", "DIVERGENT", "ANALOGICAL", "METACOGNITIVE", "SYSTEMS", "DMN"]:
                        if raw_name.upper().startswith(f"{m}:"):
                            raw_name = raw_name[len(m)+1:].strip()
                    
                    concept_mode = mode_target
                    mode_str = ec.get("thinking_mode", "").upper().strip()
                    if mode_str in [m.value for m in ThinkingMode]:
                        concept_mode = ThinkingMode(mode_str)

                    concept = graph.add_concept(
                        name=raw_name or "Research Concept",
                        domain=ec.get("domain", "General")[:100],
                        thinking_mode=concept_mode,
                    )
                    concepts_added += 1
            else:
                turns = self.db.get_session_turns(session_id, limit=1)
                goal = turns[0]["user_input"][:80].strip() if turns else ""
                clean_name = goal.split("\n")[0].strip() if goal else "Research Concept"
                for m in ["CONVERGENT", "DIVERGENT", "ANALOGICAL", "METACOGNITIVE", "SYSTEMS", "DMN"]:
                    if clean_name.upper().startswith(f"{m}:"):
                        clean_name = clean_name[len(m)+1:].strip()
                if len(clean_name) > 60:
                    clean_name = clean_name[:60] + "..."

                concept = graph.add_concept(
                    name=clean_name or "Research Concept",
                    domain="General",
                    thinking_mode=mode_target,
                )
                concepts_added = 1

            # Compute concept VSA vectors and link to session
            signal_dicts = [sv.model_dump() for sv in signal_history]
            session_vec = compute_enriched_session_vector(modes_activated, signal_dicts)
            for node in graph._nodes.values():
                if str(node.id) == str(concept.id):
                    node.session_id = session_id
                    node.vector = session_vec
                    self.db.update_concept_node(
                        str(node.id), session_id=session_id,
                        vector=json.dumps([round(v, 6) for v in session_vec])
                    )
                    break

            # Strengthen edges between the new concept and related concepts
            related_nodes = [
                n for n in graph._nodes.values()
                if str(n.id) != str(concept.id)
                and n.thinking_mode_association == mode_target
            ]
            for related in related_nodes[:3]:
                graph.strengthen_edge(str(concept.id), str(related.id), amount=0.15)
                bridges_formed += 1
        except Exception:
            logger.warning("Failed to update knowledge graph", exc_info=True)
        
        # Compute and persist VSA session vector
        try:
            if not signal_dicts:
                signal_dicts = [sv.model_dump() for sv in signal_history]
            if 'session_vec' not in dir():
                session_vec = compute_enriched_session_vector(modes_activated, signal_dicts)
            self.db.update_session(
                session_id,
                vector=json.dumps([round(v, 6) for v in session_vec])
            )
        except Exception:
            logger.warning("Failed to compute session vector", exc_info=True)

        # Write narrative summary and clean title to session
        summary_payload = {
            "title": session_title,
            "topic": session_title,
            "narrative": narrative_summary,
            "modes_activated": modes_activated,
            "concepts_added": concepts_added,
        }
        try:
            self.db.update_session(session_id, summary=json.dumps(summary_payload))
        except Exception:
            pass

        # Only save metrics for meaningful sessions (>= 2 turns)
        if turn_count >= 2:
            self.db.save_session_metrics(
                metric_id, session_id,
                modes_activated=modes_activated,
                concepts_added=concepts_added,
                bridges_formed=bridges_formed,
                session_duration_seconds=duration,
                mode_scores=mode_scores,
                overall_score=overall_score
            )
        else:
            logger.info(f"Skipping metrics save for session {session_id} with only {turn_count} turn(s)")
        
        # Clean up session cache
        self._sessions.pop(session_id, None)
        
        return {
            "session_id": session_id,
            "summary": {
                "narrative": narrative_summary,
                "modes_activated": modes_activated,
                "concepts_added": concepts_added,
                "bridges_formed": bridges_formed,
                "session_duration_seconds": duration,
                "mode_scores": mode_scores,
                "overall_score": overall_score,
            },
            "modes_activated": modes_activated,
            "concepts_added": concepts_added,
            "bridges_formed": bridges_formed,
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
        
        # Cognitive regime & spectral topology diagnostics
        spectral_guidance = ""
        try:
            from backend.orchestrator import CognitiveGraphOrchestrator
            G = graph.to_networkx()
            if G.number_of_nodes() >= 2:
                orch = CognitiveGraphOrchestrator(initial_graph=G)
                diag = orch.snapshot()
                regime_str = diag.regime.value
                rec = orch.recommend_spectral_bridge()
                bridge_info = ""
                if rec:
                    node_u_obj = graph._nodes.get(str(rec.node_u))
                    node_v_obj = graph._nodes.get(str(rec.node_v))
                    u_label = node_u_obj.name if node_u_obj else str(rec.node_u)
                    v_label = node_v_obj.name if node_v_obj else str(rec.node_v)
                    bridge_info = f"\n- Topological Bottleneck Cut: Disconnect between '{u_label}' and '{v_label}' (Fiedler potential gap: {rec.fiedler_gap:.3f})."

                spectral_guidance = (
                    f"\n\nCognitive Topology State:\n"
                    f"- Cognitive Regime: {regime_str}\n"
                    f"- Spectral Gap (Algebraic Connectivity λ2): {diag.observables.lambda_2:.4f}\n"
                    f"- Random-Walk Conceptual Entropy (Hc): {diag.observables.H_c:.2f} bits (norm: {diag.H_c_norm:.2f})\n"
                    f"- Transition Entropy Rate (h_rate): {diag.observables.h_rate:.2f} bits (norm: {diag.h_rate_norm:.2f})"
                    f"{bridge_info}\n"
                    f"- Socratic Directive: When regime is COMPARTMENTALIZED or FIXATED, actively prompt the user to synthesize connections across cognitive silos and build structural analogies between distant hubs."
                )
        except Exception as e:
            logger.debug(f"Could not compute spectral diagnostics for session context: {e}")

        context = (
            f"Concepts: {concept_count} across {len(domains)} domains\n"
            f"Top domains: {', '.join(top_domains)}\n"
            f"Connections: {edge_count}\n"
            f"Domain entropy: {entropy:.2f} bits (higher = more diverse)\n"
            f"Dominant mode: {profile.dominant_mode.value if profile.dominant_mode else 'Not yet determined'}\n"
            f"Weakest mode: {profile.weakest_mode.value if profile.weakest_mode else 'Not yet determined'}\n"
            f"Session count: {profile.session_count}"
            f"{spectral_guidance}"
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
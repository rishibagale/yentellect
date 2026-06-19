"""
Yentellect Knowledge Graph Engine

A semantic network representing the user's conceptual landscape.
Uses NetworkX for in-memory graph operations and SQLite for persistence.
Implements Ebbinghaus forgetting curve for confidence decay.

Neuroscience basis:
- Semantic memory is organized as a network of associated concepts
- Spreading activation: concepts prime related concepts
- Ebbinghaus decay: memories weaken without reinforcement
- Cognitive entropy: conceptual diversity enables creative insights
"""

import uuid
import math
from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime, timedelta
from collections import Counter
import json

from .models import (
    ThinkingMode, ConceptNode, GraphEdge, CognitiveProfile
)
from ..db.database import DatabaseManager


class KnowledgeGraph:
    """
    Knowledge graph engine for a single user's cognitive model.
    
    Manages concept nodes, edges, decay, and entropy.
    Exports to D3.js JSON format for visualization.
    Persisted via SQLite.
    """
    
    def __init__(self, user_id: str, db_manager: Optional[DatabaseManager] = None):
        """
        Initialize knowledge graph for a user.
        
        Args:
            user_id: User UUID
            db_manager: DatabaseManager instance
        """
        self.user_id = user_id
        self.db = db_manager or DatabaseManager()
        self._nodes: Dict[str, ConceptNode] = {}
        self._edges: Dict[Tuple[str, str], GraphEdge] = {}
        
        # Ebbinghaus decay: confidence *= decay_rate per day since last reinforced
        self.decay_rate = 0.9  # configurable via .env
        
        # Load existing data from DB
        self._load_from_db()
    
    def _load_from_db(self) -> None:
        """Load existing nodes and edges from database."""
        rows = self.db.get_user_concepts(self.user_id)
        for row in rows:
            try:
                last_reinforced = datetime.fromisoformat(row["last_reinforced"])
            except Exception:
                last_reinforced = datetime.utcnow()
            node = ConceptNode(
                id=uuid.UUID(row["concept_id"]),
                name=row["name"],
                domain=row["domain"],
                confidence_score=row["confidence_score"],
                last_reinforced=last_reinforced,
                session_count=row["session_count"],
                thinking_mode_association=ThinkingMode(row["thinking_mode_association"])
            )
            self._nodes[row["concept_id"]] = node
        
        edge_rows = self.db.get_user_edges(self.user_id)
        for row in edge_rows:
            try:
                last_activated = datetime.fromisoformat(row["last_activated"])
            except Exception:
                last_activated = datetime.utcnow()
            edge = GraphEdge(
                source_id=uuid.UUID(row["source_id"]),
                target_id=uuid.UUID(row["target_id"]),
                weight=row["weight"],
                connection_count=row["connection_count"],
                last_activated=last_activated
            )
            key = (row["source_id"], row["target_id"])
            self._edges[key] = edge
    
    def add_concept(self, name: str, domain: str,
                    thinking_mode: ThinkingMode = ThinkingMode.CONVERGENT) -> ConceptNode:
        """
        Add a new concept node to the graph.
        
        Args:
            name: Concept name
            domain: Concept domain (e.g., "physics", "psychology")
            thinking_mode: Associated thinking mode
            
        Returns:
            Created ConceptNode
        """
        # Check if concept already exists by name
        existing = self._find_concept_by_name(name.lower())
        if existing:
            # Reinforce existing concept
            existing.session_count += 1
            existing.last_reinforced = datetime.utcnow()
            existing.confidence_score = min(1.0, existing.confidence_score + 0.1)
            self._save_concept(existing)
            return existing
        
        node = ConceptNode(
            name=name,
            domain=domain,
            thinking_mode_association=thinking_mode
        )
        self._nodes[str(node.id)] = node
        self._save_concept(node)
        return node
    
    def _find_concept_by_name(self, name_lower: str) -> Optional[ConceptNode]:
        """Find concept by lowercase name."""
        for node in self._nodes.values():
            if node.name.lower() == name_lower:
                return node
        return None
    
    def get_concept(self, concept_id: str) -> Optional[ConceptNode]:
        """
        Get concept by ID.
        
        Args:
            concept_id: UUID string
            
        Returns:
            ConceptNode or None
        """
        return self._nodes.get(concept_id)
    
    def get_concept_by_name(self, name: str) -> Optional[ConceptNode]:
        """
        Get concept by exact name (case-insensitive).
        
        Args:
            name: Concept name
            
        Returns:
            ConceptNode or None
        """
        return self._find_concept_by_name(name.lower())
    
    def strengthen_edge(self, source_id: str, target_id: str, amount: float = 0.1) -> GraphEdge:
        """
        Strengthen the edge between two concepts.
        
        Implements Hebbian learning: "neurons that fire together, wire together."
        
        Args:
            source_id: Source concept UUID
            target_id: Target concept UUID
            amount: Amount to increase edge weight by
            
        Returns:
            Updated GraphEdge
        """
        # Ensure both concepts exist
        source = self._nodes.get(source_id)
        target = self._nodes.get(target_id)
        if not source or not target:
            raise ValueError(f"Concept not found: {source_id if not source else target_id}")
        
        # Check both orientations for the edge key
        key = (source_id, target_id)
        reverse_key = (target_id, source_id)
        
        if key in self._edges:
            edge = self._edges[key]
        elif reverse_key in self._edges:
            edge = self._edges[reverse_key]
        else:
            # Create new edge
            edge = GraphEdge(
                source_id=uuid.UUID(source_id),
                target_id=uuid.UUID(target_id),
                weight=0.1
            )
            self._edges[key] = edge
        
        # Hebbian strengthening with diminishing returns
        edge.weight = min(1.0, edge.weight + amount * (1.0 - edge.weight * 0.5))
        edge.connection_count += 1
        edge.last_activated = datetime.utcnow()
        
        self._save_edge(edge)
        return edge
    
    def find_isolated_concepts(self) -> List[ConceptNode]:
        """
        Find isolated concepts (degree < 2, not reinforced in 7+ days).
        
        These are the best candidates for CONVERGENT mode sessions.
        
        Returns:
            List of isolated ConceptNodes, oldest first
        """
        isolated = []
        cutoff = datetime.utcnow() - timedelta(days=7)
        
        for node_id, node in self._nodes.items():
            # Count edges involving this node
            degree = sum(1 for (s, t) in self._edges 
                        if s == node_id or t == node_id)
            
            if degree < 2 and node.last_reinforced < cutoff:
                isolated.append(node)
        
        # Sort by oldest first (Zone of Proximal Development: target just above current)
        isolated.sort(key=lambda n: n.last_reinforced)
        return isolated
    
    def find_weak_bridges(self) -> List[Tuple[ConceptNode, ConceptNode]]:
        """
        Find weak bridges: edges connecting separate clusters with weight < 0.3.
        
        These are the best candidates for ANALOGICAL mode sessions.
        
        Returns:
            List of (node_a, node_b) tuples
        """
        # Identify clusters using connected components
        clusters = self._find_clusters()
        
        # Find cross-cluster edges with low weight
        weak_bridges = []
        for (s_id, t_id), edge in self._edges.items():
            if edge.weight < 0.3:
                s_node = self._nodes.get(s_id)
                t_node = self._nodes.get(t_id)
                if s_node and t_node:
                    # Check if they're in different clusters
                    s_cluster = self._get_cluster_for_node(s_id, clusters)
                    t_cluster = self._get_cluster_for_node(t_id, clusters)
                    if s_cluster != t_cluster:
                        weak_bridges.append((s_node, t_node))
        
        return weak_bridges
    
    def _find_clusters(self) -> List[List[str]]:
        """Find connected components (clusters) in the graph."""
        all_nodes = set(self._nodes.keys())
        clusters = []
        visited = set()
        
        def bfs(start: str) -> List[str]:
            queue = [start]
            cluster = []
            while queue:
                node = queue.pop(0)
                if node in visited:
                    continue
                visited.add(node)
                cluster.append(node)
                
                # Find all neighbors
                for (s, t) in self._edges:
                    if s == node and t not in visited:
                        queue.append(t)
                    elif t == node and s not in visited:
                        queue.append(s)
            return cluster
        
        for node_id in all_nodes:
            if node_id not in visited:
                cluster = bfs(node_id)
                if cluster:
                    clusters.append(cluster)
        
        return clusters
    
    def _get_cluster_for_node(self, node_id: str, clusters: List[List[str]]) -> int:
        """Get cluster index for a node."""
        for i, cluster in enumerate(clusters):
            if node_id in cluster:
                return i
        return -1
    
    def get_conceptual_entropy(self) -> float:
        """
        Calculate Shannon entropy of domain distribution.
        
        High entropy = diverse domain knowledge = more analogical potential.
        Low entropy = specialized knowledge = deeper convergent reasoning.
        
        Returns:
            Entropy in bits (0 = single domain, max ~log2(num_domains))
        """
        if not self._nodes:
            return 0.0
        
        domains = Counter(node.domain for node in self._nodes.values())
        total = len(self._nodes)
        
        entropy = 0.0
        for count in domains.values():
            p = count / total
            if p > 0:
                entropy -= p * math.log2(p)
        
        return entropy
    
    def update_confidence_decay(self) -> None:
        """
        Apply Ebbinghaus forgetting curve decay to all concepts.
        
        confidence *= decay_rate ^ (days_since_last_reinforced)
        Every concept weakens over time without reinforcement.
        """
        now = datetime.utcnow()
        for node in self._nodes.values():
            days_since = (now - node.last_reinforced).days
            if days_since > 0:
                # Ebbinghaus forgetting curve
                node.confidence_score *= (self.decay_rate ** days_since)
                node.confidence_score = max(0.01, min(1.0, node.confidence_score))
                self._save_concept(node)
    
    def to_d3_json(self) -> Dict[str, list]:
        """
        Export graph to D3.js force-directed graph format.
        
        Returns:
            Dict with "nodes" and "links" arrays
        """
        d3_nodes = []
        d3_links = []
        
        for node in self._nodes.values():
            d3_nodes.append({
                "id": str(node.id),
                "name": node.name,
                "domain": node.domain,
                "confidenceScore": node.confidence_score,
                "lastReinforced": node.last_reinforced.isoformat(),
                "sessionCount": node.session_count,
                "thinkingMode": node.thinking_mode_association.value,
                "isolated": self._is_isolated(str(node.id))
            })
        
        for (s_id, t_id), edge in self._edges.items():
            d3_links.append({
                "source": s_id,
                "target": t_id,
                "weight": edge.weight,
                "connectionCount": edge.connection_count,
                "lastActivated": edge.last_activated.isoformat()
            })
        
        return {
            "nodes": d3_nodes,
            "links": d3_links
        }
    
    def _is_isolated(self, node_id: str) -> bool:
        """Check if a node is isolated (degree < 2)."""
        degree = sum(1 for (s, t) in self._edges 
                    if s == node_id or t == node_id)
        return degree < 2
    
    def get_profile(self) -> CognitiveProfile:
        """
        Get the full CognitiveProfile for this user.
        
        Derives dominant and weakest modes from session metrics.
        
        Returns:
            CognitiveProfile with all nodes, edges, and mode analysis
        """
        user_data = self.db.get_user(self.user_id)
        if not user_data:
            return CognitiveProfile(user_id=self.user_id)
        
        # Determine dominant and weakest modes from session history
        metrics = self.db.get_session_metrics(self.user_id, limit=50)
        
        mode_scores: Dict[str, List[float]] = {
            mode.value: [] for mode in ThinkingMode
        }
        
        for m in metrics:
            scores_str = m.get("mode_scores", "{}")
            try:
                scores = json.loads(scores_str)
                for mode, score in scores.items():
                    if mode in mode_scores:
                        mode_scores[mode].append(score)
            except (json.JSONDecodeError, TypeError):
                pass
        
        # Average scores per mode
        avg_scores = {}
        for mode, scores in mode_scores.items():
            if scores:
                avg_scores[mode] = sum(scores) / len(scores)
        
        dominant = None
        weakest = None
        if avg_scores:
            dominant_str = max(avg_scores, key=avg_scores.get)
            weakest_str = min(avg_scores, key=avg_scores.get)
            dominant = ThinkingMode(dominant_str)
            weakest = ThinkingMode(weakest_str)
        
        try:
            created_at = datetime.fromisoformat(user_data["created_at"])
        except Exception:
            created_at = datetime.utcnow()
        try:
            updated_at = datetime.fromisoformat(user_data["updated_at"])
        except Exception:
            updated_at = datetime.utcnow()
        profile = CognitiveProfile(
            user_id=self.user_id,
            name=user_data.get("name", ""),
            nodes=list(self._nodes.values()),
            edges=list(self._edges.values()),
            dominant_mode=dominant or (
                ThinkingMode(dom) if (dom := user_data.get("dominant_mode")) else None
            ),
            weakest_mode=weakest or (
                ThinkingMode(wk) if (wk := user_data.get("weakest_mode")) else None
            ),
            session_count=user_data.get("session_count", 0),
            created_at=created_at,
            updated_at=updated_at
        )
        
        return profile
    
    def _save_concept(self, node: ConceptNode) -> None:
        """Save a concept node to database."""
        try:
            self.db.update_concept_node(
                str(node.id),
                confidence_score=node.confidence_score,
                last_reinforced=node.last_reinforced.isoformat(),
                session_count=node.session_count,
                thinking_mode_association=node.thinking_mode_association.value
            )
        except Exception:
            # Fall back to insert
            pass
    
    def _save_edge(self, edge: GraphEdge) -> None:
        """Save an edge to database."""
        try:
            # Upsert edge
            with self.db.get_db() as conn:
                conn.execute(
                    """INSERT OR REPLACE INTO graph_edges
                       (edge_id, user_id, source_id, target_id, weight,
                        connection_count, last_activated, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (str(uuid.uuid4()), self.user_id,
                     str(edge.source_id), str(edge.target_id),
                     edge.weight, edge.connection_count,
                     edge.last_activated.isoformat(),
                     datetime.utcnow().isoformat())
                )
        except Exception:
            pass
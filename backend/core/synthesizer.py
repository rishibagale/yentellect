"""
Yentellect Concept Synthesizer: Fauconnier & Turner's 4-Space Conceptual Blending
coupled with Spectral Graph Theory.

Bridges the topological gap identified by the Fiedler vector and coarsening operator
with semantic emergent concept creation via Large Language Models.
"""

from __future__ import annotations
import json
import logging
import os
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from .models import ConceptNode, ThinkingMode

logger = logging.getLogger(__name__)

CONCEPT_SYNTHESIS_SYSTEM_PROMPT = """You are a Principal Scientific Concept Synthesizer and Theoretical Architect.
Your mission is to combine two distinct concepts from different domains into a novel, rigorous, and scientifically sound synthesized concept using Fauconnier & Turner's 4-Space Conceptual Blending framework:
1. Input Space 1 (Concept A): Foundational laws, governing variables, and dynamics.
2. Input Space 2 (Concept B): Foundational laws, governing variables, and dynamics.
3. Generic Space: The underlying structural isomorphism connecting both domains.
4. Blend Space (A ⊕ B): A novel synthesized paradigm with emergent properties that exist in neither parent domain alone.

You must respond with a single valid JSON object with EXACTLY these keys:
{
  "name": "Crisp, prestigious scientific name (e.g. 'Physics-Informed Neural Networks', 'Quantum Entropic Attractors'). Never use generic 'Fusion A + B'.",
  "domain": "Precise interdisciplinary field (e.g. 'Scientific Machine Learning', 'Computational Neurophysics').",
  "description": "2-3 rigorous sentences explaining the unified paradigm and its operational mechanism.",
  "isomorphism_mapping": "Explicit relational mapping: how relations/operators in Concept A correspond to relations in Concept B.",
  "emergent_property": "The breakthrough capability or property that emerges ONLY in the blend and exists in neither parent alone.",
  "falsifiable_test": "A concrete experimental benchmark, physical test, or mathematical theorem to verify or falsify this blend."
}

Return ONLY the raw JSON object. Do not wrap in markdown fences or include surrounding conversational text."""


@dataclass(frozen=True)
class SynthesizedConceptResult:
    name: str
    domain: str
    description: str
    emergent_property: str
    isomorphism_mapping: str
    falsifiable_test: str
    thinking_mode: ThinkingMode
    theoretical_entropy_drop: float = 0.0
    fiedler_gap: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "domain": self.domain,
            "description": self.description,
            "emergentProperty": self.emergent_property,
            "isomorphismMapping": self.isomorphism_mapping,
            "falsifiableTest": self.falsifiable_test,
            "thinkingMode": self.thinking_mode.value,
            "theoreticalEntropyDrop": self.theoretical_entropy_drop,
            "fiedlerGap": self.fiedler_gap,
        }


class ConceptSynthesizer:
    """
    Semantic engine executing conceptual blending between concept pairs.
    """

    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key or os.getenv("GROQ_API_KEY", "")
        self._groq_client = None

    def _get_client(self):
        if self._groq_client is None:
            try:
                from .session import GroqClient
                self._groq_client = GroqClient(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Could not initialize GroqClient in ConceptSynthesizer: {e}")
        return self._groq_client

    def synthesize(
        self,
        concept_u: ConceptNode | dict,
        concept_v: ConceptNode | dict,
        fiedler_gap: float = 0.0,
        theoretical_drop: float = 0.0,
        regime_context: Optional[str] = None,
    ) -> SynthesizedConceptResult:
        """
        Synthesize two concepts into an emergent conceptual blend.
        """
        # Extract metadata
        name_u = concept_u.name if isinstance(concept_u, ConceptNode) else concept_u.get("name", "Concept A")
        domain_u = concept_u.domain if isinstance(concept_u, ConceptNode) else concept_u.get("domain", "Domain A")
        mode_u = (
            concept_u.thinking_mode_association.value
            if isinstance(concept_u, ConceptNode)
            else concept_u.get("thinkingMode") or concept_u.get("thinking_mode") or "CONVERGENT"
        )

        name_v = concept_v.name if isinstance(concept_v, ConceptNode) else concept_v.get("name", "Concept B")
        domain_v = concept_v.domain if isinstance(concept_v, ConceptNode) else concept_v.get("domain", "Domain B")
        mode_v = (
            concept_v.thinking_mode_association.value
            if isinstance(concept_v, ConceptNode)
            else concept_v.get("thinkingMode") or concept_v.get("thinking_mode") or "DIVERGENT"
        )

        # Build prompt
        user_prompt = f"""Synthesize the following two concepts:

Input Concept A:
- Name: {name_u}
- Domain: {domain_u}
- Mode Target: {mode_u}

Input Concept B:
- Name: {name_v}
- Domain: {domain_v}
- Mode Target: {mode_v}

Graph Topology Context:
- Cognitive Regime: {regime_context or 'INTEGRATED'}
- Fiedler Vector Potential Gap: {fiedler_gap:.4f} (spectral bottleneck cut)
- Theoretical Information Entropy Drop: {theoretical_drop:.4f} bits

Construct an emergent conceptual blend that bridges these two domains."""

        client = self._get_client()
        raw_json_str = ""

        if client and self.api_key:
            try:
                messages = [
                    {"role": "system", "content": CONCEPT_SYNTHESIS_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ]
                response = client.chat_completion(
                    messages=messages,
                    temperature=0.7,
                    max_tokens=1500,
                )
                raw_json_str = response.strip()
            except Exception as exc:
                logger.warning(f"Concept synthesis LLM call failed: {exc}; using scientific fallback")

        # Parse JSON output or use fallback
        parsed = self._extract_json(raw_json_str)
        if not parsed:
            parsed = self._deterministic_scientific_fallback(name_u, domain_u, name_v, domain_v)

        # Determine thinking mode association
        try:
            mode_enum = ThinkingMode(mode_u)
        except Exception:
            mode_enum = ThinkingMode.SYSTEMS

        return SynthesizedConceptResult(
            name=parsed.get("name", f"{name_u} ⊗ {name_v}"),
            domain=parsed.get("domain", f"{domain_u}-{domain_v} Synthesis"),
            description=parsed.get("description", f"Unified cross-disciplinary blend coupling {name_u} and {name_v}."),
            emergent_property=parsed.get("emergent_property", f"Emergent interplay between {domain_u} and {domain_v} dynamics."),
            isomorphism_mapping=parsed.get("isomorphism_mapping", f"Mapping invariant structures of {name_u} to {name_v}."),
            falsifiable_test=parsed.get("falsifiable_test", f"Empirical benchmarking of {parsed.get('name')} in hybrid experiments."),
            thinking_mode=mode_enum,
            theoretical_entropy_drop=theoretical_drop,
            fiedler_gap=fiedler_gap,
        )

    def _extract_json(self, text: str) -> Optional[Dict[str, Any]]:
        """Safely extract JSON from model output, handling potential markdown fences."""
        if not text:
            return None
        # Remove markdown code fences if present
        clean = re.sub(r"^```(?:json)?", "", text.strip(), flags=re.MULTILINE)
        clean = re.sub(r"```$", "", clean.strip(), flags=re.MULTILINE).strip()
        try:
            return json.loads(clean)
        except Exception:
            # Try finding the first '{' and last '}'
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1 and end > start:
                try:
                    return json.loads(text[start : end + 1])
                except Exception:
                    pass
        return None

    def _deterministic_scientific_fallback(
        self, name_u: str, domain_u: str, name_v: str, domain_v: str
    ) -> Dict[str, Any]:
        """High-grade deterministic fallback for development, offline, or fallback mode."""
        synthesis_name = f"{name_u}-{name_v} Unified Model"
        combined_domain = f"{domain_u} & {domain_v}"
        return {
            "name": synthesis_name,
            "domain": combined_domain,
            "description": f"An integrated theoretical synthesis combining the structural principles of {name_u} ({domain_u}) with the dynamics of {name_v} ({domain_v}).",
            "isomorphism_mapping": f"Structural isomorphism maps governing variables of {name_u} directly to behavioral constraints in {name_v}.",
            "emergent_property": f"Cross-domain feedback coupling enabling multi-scale prediction across {domain_u} and {domain_v}.",
            "falsifiable_test": f"Verification of predictive consistency against dual-domain benchmarks under boundary constraints.",
        }


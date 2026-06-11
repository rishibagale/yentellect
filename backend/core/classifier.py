"""
Yentellect Thinking Mode Classifier

Classifies user input into one of six thinking modes based on
BehavioralSignalVector features.

Uses a weighted heuristic approach (ready for ML upgrade with scikit-learn).
Each thinking mode has a characteristic signal profile:
- CONVERGENT: high sentence_complexity, low hedge_word_rate, low first_person_rate
- DIVERGENT: high ideational_fluency, high question_density, high first_person_rate
- ANALOGICAL: high cross_domain_refs, moderate ideational_fluency
- METACOGNITIVE: high hedge_word_rate, high self_correction_rate
- SYSTEMS: high sentence_complexity, moderate cross_domain_refs
- DMN: high first_person_rate, low question_density, low sentence_complexity
"""

from typing import List, Tuple, Dict

from .models import SignalVector, ThinkingMode

# Optional numpy - fall back to pure Python if not available
try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False


# Characteristic signal profiles for each mode (heuristic weights)
# Each profile is a dict mapping feature_name to weight (positive = higher, negative = lower)
MODE_PROFILES: Dict[ThinkingMode, Dict[str, float]] = {
    ThinkingMode.CONVERGENT: {
        "type_token_ratio": 0.3,
        "question_density": -0.8,
        "hedge_word_rate": -0.6,
        "self_correction_rate": -0.4,
        "cross_domain_refs": -0.3,
        "first_person_rate": -0.7,
        "sentence_complexity": 0.8,
        "ideational_fluency": -0.2,
    },
    ThinkingMode.DIVERGENT: {
        "type_token_ratio": 0.6,
        "question_density": 0.7,
        "hedge_word_rate": 0.3,
        "self_correction_rate": 0.2,
        "cross_domain_refs": 0.5,
        "first_person_rate": 0.6,
        "sentence_complexity": -0.3,
        "ideational_fluency": 0.9,
    },
    ThinkingMode.ANALOGICAL: {
        "type_token_ratio": 0.5,
        "question_density": 0.3,
        "hedge_word_rate": -0.2,
        "self_correction_rate": 0.1,
        "cross_domain_refs": 0.9,
        "first_person_rate": 0.1,
        "sentence_complexity": 0.5,
        "ideational_fluency": 0.6,
    },
    ThinkingMode.METACOGNITIVE: {
        "type_token_ratio": 0.4,
        "question_density": 0.4,
        "hedge_word_rate": 0.9,
        "self_correction_rate": 0.8,
        "cross_domain_refs": 0.2,
        "first_person_rate": 0.7,
        "sentence_complexity": 0.3,
        "ideational_fluency": 0.1,
    },
    ThinkingMode.SYSTEMS: {
        "type_token_ratio": 0.7,
        "question_density": 0.2,
        "hedge_word_rate": -0.5,
        "self_correction_rate": 0.3,
        "cross_domain_refs": 0.6,
        "first_person_rate": -0.6,
        "sentence_complexity": 0.9,
        "ideational_fluency": 0.2,
    },
    ThinkingMode.DMN: {
        "type_token_ratio": 0.2,
        "question_density": -0.5,
        "hedge_word_rate": 0.5,
        "self_correction_rate": -0.7,
        "cross_domain_refs": 0.4,
        "first_person_rate": 0.9,
        "sentence_complexity": -0.8,
        "ideational_fluency": 0.5,
    },
}

# Feature names in order
_FEATURE_NAMES = [
    "type_token_ratio", "question_density", "hedge_word_rate",
    "self_correction_rate", "cross_domain_refs", "first_person_rate",
    "sentence_complexity", "ideational_fluency"
]


def _dot_product(features: List[float], weights: List[float]) -> float:
    """Dot product of two vectors, works without numpy."""
    return sum(f * w for f, w in zip(features, weights))


class ThinkingModeClassifier:
    """
    Classifies thinking mode from behavioral signal vectors.
    
    Uses weighted heuristic: dot product of signal features with mode profiles.
    Ready for scikit-learn ML upgrade when sufficient training data exists.
    """
    
    def __init__(self, confidence_threshold: float = 0.6):
        """
        Initialize classifier.
        
        Args:
            confidence_threshold: Minimum confidence to return a classification.
                                 Below this, returns None (uncertain).
        """
        self.confidence_threshold = confidence_threshold
        self._feature_names = _FEATURE_NAMES
    
    def classify(self, vector: SignalVector) -> Tuple[ThinkingMode, float]:
        """
        Classify a single signal vector into a thinking mode.
        
        Args:
            vector: SignalVector to classify
            
        Returns:
            Tuple of (predicted_mode, confidence) where confidence is 0.0-1.0
        """
        # Extract feature values into list
        features = [getattr(vector, name) for name in self._feature_names]
        
        # Compute scores for each mode via weighted heuristic
        scores = {}
        for mode, profile in MODE_PROFILES.items():
            weights = [profile.get(name, 0.0) for name in self._feature_names]
            # Dot product, normalized to [0, 1]
            score = _dot_product(features, weights)
            # Shift to positive range
            score = (score + 4.0) / 8.0  # Normalize approximately to [0, 1]
            score = max(0.0, min(1.0, score))
            scores[mode] = score
        
        # Get best mode
        predicted = max(scores, key=scores.get)
        confidence = scores[predicted]
        
        # Apply threshold
        if confidence < self.confidence_threshold:
            predicted = ThinkingMode.CONVERGENT  # Default fallback
        
        return predicted, confidence
    
    def classify_batch(self, vectors: List[SignalVector]) -> List[Tuple[ThinkingMode, float]]:
        """
        Classify a batch of signal vectors.
        
        Args:
            vectors: List of SignalVectors
            
        Returns:
            List of (predicted_mode, confidence) tuples
        """
        return [self.classify(v) for v in vectors]
    
    def get_mode_distribution(self, vectors: List[SignalVector]) -> Dict[ThinkingMode, float]:
        """
        Get the distribution of modes across multiple turns.
        
        Args:
            vectors: List of signal vectors from a session
            
        Returns:
            Dict mapping ThinkingMode to proportion (0.0-1.0)
        """
        if not vectors:
            return {mode: 0.0 for mode in ThinkingMode}
        
        classifications = self.classify_batch(vectors)
        counts = {mode: 0 for mode in ThinkingMode}
        
        for mode, _ in classifications:
            counts[mode] += 1
        
        total = len(vectors)
        return {mode: count / total for mode, count in counts.items()}
    
    def get_dominant_and_weakest(self, vectors: List[SignalVector]) -> Tuple[ThinkingMode, ThinkingMode, Dict[str, float]]:
        """
        Determine dominant and weakest thinking modes from signal history.
        
        Args:
            vectors: List of signal vectors
            
        Returns:
            Tuple of (dominant_mode, weakest_mode, mode_averages)
        """
        if not vectors:
            return ThinkingMode.CONVERGENT, ThinkingMode.DMN, {}
        
        # Average signal vector across all turns
        avg_vector = SignalVector()
        for name in self._feature_names:
            values = [getattr(v, name) for v in vectors]
            setattr(avg_vector, name, sum(values) / len(values))
        
        # Classify the average vector
        dominant, dom_confidence = self.classify(avg_vector)
        
        # Find weakest by lowest confidence
        all_scores = {}
        for mode in ThinkingMode:
            mode_features = [getattr(avg_vector, name) for name in self._feature_names]
            mode_weights = [MODE_PROFILES[mode].get(name, 0.0) for name in self._feature_names]
            raw_score = _dot_product(mode_features, mode_weights)
            norm_score = max(0.0, min(1.0, (raw_score + 4.0) / 8.0))
            all_scores[mode.value] = norm_score
        
        weakest = min(all_scores, key=all_scores.get)
        
        return dominant, ThinkingMode(weakest), all_scores


# Global instance for convenience
classifier = ThinkingModeClassifier()


def classify_text(vector: SignalVector) -> Tuple[ThinkingMode, float]:
    """
    Convenience function to classify a signal vector.
    
    Args:
        vector: SignalVector from signal extractor
        
    Returns:
        (predicted_mode, confidence) tuple
    """
    return classifier.classify(vector)
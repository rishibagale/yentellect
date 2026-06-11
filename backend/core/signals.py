"""
Yentellect Behavioral Signal Extractor

Extracts 8-dimensional signal vector from user text using spaCy and NLTK.
Each feature maps to a cognitive/neural correlate of thinking modes.

Neuroscience basis:
- Type-token ratio: lexical diversity → vocabulary breadth (temporal lobe)
- Question density: inquiry orientation → curiosity/dopamine (ventral striatum)
- Hedge word rate: uncertainty calibration → metacognitive monitoring (anterior PFC)
- Self-correction rate: online monitoring → executive control (DLPFC)
- Cross-domain refs: conceptual distance → analogical mapping (frontopolar cortex)
- First-person rate: self-referential processing → DMN engagement (PCC/mPFC)
- Sentence complexity: syntactic embedding → working memory load (DLPFC + parietal)
- Ideational fluency: unique concept density → divergent generation (DMN-DLPFC coupling)
"""

import re
import math
from typing import List, Set, Optional
from .models import SignalVector

# Optional heavy dependencies - fall back to lightweight implementations
try:
    import spacy
    from spacy.tokens import Doc
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    Doc = None

try:
    import nltk
    from nltk.tokenize import word_tokenize, sent_tokenize
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False

# Download required NLTK data (only if available)
if NLTK_AVAILABLE:
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt', quiet=True)
    try:
        nltk.data.find('tokenizers/punkt_tab')
    except LookupError:
        nltk.download('punkt_tab', quiet=True)
    try:
        nltk.data.find('taggers/averaged_perceptron_tagger')
    except LookupError:
        nltk.download('averaged_perceptron_tagger', quiet=True)
    try:
        nltk.data.find('taggers/averaged_perceptron_tagger_eng')
    except LookupError:
        nltk.download('averaged_perceptron_tagger_eng', quiet=True)


# Hedge words indicating uncertainty / metacognitive awareness
HEDGE_WORDS = {
    "maybe", "perhaps", "possibly", "probably", "likely", "unlikely",
    "i think", "i believe", "i suppose", "i guess", "it seems", "apparently",
    "might", "could", "would", "should", "seemingly", "presumably",
    "sort of", "kind of", "almost", "nearly", "roughly", "approximately"
}

# Self-correction markers indicating online monitoring
SELF_CORRECTION_MARKERS = {
    "wait", "actually", "no", "i mean", "correction", "rather",
    "let me rephrase", "that's not right", "scratch that", "on second thought",
    "hold on", "wait a minute", "let me correct", "my mistake"
}


class _LightweightExtractor:
    """Fallback signal extractor when spaCy/NLTK are not available.
    
    Uses regex and simple heuristics instead of full NLP pipelines.
    """
    
    def __init__(self):
        self._hedge_pattern = re.compile(
            r'\b(' + '|'.join(re.escape(w) for w in HEDGE_WORDS) + r')\b',
            re.IGNORECASE
        )
        self._correction_pattern = re.compile(
            r'\b(' + '|'.join(re.escape(w) for w in SELF_CORRECTION_MARKERS) + r')\b',
            re.IGNORECASE
        )
    
    def extract(self, text: str) -> SignalVector:
        """Extract signal vector using lightweight methods."""
        if not text or not text.strip():
            return SignalVector()
        
        words = re.findall(r"[a-zA-Z']+", text)
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        word_count = len(words) if words else 1
        
        # Type-token ratio
        unique_words = len(set(w.lower() for w in words))
        ttr = min(unique_words / word_count, 1.0) if words else 0.0
        
        # Question density
        question_count = text.count('?')
        question_density = min((question_count / word_count) * 100, 1.0)
        
        # Hedge word rate
        hedge_count = len(self._hedge_pattern.findall(text.lower()))
        hedge_rate = min((hedge_count / word_count) * 100, 1.0)
        
        # Self-correction rate
        correction_count = len(self._correction_pattern.findall(text.lower()))
        correction_rate = min((correction_count / word_count) * 100, 1.0)
        
        # Cross-domain refs (simplified: unique capitalized terms / 18 max)
        capitalized = set(w.lower() for w in words if w[0].isupper() and len(w) > 1)
        cross_domain = min(len(capitalized) / 18.0, 1.0)
        
        # First-person rate
        first_person = {"i", "me", "my", "mine", "myself"}
        fp_count = sum(1 for w in words if w.lower() in first_person)
        fp_rate = min((fp_count / word_count) * 100, 1.0)
        
        # Sentence complexity (simplified: avg words per sentence / 30 max)
        avg_words_per_sent = word_count / len(sentences) if sentences else 0
        complexity = min(avg_words_per_sent / 30.0, 1.0)
        
        # Ideational fluency (simplified: unique nouns via heuristic)
        # Words longer than 5 chars that aren't common verbs/stopwords
        stop_words = {
            "about", "above", "after", "again", "against", "all", "also", "and",
            "because", "been", "before", "being", "below", "between", "both",
            "could", "did", "does", "doing", "down", "each", "few", "from",
            "further", "have", "having", "here", "how", "just", "like", "more",
            "most", "much", "other", "over", "same", "should", "such", "than",
            "that", "their", "them", "there", "these", "they", "this", "those",
            "through", "too", "under", "very", "was", "were", "what", "when",
            "where", "which", "while", "who", "why", "will", "with", "would",
            "your",
        }
        candidate_concepts = set(
            w.lower() for w in words
            if len(w) > 5 and w.lower() not in stop_words
        )
        fluency = min(len(candidate_concepts) / word_count, 1.0)
        
        return SignalVector(
            type_token_ratio=ttr,
            question_density=question_density,
            hedge_word_rate=hedge_rate,
            self_correction_rate=correction_rate,
            cross_domain_refs=cross_domain,
            first_person_rate=fp_rate,
            sentence_complexity=complexity,
            ideational_fluency=fluency,
        )


class BehavioralSignalExtractor:
    """
    Extracts behavioral signals from natural language text.
    
    Uses spaCy for linguistic analysis (dependency parsing, NER, POS tagging)
    and NLTK for tokenization fallback.
    
    Falls back to lightweight regex-based extraction when these are not available.
    
    All outputs normalized to [0, 1] range for classifier compatibility.
    """
    
    def __init__(self, model_name: str = "en_core_web_sm"):
        """
        Initialize with spaCy model or fallback extractor.
        
        Args:
            model_name: spaCy model to load. Default: en_core_web_sm
        """
        self._fallback = None
        self.nlp = None
        
        if SPACY_AVAILABLE:
            try:
                self.nlp = spacy.load(model_name)
            except OSError:
                print(f"spaCy model '{model_name}' not found. Using lightweight fallback.")
                self._fallback = _LightweightExtractor()
        else:
            print("spaCy not installed. Using lightweight signal extraction fallback.")
            self._fallback = _LightweightExtractor()
        
        # Cache for performance
        self._hedge_pattern = re.compile(
            r'\b(' + '|'.join(re.escape(w) for w in HEDGE_WORDS) + r')\b',
            re.IGNORECASE
        )
        self._correction_pattern = re.compile(
            r'\b(' + '|'.join(re.escape(w) for w in SELF_CORRECTION_MARKERS) + r')\b',
            re.IGNORECASE
        )
    
    def extract(self, text: str) -> SignalVector:
        """
        Extract full signal vector from text.
        
        Args:
            text: Raw user input text
            
        Returns:
            SignalVector with all 8 dimensions populated
        """
        if not text or not text.strip():
            return SignalVector()
        
        # Use fallback if spaCy not available
        if self._fallback:
            return self._fallback.extract(text)
        
        doc = self.nlp(text)
        
        return SignalVector(
            type_token_ratio=self._type_token_ratio(doc),
            question_density=self._question_density(doc, text),
            hedge_word_rate=self._hedge_word_rate(text),
            self_correction_rate=self._self_correction_rate(text),
            cross_domain_refs=self._cross_domain_refs(doc),
            first_person_rate=self._first_person_rate(doc, text),
            sentence_complexity=self._sentence_complexity(doc),
            ideational_fluency=self._ideational_fluency(doc),
        )
    
    def _type_token_ratio(self, doc) -> float:
        """
        Type-token ratio: unique word types / total tokens.
        
        Higher values indicate broader vocabulary usage.
        Normalized by theoretical max (~1.0 for all unique words).
        """
        tokens = [token.lower_ for token in doc if token.is_alpha]
        if not tokens:
            return 0.0
        
        unique_types = len(set(tokens))
        total_tokens = len(tokens)
        
        # Normalize: TTR naturally decreases with text length
        # Use corrected TTR or just raw ratio capped at 1.0
        return min(unique_types / total_tokens, 1.0)
    
    def _question_density(self, doc, text: str) -> float:
        """
        Question marks per 100 words.
        
        Higher values indicate more inquiry-driven thinking.
        """
        word_count = len([t for t in doc if t.is_alpha])
        if word_count == 0:
            return 0.0
        
        question_count = text.count('?')
        # Per 100 words, cap at 1.0 (more than 1 question per 3 words is max)
        return min((question_count / word_count) * 100, 1.0)
    
    def _hedge_word_rate(self, text: str) -> float:
        """
        Hedge words per 100 words.
        
        Hedge words indicate uncertainty calibration / metacognitive awareness.
        Higher = more explicit uncertainty expression.
        """
        if NLTK_AVAILABLE:
            words = word_tokenize(text.lower())
        else:
            words = re.findall(r"[a-zA-Z']+", text.lower())
        if not words:
            return 0.0
        
        word_count = len([w for w in words if w.isalpha()])
        if word_count == 0:
            return 0.0
        
        hedge_count = len(self._hedge_pattern.findall(text.lower()))
        return min((hedge_count / word_count) * 100, 1.0)
    
    def _self_correction_rate(self, text: str) -> float:
        """
        Self-correction markers per 100 words.
        
        Indicates online monitoring / executive function engagement.
        Higher = more self-monitoring during generation.
        """
        if NLTK_AVAILABLE:
            words = word_tokenize(text.lower())
        else:
            words = re.findall(r"[a-zA-Z']+", text.lower())
        if not words:
            return 0.0
        
        word_count = len([w for w in words if w.isalpha()])
        if word_count == 0:
            return 0.0
        
        correction_count = len(self._correction_pattern.findall(text.lower()))
        return min((correction_count / word_count) * 100, 1.0)
    
    def _cross_domain_refs(self, doc) -> float:
        """
        Named entity type diversity.
        
        Different entity types (PERSON, ORG, GPE, PRODUCT, EVENT, etc.)
        indicate cross-domain concept bridging → analogical thinking.
        
        Returns normalized count of unique entity types (max 18 spaCy types).
        """
        entity_types: Set[str] = set()
        for ent in doc.ents:
            entity_types.add(ent.label_)
        
        # Normalize by max possible entity types (~18 in spaCy)
        return min(len(entity_types) / 18.0, 1.0)
    
    def _first_person_rate(self, doc, text: str) -> float:
        """
        First-person pronouns (I/me/my/mine/myself) per 100 words.
        
        Higher = more self-referential processing → DMN engagement.
        """
        if NLTK_AVAILABLE:
            words = word_tokenize(text.lower())
        else:
            words = re.findall(r"[a-zA-Z']+", text.lower())
        if not words:
            return 0.0
        
        word_count = len([w for w in words if w.isalpha()])
        if word_count == 0:
            return 0.0
        
        first_person = {"i", "me", "my", "mine", "myself"}
        fp_count = sum(1 for w in words if w in first_person)
        
        return min((fp_count / word_count) * 100, 1.0)
    
    def _sentence_complexity(self, doc) -> float:
        """
        Average dependency tree depth per sentence.
        
        Deeper trees = more complex syntactic embedding = higher working memory load.
        Normalized by typical max depth (~10-15 for complex sentences).
        """
        if not list(doc.sents):
            return 0.0
        
        depths = []
        for sent in doc.sents:
            # Calculate max dependency depth in this sentence
            sent_tokens = list(sent)
            if not sent_tokens:
                depths.append(0)
                continue
            
            # Build dependency depth for each token
            token_to_depth = {}
            for token in sent_tokens:
                depth = 0
                current = token
                while current.head != current and depth < 20:  # prevent cycles
                    depth += 1
                    current = current.head
                token_to_depth[token] = depth
            
            max_depth = max(token_to_depth.values()) if token_to_depth else 0
            depths.append(max_depth)
        
        avg_depth = sum(depths) / len(depths)
        # Normalize: typical max depth ~12, cap at 1.0
        return min(avg_depth / 12.0, 1.0)
    
    def _ideational_fluency(self, doc) -> float:
        """
        Unique noun concept density.
        
        Count of unique nouns (concepts) / total words.
        Higher = more distinct ideas per unit text → divergent thinking.
        """
        words = [token for token in doc if token.is_alpha]
        if not words:
            return 0.0
        
        total_words = len(words)
        nouns = {token.lemma_.lower() for token in doc 
                 if token.pos_ in ("NOUN", "PROPN") and token.is_alpha}
        
        unique_noun_count = len(nouns)
        return min(unique_noun_count / total_words, 1.0)


# Convenience function for direct use
def extract_signals(text: str, model_name: str = "en_core_web_sm") -> SignalVector:
    """
    Convenience function to extract signals without instantiating class.
    
    Args:
        text: Input text
        model_name: spaCy model to use
        
    Returns:
        SignalVector with extracted features
    """
    extractor = BehavioralSignalExtractor(model_name)
    return extractor.extract(text)
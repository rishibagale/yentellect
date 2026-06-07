"""
Tests for Behavioral Signal Extractor

Tests each extractor method with known inputs.
Asserts output is within valid 0-1 range.
Tests edge cases (empty string).
Tests divergent vs convergent style texts.
"""

import pytest
from backend.core.signals import BehavioralSignalExtractor, extract_signals
from backend.core.models import SignalVector


class TestBehavioralSignalExtractor:
    """Test suite for BehavioralSignalExtractor class."""
    
    @pytest.fixture(scope="class")
    def extractor(self):
        """Create extractor instance for testing."""
        return BehavioralSignalExtractor()
    
    def test_empty_string(self, extractor):
        """Test extraction from empty string returns zeros."""
        result = extractor.extract("")
        assert isinstance(result, SignalVector)
        assert result.type_token_ratio == 0.0
        assert result.question_density == 0.0
        assert result.hedge_word_rate == 0.0
        assert result.self_correction_rate == 0.0
        assert result.cross_domain_refs == 0.0
        assert result.first_person_rate == 0.0
        assert result.sentence_complexity == 0.0
        assert result.ideational_fluency == 0.0
    
    def test_whitespace_only(self, extractor):
        """Test extraction from whitespace only."""
        result = extractor.extract("   \n\t  ")
        assert isinstance(result, SignalVector)
        # All zeros for whitespace
        for field_name in result.model_fields:
            assert getattr(result, field_name) == 0.0
    
    def test_all_features_in_range(self, extractor):
        """Test all features return values in [0, 1] range."""
        text = "I think maybe this could work? Actually, wait - let me reconsider. The system involves multiple feedback loops between biology and technology."
        result = extractor.extract(text)
        
        for field_name in result.model_fields:
            value = getattr(result, field_name)
            assert 0.0 <= value <= 1.0, f"{field_name} = {value} out of range"
    
    def test_type_token_ratio(self, extractor):
        """Test type-token ratio calculation."""
        # All unique words
        text_unique = "apple banana cherry date elderberry"
        result = extractor.extract(text_unique)
        assert result.type_token_ratio == 1.0
        
        # Repeated words
        text_repeated = "apple apple apple apple apple"
        result = extractor.extract(text_repeated)
        assert result.type_token_ratio < 1.0
        assert result.type_token_ratio > 0.0
    
    def test_question_density(self, extractor):
        """Test question density calculation."""
        # No questions
        text_no_q = "This is a statement. Another statement here."
        result = extractor.extract(text_no_q)
        assert result.question_density == 0.0
        
        # Many questions
        text_many_q = "What? Why? How? When? Where? Who?"
        result = extractor.extract(text_many_q)
        assert result.question_density > 0.0
        assert result.question_density <= 1.0
    
    def test_hedge_word_rate(self, extractor):
        """Test hedge word detection."""
        # No hedges
        text_no_hedge = "This is certain. Definitely true."
        result = extractor.extract(text_no_hedge)
        assert result.hedge_word_rate == 0.0
        
        # Many hedges
        text_hedges = "Maybe perhaps possibly I think it might work."
        result = extractor.extract(text_hedges)
        assert result.hedge_word_rate > 0.0
        assert result.hedge_word_rate <= 1.0
    
    def test_self_correction_rate(self, extractor):
        """Test self-correction marker detection."""
        # No corrections
        text_no_corr = "This is correct. Absolutely right."
        result = extractor.extract(text_no_corr)
        assert result.self_correction_rate == 0.0
        
        # Corrections present
        text_corr = "Wait, actually no, I mean let me rephrase that."
        result = extractor.extract(text_corr)
        assert result.self_correction_rate > 0.0
        assert result.self_correction_rate <= 1.0
    
    def test_cross_domain_refs(self, extractor):
        """Test named entity type diversity."""
        # Single domain (only PERSON entities)
        text_single = "John met Mary and they talked to Peter."
        result = extractor.extract(text_single)
        # Only PERSON entity type
        assert result.cross_domain_refs >= 0.0
        assert result.cross_domain_refs <= 1.0
        
        # Multiple domains
        text_multi = "Apple Inc. released iPhone in California yesterday during WWDC event."
        result = extractor.extract(text_multi)
        # ORG, PRODUCT, GPE, DATE, EVENT = multiple types
        assert result.cross_domain_refs > 0.0
    
    def test_first_person_rate(self, extractor):
        """Test first-person pronoun rate."""
        # No first person
        text_no_fp = "The system works well. It processes data efficiently."
        result = extractor.extract(text_no_fp)
        assert result.first_person_rate == 0.0
        
        # High first person
        text_fp = "I think I believe I feel I know I understand."
        result = extractor.extract(text_fp)
        assert result.first_person_rate > 0.0
        assert result.first_person_rate <= 1.0
    
    def test_sentence_complexity(self, extractor):
        """Test sentence complexity (dependency depth)."""
        # Simple sentences
        text_simple = "The cat sat. The dog ran. The bird flew."
        result = extractor.extract(text_simple)
        assert result.sentence_complexity >= 0.0
        assert result.sentence_complexity <= 1.0
        
        # Complex nested sentence
        text_complex = "The scientist who discovered the particle that explains the force which binds the universe won the prize."
        result = extractor.extract(text_complex)
        assert result.sentence_complexity > 0.0
    
    def test_ideational_fluency(self, extractor):
        """Test unique noun concept density."""
        # Low fluency (repeated nouns)
        text_low = "The cat cat cat cat cat."
        result = extractor.extract(text_low)
        assert result.ideational_fluency >= 0.0
        assert result.ideational_fluency <= 1.0
        
        # High fluency (many unique nouns)
        text_high = "Physics biology chemistry mathematics psychology sociology anthropology linguistics."
        result = extractor.extract(text_high)
        assert result.ideational_fluency > 0.0
    
    def test_divergent_vs_convergent_style(self, extractor):
        """
        Test that divergent-style and convergent-style texts
        produce different feature profiles in expected directions.
        """
        # Convergent style: focused, precise, low hedges, low first-person
        convergent_text = (
            "The algorithm sorts the array in O(n log n) time. "
            "It divides the input recursively. "
            "The base case handles single elements. "
            "Merge step combines sorted subarrays."
        )
        
        # Divergent style: exploratory, many ideas, questions, hedges
        divergent_text = (
            "What if we tried a completely different approach? "
            "Maybe we could use quantum principles or biological metaphors. "
            "I wonder whether neural networks might help here. "
            "Perhaps we should explore genetic algorithms instead. "
            "What about swarm intelligence or ant colony optimization?"
        )
        
        conv_result = extractor.extract(convergent_text)
        div_result = extractor.extract(divergent_text)
        
        # Divergent should have higher question density
        assert div_result.question_density > conv_result.question_density
        
        # Divergent should have higher hedge word rate
        assert div_result.hedge_word_rate > conv_result.hedge_word_rate
        
        # Divergent should have higher ideational fluency (more unique concepts)
        assert div_result.ideational_fluency > conv_result.ideational_fluency
        
        # Divergent should have higher first person rate
        assert div_result.first_person_rate > conv_result.first_person_rate
        
        # Convergent should have lower self-correction (more confident)
        # (This is a tendency, not absolute)
        
        # Both should have valid ranges
        for result in [conv_result, div_result]:
            for field_name in result.model_fields:
                value = getattr(result, field_name)
                assert 0.0 <= value <= 1.0
    
    def test_convenience_function(self):
        """Test the extract_signals convenience function."""
        result = extract_signals("Test input text with a question?")
        assert isinstance(result, SignalVector)
        assert result.question_density > 0.0
    
    def test_special_characters_handling(self, extractor):
        """Test handling of special characters and punctuation."""
        text = "Hello!!! What's up??? I'm testing... (parentheses) [brackets] {braces}"
        result = extractor.extract(text)
        # Should not crash, all values in range
        for field_name in result.model_fields:
            value = getattr(result, field_name)
            assert 0.0 <= value <= 1.0
    
    def test_unicode_handling(self, extractor):
        """Test handling of unicode characters."""
        text = "Café naïve résumé 🤔 你好 こんにちは"
        result = extractor.extract(text)
        # Should not crash
        for field_name in result.model_fields:
            value = getattr(result, field_name)
            assert 0.0 <= value <= 1.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
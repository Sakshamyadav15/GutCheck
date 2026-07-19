"""
test_extraction.py — Tests for the claim extractor (extraction/extractor.py).
"""

import pytest
from backend.extraction.extractor import extract_claims


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

AI_ANSWER_RICH = """
ChatGPT reached 100 million users within two months of its November 2022 launch.
The Great Wall of China is visible from space with the naked eye.
Roughly 30 percent of US teenagers use AI chatbots on a daily basis.
Some people think AI is probably going to be important in the future.
AI could maybe perhaps change how we work, possibly.
"""

AI_ANSWER_OPINIONS = """
AI is probably the most important technology ever invented.
Society should maybe consider thinking about whether AI might be important.
Perhaps we ought to reconsider our approach to technology.
"""

AI_ANSWER_MINIMAL = "AI is good."

AI_ANSWER_STATISTICAL = """
According to a 2025 study, 67 percent of students aged 15-24 use AI tools for homework.
The global AI market was valued at approximately $207 billion in 2023.
"""


# ---------------------------------------------------------------------------
# Core extraction tests
# ---------------------------------------------------------------------------

class TestExtractClaims:
    def test_returns_list(self):
        result = extract_claims(AI_ANSWER_RICH)
        assert isinstance(result, list)

    def test_extracts_at_least_one_claim(self):
        result = extract_claims(AI_ANSWER_RICH)
        assert len(result) >= 1, "Should extract at least one checkable claim"

    def test_sorted_by_specificity_descending(self):
        result = extract_claims(AI_ANSWER_RICH)
        scores = [c["specificity_score"] for c in result]
        assert scores == sorted(scores, reverse=True), "Claims must be sorted highest specificity first"

    def test_claim_schema(self):
        """Each claim must conform to the PRD §10.1 JSON schema."""
        result = extract_claims(AI_ANSWER_RICH)
        for claim in result:
            assert "claim_id" in claim
            assert "text" in claim
            assert "claim_type" in claim
            assert "entities" in claim
            assert "specificity_score" in claim
            assert "source_position" in claim
            assert isinstance(claim["specificity_score"], float)
            assert 0.0 <= claim["specificity_score"] <= 1.0

    def test_claim_type_values(self):
        """Claim types must be one of the allowed values."""
        allowed = {"factual", "statistical", "causal", "quotation", "opinion_excluded"}
        result = extract_claims(AI_ANSWER_RICH)
        for claim in result:
            assert claim["claim_type"] in allowed

    def test_opinion_claims_excluded(self):
        """Heavy opinion/hedge sentences should not appear as primary claims."""
        result = extract_claims(AI_ANSWER_OPINIONS)
        # Either empty or very few claims with low specificity
        for claim in result:
            assert claim["specificity_score"] < 0.5, \
                f"Opinion claim should have low specificity: {claim['text']}"

    def test_empty_string_returns_empty(self):
        result = extract_claims("")
        assert result == []

    def test_short_text_returns_empty_or_minimal(self):
        result = extract_claims(AI_ANSWER_MINIMAL)
        # Should not crash; may return 0 or 1 results
        assert isinstance(result, list)

    def test_statistical_claims_detected(self):
        result = extract_claims(AI_ANSWER_STATISTICAL)
        types = [c["claim_type"] for c in result]
        assert "statistical" in types, "Statistical claims (with %) should be typed correctly"

    def test_source_answer_id_propagated(self):
        result = extract_claims(AI_ANSWER_RICH, source_answer_id="test-session-123")
        for claim in result:
            assert claim.get("source_answer_id") == "test-session-123"

    def test_features_present(self):
        """_features key must be present for Coach Engine pipeline."""
        result = extract_claims(AI_ANSWER_RICH)
        for claim in result:
            assert "_features" in claim
            feats = claim["_features"]
            assert "hedge_ratio" in feats
            assert "has_numeric" in feats
            assert isinstance(feats["hedge_ratio"], float)
            assert isinstance(feats["has_numeric"], bool)

    def test_numeric_claims_flagged(self):
        result = extract_claims(AI_ANSWER_STATISTICAL)
        for claim in result:
            if "67 percent" in claim["text"] or "207 billion" in claim["text"]:
                assert claim["_features"]["has_numeric"] is True

    def test_hedge_ratio_for_hedged_sentence(self):
        hedged = "AI could perhaps maybe possibly change things in some ways."
        result = extract_claims(hedged)
        if result:
            for claim in result:
                assert claim["_features"]["hedge_ratio"] > 0, \
                    "Hedge ratio should be positive for heavily hedged sentence"

    def test_max_claims_reasonable(self):
        """Extractor should not return an unbounded number of claims."""
        long_text = " ".join([
            f"ChatGPT had {i*10} million users in year {2020+i}." for i in range(1, 20)
        ])
        result = extract_claims(long_text)
        # Extractor imposes no hard cap but should be bounded by sentence count
        assert len(result) <= 20

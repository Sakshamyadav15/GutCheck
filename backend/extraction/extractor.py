"""
extractor.py — Real claim extraction from AI-generated text.

Strategy (no fine-tuned model required for MVP):
  1. Use spaCy for NER + sentence segmentation.
  2. Apply rule-based filters to isolate atomic, checkable claims:
     - Contains named entities OR numerical values OR dates.
     - Not a hedged opinion (filtered by hedge-word ratio).
     - Not a pure question or imperative sentence.
  3. Score each claim on specificity (entity density + numeric presence).
  4. Return ordered list, highest specificity first (PRD §5.2).
"""

import re
import uuid
import math
from typing import List, Dict, Any

# Graceful import — spaCy may not be installed in test-only environments
try:
    import spacy
    _nlp = spacy.load("en_core_web_sm")
except Exception:
    _nlp = None

# Hedge words that lower claim verifiability (PRD §10.2 hedge-language ratio)
HEDGE_WORDS = {
    "probably", "possibly", "perhaps", "maybe", "might", "could", "may",
    "seem", "appears", "suggests", "allegedly", "reportedly", "supposedly",
    "some", "many", "often", "generally", "usually", "typically", "often",
    "sometimes", "occasionally", "rarely", "about", "roughly", "approximately",
    "around", "nearly", "almost", "somewhat", "rather", "fairly", "quite",
}

# Opinion/prediction markers that flag a claim as non-checkable
OPINION_MARKERS = {
    "should", "ought", "must", "need", "believe", "think", "feel", "consider",
    "argue", "claim", "assert", "contend", "predict", "forecast", "expect",
    "good", "bad", "better", "worse", "best", "worst",
    "beautiful", "ugly", "important", "significant", "relevant", "interesting",
}

NUMERIC_PATTERN = re.compile(r"\b\d[\d,\.]*(%|billion|million|thousand|percent|°|km|kg|mph|years?)?\b")
CITATION_PATTERN = re.compile(r"\([A-Za-z].*?\d{4}\)|\[.*?\]|according to|cited in|source:")


def _sentence_features(sentence_text: str, doc) -> Dict[str, Any]:
    """
    Compute the feature vector for a single candidate claim sentence.
    Mirrors the Coach Engine feature set (PRD §10.2).
    """
    tokens = [t for t in doc if not t.is_space]
    if not tokens:
        return {}

    words = [t.text.lower() for t in tokens]
    word_set = set(words)

    # Named entity density
    ents = [e for e in doc.ents]
    ent_density = len(ents) / max(len(tokens), 1)

    # Numeric presence
    numerics = NUMERIC_PATTERN.findall(sentence_text)
    has_numeric = len(numerics) > 0
    numeric_density = len(numerics) / max(len(tokens), 1)

    # Hedge ratio
    hedge_count = sum(1 for w in words if w in HEDGE_WORDS)
    hedge_ratio = hedge_count / max(len(tokens), 1)

    # Opinion score
    opinion_count = sum(1 for w in words if w in OPINION_MARKERS)

    # Unresolved citation flag
    has_unresolved_citation = bool(CITATION_PATTERN.search(sentence_text))

    # Specificity score: composite of entity density, numeric presence, low hedge
    specificity = (
        0.40 * min(ent_density * 5, 1.0)     # entity density, capped
        + 0.30 * (1.0 if has_numeric else 0.0)
        + 0.20 * (1.0 - min(hedge_ratio * 10, 1.0))  # lower hedge = higher specificity
        + 0.10 * min(numeric_density * 20, 1.0)
    )

    # Determine claim type
    if opinion_count > 1:
        claim_type = "opinion_excluded"
    elif "%" in sentence_text or any(w in words for w in ["percent", "percentage", "rate", "ratio", "proportion"]):
        claim_type = "statistical"
    elif any(w in words for w in ["cause", "caused", "leads to", "results in", "due to", "because"]):
        claim_type = "causal"
    elif any(w in words for w in ["said", "stated", "wrote", "according", "quoted"]):
        claim_type = "quotation"
    else:
        claim_type = "factual"

    return {
        "ent_density": ent_density,
        "ents": [{"text": e.text, "label": e.label_} for e in ents],
        "has_numeric": has_numeric,
        "numeric_density": numeric_density,
        "hedge_ratio": hedge_ratio,
        "has_unresolved_citation": has_unresolved_citation,
        "opinion_count": opinion_count,
        "specificity_score": round(specificity, 4),
        "claim_type": claim_type,
    }


def _is_checkable(text: str, features: Dict[str, Any]) -> bool:
    """Return True if this sentence is a checkable factual claim."""
    if not features:
        return False
    if features.get("claim_type") == "opinion_excluded":
        return False
    if len(text.split()) < 5:  # too short
        return False
    if text.strip().endswith("?"):  # question
        return False
    # Must have at least some specificity signal
    if features.get("specificity_score", 0) < 0.05:
        return False
    return True


def extract_claims(answer_text: str, source_answer_id: str = None) -> List[Dict[str, Any]]:
    """
    Main entry point. Takes raw AI answer text, returns ordered claim list
    conforming to the JSON schema in PRD §10.1.
    """
    if not answer_text or not answer_text.strip():
        return []

    if _nlp is not None:
        return _extract_with_spacy(answer_text, source_answer_id)
    else:
        return _extract_fallback(answer_text, source_answer_id)


def _extract_with_spacy(answer_text: str, source_answer_id: str = None) -> List[Dict[str, Any]]:
    """Full extraction using spaCy NER + sentence segmentation."""
    doc = _nlp(answer_text)
    claims = []

    for i, sent in enumerate(doc.sents):
        sent_text = sent.text.strip()
        if not sent_text:
            continue

        sent_doc = _nlp(sent_text)
        features = _sentence_features(sent_text, sent_doc)

        if not _is_checkable(sent_text, features):
            continue

        claim = {
            "claim_id": str(uuid.uuid4()),
            "text": sent_text,
            "claim_type": features["claim_type"],
            "entities": [e["text"] for e in features.get("ents", [])],
            "specificity_score": features["specificity_score"],
            "source_position": i,
            "source_answer_id": source_answer_id,
            # Coach Engine features — used to generate hints (PRD §10.2)
            "_features": {
                "ent_density": features["ent_density"],
                "hedge_ratio": features["hedge_ratio"],
                "has_numeric": features["has_numeric"],
                "numeric_density": features["numeric_density"],
                "has_unresolved_citation": features["has_unresolved_citation"],
            },
        }
        claims.append(claim)

    # Sort by specificity descending (most learnable claim first, PRD §5.2)
    claims.sort(key=lambda c: c["specificity_score"], reverse=True)
    return claims


def _extract_fallback(answer_text: str, source_answer_id: str = None) -> List[Dict[str, Any]]:
    """
    Regex-only fallback when spaCy is unavailable.
    Less accurate but still functional for testing.
    """
    sentences = re.split(r'(?<=[.!])\s+', answer_text.strip())
    claims = []

    for i, sent in enumerate(sentences):
        sent = sent.strip()
        if len(sent.split()) < 6:
            continue
        if sent.endswith("?"):
            continue

        words = sent.lower().split()
        hedge_count = sum(1 for w in words if w in HEDGE_WORDS)
        opinion_count = sum(1 for w in words if w in OPINION_MARKERS)
        numerics = NUMERIC_PATTERN.findall(sent)
        has_numeric = len(numerics) > 0
        hedge_ratio = hedge_count / max(len(words), 1)

        if opinion_count > 2:
            continue

        specificity = (
            0.50 * (1.0 if has_numeric else 0.0)
            + 0.50 * (1.0 - min(hedge_ratio * 10, 1.0))
        )
        if specificity < 0.05:
            continue

        claims.append({
            "claim_id": str(uuid.uuid4()),
            "text": sent,
            "claim_type": "statistical" if has_numeric else "factual",
            "entities": [],
            "specificity_score": round(specificity, 4),
            "source_position": i,
            "source_answer_id": source_answer_id,
            "_features": {
                "ent_density": 0.0,
                "hedge_ratio": hedge_ratio,
                "has_numeric": has_numeric,
                "numeric_density": len(numerics) / max(len(words), 1),
                "has_unresolved_citation": bool(CITATION_PATTERN.search(sent)),
            },
        })

    claims.sort(key=lambda c: c["specificity_score"], reverse=True)
    return claims

"""
retriever.py — Real triangulation against Wikipedia REST API and
Google Fact Check Tools API (PRD §10.5 / §5.5).

Sources queried per claim:
  1. Wikipedia REST API (en.wikipedia.org/api/rest_v1) — entity search + extract
  2. Google Fact Check Tools API — if GOOGLE_API_KEY env var is set
  3. GDELT GKG API — keyword-based news evidence

All results are normalised into a common SourceResult schema.
If no source produces evidence, the reveal explicitly states so (PRD §5.5).
"""

import asyncio
import os
import re
from typing import Any, Dict, List, Optional
from urllib.parse import quote

import httpx

WIKIPEDIA_API = "https://en.wikipedia.org/api/rest_v1"
WIKIPEDIA_SEARCH = "https://en.wikipedia.org/w/api.php"
FACTCHECK_API = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
GDELT_API = "https://api.gdeltproject.org/api/v2/doc/doc"

GOOGLE_API_KEY = os.getenv("GOOGLE_FACTCHECK_API_KEY", "")
REQUEST_TIMEOUT = 8.0  # seconds


class SourceResult:
    """Normalised evidence from one source."""

    def __init__(
        self,
        source_name: str,
        source_url: str,
        excerpt: str,
        verdict: Optional[str] = None,
        supports_claim: Optional[bool] = None,
        confidence: float = 0.5,
    ):
        self.source_name = source_name
        self.source_url = source_url
        self.excerpt = excerpt
        self.verdict = verdict
        self.supports_claim = supports_claim
        self.confidence = confidence

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_name": self.source_name,
            "source_url": self.source_url,
            "excerpt": self.excerpt,
            "verdict": self.verdict,
            "supports_claim": self.supports_claim,
            "confidence": self.confidence,
        }


# ---------------------------------------------------------------------------
# Wikipedia
# ---------------------------------------------------------------------------

async def _query_wikipedia(entities: List[str], claim_text: str) -> Optional[SourceResult]:
    """
    Search Wikipedia for the primary entity, return a relevant extract.
    Uses the Wikipedia REST summary API for clean, structured extracts.
    Also performs basic semantic contradiction detection.
    """
    search_terms = entities[:2] if entities else _extract_key_terms(claim_text)
    if not search_terms:
        return None

    # Keywords that, if in the Wikipedia extract but NOT in the claim,
    # indicate the claim contradicts what Wikipedia says.
    CONTRADICTION_SIGNALS = [
        "not visible", "cannot be seen", "no evidence", "debunked",
        "misconception", "myth", "false", "incorrect", "inaccurate",
        "disputed", "no proven", "no scientific", "not proven",
        "does not", "is not", "are not", "was not", "have not",
    ]

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        for term in search_terms:
            try:
                # First: try direct REST summary (clean, structured)
                url = f"{WIKIPEDIA_API}/page/summary/{quote(term)}"
                resp = await client.get(url, headers={"User-Agent": "DeetsCheck/1.0 (DeetsCheck@example.org)"})
                if resp.status_code == 200:
                    data = resp.json()
                    extract = data.get("extract", "").strip()
                    if extract and len(extract) > 50:
                        page_url = data.get("content_urls", {}).get("desktop", {}).get("page", "")
                        excerpt = extract[:400] + ("..." if len(extract) > 400 else "")

                        # Semantic contradiction detection
                        extract_lower = extract.lower()
                        claim_lower = claim_text.lower()
                        supports = None
                        for signal in CONTRADICTION_SIGNALS:
                            if signal in extract_lower and signal not in claim_lower:
                                supports = False
                                break

                        return SourceResult(
                            source_name="Wikipedia",
                            source_url=page_url or f"https://en.wikipedia.org/wiki/{quote(term)}",
                            excerpt=excerpt,
                            verdict=None,
                            supports_claim=supports,
                        )
            except Exception:
                continue

            # Fallback: search API
            try:
                params = {
                    "action": "query",
                    "list": "search",
                    "srsearch": term,
                    "srlimit": 1,
                    "format": "json",
                    "utf8": 1,
                }
                resp = await client.get(WIKIPEDIA_SEARCH, params=params)
                if resp.status_code == 200:
                    results = resp.json().get("query", {}).get("search", [])
                    if results:
                        snippet = re.sub(r"<[^>]+>", "", results[0].get("snippet", ""))
                        title = results[0].get("title", term)
                        return SourceResult(
                            source_name="Wikipedia",
                            source_url=f"https://en.wikipedia.org/wiki/{quote(title)}",
                            excerpt=snippet[:400],
                            verdict=None,
                            supports_claim=None,
                        )
            except Exception:
                continue
    return None


# ---------------------------------------------------------------------------
# Wikidata
# ---------------------------------------------------------------------------

async def _query_wikidata(entities: List[str]) -> Optional[SourceResult]:
    """Search Wikidata for the primary entity's description to provide context."""
    if not entities:
        return None
        
    term = entities[0]
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            params = {
                "action": "wbsearchentities",
                "search": term,
                "language": "en",
                "format": "json"
            }
            resp = await client.get("https://www.wikidata.org/w/api.php", params=params)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("search", [])
                if results:
                    item = results[0]
                    desc = item.get("description", "")
                    if desc:
                        return SourceResult(
                            source_name="Wikidata",
                            source_url=f"https://www.wikidata.org/wiki/{item.get('id', '')}",
                            excerpt=f"Wikidata entity {item.get('label', term)}: {desc}",
                            verdict=None,
                            supports_claim=None,
                        )
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# Google Fact Check Tools
# ---------------------------------------------------------------------------

async def _query_factcheck(claim_text: str) -> Optional[SourceResult]:
    """Query Google Fact Check Tools API with the claim text."""
    if not GOOGLE_API_KEY:
        return None

    # Use the most distinctive 8-word phrase from the claim
    keywords = " ".join(claim_text.split()[:8])
    params = {
        "query": keywords,
        "key": GOOGLE_API_KEY,
        "languageCode": "en",
        "pageSize": 3,
    }

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            resp = await client.get(FACTCHECK_API, params=params)
        if resp.status_code == 200:
            items = resp.json().get("claims", [])
            if items:
                item = items[0]
                text = item.get("text", "")
                reviews = item.get("claimReview", [])
                if reviews:
                    review = reviews[0]
                    rating = review.get("textualRating", "")
                    publisher = review.get("publisher", {}).get("name", "Fact checker")
                    url = review.get("url", "")
                    verdict_lower = rating.lower()
                    supports = None
                    if any(w in verdict_lower for w in ["true", "correct", "accurate", "confirmed"]):
                        supports = True
                    elif any(w in verdict_lower for w in ["false", "incorrect", "fake", "misleading", "inaccurate"]):
                        supports = False

                    return SourceResult(
                        source_name=f"Google Fact Check — {publisher}",
                        source_url=url,
                        excerpt=f'Claim checked: "{text[:200]}". Rating: {rating}.',
                        verdict=rating,
                        supports_claim=supports,
                        confidence=0.85,
                    )
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# GDELT
# ---------------------------------------------------------------------------

async def _query_gdelt(claim_text: str, entities: List[str]) -> Optional[SourceResult]:
    """
    Query GDELT GKG v2 for recent news articles mentioning the claim entities.
    Returns a summary of what the news record shows.
    """
    if not entities:
        return None

    query_terms = " ".join(entities[:2])
    params = {
        "query": query_terms,
        "mode": "artlist",
        "maxrecords": 5,
        "format": "json",
        "timespan": "6m",  # last 6 months
        "sort": "hybridrel",
    }

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            resp = await client.get(GDELT_API, params=params)
        if resp.status_code == 200:
            data = resp.json()
            articles = data.get("articles", [])
            if articles:
                titles = "; ".join(a.get("title", "") for a in articles[:3] if a.get("title"))
                first_url = articles[0].get("url", "https://api.gdeltproject.org/")
                return SourceResult(
                    source_name="GDELT News Database",
                    source_url=first_url,
                    excerpt=f"Recent news headlines related to this claim: {titles[:350]}",
                    verdict=None,
                    supports_claim=None,
                    confidence=0.4,
                )
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_key_terms(claim_text: str) -> List[str]:
    """Extract likely searchable noun phrases using simple heuristics."""
    # Remove common stop words and return the longest contiguous noun-phrase candidates
    stopwords = {"the", "a", "an", "is", "was", "are", "were", "be", "been", "being",
                 "have", "has", "had", "do", "does", "did", "will", "would", "could",
                 "should", "may", "might", "shall", "can", "about", "approximately",
                 "roughly", "nearly", "over", "under", "more", "less", "than", "and",
                 "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
                 "from", "that", "this", "these", "those", "their", "its"}
    words = [w.strip(".,;:\"'()") for w in claim_text.split()]
    key_words = [w for w in words if w.lower() not in stopwords and len(w) > 2]
    # Build 2-word phrases for best Wikipedia lookup
    phrases = [f"{key_words[i]} {key_words[i+1]}" for i in range(min(2, len(key_words)-1))]
    phrases += key_words[:3]
    return phrases


def _resolve_outcome(results: List[SourceResult], known_outcome: Optional[float] = None, claim_text: str = "") -> float:
    """
    Determine claim outcome from evidence.
    1.0 = supported, 0.0 = contradicted, 0.5 = contested/mixed/unverifiable.
    If known_outcome is provided (from seeded bank), use that directly.
    """
    if known_outcome is not None:
        return known_outcome

    verdicts = [r.supports_claim for r in results if r.supports_claim is not None]
    if not verdicts:
        # Inconclusive — no source produced a definitive verdict
        return 0.5

    true_count = sum(1 for v in verdicts if v)
    false_count = sum(1 for v in verdicts if not v)

    if true_count > false_count:
        return 1.0
    elif false_count > true_count:
        return 0.0
    else:
        return 0.5  # tied / mixed evidence


def _build_rationale(results: List[SourceResult], outcome: float) -> str:
    """Generate a rich, educational evidence rationale for Reveal (PRD §5.5)."""
    if not results:
        return (
            "No independent source with direct coverage of this specific claim could be found. "
            "This is common for very specific or recently-generated AI claims. "
            "Treat the claim as unverified — the absence of evidence is not evidence of truth."
        )

    # Build a richer rationale that cites actual source excerpts
    source_summaries = []
    for r in results:
        if r.verdict:
            source_summaries.append(f"{r.source_name} rated this claim: '{r.verdict}'.")
        elif r.excerpt:
            source_summaries.append(f"{r.source_name} states: '{r.excerpt[:180]}...'")
        else:
            source_summaries.append(f"{r.source_name} provided context but no definitive rating.")

    source_names = [r.source_name for r in results]
    evidence_block = " ".join(source_summaries)

    if outcome == 1.0:
        return (
            f"Evidence from {' and '.join(source_names)} supports this claim. "
            f"{evidence_block} "
            "The sources agree that the stated information is broadly accurate."
        )
    elif outcome == 0.0:
        return (
            f"Evidence from {' and '.join(source_names)} contradicts this claim. "
            f"{evidence_block} "
            "Independent sources indicate the stated information is inaccurate or misleading. "
            "This is the kind of confident-but-wrong claim that AI systems produce most often."
        )
    else:
        return (
            f"Sources ({', '.join(source_names)}) provide mixed or inconclusive evidence. "
            f"{evidence_block} "
            "This claim touches on genuinely contested territory, or the available evidence is "
            "insufficient to reach a definitive conclusion. Apply extra caution."
        )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def triangulate(
    claim_text: str,
    entities: List[str],
    known_outcome: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Run all three triangulation sources in parallel, aggregate, and return
    a structured Reveal payload (PRD §5.5).
    """
    wiki_task = _query_wikipedia(entities, claim_text)
    wikidata_task = _query_wikidata(entities)
    factcheck_task = _query_factcheck(claim_text)
    gdelt_task = _query_gdelt(claim_text, entities)

    wiki_result, wikidata_result, factcheck_result, gdelt_result = await asyncio.gather(
        wiki_task, wikidata_task, factcheck_task, gdelt_task, return_exceptions=True
    )

    results: List[SourceResult] = []
    for r in [wiki_result, wikidata_result, factcheck_result, gdelt_result]:
        if isinstance(r, SourceResult):
            results.append(r)

    outcome = _resolve_outcome(results, known_outcome, claim_text)
    rationale = _build_rationale(results, outcome)

    return {
        "sources": [r.to_dict() for r in results],
        "outcome": outcome,
        "rationale_text": rationale,
        "source_count": len(results),
    }

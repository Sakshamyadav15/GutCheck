"""
routes.py — All FastAPI API endpoints (PRD §11).

Server-enforced ordering (critical): /reveal and /investigate/hint both
verify that a locked prediction exists before returning anything.
This is a structural guarantee, not a UI convention (PRD §11).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.database import get_db
from backend.db.models import (
    Claim, CalibrationHistory, Duel, Passport, Prediction, Reveal, User
)
from backend.extraction.extractor import extract_claims
from backend.coach.scorer import score_claim
from backend.coach.claim_bank import SEEDED_CLAIMS
from backend.triangulate.retriever import triangulate
from backend.calibration.engine import (
    brier_score, calibration_points, reliability_diagram_data,
    compute_archetype, teach_forward, compute_xp, compute_level,
)
from backend.duel.orchestrator import (
    create_duel_session, join_duel_session, lock_prediction as duel_lock,
    can_reveal, resolve_duel,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic request / response schemas
# ---------------------------------------------------------------------------

class ExtractRequest(BaseModel):
    answer_text: str = Field(..., min_length=10, description="Raw AI-generated answer text")
    user_id: Optional[str] = None

class PredictRequest(BaseModel):
    claim_id: str
    user_id: str
    probability: float = Field(..., ge=0.0, le=1.0)
    reason_tag: Optional[str] = None

class DuelCreateRequest(BaseModel):
    claim_id: str
    player_a_id: str

class DuelJoinRequest(BaseModel):
    invite_code: str
    player_b_id: str

class DuelPredictRequest(BaseModel):
    duel_id: str
    player_id: str
    probability: float = Field(..., ge=0.0, le=1.0)

class ClassroomSessionRequest(BaseModel):
    facilitator_id: str
    claim_id: Optional[str] = None
    difficulty_filter: Optional[str] = "all"  # "easy" | "hard" | "all"


# ---------------------------------------------------------------------------
# Helper: ensure user exists
# ---------------------------------------------------------------------------

async def _get_or_create_user(user_id: str, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        user = User(id=user_id, channel_identity=f"web:{user_id}")
        db.add(user)
        await db.flush()
    return user


async def _get_or_create_passport(user_id: str, db: AsyncSession) -> Passport:
    result = await db.execute(select(Passport).where(Passport.user_id == user_id))
    passport = result.scalar_one_or_none()
    if not passport:
        passport = Passport(user_id=user_id, xp=0, level=1, streak=0, total_claims=0)
        db.add(passport)
        await db.flush()
    return passport


# ---------------------------------------------------------------------------
# POST /extract-claims — Stage 0
# ---------------------------------------------------------------------------

@router.post("/extract-claims")
async def api_extract_claims(body: ExtractRequest, db: AsyncSession = Depends(get_db)):
    """
    Stage 0 (PRD §5.2): Extract atomic, checkable claims from AI answer text.
    Also scores each claim via the Coach Engine and stores to DB.
    Returns ordered list (highest specificity first).
    """
    raw_claims = extract_claims(body.answer_text)
    if not raw_claims:
        raise HTTPException(status_code=422, detail="No checkable claims could be extracted from this text.")

    stored_claims = []
    for c in raw_claims[:5]:  # cap at 5 claims per session
        features = c.pop("_features", {})
        ai_prob, hints = score_claim(features)

        claim = Claim(
            claim_id=c["claim_id"],
            text=c["text"],
            claim_type=c["claim_type"],
            entities=c.get("entities", []),
            specificity_score=c["specificity_score"],
            source_answer_id=c.get("source_answer_id"),
            difficulty_index=0.5,
        )
        db.add(claim)

        # Store AI prediction alongside (PRD §10.2)
        ai_pred = Prediction(
            claim_id=c["claim_id"],
            probability=ai_prob,
            is_ai_prediction=True,
            reason_tag="ai_model",
        )
        db.add(ai_pred)

        stored_claims.append({
            **c,
            "ai_probability": ai_prob,
            "hints": hints,
        })

    await db.commit()
    return {"claims": stored_claims, "count": len(stored_claims)}


# ---------------------------------------------------------------------------
# POST /predict — Stage 1
# ---------------------------------------------------------------------------

@router.post("/predict")
async def api_predict(body: PredictRequest, db: AsyncSession = Depends(get_db)):
    """
    Stage 1 (PRD §5.3): Lock in a user's probability + reason tag for a claim.
    Immutable once submitted — server enforced.
    """
    await _get_or_create_user(body.user_id, db)

    # Check for existing prediction (idempotency guard / anti-hindsight)
    existing = await db.execute(
        select(Prediction).where(
            Prediction.claim_id == body.claim_id,
            Prediction.user_id == body.user_id,
            Prediction.is_ai_prediction == False,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="You have already locked a prediction for this claim. Predictions are immutable.",
        )

    # Verify claim exists
    claim = await db.get(Claim, body.claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    pred = Prediction(
        claim_id=body.claim_id,
        user_id=body.user_id,
        probability=body.probability,
        reason_tag=body.reason_tag,
        is_ai_prediction=False,
    )
    db.add(pred)
    await db.commit()
    await db.refresh(pred)

    return {
        "prediction_id": pred.prediction_id,
        "claim_id": pred.claim_id,
        "probability": pred.probability,
        "reason_tag": pred.reason_tag,
        "locked_at": pred.locked_at.isoformat(),
        "message": "Prediction locked. You cannot change this after seeing evidence — that is the whole point.",
    }


# ---------------------------------------------------------------------------
# GET /investigate/hint — Stage 2
# ---------------------------------------------------------------------------

@router.get("/investigate/hint")
async def api_investigate_hint(
    claim_id: str = Query(...),
    user_id: str = Query(...),
    hint_level: int = Query(0, ge=0, le=2),
    db: AsyncSession = Depends(get_db),
):
    """
    Stage 2 (PRD §5.4): Return a graduated hint for a claim.
    SERVER-ENFORCED: requires a locked prediction to exist first.
    hint_level: 0 = most general, 1 = directional, 2 = specific action.
    Each hint increments hints_used counter (docks Calibrate points).
    """
    # Server-enforced ordering check
    pred_result = await db.execute(
        select(Prediction).where(
            Prediction.claim_id == claim_id,
            Prediction.user_id == user_id,
            Prediction.is_ai_prediction == False,
        )
    )
    pred = pred_result.scalar_one_or_none()
    if pred is None:
        raise HTTPException(
            status_code=403,
            detail="You must submit a prediction before accessing hints. This ordering is enforced by the server.",
        )

    claim = await db.get(Claim, claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    # Get AI features for this claim (stored with AI prediction)
    ai_pred_result = await db.execute(
        select(Prediction).where(
            Prediction.claim_id == claim_id,
            Prediction.is_ai_prediction == True,
        )
    )
    ai_pred = ai_pred_result.scalar_one_or_none()

    # Re-score to get hints (stateless computation)
    from backend.extraction.extractor import extract_claims
    features = {
        "ent_density": 0.15,
        "hedge_ratio": 0.05,
        "has_numeric": claim.claim_type == "statistical",
        "numeric_density": 0.08 if claim.claim_type == "statistical" else 0.0,
        "has_unresolved_citation": False,
    }
    _, hints = score_claim(features)

    # Increment hints used
    pred.hints_used = min((pred.hints_used or 0) + 1, 3)
    await db.commit()

    # Build lateral search links (PRD §5.4)
    entities_str = " ".join(claim.entities[:2]) if claim.entities else claim.text.split()[:3]
    if isinstance(entities_str, list):
        entities_str = " ".join(entities_str)
    from urllib.parse import quote as url_quote

    lateral_links = [
        {
            "label": "Wikipedia",
            "url": f"https://en.wikipedia.org/w/index.php?search={url_quote(entities_str)}",
        },
        {
            "label": "Google Fact Check Explorer",
            "url": f"https://toolbox.google.com/factcheck/explorer/search/{url_quote(claim.text[:80])};hl=en",
        },
        {
            "label": "GDELT News Search",
            "url": f"https://gdeltproject.org/data.html#gdeltgkg2",
        },
        {
            "label": "General Web Search",
            "url": f"https://www.google.com/search?q={url_quote(claim.text[:80])}",
        },
    ]

    hint_text = hints[hint_level] if hint_level < len(hints) else hints[-1]

    return {
        "hint": hint_text,
        "hint_level": hint_level,
        "hints_used": pred.hints_used,
        "xp_cost_per_hint": 3,
        "lateral_links": lateral_links,
        "timer_seconds": 90,
    }


# ---------------------------------------------------------------------------
# GET /reveal/{claim_id} — Stage 3
# ---------------------------------------------------------------------------

@router.get("/reveal/{claim_id}")
async def api_reveal(
    claim_id: str,
    user_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Stage 3 (PRD §5.5): Reveal sources, AI prediction, and rationale.
    SERVER-ENFORCED: requires a locked prediction to exist. This is the
    load-bearing anti-hindsight guarantee (PRD §11).
    """
    # Server-enforced ordering check
    pred_result = await db.execute(
        select(Prediction).where(
            Prediction.claim_id == claim_id,
            Prediction.user_id == user_id,
            Prediction.is_ai_prediction == False,
        )
    )
    pred = pred_result.scalar_one_or_none()
    if pred is None:
        raise HTTPException(
            status_code=403,
            detail="A locked prediction must exist before Reveal is accessible. Server-enforced ordering.",
        )

    claim = await db.get(Claim, claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    # Check for cached reveal
    existing_reveal = await db.execute(
        select(Reveal).where(Reveal.claim_id == claim_id)
    )
    reveal = existing_reveal.scalar_one_or_none()

    if reveal is None:
        # Check seeded bank for pre-known outcome
        known_outcome = None
        outcome_rationale = None
        for seeded in SEEDED_CLAIMS:
            if seeded["text"][:50] in claim.text[:60] or claim.text[:50] in seeded["text"][:60]:
                known_outcome = seeded.get("known_outcome")
                outcome_rationale = seeded.get("outcome_rationale")
                break

        # Run triangulation (real APIs)
        triangulation = await triangulate(
            claim_text=claim.text,
            entities=claim.entities or [],
            known_outcome=known_outcome,
        )

        # Use seeded rationale if available (more reliable than auto-generated)
        rationale = outcome_rationale or triangulation["rationale_text"]

        reveal = Reveal(
            claim_id=claim_id,
            sources_json=triangulation["sources"],
            outcome=triangulation["outcome"],
            rationale_text=rationale,
        )
        db.add(reveal)
        await db.commit()
        await db.refresh(reveal)

    # Fetch AI's own prediction (PRD §5.5)
    ai_pred_result = await db.execute(
        select(Prediction).where(
            Prediction.claim_id == claim_id,
            Prediction.is_ai_prediction == True,
        )
    )
    ai_pred = ai_pred_result.scalar_one_or_none()

    return {
        "claim_id": claim_id,
        "claim_text": claim.text,
        "sources": reveal.sources_json or [],
        "outcome": reveal.outcome,
        "rationale_text": reveal.rationale_text,
        "ai_prediction": {
            "probability": ai_pred.probability if ai_pred else 0.5,
            "label": "AI's own confidence this claim is true",
        },
        "user_prediction": {
            "probability": pred.probability,
            "reason_tag": pred.reason_tag,
        },
        "hints_used": pred.hints_used or 0,
    }


# ---------------------------------------------------------------------------
# GET /calibrate/{claim_id} — Stage 4
# ---------------------------------------------------------------------------

@router.get("/calibrate/{claim_id}")
async def api_calibrate(
    claim_id: str,
    user_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Stage 4 (PRD §5.6): Return Brier score, calibration curve, Teach Forward note.
    """
    # Fetch user prediction
    pred_result = await db.execute(
        select(Prediction).where(
            Prediction.claim_id == claim_id,
            Prediction.user_id == user_id,
            Prediction.is_ai_prediction == False,
        )
    )
    pred = pred_result.scalar_one_or_none()
    if not pred:
        raise HTTPException(status_code=404, detail="No prediction found for this claim/user.")

    # Fetch reveal outcome
    reveal_result = await db.execute(select(Reveal).where(Reveal.claim_id == claim_id))
    reveal = reveal_result.scalar_one_or_none()
    if not reveal:
        raise HTTPException(status_code=404, detail="Claim has not been revealed yet.")

    outcome = reveal.outcome
    bs = brier_score(pred.probability, outcome)
    points = calibration_points(pred.probability, outcome)
    xp = compute_xp(
        brier=bs,
        used_investigate=pred.hints_used > 0,
        is_duel=False,
        hints_used=pred.hints_used or 0,
    )

    # Fetch all historical predictions for this user (for reliability diagram)
    all_preds_result = await db.execute(
        select(Prediction).where(
            Prediction.user_id == user_id,
            Prediction.is_ai_prediction == False,
        )
    )
    all_preds = all_preds_result.scalars().all()

    # Build history for reliability diagram
    history_pairs = []
    for p in all_preds:
        rev_result = await db.execute(select(Reveal).where(Reveal.claim_id == p.claim_id))
        rev = rev_result.scalar_one_or_none()
        if rev is not None and rev.outcome is not None:
            history_pairs.append((p.probability, rev.outcome))

    diagram = reliability_diagram_data(history_pairs)
    archetype = compute_archetype(history_pairs)
    teach = teach_forward(pred.reason_tag, outcome, pred.probability)

    # Update passport
    await _get_or_create_user(user_id, db)
    passport = await _get_or_create_passport(user_id, db)
    passport.xp += xp["total"]
    passport.level = compute_level(passport.xp)
    passport.total_claims += 1
    passport.archetype = archetype
    passport.last_active = datetime.utcnow()

    # Update rolling Brier in calibration history
    cal_entry = CalibrationHistory(
        user_id=user_id,
        rolling_brier=diagram.get("overall_brier"),
        archetype=archetype,
        streak=passport.streak,
    )
    db.add(cal_entry)
    await db.commit()

    return {
        "claim_id": claim_id,
        "brier_score": bs,
        "calibration_points": points,
        "outcome": outcome,
        "user_probability": pred.probability,
        "xp_breakdown": xp,
        "teach_forward": teach,
        "reliability_diagram": diagram,
        "archetype": archetype,
        "total_claims_checked": passport.total_claims,
        "total_xp": passport.xp,
        "level": passport.level,
    }


# ---------------------------------------------------------------------------
# Duel endpoints (PRD §6)
# ---------------------------------------------------------------------------

@router.post("/duel")
async def api_create_duel(body: DuelCreateRequest, db: AsyncSession = Depends(get_db)):
    """Create a new duel session and return an invite code."""
    claim = await db.get(Claim, body.claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    session = create_duel_session(body.claim_id, body.player_a_id)
    duel = Duel(
        duel_id=session["duel_id"],
        claim_id=session["claim_id"],
        player_a_id=session["player_a_id"],
        state=session["state"],
        invite_code=session["invite_code"],
    )
    db.add(duel)
    await db.commit()
    return {
        "duel_id": duel.duel_id,
        "invite_code": duel.invite_code,
        "state": duel.state,
        "claim": {"claim_id": claim.claim_id, "text": claim.text},
    }


@router.post("/duel/join")
async def api_join_duel(body: DuelJoinRequest, db: AsyncSession = Depends(get_db)):
    """Join an existing duel via invite code."""
    result = await db.execute(
        select(Duel).where(Duel.invite_code == body.invite_code)
    )
    duel = result.scalar_one_or_none()
    if not duel:
        raise HTTPException(status_code=404, detail="No duel found with that invite code.")
    if duel.state != "waiting":
        raise HTTPException(status_code=409, detail="This duel is already active or completed.")

    duel.player_b_id = body.player_b_id
    duel.state = "active"
    await db.commit()

    claim = await db.get(Claim, duel.claim_id)
    return {
        "duel_id": duel.duel_id,
        "state": duel.state,
        "claim": {"claim_id": claim.claim_id, "text": claim.text},
    }


@router.post("/duel/{duel_id}/predict")
async def api_duel_predict(
    duel_id: str, body: DuelPredictRequest, db: AsyncSession = Depends(get_db)
):
    """Lock a player's prediction in a duel (both must lock before reveal)."""
    duel = await db.get(Duel, duel_id)
    if not duel:
        raise HTTPException(status_code=404, detail="Duel not found.")
    if duel.state != "active":
        raise HTTPException(status_code=409, detail="Duel is not active.")

    if body.player_id == duel.player_a_id:
        if duel.player_a_locked:
            raise HTTPException(status_code=409, detail="Player A has already locked.")
        duel.player_a_prob = body.probability
        duel.player_a_locked = True
    elif body.player_id == duel.player_b_id:
        if duel.player_b_locked:
            raise HTTPException(status_code=409, detail="Player B has already locked.")
        duel.player_b_prob = body.probability
        duel.player_b_locked = True
    else:
        raise HTTPException(status_code=403, detail="You are not a participant in this duel.")

    await db.commit()
    both_locked = duel.player_a_locked and duel.player_b_locked
    return {
        "duel_id": duel_id,
        "your_prediction_locked": True,
        "both_locked": both_locked,
        "reveal_available": both_locked,
    }


@router.post("/duel/{duel_id}/reveal")
async def api_duel_reveal(duel_id: str, db: AsyncSession = Depends(get_db)):
    """
    Trigger synchronised reveal once both players have locked.
    SERVER-ENFORCED: checks both_locked before proceeding.
    """
    duel = await db.get(Duel, duel_id)
    if not duel:
        raise HTTPException(status_code=404, detail="Duel not found.")
    if not (duel.player_a_locked and duel.player_b_locked):
        raise HTTPException(
            status_code=403,
            detail="Both players must lock their predictions before reveal.",
        )

    # Run reveal (same pipeline as solo play)
    reveal_result = await db.execute(select(Reveal).where(Reveal.claim_id == duel.claim_id))
    reveal = reveal_result.scalar_one_or_none()
    if not reveal:
        raise HTTPException(
            status_code=424,
            detail="Claim has not been triangulated yet. Run /reveal first.",
        )

    outcome = reveal.outcome
    bs_a = brier_score(duel.player_a_prob or 0.5, outcome)
    bs_b = brier_score(duel.player_b_prob or 0.5, outcome)

    winner = "tie"
    if bs_a < bs_b:
        winner = "player_a"
    elif bs_b < bs_a:
        winner = "player_b"

    duel.state = "revealed"
    duel.resolved_at = datetime.utcnow()
    await db.commit()

    # Update difficulty index
    disagreement = abs((duel.player_a_prob or 0.5) - (duel.player_b_prob or 0.5))
    claim = await db.get(Claim, duel.claim_id)
    if claim:
        # Rolling average: simple exponential smoothing
        claim.difficulty_index = round(0.7 * claim.difficulty_index + 0.3 * disagreement, 4)
        await db.commit()

    return {
        "duel_id": duel_id,
        "outcome": outcome,
        "rationale": reveal.rationale_text,
        "player_a": {
            "probability": duel.player_a_prob,
            "brier_score": bs_a,
            "points": calibration_points(duel.player_a_prob or 0.5, outcome),
        },
        "player_b": {
            "probability": duel.player_b_prob,
            "brier_score": bs_b,
            "points": calibration_points(duel.player_b_prob or 0.5, outcome),
        },
        "winner": winner,
        "disagreement": round(disagreement, 3),
        "share_text": (
            f"I {'won' if winner == 'player_a' else 'tied'} on DeetsCheck! "
            f"My calibration score: {calibration_points(duel.player_a_prob or 0.5, outcome)} pts. "
            f"gut-check.io"
        ),
    }


# ---------------------------------------------------------------------------
# GET /passport/{user_id} (PRD §5.6 / §8)
# ---------------------------------------------------------------------------

@router.get("/passport/{user_id}")
async def api_passport(user_id: str, db: AsyncSession = Depends(get_db)):
    """Return the user's full Instinct Passport."""
    await _get_or_create_user(user_id, db)
    passport = await _get_or_create_passport(user_id, db)

    # Compute calibration curve from full history
    all_preds_result = await db.execute(
        select(Prediction).where(
            Prediction.user_id == user_id,
            Prediction.is_ai_prediction == False,
        )
    )
    all_preds = all_preds_result.scalars().all()

    history_pairs = []
    for p in all_preds:
        rev_result = await db.execute(select(Reveal).where(Reveal.claim_id == p.claim_id))
        rev = rev_result.scalar_one_or_none()
        if rev and rev.outcome is not None:
            history_pairs.append((p.probability, rev.outcome))

    diagram = reliability_diagram_data(history_pairs)
    archetype = compute_archetype(history_pairs) if history_pairs else "Emerging"

    return {
        "user_id": user_id,
        "xp": passport.xp,
        "level": passport.level,
        "streak": passport.streak,
        "total_claims": passport.total_claims,
        "archetype": archetype,
        "calibration_trend": "improving" if len(history_pairs) >= 5 else "building",
        "reliability_diagram": diagram,
        "badges": passport.badges or [],
        "last_active": passport.last_active.isoformat() if passport.last_active else None,
    }


# ---------------------------------------------------------------------------
# POST /classroom/session (PRD §7)
# ---------------------------------------------------------------------------

@router.post("/classroom/session")
async def api_classroom_session(body: ClassroomSessionRequest, db: AsyncSession = Depends(get_db)):
    """
    Create a facilitator-driven classroom session.
    Returns the projector view payload and a student-response endpoint URL.
    Claims are sorted by difficulty_index (high = hard = most pedagogically valuable).
    """
    if body.claim_id:
        claim = await db.get(Claim, body.claim_id)
        if not claim:
            raise HTTPException(status_code=404, detail="Claim not found.")
        selected_claims = [claim]
    else:
        # Select from seeded bank, sorted by difficulty
        filter_fn = lambda c: True
        if body.difficulty_filter == "hard":
            filter_fn = lambda c: c.get("difficulty_index", 0.5) > 0.55
        elif body.difficulty_filter == "easy":
            filter_fn = lambda c: c.get("difficulty_index", 0.5) < 0.40

        seeded = [c for c in SEEDED_CLAIMS if filter_fn(c)]
        seeded.sort(key=lambda c: c.get("difficulty_index", 0.5), reverse=True)
        selected_claims = seeded[:5]

    session_id = str(uuid.uuid4())
    return {
        "session_id": session_id,
        "facilitator_id": body.facilitator_id,
        "claims": [
            {
                "text": c.text if hasattr(c, "text") else c["text"],
                "claim_type": c.claim_type if hasattr(c, "claim_type") else c["claim_type"],
                "difficulty_index": c.difficulty_index if hasattr(c, "difficulty_index") else c.get("difficulty_index", 0.5),
                "hint_ladder": [
                    "What does your general knowledge tell you about this claim?",
                    "Discuss with your partner: what would a reliable source say?",
                    "If you had 60 seconds and internet access, where would you check first?",
                ],
                "discussion_prompts": [
                    "Why might an AI confidently state this if it is false?",
                    "What signals in the claim text could have alerted you?",
                    "How does this change how you will read AI-generated information?",
                ],
            }
            for c in selected_claims
        ],
        "student_response_endpoint": f"/classroom/{session_id}/respond",
        "projector_view": f"/classroom/{session_id}/project",
        "physical_card_url": f"/classroom/{session_id}/card.pdf",
    }


# ---------------------------------------------------------------------------
# GET /claim-bank — browsable seeded claims
# ---------------------------------------------------------------------------

@router.get("/claim-bank")
async def api_claim_bank(
    difficulty: Optional[str] = Query(None, description="Filter: easy | medium | hard"),
    limit: int = Query(10, ge=1, le=50),
):
    """Return claims from the community bank, optionally filtered by difficulty."""
    claims = list(SEEDED_CLAIMS)

    if difficulty == "easy":
        claims = [c for c in claims if c.get("difficulty_index", 0.5) < 0.40]
    elif difficulty == "hard":
        claims = [c for c in claims if c.get("difficulty_index", 0.5) > 0.60]
    elif difficulty == "medium":
        claims = [c for c in claims if 0.40 <= c.get("difficulty_index", 0.5) <= 0.60]

    claims.sort(key=lambda c: c.get("difficulty_index", 0.5), reverse=True)
    return {
        "claims": [
            {
                "text": c["text"],
                "claim_type": c["claim_type"],
                "entities": c["entities"],
                "difficulty_index": c["difficulty_index"],
                "specificity_score": c["specificity_score"],
            }
            for c in claims[:limit]
        ],
        "total": len(claims),
    }

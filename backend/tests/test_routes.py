"""
test_routes.py — Integration tests for FastAPI API endpoints.
Tests the server-enforced PIRC ordering and all core endpoints.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.main import app
from backend.db.database import engine, Base


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Create fresh tables for each test."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


RICH_AI_ANSWER = (
    "ChatGPT reached 100 million users within two months of its November 2022 launch, "
    "making it the fastest-growing consumer application in history. "
    "The Great Wall of China is visible from space with the naked eye. "
    "Roughly 30 percent of US teenagers use AI chatbots on a daily basis."
)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# ---------------------------------------------------------------------------
# POST /api/v1/extract-claims
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_extract_claims_success(client: AsyncClient):
    resp = await client.post(
        "/api/v1/extract-claims",
        json={"answer_text": RICH_AI_ANSWER, "user_id": "user-001"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "claims" in data
    assert data["count"] >= 1
    claim = data["claims"][0]
    assert "claim_id" in claim
    assert "text" in claim
    assert "specificity_score" in claim


@pytest.mark.asyncio
async def test_extract_claims_too_short(client: AsyncClient):
    resp = await client.post(
        "/api/v1/extract-claims",
        json={"answer_text": "AI is good."},
    )
    # Either extracts 0 claims (422) or succeeds with 0 — depends on text
    assert resp.status_code in (200, 422)


# ---------------------------------------------------------------------------
# POST /api/v1/predict — server-enforced lock-in
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_predict_creates_locked_prediction(client: AsyncClient):
    # First extract a claim
    extract_resp = await client.post(
        "/api/v1/extract-claims",
        json={"answer_text": RICH_AI_ANSWER},
    )
    claim_id = extract_resp.json()["claims"][0]["claim_id"]

    resp = await client.post(
        "/api/v1/predict",
        json={
            "claim_id": claim_id,
            "user_id": "user-001",
            "probability": 0.75,
            "reason_tag": "confident_tone",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["probability"] == 0.75
    assert "locked_at" in data
    assert "cannot edit" in data["message"].lower() or "locked" in data["message"].lower()


@pytest.mark.asyncio
async def test_predict_immutable_after_lock(client: AsyncClient):
    """Server must reject a second prediction for the same claim/user."""
    extract_resp = await client.post(
        "/api/v1/extract-claims",
        json={"answer_text": RICH_AI_ANSWER},
    )
    claim_id = extract_resp.json()["claims"][0]["claim_id"]

    await client.post(
        "/api/v1/predict",
        json={"claim_id": claim_id, "user_id": "user-001", "probability": 0.75},
    )
    # Second attempt must fail
    resp2 = await client.post(
        "/api/v1/predict",
        json={"claim_id": claim_id, "user_id": "user-001", "probability": 0.50},
    )
    assert resp2.status_code == 409


# ---------------------------------------------------------------------------
# GET /api/v1/investigate/hint — must require prediction first
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_hint_blocked_without_prediction(client: AsyncClient):
    """Server-enforced ordering: hint must be blocked before prediction."""
    extract_resp = await client.post(
        "/api/v1/extract-claims",
        json={"answer_text": RICH_AI_ANSWER},
    )
    claim_id = extract_resp.json()["claims"][0]["claim_id"]

    resp = await client.get(
        f"/api/v1/investigate/hint?claim_id={claim_id}&user_id=user-001&hint_level=0"
    )
    assert resp.status_code == 403
    assert "prediction" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_hint_accessible_after_prediction(client: AsyncClient):
    extract_resp = await client.post(
        "/api/v1/extract-claims",
        json={"answer_text": RICH_AI_ANSWER},
    )
    claim_id = extract_resp.json()["claims"][0]["claim_id"]

    await client.post(
        "/api/v1/predict",
        json={"claim_id": claim_id, "user_id": "user-001", "probability": 0.6},
    )

    resp = await client.get(
        f"/api/v1/investigate/hint?claim_id={claim_id}&user_id=user-001&hint_level=0"
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "hint" in data
    assert "lateral_links" in data
    assert len(data["lateral_links"]) >= 3


# ---------------------------------------------------------------------------
# GET /api/v1/reveal/{claim_id} — must require prediction first
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_reveal_blocked_without_prediction(client: AsyncClient):
    """Server-enforced ordering: reveal must be blocked before prediction."""
    extract_resp = await client.post(
        "/api/v1/extract-claims",
        json={"answer_text": RICH_AI_ANSWER},
    )
    claim_id = extract_resp.json()["claims"][0]["claim_id"]

    resp = await client.get(f"/api/v1/reveal/{claim_id}?user_id=user-001")
    assert resp.status_code == 403
    assert "prediction" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_reveal_accessible_after_prediction(client: AsyncClient):
    extract_resp = await client.post(
        "/api/v1/extract-claims",
        json={"answer_text": RICH_AI_ANSWER},
    )
    claim_id = extract_resp.json()["claims"][0]["claim_id"]

    await client.post(
        "/api/v1/predict",
        json={"claim_id": claim_id, "user_id": "user-001", "probability": 0.7},
    )

    resp = await client.get(f"/api/v1/reveal/{claim_id}?user_id=user-001")
    assert resp.status_code == 200
    data = resp.json()
    assert "outcome" in data
    assert "rationale_text" in data
    assert "ai_prediction" in data
    assert "sources" in data


# ---------------------------------------------------------------------------
# GET /api/v1/calibrate/{claim_id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_calibrate_returns_brier_score(client: AsyncClient):
    extract_resp = await client.post(
        "/api/v1/extract-claims",
        json={"answer_text": RICH_AI_ANSWER},
    )
    claim_id = extract_resp.json()["claims"][0]["claim_id"]

    await client.post(
        "/api/v1/predict",
        json={"claim_id": claim_id, "user_id": "user-001", "probability": 0.8},
    )
    await client.get(f"/api/v1/reveal/{claim_id}?user_id=user-001")

    resp = await client.get(f"/api/v1/calibrate/{claim_id}?user_id=user-001")
    assert resp.status_code == 200
    data = resp.json()
    assert "brier_score" in data
    assert "calibration_points" in data
    assert "teach_forward" in data
    assert "archetype" in data
    assert 0.0 <= data["brier_score"] <= 1.0


# ---------------------------------------------------------------------------
# Full PIRC cycle integration test
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_full_pirc_cycle(client: AsyncClient):
    """End-to-end test: Extract → Predict → Investigate → Reveal → Calibrate."""
    USER = "integration-user"

    # Stage 0: Extract
    r0 = await client.post(
        "/api/v1/extract-claims",
        json={"answer_text": RICH_AI_ANSWER, "user_id": USER},
    )
    assert r0.status_code == 200
    claim_id = r0.json()["claims"][0]["claim_id"]

    # Stage 1: Predict
    r1 = await client.post(
        "/api/v1/predict",
        json={
            "claim_id": claim_id,
            "user_id": USER,
            "probability": 0.65,
            "reason_tag": "sounds_oddly_specific",
        },
    )
    assert r1.status_code == 200

    # Stage 2: Investigate (hint)
    r2 = await client.get(
        f"/api/v1/investigate/hint?claim_id={claim_id}&user_id={USER}&hint_level=0"
    )
    assert r2.status_code == 200
    assert isinstance(r2.json()["hint"], str)

    # Stage 3: Reveal
    r3 = await client.get(f"/api/v1/reveal/{claim_id}?user_id={USER}")
    assert r3.status_code == 200
    assert "outcome" in r3.json()

    # Stage 4: Calibrate
    r4 = await client.get(f"/api/v1/calibrate/{claim_id}?user_id={USER}")
    assert r4.status_code == 200
    cal = r4.json()
    assert 0.0 <= cal["brier_score"] <= 1.0
    assert isinstance(cal["teach_forward"], str)
    assert cal["total_claims_checked"] >= 1


# ---------------------------------------------------------------------------
# Passport
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_passport_returns_valid_structure(client: AsyncClient):
    resp = await client.get("/api/v1/passport/new-user-000")
    assert resp.status_code == 200
    data = resp.json()
    assert "xp" in data
    assert "level" in data
    assert "archetype" in data
    assert "streak" in data


# ---------------------------------------------------------------------------
# Claim bank
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_claim_bank_returns_claims(client: AsyncClient):
    resp = await client.get("/api/v1/claim-bank")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["claims"]) >= 1


@pytest.mark.asyncio
async def test_claim_bank_hard_filter(client: AsyncClient):
    resp = await client.get("/api/v1/claim-bank?difficulty=hard")
    assert resp.status_code == 200
    for claim in resp.json()["claims"]:
        assert claim["difficulty_index"] > 0.55

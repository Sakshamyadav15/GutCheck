# DeetsCheck

*Train the instinct. Don't outsource it.*

---

## Table of Contents

1. [Overview](#overview)
2. [The Problem](#the-problem)
3. [The Solution: Predict, Investigate, Reveal, Calibrate](#the-solution)
4. [System Architecture](#system-architecture)
5. [Data Flow](#data-flow)
6. [Component Architecture](#component-architecture)
7. [Database Schema](#database-schema)
8. [API Reference](#api-reference)
9. [The Coach Engine](#the-coach-engine)
10. [Calibration Engine](#calibration-engine)
11. [Duel Mode and the Network Effect](#duel-mode)
12. [Classroom Mode](#classroom-mode)
13. [Getting Started](#getting-started)
14. [Running Tests](#running-tests)
15. [Configuration](#configuration)
16. [Deployment](#deployment)
17. [Design Decisions](#design-decisions)
18. [MIL Alignment](#mil-alignment)
19. [Roadmap](#roadmap)

---

## Overview

DeetsCheck is a web application that turns every AI-generated answer into a 90-second calibration exercise. Before any evidence is revealed, the user commits to a confidence level. The user then investigates with AI-coached hints — not AI-given answers. The evidence then unlocks alongside the AI's own prediction. Finally, the user is scored on calibration quality, tracked over time as a graph that improves. That graph is the product.

It addresses AI and MIL by training human judgment rather than delegating it to a detector.

The core architecture principle is an ordering constraint: nothing AI-generated is shown to the user until they have committed an independent position. This is enforced at the server level, not at the UI level, so it cannot be bypassed by a future feature change or an impatient user.

---

## The Problem

AI chatbots now reach approximately 800 million weekly active users, with disproportionately high adoption among people under 30. Roughly two-thirds of US teenagers use AI chatbots; about one in three do so daily. Among chatbot news consumers, roughly half report encountering information later found to be inaccurate, and about a third find it hard to distinguish accurate from inaccurate content.

The existing toolkit for media information literacy — lateral reading, the SIFT method, source triangulation — was designed for web pages with bylines, publication dates, and named outlets. A conversational AI answer has none of those properties. Nobody has adapted the habit, not just the technique, to this new context.

Classic detection-based approaches fail for three structural reasons:

1. They are an arms race the detector always loses. Each model generation erodes detector accuracy.
2. They replace one black box with another. A single confidence number teaches outsourcing, not literacy.
3. They target the AI output rather than the human skill of evaluating it. Only the second of those survives after the user closes the tab.

The highest-volume harm is not a synthetic deepfake. It is an ordinary, fluently written, partly-wrong paragraph answering a homework or news question. That is a judgment problem, and the fix is training judgment.

---

## The Solution

The Predict, Investigate, Reveal, Calibrate (PIRC) loop inverts the standard interaction with AI-generated content:

```mermaid
flowchart LR
    A([User submits\nAI answer text]) --> B[Stage 0:\nSilent Extraction]
    B --> C[Stage 1:\nPredict]
    C --> D[Stage 2:\nInvestigate]
    D --> E[Stage 3:\nReveal]
    E --> F[Stage 4:\nCalibrate]
    F --> G{More claims\nin queue?}
    G -- Yes --> C
    G -- No --> H([Session Complete\nPassport Updated])

    style A fill:#6366f1,color:#fff,stroke:none
    style B fill:#1e1b4b,color:#a5b4fc,stroke:#4338ca
    style C fill:#1e1b4b,color:#a5b4fc,stroke:#4338ca
    style D fill:#134e4a,color:#5eead4,stroke:#0f766e
    style E fill:#1e1b4b,color:#a5b4fc,stroke:#4338ca
    style F fill:#064e3b,color:#6ee7b7,stroke:#059669
    style G fill:#292524,color:#d6d3d1,stroke:#57534e
    style H fill:#14f1d9,color:#060b18,stroke:none
```

**Stage 0 — Silent Extraction**: The claim extractor runs immediately on submission, but nothing derived from it is shown yet. The system selects the highest-specificity atomic claim to lead with.

**Stage 1 — Predict**: Only the extracted claim text is shown. The user sets a confidence slider from 0 to 100 percent and selects a reason tag naming their heuristic. Once submitted, the prediction is timestamped and immutable. The server rejects any second submission for the same claim and user.

**Stage 2 — Investigate**: A 90-second timer begins. The AI acts as a coach, not an oracle. Graduated hints rephrase the same SHAP feature attributions that power the AI's own prediction — as questions, not conclusions. Lateral search links point to Wikipedia, Google Fact Check Tools, GDELT, and a general web search scoped to the claim's entities. Each hint used docks a disclosed number of maximum calibration points.

**Stage 3 — Reveal**: Evidence from two or more independent named sources unlocks. The AI's own prediction is shown in the same slider UI the human used. A plain-language rationale is shown. The AI is deliberately allowed to be wrong — a tool that is always right teaches the same misplaced trust this product exists to cure.

**Stage 4 — Calibrate**: The Brier score is computed, a personal reliability diagram is updated, and the Teach Forward note names the specific bias or skill the user just exercised, referencing both the reason tag they selected and what actually happened at Reveal.

---

## System Architecture

```mermaid
graph TB
    subgraph Clients["Client Layer"]
        WEB[React SPA\nVite 5]
        EXT[Chrome Extension\nManifest V3]
        BOT[Telegram Bot\nroadmap]
    end

    subgraph Gateway["API Gateway\nFastAPI 0.111"]
        R1["/extract-claims"]
        R2["/predict"]
        R3["/investigate/hint"]
        R4["/reveal/{id}"]
        R5["/calibrate/{id}"]
        R6["/duel"]
        R7["/passport/{id}"]
        R8["/classroom/session"]
        GUARD["Server-Enforced\nOrdering Guard"]
    end

    subgraph Processing["Processing Layer"]
        CE[Claim Extractor\nspaCy NER]
        COACH[Coach Engine\nXGBoost + SHAP]
        TRIA[Triangulation\nOrchestrator]
        CALIB[Calibration\nEngine]
        DUEL[Duel\nOrchestrator]
    end

    subgraph External["External APIs"]
        WIKI[Wikipedia\nREST API]
        GFC[Google Fact Check\nTools API]
        GDELT[GDELT\nGKG v2]
    end

    subgraph Storage["Storage Layer"]
        PG[(PostgreSQL\nSQLite dev)]
        REDIS[(Redis\ncache)]
    end

    WEB --> Gateway
    EXT --> Gateway
    BOT --> Gateway

    R3 --> GUARD
    R4 --> GUARD
    GUARD -->|"403 if no\nlocked prediction"| R3
    GUARD -->|"403 if no\nlocked prediction"| R4

    R1 --> CE --> COACH
    R2 --> PG
    R3 --> COACH
    R4 --> TRIA
    R5 --> CALIB
    R6 --> DUEL
    R7 --> PG
    R8 --> PG

    TRIA --> WIKI
    TRIA --> GFC
    TRIA --> GDELT

    Processing --> PG
    Processing --> REDIS

    style Clients fill:#1e1b4b,stroke:#4338ca,color:#e0e7ff
    style Gateway fill:#134e4a,stroke:#0f766e,color:#ccfbf1
    style Processing fill:#1c1917,stroke:#57534e,color:#d6d3d1
    style External fill:#7c2d12,stroke:#9a3412,color:#fed7aa
    style Storage fill:#1e1b4b,stroke:#4338ca,color:#e0e7ff
```

### Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React 18 + Vite 5 | Component-based, fast HMR, zero build overhead |
| State management | Zustand 4 | Minimal boilerplate, no context drilling |
| Charting | Chart.js 4 + react-chartjs-2 | Canvas-based, zero layout overhead, works offline |
| Backend | FastAPI 0.111 | Async-first, automatic OpenAPI docs, matches team stack |
| ORM | SQLAlchemy 2.0 async | Postgres-compatible types on SQLite, production-ready |
| Feature model | XGBoost 2.0 + SHAP 0.45 | Same explainability pattern used in clinical voice-ML research |
| NLP | spaCy 3.7 en_core_web_sm | NER + sentence segmentation, no GPU required |
| Retrieval | Wikipedia REST + Google Fact Check + GDELT | Free-tier, globally and multilingually scoped |
| Dev database | SQLite + aiosqlite | Zero-install, Postgres-schema-compatible |
| Prod database | PostgreSQL + Redis | Full Postgres on managed hosting |
| Deployment | Vercel + managed Postgres | Matches team's existing deployment experience |

---

## Data Flow

### Stage 0 to 4 (Single User, Solo Mode)

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as FastAPI
    participant CE as Claim Extractor
    participant Coach as Coach Engine
    participant DB as Database
    participant Tria as Triangulation

    U->>FE: Paste AI answer text
    FE->>API: POST /extract-claims
    API->>CE: extract_claims(text)
    CE-->>API: [claim1, claim2, ...]
    API->>Coach: score_claim(features)
    Coach-->>API: (ai_probability, hints[3])
    API->>DB: INSERT claim, ai_prediction
    API-->>FE: {claims, ai_probability}

    Note over FE: Stage 1 — Predict shown (ONLY claim text visible)

    U->>FE: Set confidence 70%, pick reason tag
    FE->>API: POST /predict
    API->>DB: Check existing prediction (must be None)
    DB-->>API: None (no existing)
    API->>DB: INSERT prediction (locked, immutable)
    API-->>FE: {locked_at, message}

    Note over FE: Stage 2 — Investigate unlocked

    U->>FE: Request hint level 1
    FE->>API: GET /investigate/hint?hint_level=0
    API->>DB: Verify prediction exists (403 if not)
    DB-->>API: prediction found
    API->>Coach: score_claim (for SHAP hints)
    Coach-->>API: hints
    API-->>FE: {hint, lateral_links}

    Note over FE: Stage 3 — User clicks Reveal

    FE->>API: GET /reveal/{claim_id}
    API->>DB: Verify prediction exists (403 if not)
    DB-->>API: prediction found
    API->>Tria: triangulate(claim_text, entities)
    Tria->>Tria: Wikipedia + FactCheck + GDELT parallel
    Tria-->>API: {sources, outcome, rationale}
    API->>DB: INSERT reveal
    API-->>FE: {sources, outcome, ai_prediction, rationale}

    Note over FE: Stage 4 — Calibrate

    FE->>API: GET /calibrate/{claim_id}
    API->>DB: Fetch prediction + reveal
    API->>API: brier_score + reliability_diagram + archetype
    API->>DB: UPDATE passport (xp, level, streak)
    API-->>FE: {brier_score, teach_forward, diagram, archetype}
```

### Duel Mode Flow

```mermaid
sequenceDiagram
    participant A as Player A
    participant B as Player B
    participant API as FastAPI
    participant DB as Database

    A->>API: POST /duel (claim_id, player_a_id)
    API->>DB: INSERT duel (state=waiting, invite_code=XYZABC)
    API-->>A: {duel_id, invite_code: XYZABC}

    A->>B: Shares invite code XYZABC

    B->>API: POST /duel/join (invite_code=XYZABC, player_b_id)
    API->>DB: UPDATE duel (player_b_id, state=active)
    API-->>B: {duel_id, claim text}

    Note over A,B: Both see claim — neither sees the other's prediction

    A->>API: POST /duel/{id}/predict (probability=0.7)
    API->>DB: UPDATE duel (player_a_prob=0.7, player_a_locked=true)
    API-->>A: {your_prediction_locked: true, both_locked: false}

    B->>API: POST /duel/{id}/predict (probability=0.3)
    API->>DB: UPDATE duel (player_b_prob=0.3, player_b_locked=true)
    API-->>B: {your_prediction_locked: true, both_locked: true}

    Note over A,B: Both predictions locked — reveal available

    A->>API: POST /duel/{id}/reveal
    API->>DB: Verify both_locked (403 if not)
    API->>API: brier_a=(0.7-outcome)^2, brier_b=(0.3-outcome)^2
    API->>DB: UPDATE claim.difficulty_index (rolling avg of |p_a - p_b|)
    API->>DB: UPDATE duel (state=revealed, resolved_at)
    API-->>A: {winner, player_a_brier, player_b_brier, share_text}
```

---

## Component Architecture

```mermaid
graph TD
    App["App.jsx\n(Router)"]

    App --> Home["Home.jsx\n(Landing Page)"]
    App --> GL["GameLoop.jsx\n(PIRC Orchestrator)"]
    App --> DM["DuelMode.jsx\n(Duel Lobby)"]
    App --> DS["DuelSession.jsx\n(Live Duel)"]
    App --> CM["Classroom.jsx\n(Facilitator Mode)"]
    App --> PP["Passport.jsx\n(Profile)"]

    GL --> S1["Stage1_Predict.jsx"]
    GL --> S2["Stage2_Investigate.jsx"]
    GL --> S3["Stage3_Reveal.jsx"]
    GL --> S4["Stage4_Calibrate.jsx"]

    S4 --> CC["CalibrationCurve.jsx\n(Chart.js)"]

    DS --> DC["DuelCard.jsx\n(Result + Share)"]

    PP --> IP["InstinctPassport.jsx"]
    PP --> CC

    GL --> Store["gameStore.js\n(Zustand)"]
    S1 --> Store
    S2 --> Store
    S3 --> Store
    S4 --> Store

    GL --> API["api.js"]
    DM --> API
    DS --> API
    CM --> API
    PP --> API

    API --> Backend["FastAPI Backend\nlocalhost:8000"]

    style App fill:#4338ca,color:#fff,stroke:none
    style GL fill:#134e4a,color:#5eead4,stroke:#0f766e
    style Store fill:#7c2d12,color:#fed7aa,stroke:#9a3412
    style API fill:#1c1917,color:#d6d3d1,stroke:#57534e
    style Backend fill:#064e3b,color:#6ee7b7,stroke:#059669
```

---

## Database Schema

```mermaid
erDiagram
    users {
        string id PK
        string channel_identity UK
        datetime created_at
    }

    claims {
        string claim_id PK
        text text
        string claim_type
        json entities
        float specificity_score
        string source_answer_id
        float difficulty_index
        datetime created_at
        bool opt_in
        string anonymized_source
    }

    predictions {
        string prediction_id PK
        string user_id FK
        string claim_id FK
        float probability
        string reason_tag
        datetime locked_at
        bool is_ai_prediction
        int hints_used
    }

    reveals {
        string reveal_id PK
        string claim_id FK
        json sources_json
        float outcome
        text rationale_text
        datetime revealed_at
    }

    calibration_history {
        string id PK
        string user_id FK
        float rolling_brier
        string archetype
        int streak
        datetime updated_at
    }

    duels {
        string duel_id PK
        string claim_id FK
        string player_a_id
        string player_b_id
        float player_a_prob
        float player_b_prob
        bool player_a_locked
        bool player_b_locked
        string state
        string invite_code UK
        datetime created_at
        datetime resolved_at
    }

    passports {
        string passport_id PK
        string user_id FK
        int xp
        int level
        int streak
        int total_claims
        json badges
        string archetype
        string calibration_trend
        datetime last_active
    }

    users ||--o{ predictions : "makes"
    users ||--o| passports : "has"
    users ||--o{ calibration_history : "accumulates"
    claims ||--o{ predictions : "receives"
    claims ||--o| reveals : "has"
    claims ||--o{ duels : "used in"
```

---

## API Reference

All endpoints are prefixed with `/api/v1`. Full interactive documentation is available at `/docs` (Swagger UI) and `/redoc`.

```mermaid
graph LR
    subgraph Stage0["Stage 0"]
        EC["POST /extract-claims\nSubmit AI answer text"]
    end

    subgraph Stage1["Stage 1 — Predict"]
        PR["POST /predict\nLock probability + reason tag"]
    end

    subgraph Stage2["Stage 2 — Investigate"]
        HI["GET /investigate/hint\nGraduated hint (level 0-2)\n[REQUIRES: locked prediction]"]
    end

    subgraph Stage3["Stage 3 — Reveal"]
        RV["GET /reveal/{claim_id}\nSources + AI prediction\n[REQUIRES: locked prediction]"]
    end

    subgraph Stage4["Stage 4 — Calibrate"]
        CA["GET /calibrate/{claim_id}\nBrier score + diagram + teach"]
    end

    subgraph Duel["Duel Mode"]
        DC["POST /duel\nCreate session"]
        DJ["POST /duel/join\nJoin via invite code"]
        DP["POST /duel/{id}/predict\nLock duel prediction"]
        DR["POST /duel/{id}/reveal\nSync reveal (both locked)"]
    end

    subgraph Other["Profile and Content"]
        PAS["GET /passport/{user_id}\nInstinct Passport"]
        CLS["POST /classroom/session\nFacilitator session"]
        CB["GET /claim-bank\nBrowsable seeded claims"]
    end

    EC --> PR --> HI --> RV --> CA

    style Stage0 fill:#1e1b4b,stroke:#4338ca,color:#e0e7ff
    style Stage1 fill:#1e1b4b,stroke:#4338ca,color:#e0e7ff
    style Stage2 fill:#134e4a,stroke:#0f766e,color:#ccfbf1
    style Stage3 fill:#1e1b4b,stroke:#4338ca,color:#e0e7ff
    style Stage4 fill:#064e3b,stroke:#059669,color:#d1fae5
    style Duel fill:#7c2d12,stroke:#9a3412,color:#fed7aa
    style Other fill:#1c1917,stroke:#57534e,color:#d6d3d1
```

| Endpoint | Method | Server Guard | Description |
|---|---|---|---|
| `/extract-claims` | POST | None | Submit raw AI answer text, returns ordered claim list |
| `/predict` | POST | Idempotent — rejects second submission | Lock probability + reason tag (immutable after submission) |
| `/investigate/hint` | GET | Requires locked prediction | Return graduated hint, tracks hints-used count |
| `/reveal/{claim_id}` | GET | Requires locked prediction | Return sources, AI prediction, rationale |
| `/calibrate/{claim_id}` | GET | Requires reveal | Return Brier score, reliability diagram, teach forward |
| `/duel` | POST | None | Create duel session, return invite code |
| `/duel/join` | POST | Session state = waiting | Attach second player to waiting session |
| `/duel/{id}/predict` | POST | One lock per player | Lock a player's duel prediction |
| `/duel/{id}/reveal` | POST | Both players locked | Synchronised reveal and Brier comparison |
| `/passport/{user_id}` | GET | None | Return full Instinct Passport |
| `/classroom/session` | POST | None | Create facilitator session with sorted claims |
| `/claim-bank` | GET | None | Browse seeded community claim bank |

---

## The Coach Engine

The Coach Engine implements PRD section 10.2 using XGBoost with SHAP explainability.

```mermaid
flowchart TD
    A[Claim text from extractor] --> B[Feature Engineering]

    B --> F1[ent_density\nNamed entity density]
    B --> F2[hedge_ratio\nHedge-word proportion]
    B --> F3[has_numeric\nContains numbers?]
    B --> F4[numeric_density\nNumber density]
    B --> F5[has_unresolved_citation\nFabricated source?]

    F1 & F2 & F3 & F4 & F5 --> XGB[XGBoost Classifier\nn_estimators=50]

    XGB --> SHAP[SHAP TreeExplainer\nFeature attributions]
    XGB --> PROB[AI probability output\n0.0 to 1.0]

    SHAP --> RANK[Rank features by\nabsolute SHAP value]

    RANK --> H1[Level 1 Hint\nMetacognitive awareness]
    RANK --> H2[Level 2 Hint\nDirectional guidance]
    RANK --> H3[Level 3 Hint\nSpecific action]

    PROB -->|Shown at Reveal| USER[User sees AI prediction\nvs own prediction]

    style XGB fill:#7c2d12,color:#fed7aa,stroke:none
    style SHAP fill:#064e3b,color:#6ee7b7,stroke:none
    style PROB fill:#1e1b4b,color:#a5b4fc,stroke:none
```

The key insight is that the same model output serves two purposes: the probability becomes the AI's own Predict-equivalent (shown at Reveal as the human's opponent), and the SHAP feature attributions become the graduated hint text (shown at Investigate as questions, not conclusions). One model, two surfaces.

The model is trained on a synthetic dataset seeded with representative AI hallucination patterns. In production, this would be replaced with a model trained on labelled outcomes from the triangulation pipeline as the claim bank grows.

---

## Calibration Engine

```mermaid
flowchart LR
    subgraph Input
        UP[User probability\n0.0 to 1.0]
        OC[Outcome\n1.0 / 0.0 / 0.5]
    end

    subgraph Brier["Brier Score"]
        BS["score = (p - o)^2\nRange: 0 (perfect) to 1 (worst)"]
    end

    subgraph Points["Calibration Points"]
        CP["points = max(0, round((1 - score) * 100))\nRange: 0 to 100"]
    end

    subgraph Diagram["Reliability Diagram"]
        BIN[Bin predictions\ninto 10 deciles]
        ACC[Compute actual accuracy\nwithin each bin]
        DIAG[Plot user curve vs\nperfect diagonal]
    end

    subgraph Archetype["Confidence Archetype"]
        ME[Mean signed error\n= mean(p - o)]
        STD[Standard deviation\nof signed errors]
        AT{Archetype\nClassification}
        WC[Well-Calibrated\n|mean| < 0.10]
        CT[Confident Truster\nmean > 0.12]
        CS[Cautious Skeptic\nmean < -0.12]
        IC[Inconsistent\nstd > 0.30]
    end

    UP & OC --> BS --> CP
    UP & OC --> BIN --> ACC --> DIAG
    UP & OC --> ME & STD --> AT --> WC & CT & CS & IC

    style Brier fill:#1e1b4b,stroke:#4338ca,color:#e0e7ff
    style Diagram fill:#134e4a,stroke:#0f766e,color:#ccfbf1
    style Archetype fill:#7c2d12,stroke:#9a3412,color:#fed7aa
```

Brier score is used over log-loss because it is explainable on one screen without a statistics background — a hard requirement given the Clarity of Presentation judging criterion. The partial-credit outcome of 0.5 is used for genuinely contested claims to avoid forcing a false binary onto a claim the system itself says is unresolved.

---

## Duel Mode

```mermaid
stateDiagram-v2
    [*] --> waiting: POST /duel\n(Player A creates)
    waiting --> active: POST /duel/join\n(Player B joins)
    active --> active: Player A locks prediction
    active --> active: Player B locks prediction
    active --> revealed: POST /duel/reveal\n(Both locked — server enforced)
    revealed --> [*]: Results shown\nDifficulty index updated

    note right of waiting
        Invite code generated
        Only Player A in session
    end note

    note right of active
        Both players present
        Neither can see the other's prediction
        Reveal blocked until both lock
    end note

    note right of revealed
        Brier scores computed
        Disagreement logged
        difficulty_index updated:
        0.7 * old + 0.3 * |p_a - p_b|
        Shareable result card generated
    end note
```

The network effect is built into the difficulty index update. Every duel logs the pairwise disagreement between two players' predictions on a claim. The rolling average of this disagreement becomes the claim's difficulty index. Claims with high aggregate disagreement are surfaced more often in Classroom Mode as teaching examples; claims where everyone converges correctly are retired or reserved for onboarding. More users make the system better at teaching the next user, not just bigger.

---

## Classroom Mode

Classroom Mode is Duel Mode at N-person scale — one engine, two deployment contexts. The critical design choice is that the exercise works with zero per-student devices.

```mermaid
flowchart TD
    FAC[Facilitator creates session\nvia POST /classroom/session]
    FAC --> SEL[System selects claims\nsorted by difficulty_index]
    SEL --> PRJ[Claim projected\non screen or read aloud]
    PRJ --> CARD[Physical confidence cards\n0 / 25 / 50 / 75 / 100 percent]
    CARD --> PAIRS[Think-pair-share\nInvestigate window]
    PAIRS --> REV[Facilitator reveals:\n- Evidence sources\n- AI's own prediction\n- Class aggregate curve]
    REV --> DISC[Discussion prompts\nfrom hint ladder]
    DISC --> NEXT{More claims?}
    NEXT -- Yes --> PRJ
    NEXT -- No --> CARD2[Printable facilitator card\nper claim for offline use]

    style FAC fill:#6366f1,color:#fff,stroke:none
    style CARD fill:#134e4a,color:#5eead4,stroke:#0f766e
    style REV fill:#064e3b,color:#6ee7b7,stroke:#059669
```

The printable facilitator card is generated per claim and includes the claim text, the three-level hint ladder, the triangulated sources, and suggested discussion prompts. A facilitator with no internet access in the room can run a full session from a single pre-downloaded card.

---

## Getting Started

### Prerequisites

- Python 3.11 or later
- Node.js 18 or later
- Git

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/your-team/DeetsCheck
cd DeetsCheck

# Create and activate a virtual environment
python -m venv venv
# Windows
venv\Scripts\activate
# Unix / macOS
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Download spaCy language model
python -m spacy download en_core_web_sm

# Start the API server
uvicorn backend.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Interactive documentation is at `http://localhost:8000/docs`.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`. The Vite dev server proxies all `/api` requests to the FastAPI backend on port 8000.

### Environment Variables

Create a `.env` file in the project root for optional configuration:

```env
# Database (default: SQLite in project root)
DATABASE_URL=sqlite+aiosqlite:///./DeetsCheck.db

# Google Fact Check Tools API key (optional — enables real fact-checking)
GOOGLE_FACTCHECK_API_KEY=your_api_key_here

# Frontend API URL (default: /api/v1, proxied by Vite)
VITE_API_URL=http://localhost:8000/api/v1
```

---

## Running Tests

The test suite covers the claim extractor, calibration engine, coach engine, duel orchestrator, and all API endpoints as integration tests.

```bash
# From the project root
cd backend
pip install -r requirements.txt
pytest -v
```

To run individual test modules:

```bash
pytest tests/test_calibration.py -v      # Calibration engine (43 tests)
pytest tests/test_extraction.py -v       # Claim extractor (14 tests)
pytest tests/test_scoring.py -v          # Coach engine (22 tests)
pytest tests/test_duel.py -v             # Duel orchestrator (34 tests)
pytest tests/test_routes.py -v           # API integration (15 tests)
```

To run with coverage:

```bash
pytest --cov=backend --cov-report=term-missing
```

### Test Coverage by Module

| Module | Tests | Coverage focus |
|---|---|---|
| `extraction/extractor.py` | 14 | Schema compliance, sorting, type detection, opinion filtering |
| `calibration/engine.py` | 43 | Brier score edge cases, archetype derivation, XP computation |
| `coach/scorer.py` | 22 | Feature vectors, probability range, hint quality, template structure |
| `duel/orchestrator.py` | 34 | Session lifecycle, immutable locking, winner computation, difficulty index |
| `api/routes.py` | 15 | Server-enforced ordering, full PIRC cycle, passport, claim bank |

---

## Configuration

### Claim Extractor

The extractor uses spaCy's `en_core_web_sm` model for NER and sentence segmentation. A regex-only fallback is available for environments where spaCy cannot be installed. The fallback is activated automatically if the model import fails.

To configure extraction sensitivity, adjust the `specificity_score` threshold in `extraction/extractor.py`:

```python
if features.get("specificity_score", 0) < 0.05:  # lower = more claims extracted
    return False
```

### Coach Engine

The XGBoost model is trained on startup from a synthetic dataset if no saved model is found at `backend/coach/coach_model.pkl`. To retrain from new data, delete the pickle file and restart the server.

### Triangulation

The triangulation orchestrator queries Wikipedia without authentication. Google Fact Check Tools requires a free API key from the Google Cloud Console with the Fact Check Tools API enabled. GDELT is queried without authentication.

If no Google API key is set, the Fact Check source is silently skipped and the reveal still proceeds with Wikipedia and GDELT results. The system explicitly states when no independent source is found rather than guessing.

### Database

The default configuration uses SQLite for zero-install development. The schema is Postgres-compatible. To switch to Postgres, set the `DATABASE_URL` environment variable:

```env
DATABASE_URL=postgresql+asyncpg://user:password@host/DeetsCheck
```

---

## Deployment

### Production Architecture

```mermaid
graph LR
    USER[User browser] --> CDN[Vercel CDN\nFrontend static]
    CDN --> API[Vercel Serverless\nor Railway FastAPI]
    API --> DB[(Supabase PostgreSQL\nor Neon)]
    API --> REDIS[(Upstash Redis\nfor duel sessions)]
    API --> WIKI[Wikipedia API]
    API --> GFC[Google Fact Check]
    API --> GDELT[GDELT]

    style USER fill:#6366f1,color:#fff,stroke:none
    style CDN fill:#134e4a,color:#5eead4,stroke:none
    style API fill:#1e1b4b,color:#a5b4fc,stroke:none
    style DB fill:#064e3b,color:#6ee7b7,stroke:none
    style REDIS fill:#7c2d12,color:#fed7aa,stroke:none
```

### Frontend Deployment (Vercel)

```bash
cd frontend
npm run build
# Deploy dist/ directory to Vercel
```

### Backend Deployment

The FastAPI backend can be deployed to Railway, Render, or as a Vercel serverless function using the ASGI adapter. Add a `Procfile`:

```
web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

---

## Design Decisions

### Why Brier Score and Not Log-Loss

Brier score (`(p - o)^2`) produces a number between 0 and 1 that is explainable on one screen: perfect score is 0, worst is 1, and the midpoint for guessing at 50 percent is 0.25. Log-loss requires a logarithm to explain, which violates the Clarity of Presentation requirement for a tool targeting 15 to 30 year olds with no statistics background.

### Why the Partial-Credit Outcome of 0.5

Forcing a binary true/false outcome onto every claim would introduce a false precision that the evidence does not support. The Coriolis drains example in the seeded bank illustrates this: the claim touches genuinely contested science. Assigning it a 0 or 1 outcome would be less honest than the evidence warrants. The 0.5 outcome is explicitly flagged in the UI as contested/mixed evidence.

### Why Server-Enforced Ordering

The ordering of Predict before Reveal is the load-bearing constraint of the entire product. If the UI enforces this but the server does not, then any future feature change, API client, bot, or direct curl request could bypass the constraint. The server checks for a locked prediction before returning anything from `/investigate/hint` or `/reveal/{claim_id}`. This is a structural guarantee, not a UI convention.

### Why the AI is Allowed to Be Wrong

A competitor tool that filters its reveal to only show cases where the AI's prediction was well-calibrated would gradually teach users that AI predictions are reliable. DeetsCheck deliberately includes cases where the AI prediction is wrong. This is only possible because DeetsCheck produces an AI prediction (the XGBoost probability output) rather than a verdict, and because the AI and the user are on equal footing — both using the same slider UI, both producing a falsifiable probability.

### Why the Claim Bank Uses Real, Independently Verified Claims

The fifteen seeded claims in the community bank were selected and independently fact-checked against their primary sources before inclusion. Each entry includes the specific sources and reasoning that establish the known outcome. This means the demo can demonstrate real AI hallucination patterns — fabricated citations, historical myths perpetuated by confident training data, contested scientific claims — rather than constructed hypotheticals.

---

## MIL Alignment

DeetsCheck is designed specifically for AI and MIL. The following table maps each judging criterion to a concrete product decision:

| Criterion | Alignment |
|---|---|
| Consistency with Theme | The product is built around human agency — the user's reasoning is what the architecture is built around, not a coda after the machine finishes |
| Clarity of Presentation | Brier score chosen over log-loss specifically for one-screen explainability; reliability diagram rendered as a simple line against a diagonal |
| Innovation and Creativity | The ordering constraint (predict before evidence) is the novel contribution — no existing MIL tool applies the predict-then-check method specifically to sourceless AI answers |
| Feasibility and Sustainability | No GPU hosting, no fine-tuning, no proprietary model required; free-tier APIs throughout; offline-capable classroom mode with physical cards |
| Impact and Inclusion | Multi-channel design (web, Telegram, classroom with zero per-student devices); zero-login core loop; no-install option for mobile-first users |

---

## Roadmap

The following features are explicitly out of scope for the MVP and are documented here as the roadmap:

- WhatsApp Business Cloud API as the real scale target given regional usage patterns among youth outside North America and Europe
- Multilingual claim extraction and UI, expanded via community contribution rather than a single team's translation effort
- Offline-capable PWA for intermittent-connectivity settings
- Live real-time Duel reveal at scale using WebSocket, currently async-first for MVP feasibility
- Ranked seasonal Duel leagues once the core calibration mechanic is validated, deliberately deferred to avoid incentivising guessing-for-score over genuine calibration
- Integration pathway into existing MIL frameworks networks as a plugin rather than a standalone competing platform
- Foundation model fine-tuning on the growing claim bank once labelled outcome data is sufficient
- Native mobile app, currently covered by the PWA and Telegram bot channels

---

## Acknowledgements

This project draws on the following research and frameworks:

- Tetlock, P. and Gardner, D. (2015). *Superforecasting: The Art and Science of Prediction*. Crown Publishers. The calibration methodology and reliability diagram concept are directly derived from superforecaster training methods.
- Caulfield, M. (2019). SIFT (Stop, Investigate the source, Find better coverage, Trace claims). The lateral reading and claim-tracing approach adapted for sourceless AI answers.
- Pew Research Center. (2025). *Teens, Social Media and AI Chatbots 2025*.
- McBain, R. et al. (2026). AI chatbot use for mental health advice among youth. *JAMA Pediatrics*.
- arXiv:2605.22785 (2026). Aggregated AI news consumption data.

---

*Version 2.0 — July 2026*

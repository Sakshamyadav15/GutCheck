/**
 * api.js — API client for the DeetsCheck FastAPI backend.
 *
 * All functions call the real FastAPI backend (proxied through Vite dev server).
 * The BASE_URL is configurable for production deployment.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

async function request(method, path, body = null, params = null) {
  let url = `${BASE_URL}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    url = `${url}?${qs}`;
  }

  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const data = await res.json();

  if (!res.ok) {
    const msg = data?.detail || `API error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// Stage 0 — Extract claims from AI answer text
export async function extractClaims(answerText, userId = null) {
  return request('POST', '/extract-claims', { answer_text: answerText, user_id: userId });
}

// Stage 1 — Lock in a prediction
export async function submitPrediction(claimId, userId, probability, reasonTag = null) {
  return request('POST', '/predict', {
    claim_id: claimId,
    user_id: userId,
    probability,
    reason_tag: reasonTag,
  });
}

// Stage 2 — Get a hint (graduated, level 0/1/2)
export async function getHint(claimId, userId, hintLevel = 0) {
  return request('GET', '/investigate/hint', null, {
    claim_id: claimId,
    user_id: userId,
    hint_level: hintLevel,
  });
}

// Stage 3 — Reveal evidence and AI prediction
export async function revealClaim(claimId, userId) {
  return request('GET', `/reveal/${claimId}`, null, { user_id: userId });
}

// Stage 4 — Calibrate (Brier score + reliability diagram + teach forward)
export async function calibrateClaim(claimId, userId) {
  return request('GET', `/calibrate/${claimId}`, null, { user_id: userId });
}

// Passport
export async function getPassport(userId) {
  return request('GET', `/passport/${userId}`);
}

// Duel
export async function createDuel(claimId, playerAId) {
  return request('POST', '/duel', { claim_id: claimId, player_a_id: playerAId });
}

export async function joinDuel(inviteCode, playerBId) {
  return request('POST', '/duel/join', { invite_code: inviteCode, player_b_id: playerBId });
}

export async function duelPredict(duelId, playerId, probability) {
  return request('POST', `/duel/${duelId}/predict`, {
    duel_id: duelId,
    player_id: playerId,
    probability,
  });
}

export async function duelReveal(duelId) {
  return request('POST', `/duel/${duelId}/reveal`);
}

// Claim bank
export async function getClaimBank(difficulty = null, limit = 10) {
  const params = { limit };
  if (difficulty) params.difficulty = difficulty;
  return request('GET', '/claim-bank', null, params);
}

// Classroom
export async function createClassroomSession(facilitatorId, claimId = null, difficultyFilter = 'all') {
  return request('POST', '/classroom/session', {
    facilitator_id: facilitatorId,
    claim_id: claimId,
    difficulty_filter: difficultyFilter,
  });
}

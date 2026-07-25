const API_BASE_URL = "http://localhost:8000/api/v1";

export function getUserId(): string {
  if (typeof window === "undefined") return "user-fallback";
  let userId = localStorage.getItem("gutcheck_user_id");
  if (!userId) {
    userId = "user-" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("gutcheck_user_id", userId);
  }
  return userId;
}

export async function extractClaims(text: string) {
  const res = await fetch(`${API_BASE_URL}/extract-claims`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      answer_text: text,
      user_id: getUserId(),
    }),
  });
  if (!res.ok) throw new Error("Failed to extract claims");
  return res.json();
}

export async function lockPrediction(claimId: string, probability: number, rationale: string) {
  const res = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      claim_id: claimId,
      user_id: getUserId(),
      probability: probability,
      reason_tag: rationale,
    }),
  });
  if (!res.ok) throw new Error("Failed to lock prediction");
  return res.json();
}

export async function getInvestigateHint(claimId: string, hintLevel: number = 0) {
  const res = await fetch(`${API_BASE_URL}/investigate/hint?claim_id=${claimId}&user_id=${getUserId()}&hint_level=${hintLevel}`);
  if (!res.ok) throw new Error("Failed to fetch hint");
  return res.json();
}

export async function getReveal(claimId: string) {
  const res = await fetch(`${API_BASE_URL}/reveal/${claimId}?user_id=${getUserId()}`);
  if (!res.ok) throw new Error("Failed to fetch reveal");
  return res.json();
}

export async function getCalibration(claimId: string) {
  const res = await fetch(`${API_BASE_URL}/calibrate/${claimId}?user_id=${getUserId()}`);
  if (!res.ok) throw new Error("Failed to fetch calibration");
  return res.json();
}

export async function getPassport() {
  const res = await fetch(`${API_BASE_URL}/passport/${getUserId()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch passport");
  return res.json();
}

export async function createClassroomSession() {
  const res = await fetch(`${API_BASE_URL}/classroom/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      facilitator_id: getUserId(),
      difficulty_filter: "all",
    }),
  });
  if (!res.ok) throw new Error("Failed to create classroom session");
  return res.json();
}

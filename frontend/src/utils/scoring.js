/**
 * scoring.js — Client-side Brier score and calibration utilities.
 * Mirrors the backend calibration engine for instant UI feedback.
 */

/**
 * Compute Brier score for a single prediction.
 * @param {number} probability - user's stated probability (0-1)
 * @param {number} outcome - 1 (true), 0 (false), 0.5 (contested)
 * @returns {number}
 */
export function brierScore(probability, outcome) {
  const p = Math.max(0, Math.min(1, probability));
  const o = Number(outcome);
  return Math.round((p - o) ** 2 * 10000) / 10000;
}

/**
 * Convert Brier score to calibration points (0-100).
 */
export function calibrationPoints(probability, outcome) {
  const bs = brierScore(probability, outcome);
  return Math.max(0, Math.round((1 - bs) * 100));
}

/**
 * Get a human-readable label for an outcome value.
 */
export function outcomeLabel(outcome) {
  if (outcome === 1.0) return 'Supported';
  if (outcome === 0.0) return 'Contradicted';
  return 'Contested';
}

/**
 * Get CSS class for an outcome value.
 */
export function outcomeClass(outcome) {
  if (outcome === 1.0) return 'outcome-true';
  if (outcome === 0.0) return 'outcome-false';
  return 'outcome-contested';
}

/**
 * Format a probability as a percentage string.
 */
export function formatPct(probability) {
  return `${Math.round(probability * 100)}%`;
}

/**
 * Compute archetype from prediction history pairs [[probability, outcome], ...].
 * Mirrors backend compute_archetype().
 */
export function computeArchetype(pairs) {
  if (pairs.length < 3) return 'Emerging';
  const signedErrors = pairs.map(([p, o]) => p - o);
  const mean = signedErrors.reduce((a, b) => a + b, 0) / signedErrors.length;
  const variance = signedErrors.reduce((a, b) => a + (b - mean) ** 2, 0) / signedErrors.length;
  const std = Math.sqrt(variance);

  if (Math.abs(mean) < 0.10 && std < 0.20) return 'Well-Calibrated';
  if (mean > 0.12) return 'Confident Truster';
  if (mean < -0.12) return 'Cautious Skeptic';
  if (std > 0.30) return 'Inconsistent';
  return 'Developing';
}

/**
 * Archetype → descriptive text for the Passport card.
 */
export const archetypeDescriptions = {
  'Well-Calibrated': 'Your confidence consistently matches reality. This is the goal.',
  'Confident Truster': 'You tend to over-trust confident-sounding claims. Focus on evidence before committing.',
  'Cautious Skeptic': 'You tend to under-trust even well-supported claims. Work on raising confidence when evidence is strong.',
  'Inconsistent': 'Your calibration is unpredictable. Slow down and use the Investigate stage.',
  'Developing': 'Your calibration is forming. Keep completing cycles to reveal your pattern.',
  'Emerging': 'Complete more predictions to reveal your calibration archetype.',
};

/**
 * Get an archetype colour class.
 */
export const archetypeColors = {
  'Well-Calibrated': 'emerald',
  'Confident Truster': 'amber',
  'Cautious Skeptic': 'indigo',
  'Inconsistent': 'rose',
  'Developing': 'indigo',
  'Emerging': 'teal',
};

/**
 * Generate a persistent anonymous user ID.
 * Stored in localStorage so the same user is recognised across sessions.
 */
export function getUserId() {
  const key = 'DeetsCheck_user_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'user-' + crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

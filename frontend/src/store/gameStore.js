/**
 * gameStore.js — Zustand state management for the PIRC game loop.
 */

import { create } from 'zustand';

const STAGES = ['predict', 'investigate', 'reveal', 'calibrate'];

const useGameStore = create((set, get) => ({
  // Current claim being evaluated
  currentClaim: null,
  claimQueue: [],       // remaining claims from the extraction session
  sessionId: null,

  // Stage progress
  stage: 'idle',         // idle | predict | investigate | reveal | calibrate | done
  stageHistory: [],

  // Prediction state
  userProbability: 50,   // 0-100 (slider value)
  userReasonTag: null,
  predictionLocked: false,
  predictionLockedAt: null,

  // Investigate state
  hintsUsed: 0,
  hintsData: [],
  investigateStarted: false,

  // Reveal data
  revealData: null,

  // Calibrate data
  calibrateData: null,

  // Passport (cached)
  passport: null,

  // Errors
  error: null,

  // Actions
  setCurrentClaim: (claim) => set({ currentClaim: claim, error: null }),

  setClaimQueue: (claims) => set({
    claimQueue: claims,
    currentClaim: claims[0] || null,
    sessionId: `session-${Date.now()}`,
  }),

  startStage: (stage) => set((s) => ({
    stage,
    stageHistory: [...s.stageHistory, stage],
  })),

  setUserProbability: (val) => set({ userProbability: val }),

  setUserReasonTag: (tag) => set({ userReasonTag: tag }),

  lockPrediction: () => set({
    predictionLocked: true,
    predictionLockedAt: new Date().toISOString(),
    stage: 'investigate',
  }),

  addHint: (hintData) => set((s) => ({
    hintsUsed: s.hintsUsed + 1,
    hintsData: [...s.hintsData, hintData],
    investigateStarted: true,
  })),

  setRevealData: (data) => set({ revealData: data, stage: 'reveal' }),

  setCalibrateData: (data) => set({ calibrateData: data, stage: 'calibrate' }),

  setPassport: (passport) => set({ passport }),

  setError: (error) => set({ error }),

  advanceToNextClaim: () => set((s) => {
    const remaining = s.claimQueue.slice(1);
    if (remaining.length === 0) {
      return { stage: 'done', claimQueue: [], currentClaim: null };
    }
    return {
      currentClaim: remaining[0],
      claimQueue: remaining,
      stage: 'predict',
      userProbability: 50,
      userReasonTag: null,
      predictionLocked: false,
      predictionLockedAt: null,
      hintsUsed: 0,
      hintsData: [],
      investigateStarted: false,
      revealData: null,
      calibrateData: null,
      error: null,
    };
  }),

  resetSession: () => set({
    currentClaim: null,
    claimQueue: [],
    sessionId: null,
    stage: 'idle',
    stageHistory: [],
    userProbability: 50,
    userReasonTag: null,
    predictionLocked: false,
    predictionLockedAt: null,
    hintsUsed: 0,
    hintsData: [],
    investigateStarted: false,
    revealData: null,
    calibrateData: null,
    error: null,
  }),
}));

export default useGameStore;

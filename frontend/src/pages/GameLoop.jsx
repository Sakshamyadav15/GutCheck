import React, { useState } from 'react';
import Stage1_Predict from '../components/Stage1_Predict';
import Stage2_Investigate from '../components/Stage2_Investigate';
import Stage3_Reveal from '../components/Stage3_Reveal';
import Stage4_Calibrate from '../components/Stage4_Calibrate';
import useGameStore from '../store/gameStore';
import { extractClaims, getClaimBank, submitPrediction, getHint, revealClaim, calibrateClaim } from '../utils/api';
import { getUserId } from '../utils/scoring';

const STAGE_LABELS = {
  idle: 'Start',
  predict: 'Predict',
  investigate: 'Investigate',
  reveal: 'Reveal',
  calibrate: 'Calibrate',
};

function StageBar({ currentStage }) {
  const stages = ['predict', 'investigate', 'reveal', 'calibrate'];
  const currentIdx = stages.indexOf(currentStage);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {stages.map((s, i) => (
        <React.Fragment key={s}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: i < currentIdx ? 'var(--teal)' : i === currentIdx ? 'var(--indigo)' : 'rgba(255,255,255,0.08)',
              border: i === currentIdx ? '2px solid var(--indigo-light)' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: i <= currentIdx ? '#fff' : 'rgba(255,255,255,0.3)',
              transition: 'all 0.3s ease',
              boxShadow: i === currentIdx ? '0 0 16px var(--indigo-glow)' : 'none',
            }}>
              {i < currentIdx ? '✓' : i + 1}
            </div>
            <span style={{
              fontSize: '0.7rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              color: i <= currentIdx ? 'var(--text-primary)' : 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {STAGE_LABELS[s]}
            </span>
          </div>
          {i < stages.length - 1 && (
            <div style={{
              flex: 1,
              height: 2,
              background: i < currentIdx
                ? 'linear-gradient(90deg, var(--teal), var(--indigo))'
                : 'rgba(255,255,255,0.08)',
              transition: 'background 0.4s ease',
              marginBottom: 20,
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function GameLoop() {
  const store = useGameStore();
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const userId = getUserId();

  const handleExtract = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await extractClaims(inputText, userId);
      store.setClaimQueue(data.claims);
      store.startStage('predict');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBankClaim = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getClaimBank(null, 5);
      // Convert seeded bank claims into a format the store can use
      // They need claim_ids from the backend — extract them first
      const aiText = data.claims.map(c => c.text).join(' ');
      const extracted = await extractClaims(aiText, userId);
      store.setClaimQueue(extracted.claims);
      store.startStage('predict');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePredictSubmit = async ({ probability, reasonTag }) => {
    const claim = store.currentClaim;
    if (!claim) return;
    setError(null);
    try {
      await submitPrediction(claim.claim_id, userId, probability / 100, reasonTag);
      store.setUserProbability(probability);
      store.setUserReasonTag(reasonTag);
      store.lockPrediction();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGetHint = async (level) => {
    const claim = store.currentClaim;
    if (!claim) return null;
    try {
      const data = await getHint(claim.claim_id, userId, level);
      store.addHint(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  const handleReveal = async () => {
    const claim = store.currentClaim;
    if (!claim) return;
    setError(null);
    try {
      const data = await revealClaim(claim.claim_id, userId);
      store.setRevealData(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCalibrate = async () => {
    const claim = store.currentClaim;
    if (!claim) return;
    setError(null);
    try {
      const data = await calibrateClaim(claim.claim_id, userId);
      store.setCalibrateData(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleNextClaim = () => {
    store.advanceToNextClaim();
  };

  const handleEndSession = () => {
    store.resetSession();
  };

  const claimProgress = store.claimQueue.length > 0
    ? `Claim ${store.stageHistory.filter(s => s === 'predict').length} of ${store.claimQueue.length + store.stageHistory.filter(s => s === 'predict').length - 1}`
    : null;

  if (store.stage === 'done') {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div className="card card-body animate-fade-up">
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '4rem', fontWeight: 900, background: 'linear-gradient(135deg, var(--indigo-light), var(--teal))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Session Complete
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: '1.05rem' }}>
            You completed the full session. Check your Instinct Passport to see your calibration trend.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-lg" onClick={handleEndSession}>Start New Session</button>
            <a href="/passport" className="btn btn-ghost btn-lg">View Passport</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>

      {store.stage !== 'idle' && (
        <>
          <StageBar currentStage={store.stage} />
          {claimProgress && (
            <div style={{ textAlign: 'right', marginBottom: 16, color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-display)' }}>
              {claimProgress}
            </div>
          )}
        </>
      )}

      {error && (
        <div className="card card-body animate-fade-in" style={{ borderColor: 'rgba(244,63,94,0.4)', background: 'rgba(244,63,94,0.06)', marginBottom: 24 }}>
          <p style={{ color: 'var(--rose)', margin: 0, fontSize: '0.9rem' }}>{error}</p>
        </div>
      )}

      {store.stage === 'idle' && (
        <div className="card card-body animate-fade-up" style={{ padding: 40 }}>
          <div style={{ marginBottom: 32 }}>
            <div className="badge badge-indigo" style={{ marginBottom: 16 }}>Stage 0</div>
            <h2 style={{ marginBottom: 12, fontFamily: 'var(--font-display)' }}>
              Submit an AI Answer
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>
              Paste any text generated by an AI chatbot. The system will extract checkable claims.
              You will predict before seeing any evidence.
            </p>
          </div>

          <textarea
            className="input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste an AI-generated answer here — from ChatGPT, Gemini, Claude, Copilot, or any AI chatbot..."
            style={{ minHeight: 160, marginBottom: 20 }}
          />

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleExtract}
              disabled={loading || !inputText.trim()}
            >
              {loading ? 'Extracting...' : 'Extract Claims'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={handleBankClaim}
              disabled={loading}
            >
              Or use a claim from the bank
            </button>
          </div>

          {loading && (
            <div style={{ marginTop: 24 }}>
              <div className="skeleton" style={{ height: 16, marginBottom: 8, borderRadius: 8 }} />
              <div className="skeleton" style={{ height: 16, width: '70%', borderRadius: 8 }} />
            </div>
          )}
        </div>
      )}

      {store.stage === 'predict' && store.currentClaim && (
        <Stage1_Predict
          claim={store.currentClaim}
          onSubmit={handlePredictSubmit}
        />
      )}

      {store.stage === 'investigate' && store.currentClaim && (
        <Stage2_Investigate
          claim={store.currentClaim}
          hintsData={store.hintsData}
          hintsUsed={store.hintsUsed}
          onGetHint={handleGetHint}
          onSkipToReveal={handleReveal}
        />
      )}

      {store.stage === 'reveal' && store.revealData && (
        <Stage3_Reveal
          revealData={store.revealData}
          userPrediction={{
            probability: store.userProbability / 100,
            reasonTag: store.userReasonTag,
          }}
          onContinue={handleCalibrate}
        />
      )}

      {store.stage === 'calibrate' && store.calibrateData && (
        <Stage4_Calibrate
          calibrateData={store.calibrateData}
          onNextClaim={handleNextClaim}
          onEndSession={handleEndSession}
        />
      )}
    </div>
  );
}

export default GameLoop;

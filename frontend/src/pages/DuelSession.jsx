import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DuelCard from '../components/DuelCard';

function DuelSession() {
  const { duelId } = useParams();
  const [phase, setPhase] = useState('waiting'); // waiting, predict, reveal
  const [confidence, setConfidence] = useState(50);
  const [duelResult, setDuelResult] = useState(null);

  // Mock progression for demonstration
  useEffect(() => {
    if (phase === 'waiting') {
      const t = setTimeout(() => setPhase('predict'), 3000);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const handleLockIn = () => {
    setPhase('reveal');
    setDuelResult({
      winner: 'You',
      player_a: 85,
      player_b: 60,
      disagreement: 'High',
      share_text: `I just won a DeetsCheck duel with 85 points! Can you beat me? Code: ${duelId}`
    });
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      
      {phase === 'waiting' && (
        <div className="card card-body" style={{ textAlign: 'center', padding: '4rem' }}>
          <h2 style={{ color: 'var(--teal)', marginBottom: '1rem' }}>Waiting for opponent...</h2>
          <p style={{ fontSize: '1.2rem', color: '#a1a1aa', marginBottom: '2rem' }}>Share this code:</p>
          <div style={{ fontSize: '3rem', fontWeight: 'bold', letterSpacing: '8px', color: 'var(--indigo)' }}>{duelId}</div>
        </div>
      )}

      {phase === 'predict' && (
        <div className="card card-body animate-fade-up">
          <div className="badge badge-amber" style={{ alignSelf: 'center', marginBottom: '1rem' }}>Duel Active</div>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Claim: "The Great Wall of China is visible from the Moon."</h2>
          
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Your Confidence (True)</h3>
            <div style={{ fontSize: '4rem', fontWeight: 'bold', color: 'var(--teal)', marginBottom: '1rem' }}>
              {confidence}%
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={confidence} 
              onChange={(e) => setConfidence(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          <button className="btn btn-primary btn-lg" onClick={handleLockIn} style={{ width: '100%' }}>
            Lock In Silently
          </button>
        </div>
      )}

      {phase === 'reveal' && duelResult && (
        <div className="animate-fade-up">
          <DuelCard duelResult={duelResult} />
        </div>
      )}

    </div>
  );
}

export default DuelSession;

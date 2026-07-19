import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDuel, joinDuel } from '../utils/api';
import { getUserId } from '../utils/scoring';

function DuelMode() {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const data = await createDuel(getUserId());
      // assuming api returns { duelId: '12345' }
      navigate(`/duel/${data.duelId || 'demo-123'}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode) return;
    setLoading(true);
    try {
      await joinDuel(inviteCode, getUserId());
      navigate(`/duel/${inviteCode}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ color: 'var(--teal)', textAlign: 'center', marginBottom: '3rem' }}>Challenge a Friend</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="card card-body">
          <h2 style={{ color: 'var(--indigo)', marginBottom: '1rem' }}>Create a Duel</h2>
          <p style={{ marginBottom: '2rem', color: '#a1a1aa' }}>Start a new session and send an invite code to a friend. You both predict the same claim independently.</p>
          <button className="btn btn-primary btn-lg" onClick={handleCreate} disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Creating...' : 'Create Duel'}
          </button>
        </div>

        <div className="card card-body">
          <h2 style={{ color: 'var(--amber)', marginBottom: '1rem' }}>Join a Duel</h2>
          <p style={{ marginBottom: '1rem', color: '#a1a1aa' }}>Got an invite code? Enter it here to join.</p>
          <input 
            type="text" 
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="ENTER CODE"
            style={{ width: '100%', padding: '1rem', fontSize: '1.5rem', textAlign: 'center', letterSpacing: '4px', background: '#0a0f1d', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', marginBottom: '1rem' }}
          />
          <button className="btn btn-teal btn-lg" onClick={handleJoin} disabled={!inviteCode || loading} style={{ width: '100%' }}>
            {loading ? 'Joining...' : 'Join Duel'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: '4rem', textAlign: 'center', color: '#a1a1aa' }}>
        <h3 style={{ marginBottom: '1rem' }}>How it works</h3>
        <p>1. Both players read the same AI-generated claim.</p>
        <p>2. Both players lock in their predictions silently.</p>
        <p>3. The truth is revealed simultaneously. Highest calibration wins.</p>
      </div>
    </div>
  );
}

export default DuelMode;

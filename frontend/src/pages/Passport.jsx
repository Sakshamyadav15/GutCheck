import React, { useEffect, useState } from 'react';
import InstinctPassport from '../components/InstinctPassport';
import CalibrationCurve from '../components/CalibrationCurve';
import { getPassport } from '../utils/api';
import { getUserId } from '../utils/scoring';

function Passport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPassport = async () => {
      try {
        const res = await getPassport(getUserId());
        // Mock fallback if api is empty
        setData(res || {
          xp: 1450,
          level: 4,
          streak: 5,
          archetype: 'The Skeptic',
          totalClaims: 42,
          brierScore: 0.18
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPassport();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <h2 className="animate-fade-in" style={{ color: 'var(--teal)' }}>Loading Passport...</h2>
      </div>
    );
  }

  return (
    <div className="passport-page animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ color: 'var(--teal)', marginBottom: '2rem', textAlign: 'center' }}>Your Instinct Passport</h1>
      
      <InstinctPassport passportData={data} />

      <div className="card card-body" style={{ marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Full Calibration History</h3>
        <CalibrationCurve diagramData={null} />
      </div>

      <div className="card card-body" style={{ marginTop: '2rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--indigo)' }}>
        <h3 style={{ color: 'var(--indigo)', marginBottom: '1rem' }}>Archetype Profile: {data?.archetype}</h3>
        <p style={{ lineHeight: '1.6' }}>
          You have developed a strong defense against automated misinformation, but you occasionally doubt factual statements when they sound counter-intuitive. Your next goal is to improve confidence in verified but surprising facts.
        </p>
      </div>
    </div>
  );
}

export default Passport;

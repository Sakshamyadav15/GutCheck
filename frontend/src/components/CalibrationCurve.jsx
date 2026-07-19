import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Seeded example data so the chart is never empty during a demo
const SEEDED_BINS = [
  { confidence_mid: 0.05, accuracy: 0.10, count: 2 },
  { confidence_mid: 0.15, accuracy: 0.20, count: 3 },
  { confidence_mid: 0.25, accuracy: 0.28, count: 4 },
  { confidence_mid: 0.35, accuracy: 0.30, count: 5 },
  { confidence_mid: 0.45, accuracy: 0.42, count: 7 },
  { confidence_mid: 0.55, accuracy: 0.58, count: 8 },
  { confidence_mid: 0.65, accuracy: 0.60, count: 6 },
  { confidence_mid: 0.75, accuracy: 0.72, count: 5 },
  { confidence_mid: 0.85, accuracy: 0.80, count: 4 },
  { confidence_mid: 0.95, accuracy: 0.90, count: 3 },
];

/**
 * CalibrationCurve — Reliability diagram.
 * diagramData: { bins: [{confidence_mid, accuracy, count}], overall_brier }
 * If no data, shows a seeded demo curve.
 */
function CalibrationCurve({ diagramData }) {
  const bins = (diagramData?.bins && diagramData.bins.length > 0)
    ? diagramData.bins
    : SEEDED_BINS;

  const isSeeded = !(diagramData?.bins && diagramData.bins.length > 0);

  const xLabels = bins.map(b => `${Math.round(b.confidence_mid * 100)}%`);
  const userAccuracy = bins.map(b => Math.round(b.accuracy * 100));
  const perfectLine = bins.map(b => Math.round(b.confidence_mid * 100));

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'rgba(255,255,255,0.65)',
          font: { family: "'Inter', sans-serif", size: 12 },
          boxWidth: 20,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(6,11,24,0.92)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        titleColor: 'rgba(255,255,255,0.9)',
        bodyColor: 'rgba(255,255,255,0.65)',
        padding: 12,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}%`,
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Stated Confidence',
          color: 'rgba(255,255,255,0.4)',
          font: { size: 11 },
        },
        ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
      y: {
        title: {
          display: true,
          text: 'Actual Accuracy',
          color: 'rgba(255,255,255,0.4)',
          font: { size: 11 },
        },
        min: 0,
        max: 100,
        ticks: {
          color: 'rgba(255,255,255,0.5)',
          font: { size: 11 },
          callback: (v) => `${v}%`,
        },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
    },
  };

  const data = {
    labels: xLabels,
    datasets: [
      {
        label: 'Perfect Calibration',
        data: perfectLine,
        borderColor: 'rgba(20, 241, 217, 0.5)',
        borderDash: [6, 4],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0,
        order: 2,
      },
      {
        label: isSeeded ? 'Example Curve (complete more to see yours)' : 'Your Accuracy',
        data: userAccuracy,
        borderColor: isSeeded ? 'rgba(99, 102, 241, 0.5)' : '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        borderWidth: isSeeded ? 2 : 3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#6366f1',
        fill: true,
        tension: 0.3,
        borderDash: isSeeded ? [4, 3] : [],
        order: 1,
      },
    ],
  };

  return (
    <div style={{
      background: 'rgba(10,16,32,0.8)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 14,
      padding: '20px 16px 16px',
    }}>
      <div style={{ height: 260 }}>
        <Line options={options} data={data} />
      </div>
      {diagramData?.overall_brier != null && (
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
            Overall Brier score: {diagramData.overall_brier.toFixed(4)} · Lower is better · 0 = perfect
          </span>
        </div>
      )}
      {isSeeded && (
        <div style={{ marginTop: 8, textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
            Complete more predictions to see your real reliability curve
          </span>
        </div>
      )}
    </div>
  );
}

export default CalibrationCurve;

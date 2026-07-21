"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"

// Demo calibration curve data: perfect calibration = x === y
const calibrationData = [
  { confidence: 0, accuracy: 5 },
  { confidence: 10, accuracy: 12 },
  { confidence: 20, accuracy: 18 },
  { confidence: 30, accuracy: 28 },
  { confidence: 40, accuracy: 35 },
  { confidence: 50, accuracy: 48 },
  { confidence: 60, accuracy: 55 },
  { confidence: 70, accuracy: 62 },
  { confidence: 80, accuracy: 71 },
  { confidence: 90, accuracy: 80 },
  { confidence: 100, accuracy: 88 },
]

const perfectData = [
  { confidence: 0, accuracy: 0 },
  { confidence: 100, accuracy: 100 },
]

const statCards = [
  { label: "Total Claims", value: "47", sub: "Checked" },
  { label: "Brier Score", value: "0.18", sub: "Lower is better" },
  { label: "Accuracy", value: "74%", sub: "Correct verdicts" },
]

const recentActivity = [
  { claim: "Drinking coffee reduces Alzheimer's risk by 65%", verdict: "FALSE", delta: -8, confidence: 72 },
  { claim: "The Great Wall of China is visible from space.", verdict: "FALSE", delta: +12, confidence: 28 },
  { claim: "Humans share 60% of their DNA with bananas.", verdict: "TRUE", delta: +15, confidence: 70 },
  { claim: "Lightning never strikes the same place twice.", verdict: "FALSE", delta: +10, confidence: 35 },
]

export default function PassportPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-foreground">Your Passport</h1>
        <p className="text-sm text-muted-foreground">Track your calibration progress and media literacy skills over time.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="border border-border p-6 flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{card.label}</p>
            <p className="text-5xl font-black text-foreground tabular-nums mt-1">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Calibration Curve */}
      <div className="border border-border p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold text-foreground">Calibration Curve</p>
          <p className="text-xs text-muted-foreground">
            A perfectly calibrated forecaster follows the diagonal line — when you say 70% confident, you are right 70% of the time.
          </p>
        </div>

        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="confidence"
                type="number"
                domain={[0, 100]}
                label={{ value: "Confidence (0–100)", position: "insideBottom", offset: -4, fontSize: 11 }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                dataKey="accuracy"
                type="number"
                domain={[0, 100]}
                label={{ value: "Accuracy (0–100)", angle: -90, position: "insideLeft", offset: 12, fontSize: 11 }}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 0,
                  fontSize: 12,
                }}
                formatter={(val: number) => [`${val}%`]}
              />
              {/* Perfect calibration line */}
              <Line
                data={perfectData}
                dataKey="accuracy"
                dot={false}
                strokeDasharray="6 3"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1}
                name="Perfect"
              />
              {/* Your calibration */}
              <Line
                data={calibrationData}
                dataKey="accuracy"
                dot={{ r: 3, fill: "hsl(var(--foreground))" }}
                stroke="hsl(var(--foreground))"
                strokeWidth={2}
                name="You"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">You</span> — Your calibration &nbsp;
          <span className="font-medium text-muted-foreground">- - -</span> Perfect calibration
        </p>
      </div>

      {/* Recent Activity */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-bold text-foreground">Recent Activity</p>
        <div className="flex flex-col divide-y divide-border border border-border">
          {recentActivity.map((row, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <span
                className={`shrink-0 text-xs font-black px-2 py-0.5 ${
                  row.verdict === "TRUE"
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {row.verdict}
              </span>
              <p className="text-sm text-foreground flex-1 min-w-0 truncate">{row.claim}</p>
              <span className="shrink-0 text-xs text-muted-foreground hidden md:block">
                Conf: {row.confidence}
              </span>
              <span
                className={`shrink-0 text-sm font-black tabular-nums w-16 text-right ${
                  row.delta >= 0 ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {row.delta >= 0 ? "+" : ""}{row.delta} pts
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

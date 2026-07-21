"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

const PLAYERS = {
  p1: {
    name: "You",
    initials: "YO",
    prediction: 72,
    answer: "FALSE",
    score: -8,
    isWinner: false,
  },
  p2: {
    name: "Alex M.",
    initials: "AM",
    prediction: 31,
    answer: "FALSE",
    score: +14,
    isWinner: true,
  },
}

function PlayerCard({
  player,
  side,
}: {
  player: typeof PLAYERS.p1
  side: "left" | "right"
}) {
  return (
    <div
      className={`flex-1 flex flex-col items-center gap-5 p-6 border border-border relative ${
        player.isWinner ? "bg-foreground text-background" : "bg-background text-foreground"
      }`}
    >
      {/* Winner badge */}
      {player.isWinner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background border border-border px-3 py-0.5 text-xs font-black uppercase tracking-widest text-foreground">
          Winner
        </div>
      )}

      {/* Avatar */}
      <div
        className={`w-16 h-16 border-2 flex items-center justify-center text-xl font-black ${
          player.isWinner ? "border-background text-background" : "border-border text-foreground"
        }`}
      >
        {player.initials}
      </div>

      <p className={`font-bold text-lg ${player.isWinner ? "text-background" : "text-foreground"}`}>
        {player.name}
      </p>

      {/* Prediction */}
      <div className="flex flex-col items-center gap-0.5">
        <span className={`text-xs uppercase tracking-widest font-semibold ${player.isWinner ? "text-background/60" : "text-muted-foreground"}`}>
          Prediction
        </span>
        <span className={`text-4xl font-black tabular-nums ${player.isWinner ? "text-background" : "text-foreground"}`}>
          {player.prediction}
        </span>
        <span className={`text-xs ${player.isWinner ? "text-background/60" : "text-muted-foreground"}`}>
          confidence it is true
        </span>
      </div>

      {/* Verdict */}
      <div
        className={`px-3 py-1 text-sm font-black border ${
          player.isWinner
            ? "border-background text-background"
            : "border-border text-foreground"
        }`}
      >
        Actual: {player.answer}
      </div>

      {/* Score */}
      <div className="flex flex-col items-center gap-0.5 mt-auto">
        <span className={`text-xs uppercase tracking-widest font-semibold ${player.isWinner ? "text-background/60" : "text-muted-foreground"}`}>
          Score
        </span>
        <span
          className={`text-5xl font-black tabular-nums ${
            player.score >= 0
              ? player.isWinner ? "text-background" : "text-foreground"
              : player.isWinner ? "text-background/80" : "text-muted-foreground"
          }`}
        >
          {player.score >= 0 ? "+" : ""}{player.score}
        </span>
        <span className={`text-xs ${player.isWinner ? "text-background/60" : "text-muted-foreground"}`}>
          points this round
        </span>
      </div>
    </div>
  )
}

export default function DuelResultPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Duel Complete</p>
        <h1 className="text-4xl font-black text-foreground">Round Results</h1>
        <p className="text-sm text-muted-foreground">
          The claim was <span className="font-bold text-foreground">FALSE</span>. Here is how you both did.
        </p>
      </div>

      {/* Split screen */}
      <div className="flex flex-col md:flex-row gap-4">
        <PlayerCard player={PLAYERS.p1} side="left" />

        {/* VS divider */}
        <div className="hidden md:flex flex-col items-center justify-center gap-2">
          <div className="w-px flex-1 bg-border" />
          <span className="text-xs font-black text-muted-foreground">VS</span>
          <div className="w-px flex-1 bg-border" />
        </div>
        <div className="flex md:hidden items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs font-black text-muted-foreground">VS</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <PlayerCard player={PLAYERS.p2} side="right" />
      </div>

      {/* Calibration comparison */}
      <div className="border border-border p-5 flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Calibration Comparison</p>
        <p className="text-sm text-foreground leading-relaxed">
          <span className="font-bold">Alex M.</span> wins this round because their confidence of{" "}
          <span className="font-bold">31/100</span> was much better calibrated with the false answer
          than your confidence of <span className="font-bold">72/100</span>. Well-calibrated players
          give false claims a low confidence score, and true claims a high confidence score.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col md:flex-row gap-3">
        <Button
          size="lg"
          className="flex-1 h-12 font-bold text-base"
          onClick={() => router.push("/gutcheck/duel")}
        >
          Play Next Round
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-12 font-bold"
          onClick={() => router.push("/gutcheck")}
        >
          Back to Home
        </Button>
      </div>
    </div>
  )
}

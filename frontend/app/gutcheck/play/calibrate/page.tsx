"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { getCalibration } from "@/lib/api"

const STAGE_STEPS = ["Predict", "Investigate", "Reveal", "Calibrate"]

function StageProgress({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STAGE_STEPS.map((step, i) => (
        <div key={step} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-7 h-7 flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                i < current
                  ? "bg-primary border-primary text-primary-foreground"
                  : i === current
                  ? "border-primary text-primary bg-background"
                  : "border-border text-muted-foreground bg-background"
              }`}
            >
              {i < current ? "✓" : i + 1}
            </div>
            <span className={`text-xs font-medium hidden md:block ${i === current ? "text-foreground" : "text-muted-foreground"}`}>
              {step}
            </span>
          </div>
          {i < STAGE_STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 ${i < current ? "bg-primary" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function computeScore(confidence: number, isTrue: boolean): number {
  // Brier-based scoring: penalise miscalibration
  // If answer is TRUE: score based on confidence; if FALSE: score based on (100 - confidence)
  const calibrated = isTrue ? confidence : 100 - confidence
  // Map 0-100 to -20 to +20 points
  return Math.round((calibrated / 100) * 40 - 20)
}

export default function CalibratePage() {
  const router = useRouter()
  const [confidence, setConfidence] = useState<number>(50)
  const [verdict, setVerdict] = useState<string>("FALSE")
  const [rationale, setRationale] = useState<string>("")
  const [scoreDelta, setScoreDelta] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const isTrue = verdict === "TRUE"
  const isUnverifiable = verdict === "UNVERIFIABLE"

  useEffect(() => {
    const storedConf = sessionStorage.getItem("gutcheck_confidence")
    const storedRationale = sessionStorage.getItem("gutcheck_rationale")
    const claimId = sessionStorage.getItem("gutcheck_claim_id")
    const conf = storedConf ? Number(storedConf) : 50
    
    setConfidence(conf)
    if (storedRationale) setRationale(storedRationale)

    if (!claimId) {
      router.replace("/gutcheck")
      return
    }

    getCalibration(claimId).then(data => {
      let mappedVerdict = "UNVERIFIABLE"
      if (data.outcome === 1.0) mappedVerdict = "TRUE"
      else if (data.outcome === 0.0) mappedVerdict = "FALSE"
      
      setVerdict(mappedVerdict)
      setScoreDelta(computeScore(conf, data.outcome === 1.0))
    }).catch(err => {
      console.error(err)
      setVerdict("FALSE") // fallback
      setScoreDelta(computeScore(conf, false))
    }).finally(() => {
      setLoading(false)
    })
  }, [router])

  const handleNext = () => {
    // Clear game state for new round
    sessionStorage.removeItem("gutcheck_claim")
    sessionStorage.removeItem("gutcheck_confidence")
    sessionStorage.removeItem("gutcheck_rationale")
    sessionStorage.removeItem("gutcheck_verdict")
    sessionStorage.removeItem("gutcheck_answer")
    router.push("/gutcheck")
  }

  return (
    <div className="flex flex-col gap-6">
      <StageProgress current={3} />

      {/* Outcome Banner */}
      <div
        className={`w-full py-8 flex flex-col items-center justify-center gap-2 border-2 ${
          loading
            ? "bg-muted/50 border-border text-muted-foreground"
            : isTrue
            ? "bg-foreground text-background border-foreground"
            : "bg-background text-foreground border-foreground"
        }`}
      >
        <p className="text-xs uppercase tracking-widest font-semibold opacity-60">Verdict</p>
        <p className="text-6xl font-black tracking-tight">{loading ? "..." : verdict}</p>
        <p className="text-sm opacity-70 font-medium">
          {loading ? "Calibrating..." : isTrue ? "The claim is supported by the evidence." : isUnverifiable ? "The claim cannot be verified by available evidence." : "The claim is not supported by the evidence."}
        </p>
      </div>

      {/* Comparison + Score */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Your prediction vs actual */}
        <div className="border border-border p-5 flex flex-col gap-4">
          <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Your Prediction vs. Reality</p>
          <div className="flex items-start gap-6">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Your confidence</span>
              <span className="text-3xl font-black text-foreground">{confidence}</span>
              <span className="text-xs text-muted-foreground">out of 100 it is true</span>
            </div>
            <div className="text-2xl font-black text-muted-foreground self-center">&rarr;</div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Actual answer</span>
              <span className={`text-3xl font-black ${isTrue ? "text-foreground" : isUnverifiable ? "text-muted-foreground" : "text-destructive-foreground"}`}>
                {verdict}
              </span>
              <span className="text-xs text-muted-foreground">was the correct verdict</span>
            </div>
          </div>

          {rationale && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Your rationale</p>
              <p className="text-sm text-muted-foreground italic leading-relaxed">&ldquo;{rationale}&rdquo;</p>
            </div>
          )}
        </div>

        {/* Score Delta */}
        <div className="border border-border p-5 flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Score Delta</p>
          <p
            className={`text-7xl font-black tabular-nums ${
              scoreDelta >= 0 ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {scoreDelta >= 0 ? "+" : ""}{scoreDelta}
          </p>
          <p className="text-sm text-muted-foreground font-medium">Points</p>
          <p className="text-xs text-muted-foreground max-w-xs mt-1">
            {scoreDelta >= 10
              ? "Well calibrated — your confidence matched the evidence."
              : scoreDelta >= 0
              ? "Slightly off — there is room to improve your calibration."
              : "Miscalibrated — your confidence was not aligned with the evidence."}
          </p>
        </div>
      </div>

      {/* Calibration tip */}
      <div className="p-4 bg-muted/30 border border-border flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Calibration Insight</p>
        <p className="text-sm text-foreground leading-relaxed">
          {isTrue && confidence >= 60
            ? "Great calibration. Your high confidence aligned with a true claim."
            : isTrue && confidence < 60
            ? "The claim was true, but you were uncertain. Try to look for corroborating patterns in similar claims."
            : !isTrue && confidence <= 40
            ? "Nice skepticism. Your low confidence on a false claim reflects good calibration."
            : "The claim was false, but you gave it high confidence. Watch for emotionally resonant statistics and single-source claims."}
        </p>
      </div>

      <Button onClick={handleNext} size="lg" className="w-full h-12 text-base font-bold">
        Next Claim &rarr;
      </Button>
    </div>
  )
}

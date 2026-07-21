"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { lockPrediction } from "@/lib/api"

const STAGE_STEPS = [
  { label: "Predict", href: "/gutcheck/play/predict" },
  { label: "Investigate", href: "/gutcheck/play/investigate" },
  { label: "Reveal", href: "/gutcheck/play/reveal" },
  { label: "Calibrate", href: "/gutcheck/play/calibrate" },
]

function StageProgress({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STAGE_STEPS.map((step, i) => (
        <div key={step.label} className="flex items-center flex-1 last:flex-none">
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
              {step.label}
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

export default function PredictPage() {
  const router = useRouter()
  const [claim, setClaim] = useState("")
  const [confidence, setConfidence] = useState([50])
  const [rationale, setRationale] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem("gutcheck_claim")
    const claimId = sessionStorage.getItem("gutcheck_claim_id")
    if (stored && claimId) setClaim(stored)
    else router.replace("/gutcheck")
  }, [router])

  const handleLockIn = async () => {
    if (!rationale.trim()) return
    const claimId = sessionStorage.getItem("gutcheck_claim_id")
    if (!claimId) return router.replace("/gutcheck")

    try {
      setLoading(true)
      // API expects probability as 0.0 - 1.0
      await lockPrediction(claimId, confidence[0] / 100, rationale.trim())
      
      sessionStorage.setItem("gutcheck_confidence", String(confidence[0]))
      sessionStorage.setItem("gutcheck_rationale", rationale.trim())
      router.push("/gutcheck/play/investigate")
    } catch (err) {
      console.error(err)
      alert("Error locking prediction. Make sure you haven't already locked one.")
    } finally {
      setLoading(false)
    }
  }

  const confidenceLabel = (val: number) => {
    if (val <= 20) return "Very unlikely true"
    if (val <= 40) return "Probably false"
    if (val <= 60) return "Uncertain"
    if (val <= 80) return "Probably true"
    return "Very likely true"
  }

  return (
    <div className="flex flex-col gap-6">
      <StageProgress current={0} />

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-foreground">Stage 1: Predict</h1>
        <p className="text-sm text-muted-foreground">Before seeing any evidence, lock in your gut feeling.</p>
      </div>

      {/* Claim display */}
      <div className="border-l-4 border-primary pl-4 py-2 bg-secondary">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">Claim under investigation</p>
        <p className="text-lg font-semibold text-foreground leading-snug">{claim || "Loading claim..."}</p>
      </div>

      {/* Confidence slider */}
      <div className="flex flex-col gap-3 p-5 border border-border">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground">Confidence this claim is TRUE</label>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black text-foreground tabular-nums w-14 text-right">{confidence[0]}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
        </div>
        <Slider
          min={0}
          max={100}
          step={1}
          value={confidence}
          onValueChange={setConfidence}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0 — Definitely False</span>
          <span className="font-medium text-foreground">{confidenceLabel(confidence[0])}</span>
          <span>100 — Definitely True</span>
        </div>
      </div>

      {/* Rationale */}
      <div className="flex flex-col gap-2">
        <label htmlFor="rationale" className="text-sm font-semibold text-foreground">
          Why do you think this?
        </label>
        <Textarea
          id="rationale"
          placeholder="Briefly explain your reasoning before seeing evidence..."
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={4}
          className="resize-none"
        />
      </div>

      <Button
        onClick={handleLockIn}
        disabled={!rationale.trim() || loading}
        size="lg"
        className="w-full h-12 text-base font-bold"
      >
        {loading ? "Locking in..." : "Lock In Prediction"}
      </Button>
    </div>
  )
}

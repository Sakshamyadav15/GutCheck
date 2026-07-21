"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { getInvestigateHint } from "@/lib/api"

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

export default function InvestigatePage() {
  const router = useRouter()
  const [claim, setClaim] = useState("")
  const [hint, setHint] = useState("Loading hint...")

  useEffect(() => {
    const stored = sessionStorage.getItem("gutcheck_claim")
    const claimId = sessionStorage.getItem("gutcheck_claim_id")
    if (!stored || !claimId) { router.replace("/gutcheck"); return }
    setClaim(stored)
    
    getInvestigateHint(claimId, 0).then(data => {
      setHint(data.hint)
    }).catch(err => {
      console.error(err)
      setHint("Consider the source: Who benefits if this claim is believed?")
    })
  }, [router])

  return (
    <div className="flex flex-col gap-6">
      <StageProgress current={1} />

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-foreground">Stage 2: Investigate</h1>
        <p className="text-sm text-muted-foreground">Use the hint below to guide your thinking before we reveal the evidence.</p>
      </div>

      {/* Claim */}
      <div className="border-l-4 border-primary pl-4 py-2 bg-secondary">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">Claim under investigation</p>
        <p className="text-lg font-semibold text-foreground leading-snug">{claim}</p>
      </div>

      {/* Coaching Hint */}
      <div className="flex gap-4 p-5 border border-border bg-muted/30">
        {/* Icon placeholder */}
        <div className="shrink-0 w-10 h-10 border border-border flex items-center justify-center text-lg text-muted-foreground font-mono select-none">
          ?
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Coaching Hint</p>
          <p className="text-base text-foreground leading-relaxed">{hint}</p>
        </div>
      </div>

      {/* Thinking space */}
      <div className="p-5 border border-dashed border-border flex flex-col gap-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Your thinking space</p>
        <p className="text-sm text-muted-foreground">
          Take a moment to reflect on the hint. Think about what you already know,
          what you would search for, and whether the hint changes your confidence.
          When ready, reveal the evidence.
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => router.push("/gutcheck/play/reveal")}
          size="lg"
          className="h-12 px-8 font-bold"
        >
          Reveal Evidence &rarr;
        </Button>
      </div>
    </div>
  )
}

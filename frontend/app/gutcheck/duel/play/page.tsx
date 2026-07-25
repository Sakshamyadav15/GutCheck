"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function DuelPlayPage() {
  const router = useRouter()
  const [confidence, setConfidence] = useState(50)
  const [rationale, setRationale] = useState("")
  const [locked, setLocked] = useState(false)
  const [sagarLocked, setSagarLocked] = useState(false)
  const [showReveal, setShowReveal] = useState(false)

  const claim = "Drinking coffee reduces Alzheimer's risk."

  const handleLock = () => {
    setLocked(true)
    // Simulate waiting for other player
    setTimeout(() => {
      setSagarLocked(true)
      // Simulate fetching facts
      setTimeout(() => {
        setShowReveal(true)
      }, 2000)
    }, 1500)
  }

  return (
    <div className="flex flex-col gap-10 max-w-2xl mx-auto">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground border border-border px-3 py-1 w-fit">
          Duel Mode — Active
        </div>
        <h1 className="text-3xl font-black text-foreground mt-2">Predict</h1>
        <p className="text-sm text-muted-foreground">
          Both players must lock their prediction before the reveal.
        </p>
      </div>

      <div className="border border-border p-6 flex flex-col gap-6">
        <p className="text-xl font-bold text-foreground">{claim}</p>
        
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-xs font-semibold text-muted-foreground">
            <span>0% (False)</span>
            <span>100% (True)</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={confidence}
            onChange={(e) => setConfidence(parseInt(e.target.value))}
            disabled={locked}
            className="w-full accent-foreground"
          />
          <div className="text-center font-black text-3xl tabular-nums">
            {confidence}%
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold">Why do you think so?</p>
          <textarea
            className="w-full bg-background border border-border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            rows={3}
            placeholder="Write your reasoning here..."
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            disabled={locked}
          />
        </div>

        {!locked ? (
          <Button size="lg" onClick={handleLock} className="h-12 font-bold">
            Lock Prediction
          </Button>
        ) : (
          <div className="flex flex-col gap-4 items-center justify-center py-4">
            {!showReveal ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold animate-pulse">
                  {!sagarLocked ? "Waiting for Sagar to lock..." : "Sagar locked! Fetching Fact Check data..."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 w-full animate-in fade-in zoom-in duration-500">
                <div className="bg-muted p-4 border border-border">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Reveal Reasoning</p>
                  <p className="text-sm text-foreground leading-relaxed">
                    According to the Google Fact Check API, there is no conclusive consensus that coffee reduces Alzheimer's risk. While some observational studies show correlation, clinical trials have not established a direct causal link.
                  </p>
                </div>
                <Button size="lg" onClick={() => router.push(`/gutcheck/duel/result?confidence=${confidence}`)} className="h-12 font-bold w-full">
                  See Duel Results
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

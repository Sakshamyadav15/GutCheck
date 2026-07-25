"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { getReveal } from "@/lib/api"

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

export default function RevealPage() {
  const router = useRouter()
  const [claim, setClaim] = useState("")
  const [confidence, setConfidence] = useState<number | null>(null)
  const [sources, setSources] = useState<any[]>([])
  const [aiGuess, setAiGuess] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedClaim = sessionStorage.getItem("gutcheck_claim")
    const storedConf = sessionStorage.getItem("gutcheck_confidence")
    const claimId = sessionStorage.getItem("gutcheck_claim_id")
    
    if (!storedClaim || !claimId) { router.replace("/gutcheck"); return }
    
    setClaim(storedClaim)
    if (storedConf) setConfidence(Number(storedConf))
    
    getReveal(claimId).then(data => {
      setSources(data.sources)
      let mappedVerdict = "UNVERIFIABLE"
      if (data.outcome === 1.0) mappedVerdict = "TRUE"
      else if (data.outcome === 0.0) mappedVerdict = "FALSE"
      setAiGuess({
        verdict: mappedVerdict,
        rationale: data.rationale_text
      })
    }).catch(err => {
      console.error(err)
    }).finally(() => {
      setLoading(false)
    })
  }, [router])

  const handleCalibrate = () => {
    router.push("/gutcheck/play/calibrate")
  }

  return (
    <div className="flex flex-col gap-6">
      <StageProgress current={2} />

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-foreground">Stage 3: Reveal</h1>
        <p className="text-sm text-muted-foreground">Here is what the sources say — and how the AI read the evidence.</p>
      </div>

      {/* Claim */}
      <div className="border-l-4 border-primary pl-4 py-2 bg-secondary">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">Claim under investigation</p>
        <p className="text-base font-semibold text-foreground leading-snug">{claim}</p>
        {confidence !== null && (
          <p className="text-xs text-muted-foreground mt-1">
            Your prediction: <span className="font-bold text-foreground">{confidence} / 100</span> confidence it is true
          </p>
        )}
      </div>

      {/* 2-column grid: Sources + AI Guess */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Column 1: Source cards */}
        <div className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Evidence from sources</p>
          {loading && <p className="text-sm text-muted-foreground animate-pulse">Analyzing sources...</p>}
          {!loading && sources.map((source, idx) => (
            <div key={idx} className="border border-border p-4 flex flex-col gap-2">
              <p className="font-bold text-sm text-foreground">{source.name || source.domain || "Source"}</p>
              <blockquote className="border-l-2 border-muted-foreground pl-3 text-sm text-muted-foreground italic leading-relaxed">
                &ldquo;{source.excerpt || source.snippet}&rdquo;
              </blockquote>
              {source.url && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-2 w-fit"
                >
                  Read More &rarr;
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Column 2: AI Guess */}
        <div className="border border-border p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">AI&apos;s Guess</p>
            {aiGuess && (
              <span
                className={`text-xs font-black px-2 py-0.5 ${
                  aiGuess.verdict === "TRUE"
                    ? "bg-green-500/20 text-green-500 border border-green-500/30"
                    : aiGuess.verdict === "FALSE"
                    ? "bg-destructive/20 text-destructive-foreground border border-destructive/30"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {aiGuess.verdict}
              </span>
            )}
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Waiting for AI analysis...</p>
          ) : (
            <p className="text-sm text-foreground leading-relaxed">{aiGuess?.rationale}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleCalibrate} size="lg" className="h-12 px-8 font-bold">
          See My Score &rarr;
        </Button>
      </div>
    </div>
  )
}

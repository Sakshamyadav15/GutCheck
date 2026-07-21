"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { extractClaims } from "@/lib/api"
import { Textarea } from "@/components/ui/textarea"

export default function GutCheckHome() {
  const [claim, setClaim] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleStart = async () => {
    if (!claim.trim()) return
    try {
      setLoading(true)
      const res = await extractClaims(claim.trim())
      if (res.claims && res.claims.length > 0) {
        // Use the most specific claim extracted
        const extracted = res.claims[0]
        sessionStorage.setItem("gutcheck_claim_id", extracted.claim_id)
        sessionStorage.setItem("gutcheck_claim", extracted.text)
        router.push("/gutcheck/play/predict")
      } else {
        alert("Could not extract a checkable claim from that text.")
      }
    } catch (err) {
      console.error(err)
      alert("Error analyzing claim.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-12">
      {/* Hero */}
      <section className="flex flex-col gap-4 pt-8">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground border border-border px-3 py-1 w-fit">
          Media Literacy Training
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground text-balance leading-tight">
          Trust your gut.<br />
          Then check it.
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
          Paste any claim — a headline, a statistic, a viral post — and put your
          intuition to the test. GutCheck trains you to think like a fact-checker
          by revealing the gap between confidence and truth.
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-6 pt-2">
          {[
            { value: "12K+", label: "Claims checked" },
            { value: "94%", label: "Accuracy improvement" },
            { value: "3 min", label: "Avg. session" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col">
              <span className="text-2xl font-black text-foreground">{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Input Area */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="claim-input" className="text-sm font-semibold text-foreground">
            Paste a claim to investigate
          </label>
          <p className="text-xs text-muted-foreground">
            Headlines, statistics, social media posts, or any factual assertion works.
          </p>
        </div>

        <Textarea
          id="claim-input"
          placeholder={`e.g. "Drinking coffee daily reduces the risk of Alzheimer's disease by 65%."`}
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          rows={5}
          className="text-base resize-none focus:ring-2 focus:ring-primary/50 transition-all"
        />

        <Button
          onClick={handleStart}
          disabled={!claim.trim() || loading}
          className="w-full h-12 text-base font-bold tracking-wide"
          size="lg"
        >
          {loading ? "Extracting Claim..." : "Start GutCheck"}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          No account required &mdash; your results are saved locally.
        </p>
      </section>

      {/* How it works */}
      <section className="border-t border-border pt-8 flex flex-col gap-6">
        <h2 className="text-xl font-bold text-foreground">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: "01", title: "Predict", desc: "Rate your confidence (0–100) and note your reasoning before seeing evidence." },
            { step: "02", title: "Investigate", desc: "Get a coaching hint to guide your research process." },
            { step: "03", title: "Reveal", desc: "Compare real sources and the AI's analysis against your prediction." },
            { step: "04", title: "Calibrate", desc: "See your score delta and track how well-calibrated your gut truly is." },
          ].map((item) => (
            <div key={item.step} className="flex flex-col gap-2 p-4 border border-border">
              <span className="text-xs font-mono font-bold text-muted-foreground">{item.step}</span>
              <span className="font-bold text-foreground">{item.title}</span>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

const DEMO_INVITE_CODE = "GC-7X4K9"

const CONNECTED_PLAYERS = [
  { id: 1, name: "You", initials: "YO", ready: true },
  { id: 2, name: "Sagar", initials: "SA", ready: true },
]

export default function DuelLobbyPage() {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(DEMO_INVITE_CODE).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground border border-border px-3 py-1 w-fit">
          Duel Mode
        </div>
        <h1 className="text-3xl font-black text-foreground mt-2">Lobby</h1>
        <p className="text-sm text-muted-foreground">
          Share the invite code below with a friend to start a head-to-head calibration duel.
        </p>
      </div>

      {/* Invite Code */}
      <div className="border border-border p-6 flex flex-col gap-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your Invite Code</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-5xl font-black text-foreground tracking-widest select-all">
            {DEMO_INVITE_CODE}
          </span>
          <Button
            variant="outline"
            onClick={handleCopy}
            className="h-10 px-4 font-semibold shrink-0"
          >
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          This code expires in 15 minutes. Anyone with the code can join your lobby.
        </p>
      </div>

      {/* Connected Players */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-bold text-foreground">
          Connected Players ({CONNECTED_PLAYERS.length}/2)
        </p>
        <div className="flex flex-col gap-2">
          {CONNECTED_PLAYERS.map((player) => (
            <div key={player.id} className="flex items-center gap-3 border border-border p-3">
              {/* Avatar */}
              <div className="w-9 h-9 border border-border flex items-center justify-center font-bold text-sm text-foreground shrink-0">
                {player.initials}
              </div>
              <p className="font-medium text-foreground flex-1">{player.name}</p>
              <span
                className={`text-xs font-semibold px-2 py-0.5 ${
                  player.ready
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {player.ready ? "Ready" : "Waiting..."}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col md:flex-row gap-3">
        <Button
          size="lg"
          className="flex-1 h-12 font-bold text-base"
          onClick={() => router.push("/gutcheck/duel/play")}
        >
          Start Duel
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-12 font-bold"
          onClick={() => router.push("/gutcheck")}
        >
          Cancel
        </Button>
      </div>

      {/* Join existing lobby */}
      <div className="border-t border-border pt-6 flex flex-col gap-3">
        <p className="text-sm font-bold text-foreground">Join a lobby instead</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter invite code (e.g. GC-7X4K9)"
            className="flex-1 border border-border bg-background text-foreground px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
          <Button variant="outline" className="font-semibold h-10 px-4">
            Join
          </Button>
        </div>
      </div>
    </div>
  )
}

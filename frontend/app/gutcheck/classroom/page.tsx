import Link from "next/link"
import { Button } from "@/components/ui/button"

const SESSIONS = [
  { code: "CLS-001", topic: "Vaccine misinformation", students: 24, status: "Active" },
  { code: "CLS-002", topic: "Economic statistics", students: 18, status: "Active" },
  { code: "CLS-003", topic: "Climate data claims", students: 31, status: "Ended" },
]

export default function ClassroomPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black text-foreground">Classroom</h1>
          <p className="text-sm text-muted-foreground">
            Host guided GutCheck sessions for students or groups. Share a session code and monitor results in real-time.
          </p>
        </div>
        <Button className="font-bold shrink-0">New Session</Button>
      </div>

      {/* Active sessions */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-bold text-foreground">Your Sessions</p>
        <div className="flex flex-col divide-y divide-border border border-border">
          {SESSIONS.map((session) => (
            <div key={session.code} className="flex items-center gap-4 px-4 py-4">
              <span className="font-mono font-bold text-sm text-foreground w-20 shrink-0">{session.code}</span>
              <p className="flex-1 text-sm text-foreground">{session.topic}</p>
              <span className="text-xs text-muted-foreground hidden md:block">{session.students} students</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 shrink-0 ${
                  session.status === "Active" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                }`}
              >
                {session.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Explainer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {[
          { title: "Create a Session", desc: "Choose a topic pack or paste custom claims for your group to evaluate." },
          { title: "Share the Code", desc: "Students join with a session code on any device — no account required." },
          { title: "Review Results", desc: "See aggregate calibration curves and identify the claims that stumped your class." },
        ].map((item) => (
          <div key={item.title} className="border border-border p-4 flex flex-col gap-2">
            <p className="font-bold text-sm text-foreground">{item.title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

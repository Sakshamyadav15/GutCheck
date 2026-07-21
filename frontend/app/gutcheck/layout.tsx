"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navLinks = [
  { label: "Single Player", href: "/gutcheck" },
  { label: "Duel Mode", href: "/gutcheck/duel" },
  { label: "Classroom", href: "/gutcheck/classroom" },
  { label: "Profile", href: "/gutcheck/passport" },
]

export default function GutCheckLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky Top Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/gutcheck" className="flex items-center gap-2 font-bold text-lg tracking-tight text-foreground">
            <span className="inline-flex items-center justify-center w-7 h-7 bg-primary text-primary-foreground text-xs font-black">
              GC
            </span>
            GutCheck
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile nav */}
          <nav className="flex md:hidden items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-2 py-1 text-xs font-medium transition-colors",
                  pathname === link.href
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label.split(" ")[0]}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        GutCheck &mdash; Media Literacy Training
      </footer>
    </div>
  )
}

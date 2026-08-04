"use client"

import { LayoutDashboard, Table2, LineChart, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type TabId = "dashboard" | "detallado" | "simplificado"

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "detallado", label: "Cuadro Detallado", icon: Table2 },
  { id: "simplificado", label: "Cuadro Simplificado", icon: LineChart },
]

export function NavTabs({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  return (
    <nav className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 md:px-6">
        <ul className="flex flex-1 items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = tab.id === active
            const Icon = tab.icon
            return (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => onChange(tab.id)}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap border-b-[3px] px-3 py-3.5 text-sm font-medium transition-colors",
                    isActive
                      ? "border-accent text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-accent" : "")} />
                  {tab.label}
                </button>
              </li>
            )
          })}
        </ul>
        <div className="hidden items-center gap-4 pl-4 text-xs text-muted-foreground lg:flex">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Versión 1.0.0
          </span>
          <span>Región: Local</span>
        </div>
      </div>
    </nav>
  )
}

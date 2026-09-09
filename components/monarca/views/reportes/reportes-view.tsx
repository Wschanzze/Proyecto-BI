// components/monarca/views/reportes/reportes-view.tsx
"use client"

import { useState } from "react"
import {
  FileText,
  TrendingUp,
  AlertTriangle,
  Store,
  Clock,
  PieChart,
  ShoppingBag,
  DollarSign,
  Layers,
  Flame,
  Wallet,
  Receipt,
  CalendarClock,
  Trophy,
  type LucideIcon,
} from "lucide-react"
import { REPORT_TEMPLATES, type ReportTemplateDef } from "@/lib/reportes-data"
import { ParticipacionSucursalesPanel } from "./participacion-sucursales-panel"
import { QuiebresCarniceriaPanel } from "./quiebres-carniceria-panel"
import { ControlSurtidoPanel } from "./control-surtido-panel"
import { ReporteEstandarPanel } from "./reporte-estandar-panel"
import { ProveedoresPanel } from "./proveedores-panel"

const ICON_MAP: Record<string, LucideIcon> = {
  PieChart,
  Flame,
  Layers,
  Store,
  AlertTriangle,
  TrendingUp,
  ShoppingBag,
  Clock,
  DollarSign,
  FileText,
  Wallet,
  Receipt,
  CalendarClock,
  Trophy,
}

export function ReportesView() {
  const [selectedReport, setSelectedReport] = useState<ReportTemplateDef>(REPORT_TEMPLATES[0])

  return (
    <div className="space-y-6">
      {/* Selector Rápido de Plantillas de Reporte */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="mr-2 whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Plantillas:
          </span>
          {REPORT_TEMPLATES.map((tpl) => {
            const isSelected = selectedReport.id === tpl.id
            const IconComp = ICON_MAP[tpl.iconName] || FileText
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setSelectedReport(tpl)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <IconComp className={`h-3.5 w-3.5 ${isSelected ? "text-accent-foreground" : "text-accent"}`} />
                <span>{tpl.title}</span>
                {tpl.badge && (
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-black uppercase tracking-tight ${
                      isSelected
                        ? "bg-white/25 text-white"
                        : tpl.badge === "Crítico"
                        ? "bg-red-500/15 text-red-600 dark:text-red-400"
                        : "bg-accent/15 text-accent"
                    }`}
                  >
                    {tpl.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Renderizado del Panel Seleccionado */}
      {selectedReport.id === "participacion-sucursales" ? (
        <ParticipacionSucursalesPanel />
      ) : selectedReport.id === "quiebres-carniceria" ? (
        <QuiebresCarniceriaPanel />
      ) : selectedReport.id === "control-surtido" ? (
        <ControlSurtidoPanel />
      ) : selectedReport.category === "Contabilidad" ? (
        <ProveedoresPanel template={selectedReport} />
      ) : (
        <ReporteEstandarPanel template={selectedReport} />
      )}
    </div>
  )
}

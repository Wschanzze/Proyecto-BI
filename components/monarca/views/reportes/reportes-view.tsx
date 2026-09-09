// components/monarca/views/reportes/reportes-view.tsx
"use client"

import { useState, useRef, useEffect, useMemo } from "react"
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
  ChevronLeft,
  ChevronRight,
  Sparkles,
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

type CategoryFilter = "TODOS" | "Contabilidad" | "Ventas" | "Stock" | "Operativo"

const CATEGORIES: { id: CategoryFilter; label: string; icon?: LucideIcon; highlight?: boolean }[] = [
  { id: "TODOS", label: "Todas" },
  { id: "Contabilidad", label: "Contabilidad & Proveedores", highlight: true },
  { id: "Ventas", label: "Ventas" },
  { id: "Stock", label: "Stock & Surtido" },
  { id: "Operativo", label: "Operativo" },
]

export function ReportesView() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("TODOS")
  const [selectedReport, setSelectedReport] = useState<ReportTemplateDef>(REPORT_TEMPLATES[0])
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  // Filtrar plantillas según la categoría elegida
  const visibleTemplates = useMemo(() => {
    if (selectedCategory === "TODOS") return REPORT_TEMPLATES
    return REPORT_TEMPLATES.filter((t) => t.category === selectedCategory)
  }, [selectedCategory])

  // Contar cuántas plantillas hay por categoría
  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = { TODOS: REPORT_TEMPLATES.length }
    REPORT_TEMPLATES.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1
    })
    return counts
  }, [])

  // Verificar si se puede scrollear a izquierda/derecha
  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const atLeft = el.scrollLeft <= 5
    const atRight = el.scrollLeft + el.clientWidth >= el.scrollWidth - 5
    setCanScrollLeft(!atLeft)
    setCanScrollRight(!atRight)
  }

  useEffect(() => {
    checkScroll()
    window.addEventListener("resize", checkScroll)
    return () => window.removeEventListener("resize", checkScroll)
  }, [visibleTemplates])

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return
    const offset = direction === "left" ? -280 : 280
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" })
    setTimeout(checkScroll, 320)
  }

  // Permitir scroll horizontal usando la rueda del mouse vertical
  const handleWheel = (e: React.WheelEvent) => {
    if (!scrollRef.current) return
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      scrollRef.current.scrollLeft += e.deltaY
      checkScroll()
    }
  }

  // Al cambiar de categoría, si el reporte actual no pertenece a ella, seleccionar el primero disponible
  const handleSelectCategory = (cat: CategoryFilter) => {
    setSelectedCategory(cat)
    if (cat !== "TODOS") {
      const firstOfCat = REPORT_TEMPLATES.find((t) => t.category === cat)
      if (firstOfCat && selectedReport.category !== cat) {
        setSelectedReport(firstOfCat)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Contenedor Superior de Navegación de Reportes */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        {/* Fila 1: Selector de Categorías (Pills) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Categoría:
            </span>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id
              const count = countByCategory[cat.id] || 0
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                    isSelected
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : cat.highlight
                      ? "border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 font-bold"
                      : "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {cat.highlight && <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />}
                  <span>{cat.label}</span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Controles de desplazamiento horizontal (flechas) */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              aria-label="Desplazar a la izquierda"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              aria-label="Desplazar a la derecha"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Fila 2: Carrusel horizontal con scroll visible y botones de reportes */}
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            onWheel={handleWheel}
            className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scroll-smooth"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "var(--border) transparent",
            }}
          >
            {visibleTemplates.map((tpl) => {
              const isSelected = selectedReport.id === tpl.id
              const IconComp = ICON_MAP[tpl.iconName] || FileText
              const isContabilidad = tpl.category === "Contabilidad"

              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedReport(tpl)}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    isSelected
                      ? "bg-accent text-accent-foreground shadow-md ring-2 ring-accent/30"
                      : isContabilidad
                      ? "border border-accent/40 bg-card hover:bg-accent/10 text-foreground"
                      : "border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <IconComp
                    className={`h-3.5 w-3.5 ${
                      isSelected
                        ? "text-accent-foreground"
                        : isContabilidad
                        ? "text-accent"
                        : "text-muted-foreground"
                    }`}
                  />
                  <span className="whitespace-nowrap">{tpl.title}</span>
                  {tpl.badge && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-tight ${
                        isSelected
                          ? "bg-white/25 text-white"
                          : tpl.badge === "Crítico"
                          ? "bg-red-500/15 text-red-600 dark:text-red-400"
                          : tpl.badge === "Nuevo"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
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

          {/* Indicador sutil de degradado si hay más contenido a la derecha */}
          {canScrollRight && (
            <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-card to-transparent" />
          )}
          {canScrollLeft && (
            <div className="pointer-events-none absolute left-0 top-0 bottom-2 w-10 bg-gradient-to-r from-card to-transparent" />
          )}
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

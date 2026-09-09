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
      {/* BANNER EJECUTIVO REPORTES - AZUL CORPORATIVO MONARCA CON DETALLES NARANJA */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-accent/40 bg-gradient-to-r from-primary via-primary/95 to-primary p-5 sm:p-6 text-primary-foreground shadow-2xl shadow-primary/30 before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-accent space-y-4">
        {/* Marca de Agua con Logo de Monarca */}
        <img
          src="/supermercados_monarca_logo-removebg-preview__2_-1777696368463.ico"
          alt="Monarca Watermark"
          className="absolute -right-6 top-1/2 -translate-y-1/2 h-56 w-56 sm:h-72 sm:w-72 object-contain opacity-15 pointer-events-none select-none filter brightness-200 contrast-125"
        />

        {/* Encabezado del Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-primary-foreground/20 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-md font-bold">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-primary-foreground flex items-center gap-2">
                Centro de Reportes & Analytics
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-accent/25 text-white border border-accent/40 shadow-xs lowercase">
                  {REPORT_TEMPLATES.length} plantillas
                </span>
              </h2>
              <p className="text-xs text-primary-foreground/80 mt-0.5">
                Auditoría comercial de sucursales, quiebres operativos y administración contable
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-primary-foreground/90 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-xs">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="font-semibold">Supermercados Monarca</span>
          </div>
        </div>

        {/* Fila de Categorías y Flechas de Navegación */}
        <div className="flex flex-wrap items-center justify-between gap-2 relative z-10">
          <div className="flex flex-wrap items-center gap-1.5 bg-black/20 p-1.5 rounded-xl border border-white/10 backdrop-blur-xs">
            <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-primary-foreground/75">
              Categorías:
            </span>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id
              const count = countByCategory[cat.id] || 0
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    isSelected
                      ? "bg-accent text-accent-foreground shadow-md font-bold ring-1 ring-white/40"
                      : cat.highlight
                      ? "bg-accent/20 text-white hover:bg-accent/30 font-bold border border-accent/40"
                      : "text-primary-foreground/85 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {cat.highlight && <Sparkles className="h-3 w-3 text-amber-300 animate-pulse" />}
                  <span>{cat.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isSelected
                        ? "bg-black/25 text-white"
                        : "bg-white/15 text-primary-foreground/90"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Flechas de desplazamiento lateral */}
          <div className="hidden sm:flex items-center gap-1.5 bg-black/20 p-1 rounded-xl border border-white/10 backdrop-blur-xs">
            <button
              type="button"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              aria-label="Desplazar a la izquierda"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-primary-foreground/80 hover:text-white hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[10px] font-semibold text-primary-foreground/60 px-1 select-none">
              Desplazar
            </span>
            <button
              type="button"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              aria-label="Desplazar a la derecha"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-primary-foreground/80 hover:text-white hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Carrusel de Reportes / Tabs dentro del Banner */}
        <div className="relative z-10 pt-1">
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            onWheel={handleWheel}
            className="flex items-center gap-2 overflow-x-auto pb-2 scroll-smooth"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(255, 255, 255, 0.3) transparent",
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
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    isSelected
                      ? "bg-accent text-accent-foreground shadow-lg font-bold ring-2 ring-white/50 scale-[1.02]"
                      : isContabilidad
                      ? "border border-accent/50 bg-black/30 hover:bg-accent/25 text-white backdrop-blur-xs"
                      : "border border-white/15 bg-black/20 hover:bg-white/15 text-primary-foreground/90 hover:text-white backdrop-blur-xs"
                  }`}
                >
                  <IconComp
                    className={`h-3.5 w-3.5 ${
                      isSelected
                        ? "text-accent-foreground"
                        : isContabilidad
                        ? "text-accent"
                        : "text-primary-foreground/80"
                    }`}
                  />
                  <span className="whitespace-nowrap">{tpl.title}</span>
                  {tpl.badge && (
                    <span
                      className={`rounded px-1.5 py-0.2 text-[10px] font-black uppercase tracking-tight ${
                        isSelected
                          ? "bg-black/25 text-white"
                          : tpl.badge === "Crítico"
                          ? "bg-red-500/90 text-white font-bold"
                          : tpl.badge === "Nuevo"
                          ? "bg-emerald-500/90 text-white font-bold"
                          : "bg-accent text-accent-foreground font-bold"
                      }`}
                    >
                      {tpl.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Fades a los costados para indicar scroll */}
          {canScrollRight && (
            <div className="pointer-events-none absolute right-0 top-1 bottom-2 w-12 bg-gradient-to-l from-primary to-transparent rounded-r-xl" />
          )}
          {canScrollLeft && (
            <div className="pointer-events-none absolute left-0 top-1 bottom-2 w-12 bg-gradient-to-r from-primary to-transparent rounded-l-xl" />
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

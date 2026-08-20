"use client"

import type { ReactNode } from "react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PERIODOS_SELECCIONABLES } from "@/lib/data"
import { periodoLabel, formatSigned } from "@/lib/format"
import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-9 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary text-balance">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function PeriodoSelector({
  value,
  onChange,
  opciones = [],
}: {
  value: string
  onChange: (v: string) => void
  opciones?: import("@/lib/data").Periodo[]
}) {
  const finalOpciones = opciones.length > 0 ? opciones : PERIODOS_SELECCIONABLES
  const reverseOps = [...finalOpciones].reverse()
  return (
    <Select value={value} onValueChange={(val) => { if (val) onChange(val) }}>
      <SelectTrigger className="w-[180px] bg-card">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {reverseOps.map((p) => (
          <SelectItem key={p.key} value={p.key}>
            {periodoLabel(p.anio, p.mes)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function FiltrosSelector({
  periodoKey,
  onPeriodoChange,
  sucursalId,
  onSucursalChange,
  periodos = [],
  sucursales = [],
}: {
  periodoKey: string
  onPeriodoChange: (v: string) => void
  sucursalId: string
  onSucursalChange: (v: string) => void
  periodos: import("@/lib/data").Periodo[]
  sucursales: import("@/lib/supabase").DBSucursal[]
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Selector de Sucursal */}
      <Select value={sucursalId} onValueChange={(val) => { if (val) onSucursalChange(val) }}>
        <SelectTrigger className="w-[180px] bg-card">
          <SelectValue placeholder="Sucursal" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__consolidado__">Total Consolidado</SelectItem>
          {sucursales.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Selector de Período */}
      <Select value={periodoKey} onValueChange={(val) => { if (val) onPeriodoChange(val) }}>
        <SelectTrigger className="w-[160px] bg-card">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          {[...periodos].reverse().map((p) => (
            <SelectItem key={p.key} value={p.key}>
              {periodoLabel(p.anio, p.mes)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// Chip de variación con color condicional (verde positivo / rojo negativo).
export function VariacionBadge({
  value,
  className,
}: {
  value: number | null | undefined
  className?: string
}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className={cn("text-xs text-muted-foreground", className)}>—</span>
  }
  const positivo = value >= 0
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums",
        positivo ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
        className,
      )}
    >
      {positivo ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {formatSigned(value)}
    </span>
  )
}

// Spin de carga personalizado con el logotipo estacionario centrado y aro azul giratorio.
export function TransitionLoader({ fullPage = false }: { fullPage?: boolean }) {
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center animate-in fade-in duration-300",
        fullPage ? "min-h-[70vh]" : "py-24"
      )}
    >
      <div className="relative flex h-24 w-24 items-center justify-center">
        {/* Aro azul giratorio (primario) */}
        <div className="absolute inset-0 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
        
        {/* Logotipo centrado no-rotatorio */}
        <img
          src="/supermercados_monarca_logo-removebg-preview__2_-1777696368463.ico"
          alt="Supermercados Monarca"
          className="h-13 w-13 object-contain select-none"
        />
      </div>
      <p className="mt-5 text-[10px] font-bold tracking-widest uppercase text-primary/75 animate-pulse">
        Cargando datos reales
      </p>
    </div>
  )
}

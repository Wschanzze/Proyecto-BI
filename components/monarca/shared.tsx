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
}: {
  value: string
  onChange: (v: string) => void
}) {
  const opciones = [...PERIODOS_SELECCIONABLES].reverse()
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px] bg-card">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {opciones.map((p) => (
          <SelectItem key={p.key} value={p.key}>
            {periodoLabel(p.anio, p.mes)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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

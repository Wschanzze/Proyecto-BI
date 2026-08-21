// components/monarca/views/cuadro-detallado.tsx
"use client"

import { useEffect, useState, useMemo } from "react"
import { ChevronRight, Download, Printer, RefreshCw, AlertCircle, ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader, FiltrosSelector, TransitionLoader } from "@/components/monarca/shared"
import { getCuadroAsync, type MetricsConDerivados, type CategoriaNode, type GrupoNode, type Cuadro, type Periodo } from "@/lib/data"
import { formatCurrency, formatNumber, formatPercent, formatSigned, periodoLabel } from "@/lib/format"
import type { DBSucursal } from "@/lib/supabase"
import { cn } from "@/lib/utils"

const COLS = [
  "Facturación s/IVA",
  "Part. Fact.",
  "Var. m.a.",
  "Cantidad",
  "Var. a.a.",
  "CMg %",
  "Resultado CMg $",
]

function varClass(v: number | null | undefined) {
  if (v === null || v === undefined || Number.isNaN(v)) return "text-muted-foreground"
  return v >= 0 ? "text-success" : "text-destructive"
}

function MetricCells({ m }: { m: MetricsConDerivados }) {
  const vacia = m.facturacion === 0
  if (vacia) {
    return (
      <>
        {COLS.map((_, i) => (
          <td key={i} className="px-3 py-2 text-right text-xs text-muted-foreground tabular-nums">
            —
          </td>
        ))}
      </>
    )
  }
  return (
    <>
      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(m.facturacion - m.iva)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatPercent(m.participacionFacturacion)}</td>
      <td className={cn("px-3 py-2 text-right tabular-nums font-medium", varClass(m.variacionMesAnterior))}>
        {m.variacionMesAnterior === null ? "—" : formatSigned(m.variacionMesAnterior)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatNumber(m.articulos)}</td>
      <td className={cn("px-3 py-2 text-right tabular-nums font-medium", varClass(m.variacionAnioAnterior))}>
        {m.variacionAnioAnterior === null ? "—" : formatSigned(m.variacionAnioAnterior)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{formatPercent(m.cmg)}</td>
      <td className={cn("px-3 py-2 text-right font-semibold tabular-nums", varClass(m.resultadoFinal))}>
        {formatCurrency(m.resultadoFinal)}
      </td>
    </>
  )
}

export function CuadroDetallado({
  periodoKey,
  onPeriodoChange,
  sucursalId,
  onSucursalChange,
  periodos,
  sucursales,
}: {
  periodoKey: string
  onPeriodoChange: (v: string) => void
  sucursalId: string
  onSucursalChange: (v: string) => void
  periodos: Periodo[]
  sucursales: DBSucursal[]
}) {
  const [cuadro, setCuadro] = useState<Cuadro | null>(null)
  const [loading, setLoading] = useState(true)
  const [expCats, setExpCats] = useState<Set<string>>(new Set())
  const [expGrupos, setExpGrupos] = useState<Set<string>>(new Set())

  const loadData = async () => {
    setLoading(true)
    try {
      const c = await getCuadroAsync(periodoKey, sucursalId)
      setCuadro(c)
    } catch (err) {
      console.error("Error al cargar datos detallados:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [periodoKey, sucursalId])

  const toggleCat = (id: string) =>
    setExpCats((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  const toggleGrupo = (id: string) =>
    setExpGrupos((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const exportarCSV = () => {
    if (!cuadro) return
    const header = ["Nivel", "Nombre", ...COLS]
    const rows: string[][] = [header]
    for (const sec of cuadro.secciones) {
      for (const cat of sec.categorias) {
        rows.push(metricRow("Sector", cat.nombre, cat.metrics))
        for (const g of cat.grupos) {
          rows.push(metricRow("Grupo", `  ${g.nombre}`, g.metrics))
        }
      }
      rows.push(["Total Categoría", `Ganancia ${sec.nombre}`, ...totalCells(sec.total)])
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(";")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `cuadro-detallado-${periodoKey}-${sucursalId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <TransitionLoader fullPage />
  }

  if (!cuadro) {
    return (
      <div>
        <PageHeader
          title="Cuadro de Resultados — Detallado"
          subtitle="Desglose por categoría, sector y grupo financiero."
          actions={
            <FiltrosSelector
              periodoKey={periodoKey}
              onPeriodoChange={onPeriodoChange}
              sucursalId={sucursalId}
              onSucursalChange={onSucursalChange}
              periodos={periodos}
              sucursales={sucursales}
            />
          }
        />
        <Card className="mt-6 border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning">
              <AlertCircle className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-base font-semibold">Sin datos cargados</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-md">
                No hay registros reales en la base de datos para el período y sucursal seleccionados.
                Cargá un archivo en la pestaña "Cargar Datos" o ejecutá el Seed inicial.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Cuadro de Resultados — Detallado"
        subtitle={`Réplica del cuadro de resultados de ${periodoLabel(cuadro.periodo.anio, cuadro.periodo.mes)}. Desglosá para analizar sectores y grupos.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <FiltrosSelector
              periodoKey={periodoKey}
              onPeriodoChange={onPeriodoChange}
              sucursalId={sucursalId}
              onSucursalChange={onSucursalChange}
              periodos={periodos}
              sucursales={sucursales}
            />
            <Button variant="outline" size="sm" className="gap-2 bg-card h-9" onClick={exportarCSV}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="gap-2 bg-card h-9" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th rowSpan={2} className="sticky left-0 z-20 bg-card px-4 py-4 text-left font-bold text-base min-w-[300px] border-r-2 border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] align-bottom">
                Categoría / Sector / Grupo
              </th>
              {COLS.map((c) => (
                <th key={c} className="whitespace-nowrap px-3 pt-4 pb-2 text-right font-bold text-base text-foreground">
                  {c}
                </th>
              ))}
            </tr>
            <tr className="border-b-2 border-primary/20 bg-muted/30">
              {COLS.map((c) => (
                <th key={c + '-status'} className="whitespace-nowrap px-3 pb-4 pt-2 text-right">
                  <Badge variant="secondary" className="bg-primary text-primary-foreground text-[10px] uppercase tracking-wider font-semibold border-0 hover:bg-primary/90">
                    MÉTRICA
                  </Badge>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cuadro.secciones.map((sec) => (
              <SeccionRows
                key={sec.id}
                seccionNombre={sec.nombre}
                categorias={sec.categorias}
                total={sec.total}
                expCats={expCats}
                expGrupos={expGrupos}
                toggleCat={toggleCat}
                toggleGrupo={toggleGrupo}
              />
            ))}
            {/* Total general */}
            <tr className="border-t-2 border-primary bg-primary text-primary-foreground font-bold">
              <td className="sticky left-0 z-10 bg-primary px-4 py-3 min-w-[300px] whitespace-nowrap border-r border-white/20">TOTAL GENERAL</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(cuadro.total.facturacion)}</td>
              <td className="px-3 py-3 text-right tabular-nums">100,0%</td>
              <td className="px-3 py-3 text-right tabular-nums text-primary-foreground/60">—</td>
              <td className="px-3 py-3 text-right tabular-nums">
                {formatNumber(cuadro.total.articulos)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-primary-foreground/60">—</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatPercent(cuadro.total.cmg)}</td>
              <td className="px-3 py-3 text-right tabular-nums">
                {formatCurrency(cuadro.total.resultadoFinal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SeccionRows({
  seccionNombre,
  categorias,
  total,
  expCats,
  expGrupos,
  toggleCat,
  toggleGrupo,
}: {
  seccionNombre: string
  categorias: CategoriaNode[]
  total: import("@/lib/data").Metrics
  expCats: Set<string>
  expGrupos: Set<string>
  toggleCat: (id: string) => void
  toggleGrupo: (id: string) => void
}) {
  return (
    <>
      <tr className="border-b border-border" style={{ backgroundColor: 'color-mix(in srgb, var(--secondary) 70%, var(--card))' }}>
        <td colSpan={COLS.length + 1} className="sticky left-0 px-4 py-2 text-xs font-bold uppercase tracking-wide text-primary border-r border-border/10" style={{ backgroundColor: 'color-mix(in srgb, var(--secondary) 70%, var(--card))' }}>
          {seccionNombre}
        </td>
      </tr>
      {categorias.map((cat) => {
        const abierta = expCats.has(cat.id)
        return (
          <FragmentCat
            key={cat.id}
            cat={cat}
            abierta={abierta}
            expGrupos={expGrupos}
            toggleCat={toggleCat}
            toggleGrupo={toggleGrupo}
          />
        )
      })}
      <tr className="border-b border-border font-semibold" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 10%, var(--card))' }}>
        <td className="sticky left-0 z-10 px-4 py-2.5 text-primary min-w-[300px] whitespace-nowrap border-r border-border" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 10%, var(--card))' }}>Ganancia {seccionNombre}</td>
        <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(total.facturacion)}</td>
        <td colSpan={4} />
        <td className="px-3 py-2.5 text-right tabular-nums">{formatPercent(total.cmg)}</td>
        <td className={cn("px-3 py-2.5 text-right tabular-nums", varClass(total.resultadoFinal))}>
          {formatCurrency(total.resultadoFinal)}
        </td>
      </tr>
    </>
  )
}

function FragmentCat({
  cat,
  abierta,
  expGrupos,
  toggleCat,
  toggleGrupo,
}: {
  cat: CategoriaNode
  abierta: boolean
  expGrupos: Set<string>
  toggleCat: (id: string) => void
  toggleGrupo: (id: string) => void
}) {
  return (
    <>
      <tr className="border-b border-border transition-colors hover:bg-muted/40">
        <td className="sticky left-0 z-10 bg-card px-4 py-2 min-w-[300px] whitespace-nowrap border-r border-border">
          <button
            type="button"
            onClick={() => toggleCat(cat.id)}
            className="flex items-center gap-1.5 font-semibold text-foreground"
          >
            <ChevronRight className={cn("h-4 w-4 text-accent transition-transform", abierta && "rotate-90")} />
            {cat.nombre}
          </button>
        </td>
        <MetricCells m={cat.metrics} />
      </tr>
      {abierta &&
        cat.grupos.map((g) => (
          <FragmentGrupo key={g.id} grupo={g} abierto={expGrupos.has(g.id)} toggleGrupo={toggleGrupo} />
        ))}
    </>
  )
}

function FragmentGrupo({
  grupo,
  abierto,
  toggleGrupo,
}: {
  grupo: GrupoNode
  abierto: boolean
  toggleGrupo: (id: string) => void
}) {
  const tieneSubgruposVarios =
    grupo.subgrupos.length > 1 ||
    (grupo.subgrupos.length === 1 && grupo.subgrupos[0].nombre !== grupo.nombre)

  const badgeProrrateo = grupo.costoProrrateado ? (
    <span
      title="Costo prorrateado — distribuido por participación en facturación de la cadena"
      className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1 py-0.5 text-[10px] font-semibold text-amber-500 cursor-help"
    >
      ⚡ Prorrateado
    </span>
  ) : grupo.costoCalculadoTipo === 'formula_markup' ? (
    <span
      title="CMV auto-calculado — Rotisería: Costo = Facturación ÷ 1.4 (markup 40%)"
      className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-blue-500/15 px-1 py-0.5 text-[10px] font-semibold text-blue-400 cursor-help"
    >
      📊 CMV auto
    </span>
  ) : grupo.costoCalculadoTipo === 'prorrateado' ? (
    <span
      title="Costo prorrateado — distribuido por participación en facturación de la cadena"
      className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1 py-0.5 text-[10px] font-semibold text-amber-500 cursor-help"
    >
      ⚡ Prorrateado
    </span>
  ) : null

  return (
    <>
      <tr className="border-b border-border/60 bg-muted/20 text-[13px]">
        <td className="sticky left-0 z-10 px-3 py-1.5 pl-8 min-w-[300px] whitespace-nowrap border-r border-border" style={{ backgroundColor: 'color-mix(in srgb, var(--muted) 20%, var(--card))' }}>
          {tieneSubgruposVarios ? (
            <button type="button" onClick={() => toggleGrupo(grupo.id)} className="flex items-center gap-1.5 font-medium">
              <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", abierto && "rotate-90")} />
              {grupo.nombre}
              {badgeProrrateo}
            </button>
          ) : (
            <span className="font-medium pl-5 inline-flex items-center gap-1">
              {grupo.nombre}
              {badgeProrrateo}
            </span>
          )}
        </td>
        <MetricCells m={grupo.metrics} />
      </tr>
      {tieneSubgruposVarios && abierto &&
        grupo.subgrupos.map((s) => (
          <tr key={s.id} className="border-b border-border/40 text-xs text-muted-foreground">
            <td className="sticky left-0 z-10 bg-card px-3 py-1.5 pl-14 min-w-[300px] whitespace-nowrap border-r border-border">{s.nombre}</td>
            <MetricCells m={s.metrics} />
          </tr>
        ))}
    </>
  )
}


function metricRow(nivel: string, nombre: string, m: MetricsConDerivados): string[] {
  return [nivel, nombre, ...totalCells(m)]
}

function totalCells(m: import("@/lib/data").Metrics | MetricsConDerivados): string[] {
  const d = m as MetricsConDerivados
  return [
    String(Math.round(m.facturacion)),
    d.participacionFacturacion !== undefined ? formatPercent(d.participacionFacturacion) : "",
    d.variacionMesAnterior != null ? formatSigned(d.variacionMesAnterior) : "",
    String(m.articulos),
    d.variacionAnioAnterior != null ? formatSigned(d.variacionAnioAnterior) : "",
    formatPercent(m.cmg),
    String(Math.round(m.resultadoFinal)),
  ]
}

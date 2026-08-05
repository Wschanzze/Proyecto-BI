"use client"

import { useMemo, useState } from "react"
import { ChevronRight, Download, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader, PeriodoSelector } from "@/components/monarca/shared"
import { getCuadro, type MetricsConDerivados, type CategoriaNode, type GrupoNode } from "@/lib/data"
import { formatCurrency, formatNumber, formatPercent, formatSigned, periodoLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

const COLS = [
  "Facturación s/IVA",
  "Part. Fact.",
  "Var. m.a.",
  "Artículos",
  "Var. a.a.",
  "CMg",
  "Rdo. Op. $",
  "Part. Rdo. Op.",
  "RRHH/Vtas",
  "Rdo.Op/Vtas",
  "Acc./Vtas",
  "Rdo.Fin/Vtas",
  "Resultado Final",
]

function varClass(v: number | null | undefined) {
  if (v === null || v === undefined || Number.isNaN(v)) return "text-muted-foreground"
  return v >= 0 ? "text-success" : "text-destructive"
}

// Celdas de métricas reutilizadas en cada nivel.
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
      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(m.facturacion)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatPercent(m.participacionFacturacion)}</td>
      <td className={cn("px-3 py-2 text-right tabular-nums font-medium", varClass(m.variacionMesAnterior))}>
        {m.variacionMesAnterior === null ? "—" : formatSigned(m.variacionMesAnterior)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatNumber(m.articulos)}</td>
      <td className={cn("px-3 py-2 text-right tabular-nums font-medium", varClass(m.variacionAnioAnterior))}>
        {m.variacionAnioAnterior === null ? "—" : formatSigned(m.variacionAnioAnterior)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{formatPercent(m.cmg)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(m.resultadoOperativo)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
        {formatPercent(m.participacionResultadoOperativo)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatPercent(m.rrhhSobreVentas)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatPercent(m.rdoOperativoSobreVentas)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatPercent(m.accionesSobreVentas)}</td>
      <td className={cn("px-3 py-2 text-right tabular-nums", varClass(m.rdoFinalSobreVentas))}>
        {formatPercent(m.rdoFinalSobreVentas)}
      </td>
      <td className={cn("px-3 py-2 text-right font-semibold tabular-nums", varClass(m.resultadoFinal))}>
        {formatCurrency(m.resultadoFinal)}
      </td>
    </>
  )
}

export function CuadroDetallado({
  periodoKey,
  onPeriodoChange,
}: {
  periodoKey: string
  onPeriodoChange: (v: string) => void
}) {
  const cuadro = useMemo(() => getCuadro(periodoKey), [periodoKey])
  const [expCats, setExpCats] = useState<Set<string>>(new Set())
  const [expGrupos, setExpGrupos] = useState<Set<string>>(new Set())

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
    const header = ["Nivel", "Sección", "Nombre", ...COLS]
    const rows: string[][] = [header]
    for (const sec of cuadro.secciones) {
      for (const cat of sec.categorias) {
        rows.push(metricRow("Categoría", sec.nombre, cat.nombre, cat.metrics))
        for (const g of cat.grupos) {
          rows.push(metricRow("Grupo", sec.nombre, `  ${g.nombre}`, g.metrics))
          for (const s of g.subgrupos) {
            rows.push(metricRow("Subgrupo", sec.nombre, `    ${s.nombre}`, s.metrics))
          }
        }
      }
      rows.push(["Total Sección", sec.nombre, `Ganancia ${sec.nombre}`, ...totalCells(sec.total)])
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(";")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `cuadro-detallado-${periodoKey}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader
        title="Cuadro de Resultados — Detallado"
        subtitle={`Réplica completa del cuadro de ${periodoLabel(cuadro.periodo.anio, cuadro.periodo.mes)}. Expandí cada categoría para ver grupos y subgrupos.`}
        actions={
          <>
            <PeriodoSelector value={periodoKey} onChange={onPeriodoChange} />
            <Button variant="outline" size="sm" className="gap-2 bg-card" onClick={exportarCSV}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-2 bg-card" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              PDF
            </Button>
          </>
        }
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60">
              <th className="sticky left-0 z-10 bg-muted/60 px-3 py-2.5 text-left font-semibold text-foreground">
                Categoría / Grupo / Subgrupo
              </th>
              {COLS.map((c) => (
                <th key={c} className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-foreground">
                  {c}
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
            <tr className="border-t-2 border-primary bg-primary text-primary-foreground">
              <td className="sticky left-0 z-10 bg-primary px-3 py-3 font-bold">TOTAL GENERAL</td>
              <td className="px-3 py-3 text-right font-bold tabular-nums">{formatCurrency(cuadro.total.facturacion)}</td>
              <td className="px-3 py-3 text-right tabular-nums">100,0%</td>
              <td colSpan={2} className="px-3 py-3 text-right tabular-nums">
                {formatNumber(cuadro.total.articulos)} art.
              </td>
              <td className="px-3 py-3 text-right tabular-nums">{formatPercent(cuadro.total.cmg)}</td>
              <td className="px-3 py-3 text-right font-bold tabular-nums">
                {formatCurrency(cuadro.total.resultadoOperativo)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">100,0%</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatPercent(cuadro.total.rrhhSobreVentas)}</td>
              <td className="px-3 py-3 text-right tabular-nums">
                {formatPercent((cuadro.total.resultadoOperativo / cuadro.total.facturacion) * 100)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">{formatPercent(cuadro.total.accionesSobreVentas)}</td>
              <td className="px-3 py-3 text-right tabular-nums">
                {formatPercent((cuadro.total.resultadoFinal / cuadro.total.facturacion) * 100)}
              </td>
              <td className="px-3 py-3 text-right font-bold tabular-nums">
                {formatCurrency(cuadro.total.resultadoFinal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Las celdas con “—” corresponden a rubros sin datos en el período (ej. rubros nuevos o sin todos los indicadores
        calculados). El parser tolera estos casos sin afectar los totales.
      </p>
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
      <tr className="border-b border-border bg-secondary/70">
        <td colSpan={14} className="sticky left-0 px-3 py-2 text-xs font-bold uppercase tracking-wide text-primary">
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
      <tr className="border-b border-border bg-accent/10 font-semibold">
        <td className="sticky left-0 z-10 bg-accent/10 px-3 py-2.5 text-primary">Ganancia {seccionNombre}</td>
        <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(total.facturacion)}</td>
        <td colSpan={5} />
        <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(total.resultadoOperativo)}</td>
        <td colSpan={4} />
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
        <td className="sticky left-0 z-10 bg-card px-3 py-2">
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

  return (
    <>
      <tr className="border-b border-border/60 bg-muted/20 text-[13px]">
        <td className="sticky left-0 z-10 bg-muted/20 px-3 py-1.5 pl-8">
          {tieneSubgruposVarios ? (
            <button type="button" onClick={() => toggleGrupo(grupo.id)} className="flex items-center gap-1.5 font-medium">
              <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", abierto && "rotate-90")} />
              {grupo.nombre}
            </button>
          ) : (
            <span className="font-medium pl-5">{grupo.nombre}</span>
          )}
        </td>
        <MetricCells m={grupo.metrics} />
      </tr>
      {tieneSubgruposVarios && abierto &&
        grupo.subgrupos.map((s) => (
          <tr key={s.id} className="border-b border-border/40 text-xs text-muted-foreground">
            <td className="sticky left-0 z-10 bg-card px-3 py-1.5 pl-14">{s.nombre}</td>
            <MetricCells m={s.metrics} />
          </tr>
        ))}
    </>
  )
}

// --- helpers para CSV ---
function metricRow(nivel: string, seccion: string, nombre: string, m: MetricsConDerivados): string[] {
  return [nivel, seccion, nombre, ...totalCells(m)]
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
    String(Math.round(m.resultadoOperativo)),
    d.participacionResultadoOperativo !== undefined ? formatPercent(d.participacionResultadoOperativo) : "",
    formatPercent(m.rrhhSobreVentas),
    d.rdoOperativoSobreVentas !== undefined ? formatPercent(d.rdoOperativoSobreVentas) : "",
    formatPercent(m.accionesSobreVentas),
    d.rdoFinalSobreVentas !== undefined ? formatPercent(d.rdoFinalSobreVentas) : "",
    String(Math.round(m.resultadoFinal)),
  ]
}

"use client"

import { Fragment, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader, PeriodoSelector, VariacionBadge } from "@/components/monarca/shared"
import {
  getCuadro,
  serieConsolidada,
  seriePorCategoria,
  todasLasCategorias,
  PERIODOS,
  PERIODOS_SELECCIONABLES,
} from "@/lib/data"
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  periodoLabel,
  periodoLabelCorto,
} from "@/lib/format"

const CHART_BLUE = "oklch(0.42 0.15 260)"
const CHART_ORANGE = "oklch(0.68 0.18 45)"
const CHART_GREEN = "oklch(0.62 0.16 150)"

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2 tabular-nums">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">{formatCurrency(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

export function CuadroSimplificado({
  periodoKey,
  onPeriodoChange,
}: {
  periodoKey: string
  onPeriodoChange: (v: string) => void
}) {
  const [catId, setCatId] = useState<string>("__consolidado__")
  const categorias = useMemo(() => todasLasCategorias(), [])

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

  const cuadro = useMemo(() => getCuadro(periodoKey), [periodoKey])

  const cuadrosPorPeriodo = useMemo(() => {
    return PERIODOS_SELECCIONABLES.map((p) => ({
      periodo: p,
      cuadro: getCuadro(p.key),
    }))
  }, [])

  const prevKey = useMemo(() => {
    const p = PERIODOS.find((x) => x.key === periodoKey)
    return p ? PERIODOS.find((x) => x.index === p.index - 1)?.key : undefined
  }, [periodoKey])

  const serie = useMemo(() => {
    const raw = catId === "__consolidado__" ? serieConsolidada(6) : seriePorCategoria(catId, 6)
    return raw.map((p) => ({
      ...p,
      label: periodoLabelCorto(p.anio, p.mes),
    }))
  }, [catId])

  return (
    <div>
      <PageHeader
        title="Cuadro Simplificado — Seguimiento Mensual"
        subtitle={`Evolución de facturación y resultados. Comparación de ${periodoLabel(cuadro.periodo.anio, cuadro.periodo.mes)} vs. mes y año anterior.`}
        actions={<PeriodoSelector value={periodoKey} onChange={onPeriodoChange} />}
      />

      <div className="mb-6 flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Ver evolución de:</span>
        <Select value={catId} onValueChange={setCatId}>
          <SelectTrigger className="w-[220px] bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__consolidado__">Consolidado (todas)</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nombre} · {c.seccion}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolución de Facturación</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={serie} margin={{ left: 4, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="fillFact" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_BLUE} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={CHART_BLUE} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.008 250)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(v) => formatCurrencyCompact(v)}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="facturacion"
                  name="Facturación"
                  stroke={CHART_BLUE}
                  strokeWidth={2}
                  fill="url(#fillFact)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado Operativo vs. Final</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={serie} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.008 250)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(v) => formatCurrencyCompact(v)}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="resultadoOperativo"
                  name="Rdo. Operativo"
                  stroke={CHART_ORANGE}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="resultadoFinal"
                  name="Rdo. Final"
                  stroke={CHART_GREEN}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            Evolución de Margen Operativo (Rdo.Op/Vtas) — Historial Mensual
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-accent text-accent-foreground">
                  <th className="sticky left-0 z-10 bg-accent px-4 py-2.5 text-left font-semibold text-accent-foreground min-w-[300px] whitespace-nowrap border-r border-white/20">
                    Categoría / Grupo / Subgrupo
                  </th>
                  {cuadrosPorPeriodo.map(({ periodo }) => (
                    <th key={periodo.key} className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-accent-foreground">
                      {periodoLabelCorto(periodo.anio, periodo.mes)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cuadro.secciones.map((sec) => (
                  <SimplificadoSeccionRows
                    key={sec.id}
                    seccionNombre={sec.nombre}
                    seccionId={sec.id}
                    categorias={sec.categorias}
                    cuadros={cuadrosPorPeriodo}
                    expCats={expCats}
                    expGrupos={expGrupos}
                    toggleCat={toggleCat}
                    toggleGrupo={toggleGrupo}
                  />
                ))}
                {/* Total general */}
                <tr className="border-t-2 border-primary bg-primary text-primary-foreground font-bold">
                  <td className="sticky left-0 z-10 bg-primary px-4 py-3 min-w-[300px] whitespace-nowrap border-r border-white/20">TOTAL GENERAL</td>
                  <PeriodCells level="total" cuadros={cuadrosPorPeriodo} />
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// --- Componentes auxiliares para la matriz desplegable del margen operativo ---

function getRdoOpVtasForNode(
  cuadro: import("@/lib/data").Cuadro,
  level: "seccion" | "categoria" | "grupo" | "subgrupo" | "total",
  id?: string
): number | null {
  if (level === "total") {
    const m = cuadro.total
    return m.facturacion === 0 ? null : (m.resultadoOperativo / m.facturacion) * 100
  }
  if (level === "seccion") {
    const sec = cuadro.secciones.find((s) => s.id === id)
    if (!sec || sec.total.facturacion === 0) return null
    return (sec.total.resultadoOperativo / sec.total.facturacion) * 100
  }
  if (level === "categoria") {
    const cat = cuadro.secciones.flatMap((s) => s.categorias).find((c) => c.id === id)
    if (!cat || cat.metrics.facturacion === 0) return null
    return cat.metrics.rdoOperativoSobreVentas
  }
  if (level === "grupo") {
    const g = cuadro.secciones.flatMap((s) => s.categorias.flatMap((c) => c.grupos)).find((gr) => gr.id === id)
    if (!g || g.metrics.facturacion === 0) return null
    return g.metrics.rdoOperativoSobreVentas
  }
  if (level === "subgrupo") {
    const s = cuadro.secciones.flatMap((s) => s.categorias.flatMap((c) => c.grupos.flatMap((gr) => gr.subgrupos))).find((sub) => sub.id === id)
    if (!s || s.metrics.facturacion === 0) return null
    return s.metrics.rdoOperativoSobreVentas
  }
  return null
}

function PeriodCells({
  level,
  id,
  cuadros,
}: {
  level: "seccion" | "categoria" | "grupo" | "subgrupo" | "total"
  id?: string
  cuadros: { periodo: import("@/lib/data").Periodo; cuadro: import("@/lib/data").Cuadro }[]
}) {
  return (
    <>
      {cuadros.map(({ cuadro }) => {
        const val = getRdoOpVtasForNode(cuadro, level, id)
        return (
          <td
            key={cuadro.periodo.key}
            className={cn(
              "px-3 py-2 text-right tabular-nums text-xs",
              val === null ? "text-muted-foreground/60" : val >= 0 ? "text-success font-medium" : "text-destructive font-medium"
            )}
          >
            {val === null ? "—" : formatPercent(val)}
          </td>
        )
      })}
    </>
  )
}

function SimplificadoSeccionRows({
  seccionNombre,
  seccionId,
  categorias,
  cuadros,
  expCats,
  expGrupos,
  toggleCat,
  toggleGrupo,
}: {
  seccionNombre: string
  seccionId: string
  categorias: import("@/lib/data").CategoriaNode[]
  cuadros: { periodo: import("@/lib/data").Periodo; cuadro: import("@/lib/data").Cuadro }[]
  expCats: Set<string>
  expGrupos: Set<string>
  toggleCat: (id: string) => void
  toggleGrupo: (id: string) => void
}) {
  const colSpanCount = cuadros.length + 1
  return (
    <>
      <tr className="border-b border-border" style={{ backgroundColor: 'color-mix(in srgb, var(--secondary) 70%, var(--card))' }}>
        <td colSpan={colSpanCount} className="sticky left-0 px-4 py-2 text-xs font-bold uppercase tracking-wide text-primary border-r border-border/10" style={{ backgroundColor: 'color-mix(in srgb, var(--secondary) 70%, var(--card))' }}>
          {seccionNombre}
        </td>
      </tr>
      {categorias.map((cat) => {
        const abierta = expCats.has(cat.id)
        return (
          <SimplificadoFragmentCat
            key={cat.id}
            cat={cat}
            cuadros={cuadros}
            abierta={abierta}
            expGrupos={expGrupos}
            toggleCat={toggleCat}
            toggleGrupo={toggleGrupo}
          />
        )
      })}
      <tr className="border-b border-border font-semibold" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 10%, var(--card))' }}>
        <td className="sticky left-0 z-10 px-4 py-2.5 text-primary min-w-[300px] whitespace-nowrap border-r border-border" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 10%, var(--card))' }}>Ganancia {seccionNombre}</td>
        <PeriodCells level="seccion" id={seccionId} cuadros={cuadros} />
      </tr>
    </>
  )
}

function SimplificadoFragmentCat({
  cat,
  cuadros,
  abierta,
  expGrupos,
  toggleCat,
  toggleGrupo,
}: {
  cat: import("@/lib/data").CategoriaNode
  cuadros: { periodo: import("@/lib/data").Periodo; cuadro: import("@/lib/data").Cuadro }[]
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
        <PeriodCells level="categoria" id={cat.id} cuadros={cuadros} />
      </tr>
      {abierta &&
        cat.grupos.map((g) => (
          <SimplificadoFragmentGrupo key={g.id} grupo={g} cuadros={cuadros} abierto={expGrupos.has(g.id)} toggleGrupo={toggleGrupo} />
        ))}
    </>
  )
}

function SimplificadoFragmentGrupo({
  grupo,
  cuadros,
  abierto,
  toggleGrupo,
}: {
  grupo: import("@/lib/data").GrupoNode
  cuadros: { periodo: import("@/lib/data").Periodo; cuadro: import("@/lib/data").Cuadro }[]
  abierto: boolean
  toggleGrupo: (id: string) => void
}) {
  const tieneSubgruposVarios =
    grupo.subgrupos.length > 1 ||
    (grupo.subgrupos.length === 1 && grupo.subgrupos[0].nombre !== grupo.nombre)

  return (
    <>
      <tr className="border-b border-border/60 bg-muted/20 text-[13px]">
        <td className="sticky left-0 z-10 px-3 py-1.5 pl-8 min-w-[300px] whitespace-nowrap border-r border-border" style={{ backgroundColor: 'color-mix(in srgb, var(--muted) 20%, var(--card))' }}>
          {tieneSubgruposVarios ? (
            <button type="button" onClick={() => toggleGrupo(grupo.id)} className="flex items-center gap-1.5 font-medium">
              <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", abierto && "rotate-90")} />
              {grupo.nombre}
            </button>
          ) : (
            <span className="font-medium pl-5">{grupo.nombre}</span>
          )}
        </td>
        <PeriodCells level="grupo" id={grupo.id} cuadros={cuadros} />
      </tr>
      {tieneSubgruposVarios && abierto &&
        grupo.subgrupos.map((s) => (
          <tr key={s.id} className="border-b border-border/40 text-xs text-muted-foreground">
            <td className="sticky left-0 z-10 bg-card px-3 py-1.5 pl-14 min-w-[300px] whitespace-nowrap border-r border-border">{s.nombre}</td>
            <PeriodCells level="subgrupo" id={s.id} cuadros={cuadros} />
          </tr>
        ))}
    </>
  )
}

"use client"

import { useMemo, useState } from "react"
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
} from "@/lib/data"
import {
  formatCurrency,
  formatCurrencyCompact,
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

  const cuadro = useMemo(() => getCuadro(periodoKey), [periodoKey])
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

  // Tabla resumen por categoría (con variaciones)
  const filas = useMemo(
    () =>
      cuadro.secciones.flatMap((s) =>
        s.categorias.map((c) => ({
          seccion: s.nombre,
          nombre: c.nombre,
          facturacion: c.metrics.facturacion,
          resultadoOperativo: c.metrics.resultadoOperativo,
          resultadoFinal: c.metrics.resultadoFinal,
          varMes: c.metrics.variacionMesAnterior,
          varAnio: c.metrics.variacionAnioAnterior,
        })),
      ),
    [cuadro],
  )

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
            Resumen por Categoría — {periodoLabel(cuadro.periodo.anio, cuadro.periodo.mes)}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-semibold">Categoría</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Sección</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Facturación</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Rdo. Operativo</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Rdo. Final</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Var. m.a.</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Var. a.a.</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.nombre} className="border-b border-border/60 hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{f.nombre}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{f.seccion}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(f.facturacion)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(f.resultadoOperativo)}</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatCurrency(f.resultadoFinal)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <VariacionBadge value={f.varMes} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <VariacionBadge value={f.varAnio} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

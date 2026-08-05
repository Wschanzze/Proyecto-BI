"use client"

import { useMemo } from "react"
import {
  Banknote,
  TrendingUp,
  Wallet,
  Package,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader, PeriodoSelector, VariacionBadge } from "@/components/monarca/shared"
import { getCuadro, PERIODOS } from "@/lib/data"
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatPercent,
  periodoLabel,
} from "@/lib/format"

function kpiVariacion(actual: number, anterior: number | undefined | null): number | null {
  if (anterior === undefined || anterior === null || anterior === 0) return null
  return ((actual - anterior) / anterior) * 100
}

export function DashboardView({
  periodoKey,
  onPeriodoChange,
}: {
  periodoKey: string
  onPeriodoChange: (v: string) => void
}) {
  const cuadro = useMemo(() => getCuadro(periodoKey), [periodoKey])
  const prevKey = useMemo(() => {
    const p = PERIODOS.find((x) => x.key === periodoKey)
    return p ? PERIODOS.find((x) => x.index === p.index - 1)?.key : undefined
  }, [periodoKey])
  const cuadroPrev = useMemo(() => (prevKey ? getCuadro(prevKey) : null), [prevKey])

  const { total } = cuadro
  const totalPrev = cuadroPrev?.total

  const kpis = [
    {
      label: "Facturación s/IVA",
      value: formatCurrency(total.facturacion),
      icon: Banknote,
      variacion: kpiVariacion(total.facturacion, totalPrev?.facturacion),
    },
    {
      label: "Resultado Operativo",
      value: formatCurrency(total.resultadoOperativo),
      icon: TrendingUp,
      variacion: kpiVariacion(total.resultadoOperativo, totalPrev?.resultadoOperativo),
      sub: `${formatPercent((total.resultadoOperativo / total.facturacion) * 100)} s/ventas`,
    },
    {
      label: "Resultado Final",
      value: formatCurrency(total.resultadoFinal),
      icon: Wallet,
      variacion: kpiVariacion(total.resultadoFinal, totalPrev?.resultadoFinal),
      sub: `${formatPercent((total.resultadoFinal / total.facturacion) * 100)} s/ventas`,
    },
    {
      label: "Artículos",
      value: formatNumber(total.articulos),
      icon: Package,
      variacion: null,
      sub: "SKUs activos",
    },
  ]

  // Ranking de categorías por facturación
  const categorias = useMemo(
    () =>
      cuadro.secciones
        .flatMap((s) => s.categorias.map((c) => ({ ...c, seccion: s.nombre })))
        .sort((a, b) => b.metrics.facturacion - a.metrics.facturacion),
    [cuadro],
  )
  const maxFact = categorias[0]?.metrics.facturacion ?? 1

  return (
    <div>
      <PageHeader
        title="Disponibilidad de Datos"
        subtitle={`Resumen del cuadro de resultados de ${periodoLabel(cuadro.periodo.anio, cuadro.periodo.mes)}. Monitorea facturación, rentabilidad y variaciones del período.`}
        actions={
          <>
            <PeriodoSelector value={periodoKey} onChange={onPeriodoChange} />
            <Button variant="outline" size="sm" className="gap-2 bg-card">
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{kpi.label}</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-3 text-2xl font-bold tabular-nums text-foreground">{kpi.value}</div>
                <div className="mt-2 flex items-center gap-2">
                  {kpi.variacion !== null && <VariacionBadge value={kpi.variacion} />}
                  {kpi.sub && <span className="text-xs text-muted-foreground">{kpi.sub}</span>}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Resultado por sección */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Resultado por Sección</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cuadro.secciones.map((sec) => {
              const pct = (sec.total.facturacion / total.facturacion) * 100
              return (
                <div key={sec.id}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium">{sec.nombre}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatCurrencyCompact(sec.total.facturacion)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatPercent(pct)} de la facturación</span>
                    <span>Rdo. final {formatCurrencyCompact(sec.total.resultadoFinal)}</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Ranking categorías */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Facturación por Categoría</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categorias.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-sm font-medium" title={cat.nombre}>
                  {cat.nombre}
                </span>
                <div className="h-6 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className="flex h-full items-center justify-end rounded bg-accent/80 pr-2"
                    style={{ width: `${Math.max((cat.metrics.facturacion / maxFact) * 100, 6)}%` }}
                  >
                    <span className="text-[10px] font-semibold text-accent-foreground tabular-nums">
                      {formatCurrencyCompact(cat.metrics.facturacion)}
                    </span>
                  </div>
                </div>
                <div className="w-16 shrink-0 text-right">
                  <VariacionBadge value={cat.metrics.variacionMesAnterior} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

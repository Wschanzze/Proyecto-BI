// components/monarca/views/dashboard-view.tsx
"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Banknote,
  TrendingUp,
  Wallet,
  Package,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader, FiltrosSelector, VariacionBadge, TransitionLoader } from "@/components/monarca/shared"
import { getCuadroAsync } from "@/lib/data"
import type { Cuadro, Periodo } from "@/lib/data"
import type { DBSucursal } from "@/lib/supabase"
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
  const [cuadroPrev, setCuadroPrev] = useState<Cuadro | null>(null)
  const [loading, setLoading] = useState(true)

  // Obtener clave del período anterior
  const prevKey = useMemo(() => {
    if (periodos.length === 0) return undefined
    const idx = periodos.findIndex((p) => p.key === periodoKey)
    return idx > 0 ? periodos[idx - 1].key : undefined
  }, [periodoKey, periodos])

  // Carga asíncrona de datos desde Supabase
  const loadData = async () => {
    setLoading(true)
    try {
      const [c, cp] = await Promise.all([
        getCuadroAsync(periodoKey, sucursalId),
        prevKey ? getCuadroAsync(prevKey, sucursalId) : Promise.resolve(null),
      ])
      setCuadro(c)
      setCuadroPrev(cp)
    } catch (err) {
      console.error("Error al cargar datos del Dashboard:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [periodoKey, sucursalId, prevKey])

  if (loading) {
    return <TransitionLoader fullPage />
  }

  if (!cuadro) {
    return (
      <div>
        <PageHeader
          title="Dashboard de Gestión"
          subtitle="Monitoreo de facturación, rentabilidad y variaciones."
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
      sub: `${formatPercent(total.facturacion > 0 ? (total.resultadoOperativo / total.facturacion) * 100 : 0)} s/ventas`,
    },
    {
      label: "Resultado Final",
      value: formatCurrency(total.resultadoFinal),
      icon: Wallet,
      variacion: kpiVariacion(total.resultadoFinal, totalPrev?.resultadoFinal),
      sub: `${formatPercent(total.facturacion > 0 ? (total.resultadoFinal / total.facturacion) * 100 : 0)} s/ventas`,
    },
    {
      label: "Cantidad Vendida",
      value: formatNumber(total.articulos),
      icon: Package,
      variacion: null,
      sub: "Unidades totales",
    },
  ]

  // Ranking de categorías por facturación
  const categorias = cuadro.secciones
    .flatMap((s) => s.categorias.map((c) => ({ ...c, seccion: s.nombre })))
    .sort((a, b) => b.metrics.facturacion - a.metrics.facturacion)

  const maxFact = categorias[0]?.metrics.facturacion ?? 1

  return (
    <div>
      <PageHeader
        title="Dashboard de Gestión"
        subtitle={`Resumen de resultados para el período de ${periodoLabel(cuadro.periodo.anio, cuadro.periodo.mes)}. Filtrado por sucursal.`}
        actions={
          <div className="flex items-center gap-2">
            <FiltrosSelector
              periodoKey={periodoKey}
              onPeriodoChange={onPeriodoChange}
              sucursalId={sucursalId}
              onSucursalChange={onSucursalChange}
              periodos={periodos}
              sucursales={sucursales}
            />
            <Button onClick={loadData} variant="outline" size="sm" className="gap-2 bg-card h-9">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
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
              const pct = total.facturacion > 0 ? (sec.total.facturacion / total.facturacion) * 100 : 0
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
                    <span>CMg {formatCurrencyCompact(sec.total.resultadoFinal)}</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Ranking categorías */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Facturación por Sector</CardTitle>
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

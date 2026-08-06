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
  BarChart3,
  PieChart as PieIcon,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Zap,
  Users
} from "lucide-react"
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

const COLORS_DONUT = ["#0b4da2", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"]

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
  const [cuadroYoy, setCuadroYoy] = useState<Cuadro | null>(null)
  const [historicoData, setHistoricoData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Claves de período anterior y año anterior
  const { prevKey, yoyKey } = useMemo(() => {
    if (periodos.length === 0) return { prevKey: undefined, yoyKey: undefined }
    const idx = periodos.findIndex((p) => p.key === periodoKey)
    const pKey = idx > 0 ? periodos[idx - 1].key : undefined
    
    // YOY: buscar el mismo mes pero del año anterior (ej: 2025-06 para 2026-06)
    const [anioStr, mesStr] = periodoKey.split('-')
    const targetYoyKey = `${parseInt(anioStr, 10) - 1}-${mesStr}`
    const yKey = periodos.find(p => p.key === targetYoyKey)?.key

    return { prevKey: pKey, yoyKey: yKey }
  }, [periodoKey, periodos])

  // Carga asíncrona de datos desde Supabase
  const loadData = async () => {
    setLoading(true)
    try {
      const [c, cp, cy] = await Promise.all([
        getCuadroAsync(periodoKey, sucursalId),
        prevKey ? getCuadroAsync(prevKey, sucursalId) : Promise.resolve(null),
        yoyKey ? getCuadroAsync(yoyKey, sucursalId) : Promise.resolve(null),
      ])
      setCuadro(c)
      setCuadroPrev(cp)
      setCuadroYoy(cy)
    } catch (err) {
      console.error("Error al cargar datos del Dashboard:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [periodoKey, sucursalId, prevKey, yoyKey])

  // Cargar historial completo para gráficos de tendencias multi-mes
  useEffect(() => {
    async function loadHistorico() {
      if (periodos.length === 0) return
      try {
        const list = await Promise.all(
          periodos.map(async (p) => {
            const c = await getCuadroAsync(p.key, sucursalId)
            if (!c) return null
            return {
              key: p.key,
              label: p.label.toUpperCase(),
              facturacion: c.total.facturacion,
              costo: c.total.costo,
              cmg: c.total.resultadoFinal,
              margenPct: c.total.cmg,
              cantidad: c.total.articulos
            }
          })
        )
        setHistoricoData(list.filter(Boolean))
      } catch (err) {
        console.error("Error al cargar histórico para dashboard:", err)
      }
    }
    loadHistorico()
  }, [periodos, sucursalId])

  if (loading) {
    return <TransitionLoader fullPage />
  }

  if (!cuadro) {
    return (
      <div>
        <PageHeader
          title="Dashboard de Gestión Ejecutivo"
          subtitle="Monitoreo de KPI gerenciales, rentabilidad y variaciones."
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
                No hay registros en la base de datos para el período y sucursal seleccionados.
                Cargá un archivo en la pestaña "Cargar Datos".
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { total } = cuadro
  const totalPrev = cuadroPrev?.total
  const totalYoy = cuadroYoy?.total

  const varFactMes = kpiVariacion(total.facturacion, totalPrev?.facturacion)
  const varFactYoy = kpiVariacion(total.facturacion, totalYoy?.facturacion)
  const varCmgMes = kpiVariacion(total.resultadoFinal, totalPrev?.resultadoFinal)
  const varCantMes = kpiVariacion(total.articulos, totalPrev?.articulos)

  // Datos para gráfico Puente de Resultados (Waterfall)
  const waterfallData = [
    { name: "Facturación s/IVA", monto: total.facturacion, fill: "#10b981", isTotal: true },
    { name: "Costo Mercadería (CMV)", monto: -total.costo, fill: "#ef4444", isOutflow: true },
    { name: "Contribución Marginal (CMg)", monto: total.resultadoFinal, fill: "#0b4da2", isTotal: true },
  ]

  // Datos para gráfico Donut de Secciones (Salón vs Frescos)
  const seccionesDonutData = cuadro.secciones.map((s) => ({
    name: s.nombre,
    value: s.total.facturacion,
    cmg: s.total.resultadoFinal
  }))

  // Ranking sectores
  const sectores = cuadro.secciones
    .flatMap((s) => s.categorias.map((c) => ({ ...c, seccion: s.nombre })))
    .sort((a, b) => b.metrics.facturacion - a.metrics.facturacion)

  const maxFact = sectores[0]?.metrics.facturacion ?? 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard de Gestión Ejecutivo"
        subtitle={`KPI gerenciales y resumen de resultados para ${periodoLabel(cuadro.periodo.anio, cuadro.periodo.mes)}. Comparativa mensual e histórica.`}
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

      {/* FILA 1: TARJETAS KPI GERENCIALES CON MINI SPARK LINES */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: FACTURACIÓN */}
        <Card className="relative overflow-hidden border-border bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ingresos s/IVA
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Banknote className="h-4 w-4" />
              </span>
            </div>
            
            <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
              {formatCurrencyCompact(total.facturacion)}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <VariacionBadge value={varFactMes} />
              <span className="text-muted-foreground">vs mes ant.</span>
              {varFactYoy !== null && (
                <span className="text-[11px] text-muted-foreground border-l pl-2 border-border">
                  {varFactYoy >= 0 ? "+" : ""}{formatPercent(varFactYoy)} a.a.
                </span>
              )}
            </div>

            {/* Mini Sparkline Line */}
            {historicoData.length > 1 && (
              <div className="mt-3 h-8 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicoData}>
                    <Line type="monotone" dataKey="facturacion" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPI 2: CONTRIBUCIÓN MARGINAL */}
        <Card className="relative overflow-hidden border-border bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contribución Marginal (CMg)
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-success/10 text-success">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <div className="text-2xl font-bold tabular-nums text-foreground">
                {formatCurrencyCompact(total.resultadoFinal)}
              </div>
              <Badge variant="secondary" className="text-xs font-bold text-success bg-success/10">
                {formatPercent(total.cmg)} CMg
              </Badge>
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs">
              <VariacionBadge value={varCmgMes} />
              <span className="text-muted-foreground">vs mes ant.</span>
            </div>

            {/* Mini Sparkline Bar */}
            {historicoData.length > 1 && (
              <div className="mt-3 h-8 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historicoData}>
                    <Bar dataKey="cmg" fill="#0b4da2" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPI 3: COSTO MERCADERÍA (CMV) */}
        <Card className="relative overflow-hidden border-border bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Costo Mercadería (CMV)
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                <Wallet className="h-4 w-4" />
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <div className="text-2xl font-bold tabular-nums text-foreground">
                {formatCurrencyCompact(total.costo)}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatPercent(total.facturacion > 0 ? (total.costo / total.facturacion) * 100 : 0)} s/ventas
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Costo directo de ventas de mercadería</span>
            </div>

            {/* Mini Sparkline Area */}
            {historicoData.length > 1 && (
              <div className="mt-3 h-8 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicoData}>
                    <Area type="monotone" dataKey="costo" stroke="#ef4444" fill="#ef444420" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPI 4: CANTIDAD VENDIDA */}
        <Card className="relative overflow-hidden border-border bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Volumen Vendido
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent">
                <Package className="h-4 w-4" />
              </span>
            </div>

            <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
              {formatNumber(total.articulos)}
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs">
              <VariacionBadge value={varCantMes} />
              <span className="text-muted-foreground">unidades totales</span>
            </div>

            {/* Mini Sparkline Line */}
            {historicoData.length > 1 && (
              <div className="mt-3 h-8 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicoData}>
                    <Line type="monotone" dataKey="cantidad" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* FILA 2: PUENTE DE RESULTADOS (WATERFALL) & DISTRIBUCIÓN POR SECCIÓN */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* GRÁFICO 1: PUENTE DE RESULTADOS */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Puente de Resultados Financiero
                </CardTitle>
                <CardDescription className="text-xs">
                  Desglose visual del flujo de ingresos, costos directos y margen bruto del período.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatCurrencyCompact(Math.abs(v))} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Math.abs(Number(value))), "Monto"]}
                    contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                  />
                  <Bar dataKey="monto" radius={[4, 4, 0, 0]}>
                    {waterfallData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* GRÁFICO 2: PARTICIPACIÓN SALÓN VS FRESCOS (DONUT) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-primary" />
              Distribución por Sección
            </CardTitle>
            <CardDescription className="text-xs">
              Participación de Salón y Frescos en la facturación total.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-48 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={seccionesDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {seccionesDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_DONUT[index % COLORS_DONUT.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value)), "Facturación"]}
                    contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-sm font-bold text-foreground">{formatCurrencyCompact(total.facturacion)}</span>
              </div>
            </div>

            <div className="mt-2 space-y-2">
              {cuadro.secciones.map((sec, idx) => {
                const pct = total.facturacion > 0 ? (sec.total.facturacion / total.facturacion) * 100 : 0
                return (
                  <div key={sec.id} className="flex items-center justify-between text-xs border-t pt-1.5 border-border">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS_DONUT[idx % COLORS_DONUT.length] }} />
                      <span className="font-semibold">{sec.nombre}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold">{formatCurrencyCompact(sec.total.facturacion)}</span>
                      <span className="text-muted-foreground ml-1.5">({formatPercent(pct)})</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILA 3: EVOLUCIÓN HISTÓRICA MULTI-MES (COMPOSED CHART: BARS + MARGIN LINE) */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Evolución Histórica de Ingresos y Margen CMg %</CardTitle>
              <CardDescription className="text-xs">
                Trayectoria de ventas s/IVA (barras azules) y % de Contribución Marginal (línea naranja) a lo largo de todos los meses.
              </CardDescription>
            </div>
            {historicoData.length > 0 && (
              <Badge variant="outline" className="text-xs font-mono">
                {historicoData.length} Meses Registrados
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {historicoData.length < 2 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border border-dashed rounded-lg">
              <BarChart3 className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Se requiere más de 1 mes cargado para visualizar tendencias históricas.</p>
              <p className="text-xs text-muted-foreground mt-1">Cargá meses adicionales en la pestaña "Cargar Datos".</p>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={historicoData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tickFormatter={(v) => formatCurrencyCompact(v)} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any, name: any) => {
                      if (name === "margenPct") return [`${Number(value).toFixed(2)}%`, "Margen CMg %"]
                      return [formatCurrency(Number(value)), name === "facturacion" ? "Facturación s/IVA" : "Contribución Marginal"]
                    }}
                    contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                  />
                  <Bar yAxisId="left" dataKey="facturacion" name="facturacion" fill="#0b4da2" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="cmg" name="cmg" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="margenPct" name="margenPct" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FILA 4: PROYECCIÓN Y PREPARACIÓN FASE 2 (RATIOS DE RRHH Y GASTOS FIJOS) */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
            <Zap className="h-4 w-4" />
            Indicadores Clave y Estructura Financiera (Fase 2)
          </CardTitle>
          <CardDescription className="text-xs">
            Métricas estratégicas para la toma de decisiones gerenciales y preparación para la integración de Gastos Fijos y RRHH.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
          <div className="rounded-lg border bg-card p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Ratio Contribución Marginal</span>
              <ShieldCheck className="h-4 w-4 text-success" />
            </div>
            <div className="text-xl font-bold text-foreground">{formatPercent(total.cmg)}</div>
            <p className="text-[11px] text-muted-foreground">
              Porcentaje de ingresos disponible tras cubrir el costo directo de ventas.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-1 opacity-90">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Incidencia RRHH / Ventas (Fase 2)</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="text-xl font-bold text-foreground">— %</div>
            <p className="text-[11px] text-muted-foreground">
              Se activará al importar el módulo de Sueldos y Cargas Sociales.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-1 opacity-90">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Punto de Equilibrio Estimado</span>
              <Badge variant="outline" className="text-[10px]">Próximamente</Badge>
            </div>
            <div className="text-xl font-bold text-foreground">— ARS</div>
            <p className="text-[11px] text-muted-foreground">
              Ventas necesarias para cubrir Costos Fijos + Gastos Operativos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

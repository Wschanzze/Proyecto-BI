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
  Calendar,
  Layers,
  Zap,
  ShieldCheck,
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
  BarChart,
  Legend
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader, VariacionBadge, TransitionLoader } from "@/components/monarca/shared"
import { getCuadroAsync } from "@/lib/data"
import type { Cuadro, Periodo } from "@/lib/data"
import type { DBSucursal } from "@/lib/supabase"
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatPercent,
} from "@/lib/format"

const MESES_NOMBRES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

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
  const [cuadrosMap, setCuadrosMap] = useState<Map<string, Cuadro>>(new Map())
  const [loading, setLoading] = useState(true)
  const [anioFiltro, setAnioFiltro] = useState<string>("2026")

  // Cargar TODOS los cuadros de la base de datos para tendencias e historial YTD
  const loadAllData = async () => {
    setLoading(true)
    try {
      const map = new Map<string, Cuadro>()
      await Promise.all(
        periodos.map(async (p) => {
          const c = await getCuadroAsync(p.key, sucursalId)
          if (c) map.set(p.key, c)
        })
      )
      setCuadrosMap(map)
    } catch (err) {
      console.error("Error al cargar histórico para dashboard:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (periodos.length > 0) {
      loadAllData()
    } else {
      setLoading(false)
    }
  }, [periodos, sucursalId])

  // 1. Construir datos comparativos YTD 2025 vs 2026 mes a mes
  const { ytdChartData, ytdTotals } = useMemo(() => {
    const monthsData = MESES_NOMBRES.map((mesNombre, idx) => {
      const mesNum = idx + 1
      const mesPad = String(mesNum).padStart(2, '0')
      
      const k2025 = `2025-${mesPad}`
      const k2026 = `2026-${mesPad}`

      const c2025 = cuadrosMap.get(k2025)
      const c2026 = cuadrosMap.get(k2026)

      return {
        mes: mesNombre,
        mesNum,
        cant2025: c2025?.total.articulos ?? null,
        cant2026: c2026?.total.articulos ?? null,
        costo2025: c2025?.total.costo ?? null,
        costo2026: c2026?.total.costo ?? null,
        cmg2025: c2025?.total.resultadoFinal ?? null,
        cmg2026: c2026?.total.resultadoFinal ?? null,
        fact2025: c2025?.total.facturacion ?? null,
        fact2026: c2026?.total.facturacion ?? null,
      }
    })

    // Calcular acumulados YTD
    let sumFact2025 = 0, sumFact2026 = 0
    let sumCmg2025 = 0, sumCmg2026 = 0
    let sumCosto2025 = 0, sumCosto2026 = 0
    let sumCant2025 = 0, sumCant2026 = 0

    for (const m of monthsData) {
      if (m.fact2025) sumFact2025 += m.fact2025
      if (m.fact2026) sumFact2026 += m.fact2026
      if (m.cmg2025) sumCmg2025 += m.cmg2025
      if (m.cmg2026) sumCmg2026 += m.cmg2026
      if (m.costo2025) sumCosto2025 += m.costo2025
      if (m.costo2026) sumCosto2026 += m.costo2026
      if (m.cant2025) sumCant2025 += m.cant2025
      if (m.cant2026) sumCant2026 += m.cant2026
    }

    return {
      ytdChartData: monthsData,
      ytdTotals: {
        fact2025: sumFact2025,
        fact2026: sumFact2026,
        varFactYtd: kpiVariacion(sumFact2026, sumFact2025),
        cmg2025: sumCmg2025,
        cmg2026: sumCmg2026,
        varCmgYtd: kpiVariacion(sumCmg2026, sumCmg2025),
        costo2025: sumCosto2025,
        costo2026: sumCosto2026,
        varCostoYtd: kpiVariacion(sumCosto2026, sumCosto2025),
        cant2025: sumCant2025,
        cant2026: sumCant2026,
        varCantYtd: kpiVariacion(sumCant2026, sumCant2025),
      }
    }
  }, [cuadrosMap])

  // 2. Trajetoria lineal completa (de Enero 2025 hasta la actualidad)
  const trayectoriaHistorica = useMemo(() => {
    return periodos.map((p) => {
      const c = cuadrosMap.get(p.key)
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
    }).filter(Boolean)
  }, [periodos, cuadrosMap])

  // Cuadro del mes seleccionado para desglose puntual
  const cuadroActual = cuadrosMap.get(periodoKey) || Array.from(cuadrosMap.values())[cuadrosMap.size - 1]

  if (loading) {
    return <TransitionLoader fullPage />
  }

  if (cuadrosMap.size === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard de Gestión Ejecutivo YTD"
          subtitle="Monitoreo de tendencias históricas 2025 vs 2026 y comparativa de resultados."
        />
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning">
              <AlertCircle className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-base font-semibold">Sin datos cargados</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-md">
                Aún no hay registros en la base de datos. Cargá archivos de 2025 y 2026 en la pestaña "Cargar Datos".
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard de Gestión Ejecutivo YTD (2025 vs 2026)"
        subtitle="Análisis de tendencias históricas acumuladas desde Enero al último mes en curso. Comparativa anual."
        actions={
          <div className="flex items-center gap-3">
            {/* Filtro de Sucursal */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Select value={sucursalId} onValueChange={onSucursalChange}>
                <SelectTrigger className="w-[170px] bg-card">
                  <SelectValue placeholder="Sucursal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__consolidado__">🏬 Consolidado Total</SelectItem>
                  {sucursales.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={loadAllData} variant="outline" size="sm" className="gap-2 bg-card h-9">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* FILA 1: TARJETAS KPI ACUMULADAS YTD CON TENDENCIA 2025 VS 2026 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: INGRESOS YTD */}
        <Card className="relative overflow-hidden border-border bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ingresos s/IVA Acumulados (2026)
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Banknote className="h-4 w-4" />
              </span>
            </div>
            
            <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
              {formatCurrencyCompact(ytdTotals.fact2026)}
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs">
              <VariacionBadge value={ytdTotals.varFactYtd} />
              <span className="text-muted-foreground">vs YTD 2025 ({formatCurrencyCompact(ytdTotals.fact2025)})</span>
            </div>

            <div className="mt-3 h-8 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ytdChartData}>
                  <Line type="monotone" dataKey="fact2026" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="fact2025" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: CONTRIBUCIÓN MARGINAL YTD */}
        <Card className="relative overflow-hidden border-border bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contribución Marginal YTD
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-success/10 text-success">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <div className="text-2xl font-bold tabular-nums text-foreground">
                {formatCurrencyCompact(ytdTotals.cmg2026)}
              </div>
              <Badge variant="secondary" className="text-xs font-bold text-success bg-success/10">
                {formatPercent(ytdTotals.fact2026 > 0 ? (ytdTotals.cmg2026 / ytdTotals.fact2026) * 100 : 0)} CMg
              </Badge>
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs">
              <VariacionBadge value={ytdTotals.varCmgYtd} />
              <span className="text-muted-foreground">vs YTD 2025 ({formatCurrencyCompact(ytdTotals.cmg2025)})</span>
            </div>

            <div className="mt-3 h-8 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ytdChartData}>
                  <Bar dataKey="cmg2026" fill="#0b4da2" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: COSTO MERCADERÍA YTD */}
        <Card className="relative overflow-hidden border-border bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Costo Mercadería CMV YTD
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                <Wallet className="h-4 w-4" />
              </span>
            </div>

            <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
              {formatCurrencyCompact(ytdTotals.costo2026)}
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs">
              <VariacionBadge value={ytdTotals.varCostoYtd} />
              <span className="text-muted-foreground">vs YTD 2025 ({formatCurrencyCompact(ytdTotals.costo2025)})</span>
            </div>

            <div className="mt-3 h-8 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ytdChartData}>
                  <Area type="monotone" dataKey="costo2026" stroke="#ef4444" fill="#ef444420" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: UNIDADES VENDIDAS YTD */}
        <Card className="relative overflow-hidden border-border bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Unidades Vendidas YTD
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent">
                <Package className="h-4 w-4" />
              </span>
            </div>

            <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
              {formatNumber(ytdTotals.cant2026)}
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs">
              <VariacionBadge value={ytdTotals.varCantYtd} />
              <span className="text-muted-foreground">vs YTD 2025</span>
            </div>

            <div className="mt-3 h-8 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ytdChartData}>
                  <Line type="monotone" dataKey="cant2026" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILA 2: TRES GRÁFICOS YTD COMPARATIVOS 2025 VS 2026 (REQUERIDOS POR EL USUARIO) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* GRÁFICO YTD 1: CANTIDAD DE PRODUCTOS VENDIDOS 2025 VS 2026 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              YTD Cantidad de Productos Vendidos
            </CardTitle>
            <CardDescription className="text-xs">
              Comparativa de volumen físico mensual (2025 vs 2026).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ytdChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(val: any) => [formatNumber(Number(val)), "Unidades"]}
                    contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  <Bar dataKey="cant2025" name="Año 2025" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="cant2026" name="Año 2026" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* GRÁFICO YTD 2: COSTO MERCADERÍA VENDIDA (CMV 2025 VS 2026) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Wallet className="h-4 w-4 text-destructive" />
              YTD Costo de Mercadería (CMV)
            </CardTitle>
            <CardDescription className="text-xs">
              Comparativa de costo directo de ventas mensual (2025 vs 2026).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ytdChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => formatCurrencyCompact(v)} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), "Costo CMV"]}
                    contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  <Bar dataKey="costo2025" name="CMV 2025" fill="#cbd5e1" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="costo2026" name="CMV 2026" fill="#ef4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* GRÁFICO YTD 3: RESULTADO OPERATIVO / CMG 2025 VS 2026 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              YTD Resultado Operativo / CMg
            </CardTitle>
            <CardDescription className="text-xs">
              Comparativa de Contribución Marginal mensual (2025 vs 2026).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ytdChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => formatCurrencyCompact(v)} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), "CMg"]}
                    contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  <Bar dataKey="cmg2025" name="CMg 2025" fill="#64748b" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="cmg2026" name="CMg 2026" fill="#10b981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILA 3: EVOLUCIÓN HISTÓRICA MULTI-MES COMPLETA DESDE ENERO 2025 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Evolución Histórica Continua (Enero 2025 – Actualidad)
              </CardTitle>
              <CardDescription className="text-xs">
                Trayectoria mensual ininterrumpida de Facturación s/IVA (barras azules), CMg (barras verdes) y Margen % (línea naranja).
              </CardDescription>
            </div>
            {trayectoriaHistorica.length > 0 && (
              <Badge variant="outline" className="text-xs font-mono">
                {trayectoriaHistorica.length} Meses Registrados
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trayectoriaHistorica} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
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
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar yAxisId="left" dataKey="facturacion" name="Facturación s/IVA" fill="#0b4da2" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="cmg" name="Contribución Marginal" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="margenPct" name="Margen % CMg" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* FILA 4: INDICADORES ESTRATÉGICOS FASE 2 (GASTOS FIJOS Y RRHH) */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
            <Zap className="h-4 w-4" />
            Estructura Financiera & Proyección Módulo RRHH / Costos Fijos (Fase 2)
          </CardTitle>
          <CardDescription className="text-xs">
            Ratios estratégicos para la toma de decisiones gerenciales y preparación para la integración del módulo de Nómina y Costos Estructurales.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
          <div className="rounded-lg border bg-card p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Ratio Contribución Marginal YTD</span>
              <ShieldCheck className="h-4 w-4 text-success" />
            </div>
            <div className="text-xl font-bold text-foreground">
              {formatPercent(ytdTotals.fact2026 > 0 ? (ytdTotals.cmg2026 / ytdTotals.fact2026) * 100 : 0)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Porcentaje de ventas acumuladas disponible tras cubrir el costo directo de ventas en 2026.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-1 opacity-90">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Incidencia RRHH / Ventas (Fase 2)</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="text-xl font-bold text-foreground">— %</div>
            <p className="text-[11px] text-muted-foreground">
              Se activará al cargar el módulo de Sueldos, Cargas Sociales y Empleados por sucursal.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-1 opacity-90">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Punto de Equilibrio Estimado</span>
              <Badge variant="outline" className="text-[10px]">Próximamente</Badge>
            </div>
            <div className="text-xl font-bold text-foreground">— ARS</div>
            <p className="text-[11px] text-muted-foreground">
              Volumen de facturación mensual necesario para cubrir la estructura de Costos Fijos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

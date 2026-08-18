// components/monarca/views/dashboard-view.tsx
"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  Wallet,
  Package,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Calendar,
  Layers,
  Zap,
  ShieldCheck,
  Users,
  Calculator,
  Target,
  Percent,
  DollarSign,
  Activity,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
import { getConfiguracionPL } from "@/lib/metricas-admin"
import type { Cuadro, Periodo, ConfiguracionPL } from "@/lib/data"
import type { DBSucursal } from "@/lib/supabase"
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatPercent,
  formatSigned,
} from "@/lib/format"

const MESES_NOMBRES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

function kpiVariacion(actual: number, anterior: number | undefined | null): number | null {
  if (anterior === undefined || anterior === null || anterior === 0) return null
  return ((actual - anterior) / anterior) * 100
}

function DarkVariacionBadge({ actual, anterior, className }: { actual: number; anterior?: number | null; className?: string }) {
  if (anterior === undefined || anterior === null || anterior === 0) {
    return <span className="text-xs text-slate-400">—</span>
  }
  const val = ((actual - anterior) / anterior) * 100
  if (Number.isNaN(val)) return <span className="text-xs text-slate-400">—</span>
  const positivo = val >= 0
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-xs font-bold tabular-nums border shadow-sm",
        positivo 
          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
          : "bg-rose-500/20 text-rose-400 border-rose-500/30",
        className
      )}
    >
      {positivo ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <ArrowDownRight className="h-3.5 w-3.5 text-rose-400 shrink-0" />}
      {formatSigned(val)}
    </span>
  )
}

// Componente de KPI mejorado
function KPICard({ 
  title, 
  value, 
  previousValue, 
  icon: Icon, 
  color, 
  trend, 
  subtitle,
  badge,
  loading = false 
}: {
  title: string
  value: number
  previousValue?: number | null
  icon: React.ElementType
  color: string
  trend?: any[]
  subtitle?: string
  badge?: { text: string; color: string }
  loading?: boolean
}) {
  const variacion = kpiVariacion(value, previousValue)

  return (
    <Card className={`relative overflow-hidden border-border bg-gradient-to-br from-card to-${color}/5 shadow-sm hover:shadow-md transition-all duration-200`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${color}/10 text-${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            {badge && (
              <Badge variant="secondary" className={`text-xs font-semibold bg-${badge.color}/10 text-${badge.color}`}>
                {badge.text}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="space-y-1 mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {loading ? "..." : formatCurrencyCompact(value)}
            </span>
            {variacion !== null && (
              <VariacionBadge value={variacion} className="text-[10px]" />
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {trend && trend.length > 0 && (
          <div className="h-10 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={`var(--${color})`} 
                  strokeWidth={2} 
                  dot={false}
                  strokeDasharray={previousValue ? undefined : "2 2"}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Componente de ratio profesional
function RatioCard({ 
  title, 
  ratio, 
  target, 
  description, 
  icon: Icon, 
  color = "primary" 
}: {
  title: string
  ratio: number
  target?: number
  description: string
  icon: React.ElementType
  color?: string
}) {
  const performance = target ? (ratio / target) * 100 : null
  
  return (
    <Card className="border-border bg-card hover:bg-accent/5 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <Icon className={`h-5 w-5 text-${color}`} />
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{title}</h4>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold tabular-nums">
              {formatPercent(ratio)}
            </div>
            {target && performance && (
              <div className="text-xs text-muted-foreground">
                Meta: {formatPercent(target)}
              </div>
            )}
          </div>
        </div>
        
        {target && performance && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Rendimiento vs Meta</span>
              <span className={performance >= 100 ? "text-success" : performance >= 80 ? "text-warning" : "text-destructive"}>
                {formatPercent(performance)}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all ${
                  performance >= 100 ? "bg-success" : performance >= 80 ? "bg-warning" : "bg-destructive"
                }`}
                style={{ width: `${Math.min(performance, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
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
  const [cuadrosMap, setCuadrosMap] = useState<Map<string, Cuadro>>(new Map())
  const [loading, setLoading] = useState(true)
  const [anioComparacion, setAnioComparacion] = useState<{ base: string; comparacion: string }>({
    base: "2026",
    comparacion: "2025"
  })
  const [configuracionPL, setConfiguracionPL] = useState<ConfiguracionPL | null>(null)

  // Obtener años disponibles de los períodos
  const aniosDisponibles = useMemo(() => {
    const anios = Array.from(new Set(periodos.map(p => p.anio.toString())))
    return anios.sort((a, b) => parseInt(b) - parseInt(a)) // Más reciente primero
  }, [periodos])

  // Cargar datos y configuración
  const loadAllData = async () => {
    setLoading(true)
    try {
      const [config, ...cuadros] = await Promise.all([
        getConfiguracionPL(sucursalId === '__consolidado__' ? undefined : sucursalId),
        ...periodos.map(async (p) => {
          const c = await getCuadroAsync(p.key, sucursalId)
          return { periodo: p, cuadro: c }
        })
      ])
      
      setConfiguracionPL(config)
      
      const map = new Map<string, Cuadro>()
      cuadros.forEach(({ periodo, cuadro }) => {
        if (cuadro) map.set(periodo.key, cuadro)
      })
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

  // Actualizar años de comparación automáticamente
  useEffect(() => {
    if (aniosDisponibles.length >= 2) {
      setAnioComparacion({
        base: aniosDisponibles[0], // Más reciente
        comparacion: aniosDisponibles[1] // Segundo más reciente
      })
    } else if (aniosDisponibles.length === 1) {
      setAnioComparacion({
        base: aniosDisponibles[0],
        comparacion: aniosDisponibles[0]
      })
    }
  }, [aniosDisponibles])

  // Construir datos comparativos YTD dinámicos
  const { ytdChartData, ytdTotals } = useMemo(() => {
    const monthsData = MESES_NOMBRES.map((mesNombre, idx) => {
      const mesNum = idx + 1
      const mesPad = String(mesNum).padStart(2, '0')
      
      const kBase = `${anioComparacion.base}-${mesPad}`
      const kComp = `${anioComparacion.comparacion}-${mesPad}`

      const cBase = cuadrosMap.get(kBase)
      const cComp = cuadrosMap.get(kComp)

      return {
        mes: mesNombre,
        mesNum,
        cantBase: cBase?.total.articulos ?? null,
        cantComp: cComp?.total.articulos ?? null,
        costoBase: cBase?.total.costo ?? null,
        costoComp: cComp?.total.costo ?? null,
        cmgBase: cBase?.total.resultadoFinal ?? null,
        cmgComp: cComp?.total.resultadoFinal ?? null,
        factBase: cBase?.total.facturacion ?? null,
        factComp: cComp?.total.facturacion ?? null,
      }
    })

    // Calcular acumulados YTD
    let sumFactBase = 0, sumFactComp = 0
    let sumCmgBase = 0, sumCmgComp = 0
    let sumCostoBase = 0, sumCostoComp = 0
    let sumCantBase = 0, sumCantComp = 0

    for (const m of monthsData) {
      if (m.factBase) sumFactBase += m.factBase
      if (m.factComp) sumFactComp += m.factComp
      if (m.cmgBase) sumCmgBase += m.cmgBase
      if (m.cmgComp) sumCmgComp += m.cmgComp
      if (m.costoBase) sumCostoBase += m.costoBase
      if (m.costoComp) sumCostoComp += m.costoComp
      if (m.cantBase) sumCantBase += m.cantBase
      if (m.cantComp) sumCantComp += m.cantComp
    }

    return {
      ytdChartData: monthsData,
      ytdTotals: {
        factBase: sumFactBase,
        factComp: sumFactComp,
        varFactYtd: kpiVariacion(sumFactBase, sumFactComp),
        cmgBase: sumCmgBase,
        cmgComp: sumCmgComp,
        varCmgYtd: kpiVariacion(sumCmgBase, sumCmgComp),
        costoBase: sumCostoBase,
        costoComp: sumCostoComp,
        varCostoYtd: kpiVariacion(sumCostoBase, sumCostoComp),
        cantBase: sumCantBase,
        cantComp: sumCantComp,
        varCantYtd: kpiVariacion(sumCantBase, sumCantComp),
      }
    }
  }, [cuadrosMap, anioComparacion])

  // Trayectoria histórica
  const trayectoriaHistorica = useMemo(() => {
    return periodos.map((p) => {
      const c = cuadrosMap.get(p.key)
      if (!c) return null
      return {
        key: p.key,
        label: (p.label || p.key).toUpperCase(),
        facturacion: c.total.facturacion,
        costo: c.total.costo,
        cmg: c.total.resultadoFinal,
        margenPct: c.total.cmg,
        cantidad: c.total.articulos,
        value: c.total.facturacion // Para trends
      }
    }).filter(Boolean)
  }, [periodos, cuadrosMap])

  // Calcular ratios actuales usando configuración
  const ratiosActuales = useMemo(() => {
    if (!ytdTotals.factBase || !configuracionPL) return null

    const facturacionSinIVA = ytdTotals.factBase
    const margenCMg = ytdTotals.factBase > 0 ? (ytdTotals.cmgBase / ytdTotals.factBase) * 100 : 0
    const costoSobreVentas = ytdTotals.costoBase > 0 ? (ytdTotals.costoBase / ytdTotals.factBase) * 100 : 0
    const rotacionArticulos = ytdTotals.cantBase / 30 // Rotación diaria aproximada

    return {
      margenCMg,
      costoSobreVentas,
      rotacionArticulos,
      factSinIVA: facturacionSinIVA,
      metaMargenCMg: configuracionPL.ratios.rrhh * 100 + 15, // Meta: RRHH + 15% adicional
      metaCostoSobreVentas: configuracionPL.estimaciones.cmvSalon * 100,
    }
  }, [ytdTotals, configuracionPL])

  if (loading) {
    return <TransitionLoader fullPage />
  }

  if (cuadrosMap.size === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard de Gestión Ejecutivo YTD"
          subtitle="Monitoreo de tendencias históricas y comparativa de resultados entre períodos."
        />
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning">
              <AlertCircle className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-base font-semibold">Sin datos cargados</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-md">
                Aún no hay registros en la base de datos. Cargá archivos en la pestaña "Cargar Datos".
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Dashboard Ejecutivo YTD (${anioComparacion.base} vs ${anioComparacion.comparacion})`}
        subtitle="Análisis integral de performance financiera con comparativas interanuales y ratios clave de gestión."
        actions={
          <div className="flex items-center gap-3">
            {/* Selector de Años */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Comparar:</span>
              <Select 
                value={anioComparacion.base} 
                onValueChange={(value) => setAnioComparacion(prev => ({ ...prev, base: value }))}
              >
                <SelectTrigger className="w-[80px] bg-card h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aniosDisponibles.map(anio => (
                    <SelectItem key={anio} value={anio}>{anio}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">vs</span>
              <Select 
                value={anioComparacion.comparacion} 
                onValueChange={(value) => setAnioComparacion(prev => ({ ...prev, comparacion: value }))}
              >
                <SelectTrigger className="w-[80px] bg-card h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aniosDisponibles.map(anio => (
                    <SelectItem key={anio} value={anio}>{anio}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Sucursal */}
            <Select value={sucursalId} onValueChange={onSucursalChange}>
              <SelectTrigger className="w-[160px] bg-card h-8">
                <SelectValue placeholder="Sucursal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__consolidado__">🏬 Consolidado</SelectItem>
                {sucursales.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={loadAllData} variant="outline" size="sm" className="gap-2 bg-card h-8">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* BANNER EJECUTIVO YTD UNIFICADO */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-800/40 bg-gradient-to-r from-[#0b192e] via-[#0f2b4c] to-[#0a182b] p-6 sm:p-8 text-white shadow-2xl shadow-blue-950/50 before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-orange-500 before:via-amber-400 before:to-orange-600">
        {/* Marca de Agua con Logo de Monarca */}
        <img
          src="/supermercados_monarca_logo-removebg-preview__2_-1777696368463.ico"
          alt="Monarca Watermark"
          className="absolute -right-6 top-1/2 -translate-y-1/2 h-56 w-56 sm:h-72 sm:w-72 object-contain opacity-10 pointer-events-none select-none filter brightness-150 saturate-50"
        />

        {/* Encabezado del Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-blue-500/20 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Sparkles className="h-4 w-4 text-orange-400" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                Resumen Ejecutivo YTD
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30 lowercase">
                  {anioComparacion.base} vs {anioComparacion.comparacion}
                </span>
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium">Consolidado Acumulado YTD</span>
          </div>
        </div>

        {/* Grid de 4 KPIs Unificados */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 relative z-10 divide-y sm:divide-y-0 lg:divide-x divide-blue-500/20">
          
          {/* KPI 1: Facturación YTD */}
          <div className="flex flex-col justify-between space-y-3 lg:pr-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Banknote className="h-4 w-4 text-orange-400" />
                Facturación YTD
              </span>
              <DarkVariacionBadge actual={ytdTotals.factBase} anterior={ytdTotals.factComp} />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white tabular-nums">
                {loading ? "..." : formatCurrencyCompact(ytdTotals.factBase)}
              </div>
              <p className="mt-1 text-xs text-slate-300">
                vs {anioComparacion.comparacion}: <span className="font-semibold text-slate-200">{formatCurrencyCompact(ytdTotals.factComp)}</span>
              </p>
            </div>
          </div>

          {/* KPI 2: Contribución Marginal YTD */}
          <div className="flex flex-col justify-between space-y-3 pt-6 sm:pt-0 lg:px-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-orange-400" />
                Contribución Marginal YTD
              </span>
              <DarkVariacionBadge actual={ytdTotals.cmgBase} anterior={ytdTotals.cmgComp} />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white tabular-nums">
                {loading ? "..." : formatCurrencyCompact(ytdTotals.cmgBase)}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="text-slate-300">Margen:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  {ratiosActuales ? formatPercent(ratiosActuales.margenCMg) : "..."} CMg
                </span>
              </div>
            </div>
          </div>

          {/* KPI 3: Costo de Mercadería YTD */}
          <div className="flex flex-col justify-between space-y-3 pt-6 sm:pt-0 lg:px-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-orange-400" />
                Costo de Mercadería YTD
              </span>
              <DarkVariacionBadge actual={ytdTotals.costoBase} anterior={ytdTotals.costoComp} />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white tabular-nums">
                {loading ? "..." : formatCurrencyCompact(ytdTotals.costoBase)}
              </div>
              <p className="mt-1 text-xs text-slate-300">
                Incidencia: <span className="font-semibold text-orange-300">{ratiosActuales ? formatPercent(ratiosActuales.costoSobreVentas) : "..."}</span> de ventas
              </p>
            </div>
          </div>

          {/* KPI 4: Unidades Vendidas YTD */}
          <div className="flex flex-col justify-between space-y-3 pt-6 sm:pt-0 lg:pl-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Package className="h-4 w-4 text-orange-400" />
                Unidades Vendidas YTD
              </span>
              <DarkVariacionBadge actual={ytdTotals.cantBase} anterior={ytdTotals.cantComp} />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white tabular-nums">
                {loading ? "..." : formatNumber(ytdTotals.cantBase)}
              </div>
              <p className="mt-1 text-xs text-slate-300">
                Rotación: <span className="font-semibold text-slate-200">{ratiosActuales ? formatNumber(ratiosActuales.rotacionArticulos) : "..."} art/día</span>
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* FILA 2: RATIOS Y MÉTRICAS DE GESTIÓN */}
      {ratiosActuales && configuracionPL && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Ratios de Gestión y Performance</h2>
            <Badge variant="outline" className="text-xs">
              Basado en métricas configurables
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <RatioCard
              title="Margen de Contribución"
              ratio={ratiosActuales.margenCMg}
              target={ratiosActuales.metaMargenCMg}
              description="CMg sobre ventas sin IVA"
              icon={Target}
              color="success"
            />
            
            <RatioCard
              title="Incidencia de Costos"
              ratio={ratiosActuales.costoSobreVentas}
              target={ratiosActuales.metaCostoSobreVentas}
              description="CMV sobre facturación total"
              icon={Percent}
              color="destructive"
            />
            
            <RatioCard
              title="Rotación de Inventario"
              ratio={ratiosActuales.rotacionArticulos}
              description="Unidades promedio por día"
              icon={Activity}
              color="warning"
            />
            
            <RatioCard
              title="RRHH Configurado"
              ratio={configuracionPL.ratios.rrhh * 100}
              description="Peso planificado sobre ventas"
              icon={Users}
              color="primary"
            />
          </div>
        </div>
      )}

      {/* FILA 3: GRÁFICOS COMPARATIVOS INTERANUALES */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* GRÁFICO 1: CANTIDAD DE PRODUCTOS VENDIDOS */}
        <Card className="border-border hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              YTD Volumen de Productos
            </CardTitle>
            <CardDescription className="text-xs">
              Comparativa de unidades vendidas ({anioComparacion.base} vs {anioComparacion.comparacion})
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
                  <Bar dataKey="cantComp" name={`Año ${anioComparacion.comparacion}`} fill="#94a3b8" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="cantBase" name={`Año ${anioComparacion.base}`} fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* GRÁFICO 2: COSTO MERCADERÍA VENDIDA */}
        <Card className="border-border hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Wallet className="h-4 w-4 text-destructive" />
              YTD Costo de Mercadería
            </CardTitle>
            <CardDescription className="text-xs">
              Evolución del CMV mensual ({anioComparacion.base} vs {anioComparacion.comparacion})
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
                  <Bar dataKey="costoComp" name={`CMV ${anioComparacion.comparacion}`} fill="#cbd5e1" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="costoBase" name={`CMV ${anioComparacion.base}`} fill="#ef4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* GRÁFICO 3: CONTRIBUCIÓN MARGINAL */}
        <Card className="border-border hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              YTD Contribución Marginal
            </CardTitle>
            <CardDescription className="text-xs">
              Performance de margen mensual ({anioComparacion.base} vs {anioComparacion.comparacion})
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
                  <Bar dataKey="cmgComp" name={`CMg ${anioComparacion.comparacion}`} fill="#64748b" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="cmgBase" name={`CMg ${anioComparacion.base}`} fill="#10b981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILA 4: EVOLUCIÓN HISTÓRICA COMPLETA */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Trayectoria Histórica Completa
              </CardTitle>
              <CardDescription className="text-xs">
                Evolución temporal de facturación, contribución marginal y margen porcentual desde el primer registro.
              </CardDescription>
            </div>
            {trayectoriaHistorica.length > 0 && (
              <Badge variant="outline" className="text-xs font-mono">
                {trayectoriaHistorica.length} períodos
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {trayectoriaHistorica.length > 0 ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trayectoriaHistorica} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                  <Bar yAxisId="left" dataKey="facturacion" name="Facturación s/IVA" fill="#0b4da2" radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="left" dataKey="cmg" name="Contribución Marginal" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="margenPct" name="Margen % CMg" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-center">
              <div>
                <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">Sin datos históricos suficientes para mostrar la trayectoria.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FILA 5: PROYECCIONES Y MÓDULOS FUTUROS */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-success/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
            <Zap className="h-4 w-4" />
            Estructura Financiera & Roadmap de Módulos
          </CardTitle>
          <CardDescription className="text-xs">
            Indicadores estratégicos actuales y preparación para integración con módulos avanzados de RRHH y costos estructurales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-card/50 backdrop-blur-sm p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  Ratio CMg YTD Actual
                </span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {ratiosActuales ? formatPercent(ratiosActuales.margenCMg) : "..."}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Margen de contribución consolidado disponible para cubrir estructura de costos fijos.
              </p>
            </div>

            <div className="rounded-lg border bg-card/50 backdrop-blur-sm p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-warning" />
                  Módulo RRHH
                </span>
                <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20">
                  En desarrollo
                </Badge>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {configuracionPL ? formatPercent(configuracionPL.ratios.rrhh * 100) : "..."}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Ratio configurado de RRHH. Próximamente: nómina real, cargas sociales y análisis por sucursal.
              </p>
            </div>

            <div className="rounded-lg border bg-card/50 backdrop-blur-sm p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-accent" />
                  Punto de Equilibrio
                </span>
                <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/20">
                  Próximamente
                </Badge>
              </div>
              <div className="text-2xl font-bold text-foreground">— ARS</div>
              <p className="text-[11px] text-muted-foreground">
                Cálculo automático basado en costos fijos reales y estructura de gastos por sucursal.
              </p>
            </div>
          </div>

          {configuracionPL && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold">Métricas Configurables Activas</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Merma: <span className="font-mono">{formatPercent(configuracionPL.ratios.merma * 100)}</span></div>
                <div>Gastos Com.: <span className="font-mono">{formatPercent(configuracionPL.ratios.gastosComerciales * 100)}</span></div>
                <div>IIBB: <span className="font-mono">{formatPercent(configuracionPL.impuestos.iibb * 100)}</span></div>
                <div>IVA Aplicado: <span className="font-mono">{formatPercent(configuracionPL.ratios.iva * 100)}</span></div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Configurables en Admin → Métricas P&L. Los cambios se aplican inmediatamente a todos los cálculos.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

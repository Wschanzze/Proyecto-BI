"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, TrendingUp, DollarSign, Calendar, RefreshCw, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { TransitionLoader } from "../shared"
import { getCuadroFromDB } from "@/lib/data-db"
import { getConfiguracionPL } from "@/lib/metricas-admin"
import { getRRHHSubcuentas } from "@/lib/rrhh-subcuentas"
import { getCostosFijosSubcuentas } from "@/lib/costos-fijos-subcuentas"
import { getIngresosFinancierosSubcuentas } from "@/lib/ingresos-financieros-subcuentas"
import { calcularProyeccionAnual, calcularMAPE, type MesProyectado } from "@/lib/proyecciones"
import { calcularCuadroResultado, LINEAS_PL } from "./cuadro-simplificado"
import { formatCurrency, formatCurrencyCompact, formatPercent, formatSigned, periodoLabelCorto } from "@/lib/format"
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, ReferenceLine 
} from "recharts"
import { cn } from "@/lib/utils"

function DarkVariacionBadge({ actual, anterior, className }: { actual: number; anterior?: number | null; className?: string }) {
  if (anterior === undefined || anterior === null || anterior === 0) {
    return <span className="text-xs text-primary-foreground/60">—</span>
  }
  const val = ((actual - anterior) / anterior) * 100
  if (Number.isNaN(val)) return <span className="text-xs text-primary-foreground/60">—</span>
  const positivo = val >= 0
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-xs font-bold tabular-nums border shadow-sm",
        positivo 
          ? "bg-emerald-500/25 text-emerald-300 border-emerald-400/40" 
          : "bg-rose-500/25 text-rose-300 border-rose-400/40",
        className
      )}
    >
      {positivo ? <ArrowUpRight className="h-3.5 w-3.5 shrink-0" /> : <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />}
      {formatSigned(val)}
    </span>
  )
}

export function ProyectadoView() {
  const [loading, setLoading] = useState(true)
  const [anioSeleccionado, setAnioSeleccionado] = useState<string>("2026")
  const [mesesProyectados, setMesesProyectados] = useState<MesProyectado[]>([])
  const [realesPorMes, setRealesPorMes] = useState<Record<string, any>>({})
  
  // En un caso real esto vendría por props (como en app-shell), lo adaptamos a la vista
  const sucursalId = "__consolidado__"

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const config = await getConfiguracionPL()
        
        // Calcular Proyección Matemática para los 12 meses
        const proyeccion = calcularProyeccionAnual(parseInt(anioSeleccionado), config)
        setMesesProyectados(proyeccion)

        // Obtener Reales para los meses que ya ocurrieron
        const realesResult: Record<string, any> = {}
        
        const promesas = proyeccion.map(async (mes) => {
          try {
            const cuadro = await getCuadroFromDB(mes.key, sucursalId)
            if (!cuadro || cuadro.total.facturacion === 0) return
            
            const rrhhSubcuentas = await getRRHHSubcuentas(mes.key, sucursalId)
            const costosFijosSubcuentas = await getCostosFijosSubcuentas(mes.key, sucursalId)
            const ingresosFinancierosSubcuentas = await getIngresosFinancierosSubcuentas(mes.key, sucursalId)
            
            const pl = calcularCuadroResultado(
              cuadro.total.facturacion,
              cuadro.total.iva,
              cuadro.total.costo,
              config,
              rrhhSubcuentas,
              costosFijosSubcuentas,
              ingresosFinancierosSubcuentas
            )
            
            realesResult[mes.key] = pl
          } catch (e) {
            console.warn(`No se pudo cargar real para ${mes.key}`)
          }
        })
        
        await Promise.all(promesas)
        setRealesPorMes(realesResult)
      } catch (err) {
        console.error("Error al cargar proyecciones", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [anioSeleccionado])

  const chartData = useMemo(() => {
    return mesesProyectados.map(m => {
      const real = realesPorMes[m.key]
      return {
        name: m.labelCorto,
        Proyectado: m.resultadoTotal,
        Real: real ? real.resultadoTotal : null,
      }
    })
  }, [mesesProyectados, realesPorMes])

  // Calcular KPIs para tarjetas superiores
  const kpis = useMemo(() => {
    const rFact: number[] = []
    const pFact: number[] = []
    const rRes: number[] = []
    const pRes: number[] = []
    
    let factProyYTD = 0
    let factRealYTD = 0
    let resProyYTD = 0
    let resRealYTD = 0
    
    mesesProyectados.forEach(m => {
      const real = realesPorMes[m.key]
      if (real) {
        rFact.push(real.facturacion || 0)
        pFact.push(m.facturacion || 0)
        rRes.push(real.resultadoTotal || real.resultadoOperativo || 0)
        pRes.push(m.resultadoTotal || m.resultadoOperativo || 0)
        
        factRealYTD += (real.facturacion || 0)
        factProyYTD += (m.facturacion || 0)
        resRealYTD += (real.resultadoTotal || real.resultadoOperativo || 0)
        resProyYTD += (m.resultadoTotal || m.resultadoOperativo || 0)
      }
    })
    
    const mapeFact = calcularMAPE(rFact, pFact)
    const mapeRes = calcularMAPE(rRes, pRes)
    const mapeGlobal = (mapeFact !== null && mapeRes !== null) ? (mapeFact + mapeRes) / 2 : (mapeFact ?? mapeRes)

    return {
      factRealYTD,
      factProyYTD,
      resRealYTD,
      resProyYTD,
      mapeGlobal,
      mesesCargados: rFact.length
    }
  }, [mesesProyectados, realesPorMes])

  if (loading) {
    return <TransitionLoader fullPage />
  }

  return (
    <div className="space-y-6">
      {/* BANNER EJECUTIVO PROYECCIONES - AZUL CORPORATIVO MONARCA */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-accent/40 bg-gradient-to-r from-primary via-primary/95 to-primary p-6 sm:p-8 text-primary-foreground shadow-2xl shadow-primary/30 before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-accent">
        {/* Marca de Agua con Logo de Monarca */}
        <img
          src="/supermercados_monarca_logo-removebg-preview__2_-1777696368463.ico"
          alt="Monarca Watermark"
          className="absolute -right-6 top-1/2 -translate-y-1/2 h-56 w-56 sm:h-72 sm:w-72 object-contain opacity-15 pointer-events-none select-none filter brightness-200 contrast-125"
        />

        {/* Encabezado del Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-primary-foreground/20 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground shadow-xs font-bold">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-primary-foreground flex items-center gap-2">
                Proyecciones Anuales
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent/20 text-accent-foreground border border-accent/40 lowercase">
                  presupuesto vs real
                </span>
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary-foreground/80 font-medium">Ejercicio:</span>
              <Select value={anioSeleccionado} onValueChange={(v) => v && setAnioSeleccionado(v)}>
                <SelectTrigger className="w-[110px] bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground font-bold h-8">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2027">2027</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-primary-foreground/80">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="font-medium">Modelo Matemático Proyectado</span>
            </div>
          </div>
        </div>

        {/* Grid de 4 KPIs Unificados */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 relative z-10 divide-y sm:divide-y-0 lg:divide-x divide-primary-foreground/20">
          
          {/* KPI 1: Facturación YTD */}
          <div className="flex flex-col justify-between space-y-3 lg:pr-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/90 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-accent" />
                Facturación Acumulada YTD
              </span>
              <DarkVariacionBadge actual={kpis.factRealYTD} anterior={kpis.factProyYTD} />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary-foreground tabular-nums">
                {kpis.mesesCargados > 0 ? formatCurrencyCompact(kpis.factRealYTD) : "—"}
              </div>
              <p className="mt-1 text-xs text-primary-foreground/80">
                Proyectado YTD: <span className="font-semibold text-primary-foreground">{formatCurrencyCompact(kpis.factProyYTD)}</span>
              </p>
            </div>
          </div>

          {/* KPI 2: Resultado Operativo YTD */}
          <div className="flex flex-col justify-between space-y-3 pt-6 sm:pt-0 lg:px-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/90 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-accent" />
                Resultado Operativo YTD
              </span>
              <DarkVariacionBadge actual={kpis.resRealYTD} anterior={kpis.resProyYTD} />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary-foreground tabular-nums">
                {kpis.mesesCargados > 0 ? formatCurrencyCompact(kpis.resRealYTD) : "—"}
              </div>
              <p className="mt-1 text-xs text-primary-foreground/80">
                Proyectado YTD: <span className="font-semibold text-primary-foreground">{formatCurrencyCompact(kpis.resProyYTD)}</span>
              </p>
            </div>
          </div>

          {/* KPI 3: Precisión de Proyección (MAPE) */}
          <div className="flex flex-col justify-between space-y-3 pt-6 sm:pt-0 lg:px-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/90 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-accent" />
                Error de Proyección (MAPE)
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-accent/20 text-accent-foreground border border-accent/40">
                Precisión Promedio
              </span>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary-foreground tabular-nums">
                {kpis.mapeGlobal !== null ? formatPercent(kpis.mapeGlobal) : "—"}
              </div>
              <p className="mt-1 text-xs text-primary-foreground/80">
                Desviación sobre <span className="font-semibold text-primary-foreground">{kpis.mesesCargados} meses</span> transcurridos
              </p>
            </div>
          </div>

          {/* KPI 4: Progreso y Avance Anual */}
          <div className="flex flex-col justify-between space-y-3 pt-6 sm:pt-0 lg:pl-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/90 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-accent" />
                Avance del Ejercicio
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-400/40">
                {formatPercent((kpis.mesesCargados / 12) * 100)} del año
              </span>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary-foreground tabular-nums">
                {kpis.mesesCargados} / 12 meses
              </div>
              <p className="mt-1 text-xs text-primary-foreground/80">
                Períodos reales procesados en sistema
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* GRÁFICO */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolución: Resultado Total (Real vs Proyectado)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${(val / 1000000).toFixed(0)}M`}
                />
                <RechartsTooltip 
                  formatter={(val: number) => formatCurrency(val)}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="Proyectado" 
                  stroke="#94a3b8" 
                  strokeWidth={2} 
                  strokeDasharray="5 5" 
                  dot={{ r: 3, fill: '#94a3b8' }}
                  activeDot={{ r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Real" 
                  stroke="#0b4da2" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#0b4da2', strokeWidth: 2, stroke: 'white' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* TABLA P&L EVOLUTIVA */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Estado de Resultados Proyectado
            </CardTitle>
            <Badge variant="outline">Valores expresados en ARS</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th rowSpan={2} className="sticky left-0 z-20 bg-card px-4 py-4 text-left font-bold text-base min-w-[280px] border-r-2 border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] align-bottom">
                    Línea de Resultado
                  </th>
                  {mesesProyectados.map((m) => (
                    <th key={m.key} className="px-4 pt-4 pb-2 text-center min-w-[150px] whitespace-nowrap">
                      <div className="font-bold text-base text-foreground">{m.labelCorto}</div>
                    </th>
                  ))}
                </tr>
                <tr className="border-b-2 border-primary/20 bg-muted/30">
                  {mesesProyectados.map((m) => {
                    const esReal = !!realesPorMes[m.key]
                    return (
                      <th key={m.key + '-status'} className="px-4 pb-4 pt-2 text-center min-w-[150px] whitespace-nowrap">
                        <Badge 
                          variant={esReal ? "default" : "secondary"} 
                          className={cn(
                            "text-[10px] uppercase tracking-wider font-semibold", 
                            esReal ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/30"
                          )}
                        >
                          {esReal ? "Real" : "Proyectado"}
                        </Badge>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {LINEAS_PL.map((linea, i) => {
                  return (
                    <tr 
                      key={linea.key}
                      className={cn(
                        "group border-b border-border/50 transition-colors hover:bg-muted/50",
                        linea.tipo === 'resultado' && "bg-muted/30 font-semibold",
                        linea.tipo === 'resultado-principal' && "bg-primary/5 font-bold",
                        linea.tipo === 'resultado-total' && "bg-accent/10 font-bold border-b-2 border-accent/30"
                      )}
                    >
                      <td className="sticky left-0 z-10 p-0 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r-2 border-border bg-card">
                        <div className={cn(
                          "px-4 py-3 h-full w-full transition-colors",
                          "group-hover:bg-muted/50",
                          linea.tipo === 'resultado' && "bg-muted/50 group-hover:bg-muted",
                          linea.tipo === 'resultado-principal' && "bg-primary/10 group-hover:bg-primary/20",
                          linea.tipo === 'resultado-total' && "bg-accent/10 group-hover:bg-accent/20"
                        )}>
                          <div className="flex flex-col">
                            <span className={cn(
                              (linea.tipo === 'resultado' || linea.tipo === 'resultado-principal' || linea.tipo === 'resultado-total') 
                                ? "text-foreground font-medium" : "text-muted-foreground"
                            )}>
                              {linea.label}
                            </span>
                          </div>
                        </div>
                      </td>
                      {mesesProyectados.map(m => {
                        const realObj = realesPorMes[m.key]
                        const valorProy = (m as any)[linea.key] as number
                        const valorReal = realObj ? ((realObj as any)[linea.key] as number) : null
                        
                        return (
                          <td key={m.key} className="px-4 py-3 text-right whitespace-nowrap">
                            {valorReal !== null ? (
                              <div className="flex flex-col">
                                <span className={cn(
                                  "font-medium",
                                  linea.tipo === 'resultado-total' && valorReal > 0 ? "text-success" : 
                                  linea.tipo === 'resultado-total' && valorReal < 0 ? "text-destructive" : ""
                                )}>
                                  {formatCurrency(valorReal)}
                                </span>
                                <span className="text-[10px] text-muted-foreground/70 flex items-center justify-end gap-1 mt-0.5">
                                  Proy: {formatCurrency(valorProy)}
                                  {valorReal !== 0 && (
                                    <span className={Math.abs((valorReal - valorProy) / valorReal) > 0.1 ? "text-destructive" : "text-success"}>
                                      ({formatPercent(Math.abs((valorReal - valorProy) / Math.abs(valorReal)) * 100)} err)
                                    </span>
                                  )}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span className={cn(
                                  "italic text-muted-foreground/60",
                                  linea.tipo === 'resultado-total' && valorProy > 0 ? "text-success/60" : 
                                  linea.tipo === 'resultado-total' && valorProy < 0 ? "text-destructive/60" : ""
                                )}>
                                  {formatCurrency(valorProy)}
                                </span>
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

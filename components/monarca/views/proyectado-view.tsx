"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, TrendingUp, DollarSign, Calendar, RefreshCw } from "lucide-react"
import { TransitionLoader } from "../shared"
import { getCuadroFromDB } from "@/lib/data-db"
import { getConfiguracionPL } from "@/lib/metricas-admin"
import { getRRHHSubcuentas } from "@/lib/rrhh-subcuentas"
import { getCostosFijosSubcuentas } from "@/lib/costos-fijos-subcuentas"
import { getIngresosFinancierosSubcuentas } from "@/lib/ingresos-financieros-subcuentas"
import { calcularProyeccionAnual, calcularMAPE, type MesProyectado } from "@/lib/proyecciones"
import { calcularCuadroResultado, LINEAS_PL } from "./cuadro-simplificado"
import { formatCurrency, formatPercent, periodoLabelCorto } from "@/lib/format"
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, ReferenceLine 
} from "recharts"
import { cn } from "@/lib/utils"

export function ProyectadoView() {
  const [loading, setLoading] = useState(true)
  const [anioSeleccionado, setAnioSeleccionado] = useState<string>(new Date().getFullYear().toString())
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
    
    let factProyTotal = 0
    let factProyYTD = 0
    let factRealYTD = 0
    
    let resProyTotal = 0
    let resProyYTD = 0
    let resRealYTD = 0
    
    mesesProyectados.forEach(m => {
      factProyTotal += m.facturacion
      resProyTotal += m.resultadoOperativo
      
      const real = realesPorMes[m.key]
      if (real) {
        rFact.push(real.facturacion)
        pFact.push(m.facturacion)
        rRes.push(real.resultadoOperativo)
        pRes.push(m.resultadoOperativo)
        
        factRealYTD += real.facturacion
        factProyYTD += m.facturacion
        resRealYTD += real.resultadoOperativo
        resProyYTD += m.resultadoOperativo
      }
    })
    
    const mapeGlobal = calcularMAPE([...rFact, ...rRes], [...pFact, ...pRes])
    
    return {
      factProyTotal,
      factRealYTD,
      factProyYTD,
      resProyTotal,
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
      {/* HEADER & SELECTOR DE AÑO */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-accent" />
            Proyecciones Anuales {anioSeleccionado}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Comparativa de P&L: Datos reales vs Presupuesto proyectado matemáticamente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={anioSeleccionado} onValueChange={setAnioSeleccionado}>
            <SelectTrigger className="w-[120px] bg-card">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* TARJETAS KPI */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Facturación Acumulada YTD</p>
                <div className="flex items-end gap-2 mt-1">
                  <h3 className="text-2xl font-bold">
                    {kpis.mesesCargados > 0 ? formatCurrency(kpis.factRealYTD) : "—"}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Proyectado YTD: <span className="font-medium">{formatCurrency(kpis.factProyYTD)}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-success/10 rounded-full">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rtdo. Operativo Acumulado</p>
                <div className="flex items-end gap-2 mt-1">
                  <h3 className="text-2xl font-bold">
                    {kpis.mesesCargados > 0 ? formatCurrency(kpis.resRealYTD) : "—"}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Proyectado YTD: <span className="font-medium">{formatCurrency(kpis.resProyYTD)}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-accent/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-accent/20 rounded-full">
                <Sparkles className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Margen de Error (MAPE Global)</p>
                <div className="flex items-center gap-2 mt-1">
                  <h3 className="text-2xl font-bold">
                    {kpis.mapeGlobal !== null ? formatPercent(kpis.mapeGlobal) : "—"}
                  </h3>
                  {kpis.mesesCargados > 0 && <Badge variant="secondary" className="text-xs">Precisión Promedio</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  En base a los {kpis.mesesCargados} meses transcurridos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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

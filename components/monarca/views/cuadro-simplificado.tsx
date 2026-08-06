// components/monarca/views/cuadro-simplificado.tsx
"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  AlertCircle,
  Building2,
  Users,
  Package,
  Ruler,
  Calculator,
  Info,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader, FiltrosSelector, TransitionLoader } from "@/components/monarca/shared"
import { getCuadroAsync } from "@/lib/data"
import { getConfiguracionPL } from "@/lib/metricas-admin"
import type { Cuadro, Periodo, CuadroResultadoLinea, KPIsComplementarios, ConfiguracionPL } from "@/lib/data"
import type { DBSucursal } from "@/lib/supabase"
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  formatNumber,
  periodoLabel,
  periodoLabelCorto,
} from "@/lib/format"

// Función para calcular cuadro de resultado P&L desde datos base
function calcularCuadroResultado(
  ventasConIva: number,
  iva: number,
  cmv: number,
  config: ConfiguracionPL
): CuadroResultadoLinea {
  const ventasSinIva = ventasConIva - iva
  const contribucionMarginal = ventasSinIva - cmv
  const rrhh = ventasSinIva * config.ratios.rrhh
  const gastosComerciales = ventasSinIva * config.ratios.gastosComerciales
  const resultadoOperativo = contribucionMarginal - rrhh - gastosComerciales
  const impuestos = ventasSinIva * config.ratios.impuestosOperativos
  const gastos = ventasSinIva * config.ratios.gastosGenerales
  const merma = ventasSinIva * config.ratios.merma
  const resultadoSupermercado = resultadoOperativo - impuestos - gastos - merma
  const ingresosFinancieros = ventasSinIva * config.ratios.ingresosFinancieros
  const resultadoFinal = resultadoSupermercado + ingresosFinancieros
  const resultadoImpositivo = (iva * config.impuestos.ivaResultado) + (ventasSinIva * config.impuestos.iibb) + (ventasSinIva * config.impuestos.tuae)
  const resultadoTotal = resultadoFinal + resultadoImpositivo

  return {
    ventasConIva,
    iva,
    ventasSinIva,
    cmv,
    contribucionMarginal,
    rrhh,
    gastosComerciales,
    resultadoOperativo,
    impuestos,
    gastos,
    merma,
    resultadoSupermercado,
    ingresosFinancieros,
    resultadoFinal,
    resultadoImpositivo,
    resultadoTotal,
  }
}
// Generar KPIs complementarios usando configuración dinámica
function generarKPIsComplementarios(ventasSinIva: number, config: ConfiguracionPL): KPIsComplementarios {
  return {
    sucursales: {
      activas: 5,
      inactivas: 0,
      nuevas: 0,
    },
    clientes: {
      activos: Math.round(ventasSinIva / config.kpis.clientesPorVenta),
      nuevos: Math.round(ventasSinIva / (config.kpis.clientesPorVenta * 4)),
      recurrentes: Math.round(ventasSinIva / (config.kpis.clientesPorVenta * 1.2)),
      ticketPromedio: config.kpis.ticketPromedio,
    },
    articulos: {
      sku: config.kpis.skuTotal,
      rotacion: config.kpis.rotacionPromedio,
      stockout: config.kpis.stockoutPromedio,
    },
    metros: {
      totalSalon: config.kpis.metrosSalon,
      metrosCuadrados: config.kpis.metrosTotales,
      facturacionPorMetro: ventasSinIva / config.kpis.metrosTotales,
    },
  }
}

function calcularVariacion(actual: number, anterior: number | null): number | null {
  if (anterior === null || anterior === 0) return null
  return ((actual - anterior) / Math.abs(anterior)) * 100
}

function VariacionCell({ actual, anterior }: { actual: number; anterior: number | null }) {
  const variacion = calcularVariacion(actual, anterior)
  
  if (variacion === null) {
    return <span className="text-muted-foreground">—</span>
  }

  const isPositive = variacion > 0
  const isNegative = variacion < 0
  
  return (
    <div className="flex items-center gap-1">
      {isPositive && <TrendingUp className="h-3 w-3 text-success" />}
      {isNegative && <TrendingDown className="h-3 w-3 text-destructive" />}
      {variacion === 0 && <Minus className="h-3 w-3 text-muted-foreground" />}
      <span className={cn(
        "text-xs font-medium",
        isPositive ? "text-success" : isNegative ? "text-destructive" : "text-muted-foreground"
      )}>
        {formatPercent(Math.abs(variacion))}
      </span>
    </div>
  )
}

// Definición de líneas del P&L
const LINEAS_PL = [
  { key: 'ventasConIva', label: 'Ventas con IVA', tipo: 'ingreso', tooltip: 'Facturación total incluyendo IVA' },
  { key: 'iva', label: 'IVA', tipo: 'separado', tooltip: 'Impuesto al Valor Agregado' },
  { key: 'ventasSinIva', label: 'Ventas sin IVA', tipo: 'ingreso', tooltip: 'Base para cálculo de margen y rentabilidad' },
  { key: 'cmv', label: 'CMV (Costo Mercadería Vendida)', tipo: 'costo', tooltip: 'Costo directo de los productos vendidos' },
  { key: 'contribucionMarginal', label: 'Contribución Marginal', tipo: 'resultado', tooltip: 'Ventas sin IVA - CMV' },
  { key: 'rrhh', label: 'RRHH', tipo: 'costo', tooltip: 'Gastos de personal y cargas sociales' },
  { key: 'gastosComerciales', label: 'Gastos Comerciales', tipo: 'costo', tooltip: 'Gastos de marketing y comercialización' },
  { key: 'resultadoOperativo', label: 'Resultado Operativo', tipo: 'resultado', tooltip: 'Contribución Marginal - RRHH - Gastos Comerciales' },
  { key: 'impuestos', label: 'Impuestos', tipo: 'costo', tooltip: 'Impuestos y cargas operativas' },
  { key: 'gastos', label: 'Gastos', tipo: 'costo', tooltip: 'Gastos operativos generales' },
  { key: 'merma', label: 'Merma', tipo: 'costo', tooltip: '1.6% × Ventas sin IVA (cálculo estándar)' },
  { key: 'resultadoSupermercado', label: 'Resultado Supermercado', tipo: 'resultado-principal', tooltip: 'Resultado Operativo - Impuestos - Gastos - Merma' },
  { key: 'ingresosFinancieros', label: 'Ingresos Financieros', tipo: 'ingreso', tooltip: 'Ingresos financieros externos a la operación comercial' },
  { key: 'resultadoFinal', label: 'Resultado Final', tipo: 'resultado-final', tooltip: 'Resultado Supermercado + Ingresos Financieros' },
  { key: 'resultadoImpositivo', label: 'Resultado Impositivo', tipo: 'separado', tooltip: '19% IVA + IIBB + TUAE' },
  { key: 'resultadoTotal', label: 'Resultado Total', tipo: 'resultado-total', tooltip: 'Resultado Final + Resultado Impositivo' },
] as const
export function CuadroSimplificado({
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
  const [loading, setLoading] = useState(true)
  const [cuadrosPorPeriodo, setCuadrosPorPeriodo] = useState<{ periodo: Periodo; cuadro: Cuadro | null }[]>([])
  const [mostrarKPIs, setMostrarKPIs] = useState(true)
  const [configuracionPL, setConfiguracionPL] = useState<ConfiguracionPL | null>(null)

  // Cargar datos de todos los períodos y configuración
  const loadData = async () => {
    if (periodos.length === 0) return
    setLoading(true)
    try {
      // Cargar configuración P&L y datos en paralelo
      const [config, ...results] = await Promise.all([
        getConfiguracionPL(sucursalId === '__consolidado__' ? undefined : sucursalId),
        ...periodos.map(async (p) => {
          const c = await getCuadroAsync(p.key, sucursalId)
          return { periodo: p, cuadro: c }
        })
      ])
      
      setConfiguracionPL(config)
      setCuadrosPorPeriodo(results)
    } catch (err) {
      console.error("Error al cargar cuadros de resultado:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [periodos, sucursalId])

  // Calcular P&L para cada período usando configuración dinámica
  const cuadrosResultado = useMemo(() => {
    if (!configuracionPL) return []
    
    return cuadrosPorPeriodo.map(({ periodo, cuadro }) => {
      if (!cuadro) return { periodo, pl: null, kpis: null }
      
      // Convertir datos actuales a estructura P&L usando configuración dinámica
      const ventasConIva = cuadro.total.facturacion * (1 + configuracionPL.ratios.iva)
      const iva = ventasConIva - cuadro.total.facturacion
      const cmv = cuadro.total.costo || (cuadro.total.facturacion * configuracionPL.estimaciones.cmvSalon)

      const pl = calcularCuadroResultado(
        ventasConIva,
        iva,
        cmv,
        configuracionPL
      )

      const kpis = generarKPIsComplementarios(pl.ventasSinIva, configuracionPL)

      return { periodo, pl, kpis }
    })
  }, [cuadrosPorPeriodo, configuracionPL])
  if (loading) {
    return <TransitionLoader fullPage />
  }

  if (cuadrosResultado.length === 0) {
    return (
      <div>
        <PageHeader
          title="Cuadro de Resultado Mensual — P&L Ejecutivo"
          subtitle="Cuadro de Pérdidas y Ganancias con evolución mensual y KPIs complementarios."
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
                No hay registros para generar el cuadro de resultados.
                Cargá archivos en la pestaña "Cargar Datos" o ejecutá el Seed inicial.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Tomar los últimos 6 períodos para visualización
  const periodosVisibles = cuadrosResultado.slice(-6)
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cuadro de Resultado Mensual — P&L Ejecutivo"
        subtitle="Estado de Pérdidas y Ganancias con evolución mensual, variaciones y KPIs complementarios de gestión."
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

      {/* KPIs Complementarios */}
      {mostrarKPIs && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* KPI Sucursales */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <Building2 className="h-4 w-4 text-primary" />
                  Sucursales
                </h4>
                <Badge variant="secondary" className="text-xs">
                  {periodosVisibles[periodosVisibles.length - 1]?.kpis?.sucursales.activas || 0}
                </Badge>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Activas:</span>
                  <span className="font-medium">{periodosVisibles[periodosVisibles.length - 1]?.kpis?.sucursales.activas || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nuevas:</span>
                  <span className="font-medium">{periodosVisibles[periodosVisibles.length - 1]?.kpis?.sucursales.nuevas || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* KPI Clientes */}
          <Card className="border-success/20 bg-success/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <Users className="h-4 w-4 text-success" />
                  Clientes
                </h4>
                <Badge variant="secondary" className="text-xs">
                  {formatNumber(periodosVisibles[periodosVisibles.length - 1]?.kpis?.clientes.activos || 0)}
                </Badge>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Ticket Prom:</span>
                  <span className="font-medium">{formatCurrency(periodosVisibles[periodosVisibles.length - 1]?.kpis?.clientes.ticketPromedio || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nuevos:</span>
                  <span className="font-medium">{formatNumber(periodosVisibles[periodosVisibles.length - 1]?.kpis?.clientes.nuevos || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Artículos */}
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <Package className="h-4 w-4 text-warning" />
                  Artículos
                </h4>
                <Badge variant="secondary" className="text-xs">
                  {formatNumber(periodosVisibles[periodosVisibles.length - 1]?.kpis?.articulos.sku || 0)} SKUs
                </Badge>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Rotación:</span>
                  <span className="font-medium">{periodosVisibles[periodosVisibles.length - 1]?.kpis?.articulos.rotacion || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Stockout:</span>
                  <span className="font-medium">{periodosVisibles[periodosVisibles.length - 1]?.kpis?.articulos.stockout || 0}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Metros */}
          <Card className="border-accent/20 bg-accent/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <Ruler className="h-4 w-4 text-accent" />
                  Metros
                </h4>
                <Badge variant="secondary" className="text-xs">
                  {formatNumber(periodosVisibles[periodosVisibles.length - 1]?.kpis?.metros.metrosCuadrados || 0)} m²
                </Badge>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Fact/m²:</span>
                  <span className="font-medium">{formatCurrency(periodosVisibles[periodosVisibles.length - 1]?.kpis?.metros.facturacionPorMetro || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Salón:</span>
                  <span className="font-medium">{formatNumber(periodosVisibles[periodosVisibles.length - 1]?.kpis?.metros.totalSalon || 0)} m²</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Cuadro Principal P&L */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              Estado de Pérdidas y Ganancias — Evolución Mensual
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMostrarKPIs(!mostrarKPIs)}
                className="text-xs"
              >
                {mostrarKPIs ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                KPIs
              </Button>
              <Badge variant="outline" className="text-xs">
                Últimos {periodosVisibles.length} períodos
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-accent text-accent-foreground">
                  <th className="sticky left-0 z-10 bg-accent px-4 py-3 text-left font-semibold min-w-[280px] border-r border-accent/20">
                    Línea de Resultado
                  </th>
                  {periodosVisibles.map(({ periodo }) => (
                    <th key={periodo.key} className="px-3 py-3 text-right font-semibold whitespace-nowrap min-w-[120px]">
                      {periodoLabelCorto(periodo.anio, periodo.mes)}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-semibold min-w-[100px]">
                    Variación
                  </th>
                </tr>
              </thead>
              <tbody>
                {LINEAS_PL.map(({ key, label, tipo, tooltip }) => {
                  const valores = periodosVisibles.map(({ pl }) => pl?.[key as keyof CuadroResultadoLinea] || 0)
                  const ultimoValor = valores[valores.length - 1]
                  const penultimoValor = valores.length > 1 ? valores[valores.length - 2] : null

                  return (
                    <tr 
                      key={key} 
                      className={cn(
                        "border-b border-border hover:bg-muted/40 transition-colors",
                        tipo === 'resultado-principal' && "bg-primary/5 font-semibold border-primary/20",
                        tipo === 'resultado-final' && "bg-success/5 font-semibold border-success/20",
                        tipo === 'resultado-total' && "bg-accent font-bold border-accent/40",
                        (tipo === 'costo') && "text-muted-foreground",
                      )}
                    >
                      <td className={cn(
                        "sticky left-0 z-10 px-4 py-3 min-w-[280px] border-r border-border",
                        tipo === 'resultado-principal' && "bg-primary/5",
                        tipo === 'resultado-final' && "bg-success/5",
                        tipo === 'resultado-total' && "bg-accent",
                        !(tipo === 'resultado-principal' || tipo === 'resultado-final' || tipo === 'resultado-total') && "bg-card"
                      )}>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            tipo === 'resultado-total' && "font-bold",
                            (tipo === 'resultado-principal' || tipo === 'resultado-final') && "font-semibold"
                          )}>
                            {label}
                          </span>
                          <Info className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" title={tooltip} />
                        </div>
                      </td>
                      {valores.map((valor, idx) => (
                        <td key={idx} className="px-3 py-3 text-right tabular-nums">
                          <span className={cn(
                            tipo === 'costo' && valor > 0 && "text-destructive",
                            (tipo === 'ingreso' || tipo === 'resultado' || tipo === 'resultado-principal' || tipo === 'resultado-final') && valor > 0 && "text-success",
                            valor < 0 && "text-destructive",
                            valor === 0 && "text-muted-foreground"
                          )}>
                            {formatCurrency(valor)}
                          </span>
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center">
                        <VariacionCell actual={ultimoValor} anterior={penultimoValor} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      {/* Nota Metodológica */}
      <Card className="border-muted">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Metodología de Cálculo:</p>
              <p>• Los valores son calculados usando métricas configurables desde el panel de administración.</p>
              <p>• Los ratios de RRHH, Gastos, Impuestos y CMV se obtienen de la tabla "metricas_configurables" en Supabase.</p>
              <p>• La Merma se calcula usando el porcentaje configurado en Admin → Métricas P&L.</p>
              <p>• Los KPIs complementarios usan valores dinámicos configurables por sucursal.</p>
              <p>• Para ajustar los ratios, accede a /admin → Métricas P&L (requiere PIN de administrador).</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
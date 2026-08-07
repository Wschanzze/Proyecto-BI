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
import { getRRHHSubcuentas } from "@/lib/rrhh-subcuentas"
import type { Cuadro, Periodo, CuadroResultadoLinea, KPIsComplementarios, ConfiguracionPL, RRHHSubcuentasDetalle } from "@/lib/data"
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
  facturacion: number,
  iva: number,
  cmv: number,
  config: ConfiguracionPL,
  rrhhSubcuentas: RRHHSubcuentasDetalle | null
): CuadroResultadoLinea {
  const ventasSinIva = facturacion - iva
  const contribucionMarginal = ventasSinIva - cmv
  
  // RRHH: usar datos reales si existen, sino usar ratio
  let rrhh: number
  let subcuentas: RRHHSubcuentasDetalle
  
  if (rrhhSubcuentas && rrhhSubcuentas.sueldos > 0) {
    // Usar datos reales cargados
    rrhh = rrhhSubcuentas.sueldos + rrhhSubcuentas.cargas_sociales + 
           rrhhSubcuentas.indemnizaciones + rrhhSubcuentas.tabla_merito
    subcuentas = rrhhSubcuentas
  } else {
    // Fallback a ratio si no hay datos cargados
    rrhh = ventasSinIva * config.ratios.rrhh
    subcuentas = {
      sueldos: rrhh * 0.70, // 70% sueldos
      cargas_sociales: rrhh * 0.30, // 30% cargas
      indemnizaciones: 0,
      tabla_merito: 0,
    }
  }
  
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
    facturacion,
    iva,
    ventasSinIva,
    cmv,
    contribucionMarginal,
    rrhh,
    rrhhSubcuentas: subcuentas,
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

function VariacionCell({ actual, anterior, esTotalNeto }: { actual: number; anterior: number | null; esTotalNeto?: boolean }) {
  const variacion = calcularVariacion(actual, anterior)
  
  if (variacion === null) {
    return <span className={cn("text-muted-foreground", esTotalNeto && "text-primary-foreground/60")}>—</span>
  }

  const isPositive = variacion > 0
  const isNegative = variacion < 0
  
  return (
    <div className="flex items-center justify-center gap-1">
      {isPositive && <TrendingUp className={cn("h-3 w-3 text-success", esTotalNeto && "text-success")} />}
      {isNegative && <TrendingDown className={cn("h-3 w-3 text-destructive", esTotalNeto && "text-destructive")} />}
      {variacion === 0 && <Minus className={cn("h-3 w-3 text-muted-foreground", esTotalNeto && "text-primary-foreground/60")} />}
      <span className={cn(
        "text-xs font-medium",
        isPositive ? "text-success" : isNegative ? "text-destructive" : "text-muted-foreground",
        esTotalNeto && "text-primary-foreground"
      )}>
        {formatPercent(Math.abs(variacion))}
      </span>
    </div>
  )
}

// Definición de líneas del P&L con categorías de agrupación
const LINEAS_PL = [
  // INGRESOS
  { key: 'facturacion', label: 'Facturación', tipo: 'ingreso', seccion: 'Ingresos', tooltip: 'Facturación total incluyendo IVA' },
  { key: 'iva', label: 'IVA', tipo: 'separado', seccion: 'Ingresos', tooltip: 'Impuesto al Valor Agregado' },
  { key: 'ventasSinIva', label: 'Ventas sin IVA', tipo: 'ingreso-base', seccion: 'Ingresos', tooltip: 'Base para cálculo de margen y rentabilidad' },
  
  // COSTOS
  { key: 'cmv', label: 'CMV (Costo Mercadería Vendida)', tipo: 'costo', seccion: 'Costos', tooltip: 'Costo directo de los productos vendidos' },
  { key: 'contribucionMarginal', label: 'Contribución Marginal', tipo: 'resultado', seccion: 'Resultado Bruto', tooltip: 'Margen bruto: Ventas sin IVA − CMV' },
  
  // GASTOS OPERATIVOS
  { key: 'rrhh', label: 'RRHH (Personal y Cargas Sociales)', tipo: 'gasto-op', seccion: 'Gastos Operativos', tooltip: 'Gastos de personal y cargas sociales' },
  { key: 'gastosComerciales', label: 'Gastos Comerciales', tipo: 'gasto-op', seccion: 'Gastos Operativos', tooltip: 'Gastos de marketing y comercialización' },
  { key: 'impuestos', label: 'Impuestos Operativos', tipo: 'gasto-op', seccion: 'Gastos Operativos', tooltip: 'Impuestos y cargas operativas' },
  { key: 'gastos', label: 'Gastos Generales', tipo: 'gasto-op', seccion: 'Gastos Operativos', tooltip: 'Gastos operativos generales' },
  { key: 'merma', label: 'Merma', tipo: 'gasto-op', seccion: 'Gastos Operativos', tooltip: 'Pérdidas por merma (1.6% × Ventas sin IVA)' },
  { key: 'resultadoOperativo', label: 'Resultado Operativo', tipo: 'resultado', seccion: 'Resultado Operativo', tooltip: 'Margen bruto menos gastos operativos' },
  
  // RESULTADO SUPERMERCADO
  { key: 'resultadoSupermercado', label: 'Resultado Supermercado', tipo: 'resultado-principal', seccion: 'Resultado Supermercado', tooltip: 'Resultado operativo final del negocio' },
  
  // OTROS INGRESOS
  { key: 'ingresosFinancieros', label: 'Ingresos Financieros', tipo: 'ingreso-otro', seccion: 'Otros Ingresos', tooltip: 'Ingresos financieros externos a la operación comercial' },
  { key: 'resultadoFinal', label: 'Resultado Final', tipo: 'resultado-final', seccion: 'Resultado Final', tooltip: 'Resultado supermercado + Ingresos financieros' },
  
  // IMPACTO TRIBUTARIO
  { key: 'resultadoImpositivo', label: 'Ajustes Tributarios', tipo: 'separado', seccion: 'Impacto Tributario', tooltip: '19% IVA + IIBB + TUAE' },
  { key: 'resultadoTotal', label: 'Resultado Total (NETO)', tipo: 'resultado-total', seccion: 'Resultado Total', tooltip: 'Resultado final + Ajustes tributarios' },
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
  const [rrhhExpanded, setRrhhExpanded] = useState<{ [key: string]: boolean }>({}) // Estado del acordeón RRHH

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

  // Calcular P&L para cada período usando datos REALES de la base de datos
  const [cuadrosResultado, setCuadrosResultado] = useState<{ periodo: Periodo; pl: CuadroResultadoLinea | null; kpis: KPIsComplementarios | null }[]>([])
  
  useEffect(() => {
    if (!configuracionPL || cuadrosPorPeriodo.length === 0) {
      setCuadrosResultado([])
      return
    }
    
    async function calcularConRRHH() {
      const results = await Promise.all(
        cuadrosPorPeriodo.map(async ({ periodo, cuadro }) => {
          if (!cuadro) return { periodo, pl: null, kpis: null }
          
          // USAR DATOS REALES de la base de datos
          const facturacion = cuadro.total.facturacion // Facturación real (YA incluye IVA)
          const iva = cuadro.total.iva // IVA real del sistema
          const cmv = cuadro.total.costo // Costo real del sistema (CMV)

          // Obtener subcuentas RRHH reales
          const rrhhSubcuentas = await getRRHHSubcuentas(periodo.key, sucursalId)

          const pl = calcularCuadroResultado(
            facturacion,
            iva,
            cmv,
            configuracionPL!,
            rrhhSubcuentas
          )

          const kpis = generarKPIsComplementarios(pl.ventasSinIva, configuracionPL!)

          return { periodo, pl, kpis }
        })
      )
      setCuadrosResultado(results)
    }
    
    calcularConRRHH()
  }, [cuadrosPorPeriodo, configuracionPL, sucursalId])
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
                <tr className="border-b-2 border-accent bg-accent text-accent-foreground">
                  <th className="sticky left-0 z-10 bg-accent px-4 py-4 text-left font-bold text-base min-w-[300px] border-r-2 border-accent/30 text-accent-foreground">
                    Línea de Resultado
                  </th>
                  {periodosVisibles.map(({ periodo }) => (
                    <th key={periodo.key} className="px-4 py-4 text-right font-bold whitespace-nowrap min-w-[130px] text-accent-foreground">
                      <span className="text-base">{periodoLabelCorto(periodo.anio, periodo.mes)}</span>
                    </th>
                  ))}
                  <th className="px-4 py-4 text-center font-bold min-w-[110px] text-accent-foreground">
                    <span className="text-base">Variación</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let seccionAnterior = ''
                  return LINEAS_PL.map(({ key, label, tipo, tooltip, seccion }) => {
                    const valores = periodosVisibles.map(({ pl }) => pl?.[key as keyof CuadroResultadoLinea] || 0)
                    const ultimoValor = valores[valores.length - 1]
                    const penultimoValor = valores.length > 1 ? valores[valores.length - 2] : null
                    
                    const mostraSeparador = seccion !== seccionAnterior
                    seccionAnterior = seccion

                    return (
                      <Fragment key={key}>
                        {/* Encabezado de sección */}
                        {mostraSeparador && (
                          <tr className="h-2 border-t-2 border-border/50">
                            <td colSpan={periodosVisibles.length + 3} className="bg-muted/30 h-2" />
                          </tr>
                        )}
                        {mostraSeparador && (
                          <tr className="bg-muted/20 border-b border-border/40">
                            <td colSpan={periodosVisibles.length + 3} className="px-4 py-2">
                              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                {seccion}
                              </span>
                            </td>
                          </tr>
                        )}
                        
                        {/* Línea de datos */}
                        <tr 
                          className={cn(
                            "border-b border-border transition-all hover:bg-muted/50",
                            key === 'rrhh' && "cursor-pointer", // RRHH es expandible
                            tipo === 'resultado-principal' && "bg-gradient-to-r from-primary/8 to-primary/5 border-primary/30 font-semibold",
                            tipo === 'resultado-final' && "bg-gradient-to-r from-success/8 to-success/5 border-success/30 font-semibold",
                            tipo === 'resultado-total' && "bg-primary border-primary/50 font-bold text-primary-foreground",
                            tipo === 'ingreso-base' && "bg-success/3 border-success/20",
                          )}
                          onClick={() => key === 'rrhh' && setRrhhExpanded(prev => ({ ...prev, [key]: !prev[key] }))}
                        >
                          <td className={cn(
                            "sticky left-0 z-10 px-4 py-3.5 min-w-[300px] border-r border-border/40 font-medium text-sm",
                            tipo === 'resultado-principal' && "bg-gradient-to-r from-primary/8 to-primary/5",
                            tipo === 'resultado-final' && "bg-gradient-to-r from-success/8 to-success/5",
                            tipo === 'resultado-total' && "bg-primary text-primary-foreground",
                            tipo === 'ingreso-base' && "bg-success/3",
                            !(tipo === 'resultado-principal' || tipo === 'resultado-final' || tipo === 'resultado-total' || tipo === 'ingreso-base') && "bg-card"
                          )}>
                            <div className="flex items-center gap-2 group">
                              {key === 'rrhh' && (
                                rrhhExpanded[key] 
                                  ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                  : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              <span className={cn(
                                tipo === 'resultado-total' && "text-primary-foreground font-bold",
                                tipo === 'resultado-principal' && "text-primary",
                                tipo === 'resultado-final' && "text-success",
                              )}>
                                {label}
                              </span>
                              <Info className={cn(
                                "h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 cursor-help",
                                tipo === 'resultado-total' ? "text-primary-foreground/60" : "text-muted-foreground/40"
                              )} title={tooltip} />
                            </div>
                          </td>
                          
                          {/* Valores por período */}
                          {valores.map((valor, idx) => {
                            // Calcular porcentajes sobre Ventas sin IVA
                            const ventasSinIva = periodosVisibles[idx]?.pl?.ventasSinIva || 0
                            
                            // Porcentaje para Resultado Total (NETO)
                            const porcentajeResultadoTotal = key === 'resultadoTotal' && ventasSinIva > 0
                              ? (valor / ventasSinIva) * 100
                              : null
                            
                            // Porcentaje para Contribución Marginal
                            const porcentajeContribucion = key === 'contribucionMarginal' && ventasSinIva > 0
                              ? (valor / ventasSinIva) * 100
                              : null
                            
                            return (
                              <td key={idx} className={cn(
                                "px-4 py-3.5 text-right tabular-nums font-medium text-sm",
                                tipo === 'resultado-principal' && "bg-gradient-to-r from-primary/5 to-primary/3",
                                tipo === 'resultado-final' && "bg-gradient-to-r from-success/5 to-success/3",
                                tipo === 'resultado-total' && "bg-primary text-primary-foreground font-bold",
                                tipo === 'ingreso-base' && "bg-success/3",
                              )}>
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className={cn(
                                    tipo === 'resultado-total' && "text-primary-foreground font-bold",
                                    (tipo === 'gasto-op' || tipo === 'costo') && valor > 0 && "text-destructive/80",
                                    (tipo === 'ingreso' || tipo === 'ingreso-base' || tipo === 'ingreso-otro' || tipo === 'resultado' || tipo === 'resultado-principal' || tipo === 'resultado-final') && valor > 0 && "text-success",
                                    tipo === 'resultado-principal' && "text-primary font-semibold",
                                    tipo === 'resultado-final' && "text-success font-semibold",
                                    valor < 0 && "text-destructive",
                                    valor === 0 && "text-muted-foreground"
                                  )}>
                                    {formatCurrency(valor)}
                                  </span>
                                  {porcentajeResultadoTotal !== null && (
                                    <span className="text-[10px] text-primary-foreground/70 font-medium">
                                      {formatPercent(porcentajeResultadoTotal)} s/Ventas
                                    </span>
                                  )}
                                  {porcentajeContribucion !== null && (
                                    <span className="text-[10px] text-success/70 font-medium">
                                      {formatPercent(porcentajeContribucion)} s/Ventas
                                    </span>
                                  )}
                                </div>
                              </td>
                            )
                          })}
                          
                          {/* Columna de variación */}
                          <td className={cn(
                            "px-4 py-3.5 text-center",
                            tipo === 'resultado-principal' && "bg-gradient-to-r from-primary/5 to-primary/3",
                            tipo === 'resultado-final' && "bg-gradient-to-r from-success/5 to-success/3",
                            tipo === 'resultado-total' && "bg-primary",
                            tipo === 'ingreso-base' && "bg-success/3",
                          )}>
                            <VariacionCell actual={ultimoValor} anterior={penultimoValor} esTotalNeto={tipo === 'resultado-total'} />
                          </td>
                        </tr>
                        
                        {/* Subcuentas RRHH (acordeón expandible) */}
                        {key === 'rrhh' && rrhhExpanded[key] && (
                          <>
                            {/* Sueldos */}
                            <tr className="bg-muted/10 border-b border-border/30 text-xs">
                              <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2.5 pl-12 text-muted-foreground border-r border-border/40">
                                └─ Sueldos
                              </td>
                              {periodosVisibles.map(({ pl }, idx) => (
                                <td key={idx} className="px-4 py-2.5 text-right tabular-nums bg-muted/10 text-muted-foreground">
                                  {pl ? formatCurrency(pl.rrhhSubcuentas.sueldos) : '—'}
                                </td>
                              ))}
                              <td className="px-4 py-2.5 bg-muted/10"></td>
                            </tr>
                            
                            {/* Cargas Sociales */}
                            <tr className="bg-muted/10 border-b border-border/30 text-xs">
                              <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2.5 pl-12 text-muted-foreground border-r border-border/40">
                                └─ Cargas Sociales
                              </td>
                              {periodosVisibles.map(({ pl }, idx) => (
                                <td key={idx} className="px-4 py-2.5 text-right tabular-nums bg-muted/10 text-muted-foreground">
                                  {pl ? formatCurrency(pl.rrhhSubcuentas.cargas_sociales) : '—'}
                                </td>
                              ))}
                              <td className="px-4 py-2.5 bg-muted/10"></td>
                            </tr>
                            
                            {/* Indemnizaciones */}
                            <tr className="bg-muted/10 border-b border-border/30 text-xs">
                              <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2.5 pl-12 text-muted-foreground border-r border-border/40">
                                └─ Indemnizaciones
                              </td>
                              {periodosVisibles.map(({ pl }, idx) => (
                                <td key={idx} className="px-4 py-2.5 text-right tabular-nums bg-muted/10 text-muted-foreground">
                                  {pl ? formatCurrency(pl.rrhhSubcuentas.indemnizaciones) : '—'}
                                </td>
                              ))}
                              <td className="px-4 py-2.5 bg-muted/10"></td>
                            </tr>
                            
                            {/* Tabla Mérito */}
                            <tr className="bg-muted/10 border-b border-border text-xs">
                              <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2.5 pl-12 text-muted-foreground border-r border-border/40">
                                └─ Tabla Mérito
                              </td>
                              {periodosVisibles.map(({ pl }, idx) => (
                                <td key={idx} className="px-4 py-2.5 text-right tabular-nums bg-muted/10 text-muted-foreground">
                                  {pl ? formatCurrency(pl.rrhhSubcuentas.tabla_merito) : '—'}
                                </td>
                              ))}
                              <td className="px-4 py-2.5 bg-muted/10"></td>
                            </tr>
                          </>
                        )}
                      </Fragment>
                    )
                  })
                })()}
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
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
  Sparkles,
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
import { getCostosFijosSubcuentas } from "@/lib/costos-fijos-subcuentas"
import { getIngresosFinancierosSubcuentas } from "@/lib/ingresos-financieros-subcuentas"
import type { Cuadro, Periodo, CuadroResultadoLinea, KPIsComplementarios, ConfiguracionPL, RRHHSubcuentasDetalle, CostosFijosSubcuentasDetalle, IngresosFinancierosSubcuentasDetalle } from "@/lib/data"
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
export function calcularCuadroResultado(
  facturacion: number,
  iva: number,
  cmv: number,
  config: ConfiguracionPL,
  rrhhSubcuentas: RRHHSubcuentasDetalle | null,
  costosFijosSubcuentas: CostosFijosSubcuentasDetalle | null,
  ingresosFinancierosSubcuentas: IngresosFinancierosSubcuentasDetalle | null
): CuadroResultadoLinea {
  const ventasSinIva = facturacion - iva
  const contribucionMarginal = ventasSinIva - cmv
  
  // RRHH: usar datos reales si existen, sino usar ratio
  let rrhh: number
  let subcuentasRRHH: RRHHSubcuentasDetalle
  let esRRHHEstimado = false
  
  if (rrhhSubcuentas && (rrhhSubcuentas.sueldos > 0 || rrhhSubcuentas.cargas_sociales > 0)) {
    rrhh = rrhhSubcuentas.sueldos + rrhhSubcuentas.cargas_sociales + 
           rrhhSubcuentas.indemnizaciones + rrhhSubcuentas.tabla_merito
    subcuentasRRHH = rrhhSubcuentas
    esRRHHEstimado = false
  } else {
    rrhh = ventasSinIva * config.ratios.rrhh
    subcuentasRRHH = {
      sueldos: rrhh * 0.70,
      cargas_sociales: rrhh * 0.30,
      indemnizaciones: 0,
      tabla_merito: 0,
    }
    esRRHHEstimado = true
  }
  
  // COSTOS FIJOS: usar datos reales si existen, sino usar ratio
  let costosFijos: number
  let subcuentasCostosFijos: CostosFijosSubcuentasDetalle
  let esCostosFijosEstimado = false
  
  if (costosFijosSubcuentas && (
    costosFijosSubcuentas.alquileres > 0 ||
    costosFijosSubcuentas.honorarios > 0 ||
    costosFijosSubcuentas.tasas_servicios > 0 ||
    costosFijosSubcuentas.mantenimiento_servicios_tecnicos > 0 ||
    costosFijosSubcuentas.seguridad_vigilancia > 0 ||
    costosFijosSubcuentas.otros_servicios > 0 ||
    costosFijosSubcuentas.gastos_personal > 0 ||
    costosFijosSubcuentas.otros_gastos > 0 ||
    costosFijosSubcuentas.comisiones_gastos_bancarios > 0 ||
    costosFijosSubcuentas.gastos_comercializacion > 0 ||
    costosFijosSubcuentas.gastos_administracion > 0 ||
    costosFijosSubcuentas.gastos_financiacion > 0
  )) {
    costosFijos = costosFijosSubcuentas.alquileres + costosFijosSubcuentas.honorarios +
                  costosFijosSubcuentas.tasas_servicios + costosFijosSubcuentas.mantenimiento_servicios_tecnicos +
                  costosFijosSubcuentas.perdida_gestion_inventarios + costosFijosSubcuentas.seguridad_vigilancia +
                  costosFijosSubcuentas.otros_servicios + costosFijosSubcuentas.gastos_personal +
                  costosFijosSubcuentas.otros_gastos + costosFijosSubcuentas.comisiones_gastos_bancarios +
                  costosFijosSubcuentas.gastos_extraordinarios + costosFijosSubcuentas.gastos_comercializacion +
                  costosFijosSubcuentas.gastos_administracion + costosFijosSubcuentas.gastos_financiacion +
                  costosFijosSubcuentas.diferencias_caja_perdida
    subcuentasCostosFijos = costosFijosSubcuentas
    esCostosFijosEstimado = false
  } else {
    costosFijos = ventasSinIva * config.ratios.gastosComerciales
    subcuentasCostosFijos = {
      alquileres: costosFijos * 0.25,
      honorarios: costosFijos * 0.05,
      tasas_servicios: costosFijos * 0.10,
      mantenimiento_servicios_tecnicos: costosFijos * 0.08,
      perdida_gestion_inventarios: costosFijos * 0.05,
      seguridad_vigilancia: costosFijos * 0.07,
      otros_servicios: costosFijos * 0.05,
      gastos_personal: costosFijos * 0.03,
      otros_gastos: costosFijos * 0.07,
      comisiones_gastos_bancarios: costosFijos * 0.04,
      gastos_extraordinarios: costosFijos * 0.03,
      gastos_comercializacion: costosFijos * 0.10,
      gastos_administracion: costosFijos * 0.05,
      gastos_financiacion: costosFijos * 0.02,
      diferencias_caja_perdida: costosFijos * 0.01,
    }
    esCostosFijosEstimado = true
  }
  
  const resultadoOperativo = contribucionMarginal - rrhh - costosFijos
  const impuestos = ventasSinIva * config.ratios.impuestosOperativos
  const merma = ventasSinIva * config.ratios.merma
  const resultadoSupermercado = resultadoOperativo - impuestos - merma
  
  // INGRESOS FINANCIEROS: usar datos reales si existen, sino usar ratio
  let ingresosFinancieros: number
  let subcuentasIngresosFinancieros: IngresosFinancierosSubcuentasDetalle
  let esIngresosFinancierosEstimado = false
  
  if (ingresosFinancierosSubcuentas && (ingresosFinancierosSubcuentas.operatoria_financiera > 0 || ingresosFinancierosSubcuentas.rendimientos_financieros > 0)) {
    ingresosFinancieros = ingresosFinancierosSubcuentas.operatoria_financiera + ingresosFinancierosSubcuentas.rendimientos_financieros
    subcuentasIngresosFinancieros = ingresosFinancierosSubcuentas
    esIngresosFinancierosEstimado = false
  } else {
    ingresosFinancieros = ventasSinIva * config.ratios.ingresosFinancieros
    subcuentasIngresosFinancieros = {
      operatoria_financiera: ingresosFinancieros * 0.70, // 70% operatoria
      rendimientos_financieros: ingresosFinancieros * 0.30, // 30% rendimientos
    }
    esIngresosFinancierosEstimado = true
  }
  
  // RESULTADO TOTAL = Resultado Supermercado + Ingresos Financieros (ELIMINADO Resultado Final)
  const resultadoTotal = resultadoSupermercado + ingresosFinancieros

  return {
    facturacion,
    iva,
    ventasSinIva,
    cmv,
    contribucionMarginal,
    rrhh,
    rrhhSubcuentas: subcuentasRRHH,
    costosFijos,
    costosFijosSubcuentas: subcuentasCostosFijos,
    resultadoOperativo,
    impuestos,
    merma,
    resultadoSupermercado,
    ingresosFinancieros,
    ingresosFinancierosSubcuentas: subcuentasIngresosFinancieros,
    resultadoTotal,
    esRRHHEstimado,
    esCostosFijosEstimado,
    esIngresosFinancierosEstimado,
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
export const LINEAS_PL: readonly { key: string; label: string; tipo: string; seccion: string; tooltip: string }[] = [
  // INGRESOS
  { key: 'facturacion', label: 'Facturación', tipo: 'ingreso', seccion: 'Ingresos', tooltip: 'Facturación total incluyendo IVA' },
  { key: 'iva', label: 'IVA', tipo: 'separado', seccion: 'Ingresos', tooltip: 'Impuesto al Valor Agregado' },
  { key: 'ventasSinIva', label: 'Ventas sin IVA', tipo: 'ingreso-base', seccion: 'Ingresos', tooltip: 'Base para cálculo de margen y rentabilidad' },
  
  // COSTOS
  { key: 'cmv', label: 'CMV (Costo Mercadería Vendida)', tipo: 'costo', seccion: 'Costos', tooltip: 'Costo directo de los productos vendidos' },
  { key: 'contribucionMarginal', label: 'Contribución Marginal', tipo: 'resultado', seccion: 'Resultado Bruto', tooltip: 'Margen bruto: Ventas sin IVA − CMV' },
  
  // GASTOS OPERATIVOS
  { key: 'rrhh', label: 'RRHH (Personal y Cargas Sociales)', tipo: 'gasto-op', seccion: 'Gastos Operativos', tooltip: 'Gastos de personal y cargas sociales' },
  { key: 'costosFijos', label: 'Costos Fijos', tipo: 'gasto-op', seccion: 'Gastos Operativos', tooltip: 'Costos fijos operativos (alquileres, servicios, etc.)' },
  { key: 'impuestos', label: 'Impuestos Operativos', tipo: 'gasto-op', seccion: 'Gastos Operativos', tooltip: 'Impuestos y cargas operativas' },
  { key: 'merma', label: 'Merma', tipo: 'gasto-op', seccion: 'Gastos Operativos', tooltip: 'Pérdidas por merma' },
  { key: 'resultadoOperativo', label: 'Resultado Operativo', tipo: 'resultado', seccion: 'Resultado Operativo', tooltip: 'Margen bruto menos gastos operativos' },
  
  // RESULTADO SUPERMERCADO
  { key: 'resultadoSupermercado', label: 'Resultado Supermercado', tipo: 'resultado-principal', seccion: 'Resultado Supermercado', tooltip: 'Resultado operativo final del negocio' },
  
  // OTROS INGRESOS
  { key: 'ingresosFinancieros', label: 'Ingresos Financieros', tipo: 'ingreso-otro', seccion: 'Otros Ingresos', tooltip: 'Ingresos financieros externos a la operación comercial' },
  
  // RESULTADO TOTAL (ELIMINADO "Resultado Final")
  { key: 'resultadoTotal', label: 'Resultado Total (NETO)', tipo: 'resultado-total', seccion: 'Resultado Total', tooltip: 'Resultado supermercado + Ingresos financieros' },
] as const

function getRatioPercentage(key: string, config: ConfiguracionPL | null): string | null {
  if (!config?.ratios) return null

  let ratioVal: number | undefined

  switch (key) {
    case 'iva':
      ratioVal = config.ratios.iva
      break
    case 'rrhh':
      ratioVal = config.ratios.rrhh
      break
    case 'costosFijos':
      ratioVal = config.ratios.gastosComerciales
      break
    case 'impuestos':
      ratioVal = config.ratios.impuestosOperativos
      break
    case 'merma':
      ratioVal = config.ratios.merma
      break
    case 'ingresosFinancieros':
      ratioVal = config.ratios.ingresosFinancieros
      break
  }

  if (ratioVal !== undefined && ratioVal !== null && ratioVal > 0) {
    return formatPercent(ratioVal * 100)
  }

  return null
}

function isCellEstimada(key: string, pl: CuadroResultadoLinea | null): boolean {
  if (!pl) return false

  switch (key) {
    case 'iva':
    case 'impuestos':
    case 'merma':
      return true
    case 'rrhh':
      return pl.esRRHHEstimado ?? true
    case 'costosFijos':
      return pl.esCostosFijosEstimado ?? true
    case 'ingresosFinancieros':
      return pl.esIngresosFinancierosEstimado ?? true
    default:
      return false
  }
}

function getEstimacionInfo(
  key: string,
  periodosVisibles: { periodo: Periodo; pl: CuadroResultadoLinea | null }[]
) {
  const totalMeses = periodosVisibles.length
  let mesesEstimados = 0
  const mesesEstimadosNombres: string[] = []

  periodosVisibles.forEach(({ periodo, pl }) => {
    if (isCellEstimada(key, pl)) {
      mesesEstimados++
      mesesEstimadosNombres.push(periodoLabelCorto(periodo.anio, periodo.mes))
    }
  })

  return {
    totalMeses,
    mesesEstimados,
    mesesReales: totalMeses - mesesEstimados,
    mesesEstimadosNombres,
  }
}

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
  const [costosFijosExpanded, setCostosFijosExpanded] = useState<{ [key: string]: boolean }>({}) // Estado del acordeón Costos Fijos
  const [ingresosFinancierosExpanded, setIngresosFinancierosExpanded] = useState<{ [key: string]: boolean }>({}) // Estado del acordeón Ingresos Financieros

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

          // Obtener subcuentas RRHH, Costos Fijos e Ingresos Financieros reales
          const rrhhSubcuentas = await getRRHHSubcuentas(periodo.key, sucursalId)
          const costosFijosSubcuentas = await getCostosFijosSubcuentas(periodo.key, sucursalId)
          const ingresosFinancierosSubcuentas = await getIngresosFinancierosSubcuentas(periodo.key, sucursalId)

          const pl = calcularCuadroResultado(
            facturacion,
            iva,
            cmv,
            configuracionPL!,
            rrhhSubcuentas,
            costosFijosSubcuentas,
            ingresosFinancierosSubcuentas
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

  // Intentar mostrar los 6 períodos que terminen en el período seleccionado, o por defecto los últimos 6
  const selectedIdx = cuadrosResultado.findIndex(c => c.periodo.key === periodoKey)
  const periodosVisibles = selectedIdx >= 0
    ? cuadrosResultado.slice(Math.max(0, selectedIdx - 5), selectedIdx + 1)
    : cuadrosResultado.slice(-6)
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

      {/* BANNER EJECUTIVO P&L - AZUL CORPORATIVO MONARCA */}
      {mostrarKPIs && (
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
                  KPIs de Gestión y Operaciones
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent/20 text-accent-foreground border border-accent/40 lowercase">
                    {periodoKey}
                  </span>
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-primary-foreground/80">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="font-medium">P&L Ejecutivo</span>
            </div>
          </div>

          {/* Grid de 4 KPIs Unificados */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 relative z-10 divide-y sm:divide-y-0 lg:divide-x divide-primary-foreground/20">
            
            {/* KPI 1: Sucursales */}
            <div className="flex flex-col justify-between space-y-3 lg:pr-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/90 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-accent" />
                  Sucursales Activas
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-400/40">
                  +{periodosVisibles[periodosVisibles.length - 1]?.kpis?.sucursales.nuevas || 0} nuevas
                </span>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary-foreground tabular-nums">
                  {periodosVisibles[periodosVisibles.length - 1]?.kpis?.sucursales.activas || 0} sucursales
                </div>
                <p className="mt-1 text-xs text-primary-foreground/80">
                  Red de locales en operación activa
                </p>
              </div>
            </div>

            {/* KPI 2: Clientes */}
            <div className="flex flex-col justify-between space-y-3 pt-6 sm:pt-0 lg:px-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/90 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-accent" />
                  Clientes Activos
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-accent/20 text-accent-foreground border border-accent/40">
                  Ticket: {formatCurrency(periodosVisibles[periodosVisibles.length - 1]?.kpis?.clientes.ticketPromedio || 0)}
                </span>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary-foreground tabular-nums">
                  {formatNumber(periodosVisibles[periodosVisibles.length - 1]?.kpis?.clientes.activos || 0)}
                </div>
                <p className="mt-1 text-xs text-primary-foreground/80">
                  Nuevos clientes: <span className="font-semibold text-primary-foreground">+{formatNumber(periodosVisibles[periodosVisibles.length - 1]?.kpis?.clientes.nuevos || 0)}</span>
                </p>
              </div>
            </div>

            {/* KPI 3: Artículos */}
            <div className="flex flex-col justify-between space-y-3 pt-6 sm:pt-0 lg:px-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/90 flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-accent" />
                  Catálogo de Artículos
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-accent/20 text-accent-foreground border border-accent/40">
                  Rotación: {periodosVisibles[periodosVisibles.length - 1]?.kpis?.articulos.rotacion || 0}%
                </span>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary-foreground tabular-nums">
                  {formatNumber(periodosVisibles[periodosVisibles.length - 1]?.kpis?.articulos.sku || 0)} SKUs
                </div>
                <p className="mt-1 text-xs text-primary-foreground/80">
                  Stockout estimado: <span className="font-semibold text-accent-foreground">{periodosVisibles[periodosVisibles.length - 1]?.kpis?.articulos.stockout || 0}%</span>
                </p>
              </div>
            </div>

            {/* KPI 4: Metros */}
            <div className="flex flex-col justify-between space-y-3 pt-6 sm:pt-0 lg:pl-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/90 flex items-center gap-1.5">
                  <Ruler className="h-4 w-4 text-accent" />
                  Superficie & Rendimiento
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-accent/20 text-accent-foreground border border-accent/40">
                  {formatNumber(periodosVisibles[periodosVisibles.length - 1]?.kpis?.metros.metrosCuadrados || 0)} m²
                </span>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary-foreground tabular-nums">
                  {formatCurrency(periodosVisibles[periodosVisibles.length - 1]?.kpis?.metros.facturacionPorMetro || 0)}/m²
                </div>
                <p className="mt-1 text-xs text-primary-foreground/80">
                  Superficie de salón: <span className="font-semibold text-primary-foreground">{formatNumber(periodosVisibles[periodosVisibles.length - 1]?.kpis?.metros.totalSalon || 0)} m²</span>
                </p>
              </div>
            </div>

          </div>
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
                <tr className="border-b border-border/50 bg-muted/30">
                  <th rowSpan={2} className="sticky left-0 z-20 bg-card px-4 py-4 text-left font-bold text-base min-w-[300px] border-r-2 border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] align-bottom">
                    Línea de Resultado
                  </th>
                  {periodosVisibles.map(({ periodo }) => (
                    <th key={periodo.key} className="px-4 pt-4 pb-2 text-center whitespace-nowrap min-w-[130px]">
                      <div className="font-bold text-base text-foreground">{periodoLabelCorto(periodo.anio, periodo.mes)}</div>
                    </th>
                  ))}
                  <th rowSpan={2} className="px-4 py-4 text-center font-bold min-w-[110px] bg-muted/10 align-bottom border-l-2 border-border/50">
                    <span className="text-base text-muted-foreground">Variación</span>
                  </th>
                </tr>
                <tr className="border-b-2 border-primary/20 bg-muted/30">
                  {periodosVisibles.map(({ periodo }) => (
                    <th key={periodo.key + '-status'} className="px-4 pb-4 pt-2 text-center whitespace-nowrap min-w-[130px]">
                       <Badge variant="secondary" className="bg-primary text-primary-foreground text-[10px] uppercase tracking-wider font-semibold border-0 hover:bg-primary/90">
                         {periodo.anio}
                       </Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let seccionAnterior = ''
                  return LINEAS_PL.map(({ key, label, tipo, tooltip, seccion }) => {
                    const valores = periodosVisibles.map(({ pl }) => (pl?.[key as keyof CuadroResultadoLinea] as number) || 0)
                    const ultimoValor = valores[valores.length - 1]
                    const penultimoValor = valores.length > 1 ? valores[valores.length - 2] : null
                    
                    const mostraSeparador = seccion !== seccionAnterior
                    seccionAnterior = seccion
                    const ratioPct = getRatioPercentage(key, configuracionPL)
                    const estInfo = getEstimacionInfo(key, periodosVisibles)

                    const tooltipEstimacion = estInfo.mesesEstimados === 0
                      ? `Ratio de supuesto (${ratioPct}). Todos los ${estInfo.totalMeses} meses visibles tienen datos reales cargados.`
                      : estInfo.mesesEstimados < estInfo.totalMeses
                        ? `Ratio de supuesto (${ratioPct}). Se aplica únicamente en los meses sin carga real (${estInfo.mesesEstimadosNombres.join(', ')}). Los otros ${estInfo.mesesReales} meses son datos reales.`
                        : `Ratio de supuesto (${ratioPct}). Se aplica en todos los ${estInfo.totalMeses} meses visibles.`

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
                            (key === 'rrhh' || key === 'costosFijos') && "cursor-pointer", // RRHH y Costos Fijos son expandibles
                            tipo === 'resultado-principal' && "bg-gradient-to-r from-primary/8 to-primary/5 border-primary/30 font-semibold",
                            tipo === 'resultado-final' && "bg-gradient-to-r from-success/8 to-success/5 border-success/30 font-semibold",
                            tipo === 'resultado-total' && "bg-primary border-primary/50 font-bold text-primary-foreground",
                            tipo === 'ingreso-base' && "bg-success/3 border-success/20",
                          )}
                          onClick={() => {
                            if (key === 'rrhh') setRrhhExpanded(prev => ({ ...prev, [key]: !prev[key] }))
                            if (key === 'costosFijos') setCostosFijosExpanded(prev => ({ ...prev, [key]: !prev[key] }))
                            if (key === 'ingresosFinancieros') setIngresosFinancierosExpanded(prev => ({ ...prev, [key]: !prev[key] }))
                          }}
                        >
                          <td className="sticky left-0 z-10 p-0 min-w-[300px] border-r-2 border-border bg-card shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                            <div className={cn(
                              "px-4 py-3.5 h-full w-full transition-colors flex items-center gap-2",
                              "group-hover:bg-muted/50",
                              tipo === 'resultado-principal' && "bg-primary/10 group-hover:bg-primary/20",
                              tipo === 'resultado-final' && "bg-success/10 group-hover:bg-success/20",
                              tipo === 'resultado-total' && "bg-primary text-primary-foreground group-hover:bg-primary/90",
                              tipo === 'ingreso-base' && "bg-success/10 group-hover:bg-success/20"
                            )}>
                              {key === 'rrhh' && (
                                rrhhExpanded[key] 
                                  ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                  : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              {key === 'costosFijos' && (
                                costosFijosExpanded[key] 
                                  ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                  : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              {key === 'ingresosFinancieros' && (
                                ingresosFinancierosExpanded[key]
                                  ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                  : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              <span className={cn(
                                "font-medium text-sm flex items-center gap-1.5 flex-wrap",
                                (tipo === 'resultado-principal' || tipo === 'resultado-final' || tipo === 'resultado-total') ? "" : "text-muted-foreground",
                                tipo === 'resultado-total' && "text-primary-foreground"
                              )}>
                                <span>{label}</span>
                                {ratioPct && (
                                  <span
                                    title={tooltipEstimacion}
                                    className={cn(
                                      "font-mono text-xs px-1.5 py-0.5 rounded font-normal border cursor-help transition-colors",
                                      estInfo.mesesEstimados > 0 && estInfo.mesesEstimados < estInfo.totalMeses
                                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 font-medium"
                                        : "bg-muted/60 text-muted-foreground border-border/40",
                                      tipo === 'resultado-total' && "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                                    )}
                                  >
                                    ({ratioPct})
                                  </span>
                                )}
                              </span>
                              {tooltip && (
                                <span title={tooltip} className="inline-flex">
                                  <Info 
                                    className={cn(
                                      "h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 cursor-help",
                                      tipo === 'resultado-total' ? "text-primary-foreground/60" : "text-muted-foreground/40"
                                    )} 
                                  />
                                </span>
                              )}
                            </div>
                          </td>
                          
                          {/* Valores por período */}
                          {valores.map((valor, idx) => {
                            // Calcular porcentajes sobre Ventas sin IVA
                            const ventasSinIva = periodosVisibles[idx]?.pl?.ventasSinIva || 0
                            const periodoPl = periodosVisibles[idx]?.pl || null
                            const esEstimadoCell = ratioPct ? isCellEstimada(key, periodoPl) : false
                            
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
                                <div 
                                  title={ratioPct ? (esEstimadoCell ? `Monto estimado según supuesto (${ratioPct})` : `Dato real cargado`) : undefined}
                                  className="flex flex-col items-end gap-0.5"
                                >
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
                        
                        {/* Subcuentas Costos Fijos (acordeón expandible - 15 cuentas) */}
                        {key === 'costosFijos' && costosFijosExpanded[key] && (
                          <>
                            <tr className="bg-muted/10 border-b border-border/30 text-xs">
                              <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2.5 pl-12 text-muted-foreground border-r border-border/40">
                                └─ Alquileres
                              </td>
                              {periodosVisibles.map(({ pl }, idx) => (
                                <td key={idx} className="px-4 py-2.5 text-right tabular-nums bg-muted/10 text-muted-foreground">
                                  {pl ? formatCurrency(pl.costosFijosSubcuentas.alquileres) : '—'}
                                </td>
                              ))}
                              <td className="px-4 py-2.5 bg-muted/10"></td>
                            </tr>
                            <tr className="bg-muted/10 border-b border-border/30 text-xs">
                              <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2.5 pl-12 text-muted-foreground border-r border-border/40">
                                └─ Honorarios
                              </td>
                              {periodosVisibles.map(({ pl }, idx) => (
                                <td key={idx} className="px-4 py-2.5 text-right tabular-nums bg-muted/10 text-muted-foreground">
                                  {pl ? formatCurrency(pl.costosFijosSubcuentas.honorarios) : '—'}
                                </td>
                              ))}
                              <td className="px-4 py-2.5 bg-muted/10"></td>
                            </tr>
                            <tr className="bg-muted/10 border-b border-border/30 text-xs">
                              <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2.5 pl-12 text-muted-foreground border-r border-border/40">
                                └─ Tasas y Servicios
                              </td>
                              {periodosVisibles.map(({ pl }, idx) => (
                                <td key={idx} className="px-4 py-2.5 text-right tabular-nums bg-muted/10 text-muted-foreground">
                                  {pl ? formatCurrency(pl.costosFijosSubcuentas.tasas_servicios) : '—'}
                                </td>
                              ))}
                              <td className="px-4 py-2.5 bg-muted/10"></td>
                            </tr>
                            <tr className="bg-muted/10 border-b border-border/30 text-xs">
                              <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2.5 pl-12 text-muted-foreground border-r border-border/40">
                                └─ Mantenimiento y Servicios Técnicos
                              </td>
                              {periodosVisibles.map(({ pl }, idx) => (
                                <td key={idx} className="px-4 py-2.5 text-right tabular-nums bg-muted/10 text-muted-foreground">
                                  {pl ? formatCurrency(pl.costosFijosSubcuentas.mantenimiento_servicios_tecnicos) : '—'}
                                </td>
                              ))}
                              <td className="px-4 py-2.5 bg-muted/10"></td>
                            </tr>
                            <tr className="bg-muted/10 border-b border-border/30 text-xs">
                              <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2.5 pl-12 text-muted-foreground border-r border-border/40">
                                └─ Pérdida en Gestión de Inventarios
                              </td>
                              {periodosVisibles.map(({ pl }, idx) => (
                                <td key={idx} className="px-4 py-2.5 text-right tabular-nums bg-muted/10 text-muted-foreground">
                                  {pl ? formatCurrency(pl.costosFijosSubcuentas.perdida_gestion_inventarios) : '—'}
                                </td>
                              ))}
                              <td className="px-4 py-2.5 bg-muted/10"></td>
                            </tr>
                            <tr className="bg-muted/10 border-b border-border/30 text-xs">
                              <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2.5 pl-12 text-muted-foreground border-r border-border/40">
                                └─ Seguridad y Vigilancia
                              </td>
                              {periodosVisibles.map(({ pl }, idx) => (
                                <td key={idx} className="px-4 py-2.5 text-right tabular-nums bg-muted/10 text-muted-foreground">
                                  {pl ? formatCurrency(pl.costosFijosSubcuentas.seguridad_vigilancia) : '—'}
                                </td>
                              ))}
                              <td className="px-4 py-2.5 bg-muted/10"></td>
                            </tr>
                            <tr className="bg-muted/10 border-b border-border/30 text-xs">
                              <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2.5 pl-12 text-muted-foreground border-r border-border/40">
                                └─ Otros Servicios
                              </td>
                              {periodosVisibles.map(({ pl }, idx) => (
                                <td key={idx} className="px-4 py-2.5 text-right tabular-nums bg-muted/10 text-muted-foreground">
                                  {pl ? formatCurrency(pl.costosFijosSubcuentas.otros_servicios) : '—'}
                                </td>
                              ))}
                              <td className="px-4 py-2.5 bg-muted/10"></td>
                            </tr>
                            <tr className="bg-muted/10 border-b border-border/30 text-xs">
                              <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2.5 pl-12 text-muted-foreground border-r border-border/40">
                                └─ Gastos en Personal
                              </td>
                              {periodosVisibles.map(({ pl }, idx) => (
                                <td key={idx} className="px-4 py-2.5 text-right tabular-nums bg-muted/10 text-muted-foreground">
                                  {pl ? formatCurrency(pl.costosFijosSubcuentas.gastos_personal) : '—'}
                                </td>
                              ))}
                              <td className="px-4 py-2.5 bg-muted/10"></td>
                            </tr>
                            <tr className="bg-muted/10 border-b border-border/30 text-xs">
                              <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2.5 pl-12 text-muted-foreground border-r border-border/40">
                                └─ Otros Gastos
                              </td>
                              {periodosVisibles.map(({ pl }, idx) => (
                                <td key={idx} className="px-4 py-2.5 text-right tabular-nums bg-muted/10 text-muted-foreground">
                                  {pl ? formatCurrency(pl.costosFijosSubcuentas.otros_gastos) : '—'}
                                </td>
                              ))}
                              <td className="px-4 py-2.5 bg-muted/10"></td>
                            </tr>
                            <tr className="bg-muted/10 border-b border-border/30 text-xs">
                              <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2.5 pl-12 text-muted-foreground border-r border-border/40">
                                └─ Comisiones y Gastos Bancarios
                              </td>
                              {periodosVisibles.map(({ pl }, idx) => (
                                <td key={idx} className="px-4 py-2.5 text-right tabular-nums bg-muted/10 text-muted-foreground">
                                  {pl ? formatCurrency(pl.costosFijosSubcuentas.comisiones_gastos_bancarios) : '—'}
                                </td>
                              ))}
                              <td className="px-4 py-2.5 bg-muted/10"></td>
                            </tr>
                            <tr className="bg-muted/10 border-b border-border/30 text-xs">
                              <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2.5 pl-12 text-muted-foreground border-r border-border/40">
                                └─ Gastos Extraordinarios
                              </td>
                              {periodosVisibles.map(({ pl }, idx) => (
                                <td key={idx} className="px-4 py-2.5 text-right tabular-nums bg-muted/10 text-muted-foreground">
                                  {pl ? formatCurrency(pl.costosFijosSubcuentas.gastos_extraordinarios) : '—'}
                                </td>
                              ))}
                              <td className="px-4 py-2.5 bg-muted/10"></td>
                            </tr>
                            <tr className="bg-muted/10 border-b border-border/30 text-xs">
                              <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2.5 pl-12 text-muted-foreground border-r border-border/40">
                                └─ Gastos de Comercialización
                              </td>
                              {periodosVisibles.map(({ pl }, idx) => (
                                <td key={idx} className="px-4 py-2.5 text-right tabular-nums bg-muted/10 text-muted-foreground">
                                  {pl ? formatCurrency(pl.costosFijosSubcuentas.gastos_comercializacion) : '—'}
                                </td>
                              ))}
                              <td className="px-4 py-2.5 bg-muted/10"></td>
                            </tr>
                            <tr className="bg-muted/10 border-b border-border/30 text-xs">
                              <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2.5 pl-12 text-muted-foreground border-r border-border/40">
                                └─ Gastos de Administración
                              </td>
                              {periodosVisibles.map(({ pl }, idx) => (
                                <td key={idx} className="px-4 py-2.5 text-right tabular-nums bg-muted/10 text-muted-foreground">
                                  {pl ? formatCurrency(pl.costosFijosSubcuentas.gastos_administracion) : '—'}
                                </td>
                              ))}
                              <td className="px-4 py-2.5 bg-muted/10"></td>
                            </tr>
                            <tr className="bg-muted/10 border-b border-border/30 text-xs">
                              <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2.5 pl-12 text-muted-foreground border-r border-border/40">
                                └─ Gastos de Financiación
                              </td>
                              {periodosVisibles.map(({ pl }, idx) => (
                                <td key={idx} className="px-4 py-2.5 text-right tabular-nums bg-muted/10 text-muted-foreground">
                                  {pl ? formatCurrency(pl.costosFijosSubcuentas.gastos_financiacion) : '—'}
                                </td>
                              ))}
                              <td className="px-4 py-2.5 bg-muted/10"></td>
                            </tr>
                            <tr className="bg-muted/10 border-b border-border text-xs">
                              <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2.5 pl-12 text-muted-foreground border-r border-border/40">
                                └─ Diferencias de Caja - Pérdida
                              </td>
                              {periodosVisibles.map(({ pl }, idx) => (
                                <td key={idx} className="px-4 py-2.5 text-right tabular-nums bg-muted/10 text-muted-foreground">
                                  {pl ? formatCurrency(pl.costosFijosSubcuentas.diferencias_caja_perdida) : '—'}
                                </td>
                              ))}
                              <td className="px-4 py-2.5 bg-muted/10"></td>
                            </tr>
                          </>
                        )}
                        
                        {/* Subcuentas Ingresos Financieros (acordeón expandible - 2 cuentas) */}
                        {key === 'ingresosFinancieros' && ingresosFinancierosExpanded[key] && (
                          <>
                            <tr className="bg-muted/10 border-b border-border/30 text-xs">
                              <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2.5 pl-12 text-muted-foreground border-r border-border/40">
                                └─ Operatoria Financiera
                              </td>
                              {periodosVisibles.map(({ pl }, idx) => (
                                <td key={idx} className="px-4 py-2.5 text-right tabular-nums bg-muted/10 text-muted-foreground">
                                  {pl ? formatCurrency(pl.ingresosFinancierosSubcuentas.operatoria_financiera) : '—'}
                                </td>
                              ))}
                              <td className="px-4 py-2.5 bg-muted/10"></td>
                            </tr>
                            <tr className="bg-muted/10 border-b border-border text-xs">
                              <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2.5 pl-12 text-muted-foreground border-r border-border/40">
                                └─ Rendimientos Financieros
                              </td>
                              {periodosVisibles.map(({ pl }, idx) => (
                                <td key={idx} className="px-4 py-2.5 text-right tabular-nums bg-muted/10 text-muted-foreground">
                                  {pl ? formatCurrency(pl.ingresosFinancierosSubcuentas.rendimientos_financieros) : '—'}
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
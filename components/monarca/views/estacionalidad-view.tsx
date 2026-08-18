// components/monarca/views/estacionalidad-view.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { 
  Users, 
  Package, 
  Banknote, 
  ShoppingCart, 
  Ticket, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  BarChart3, 
  Grid3X3, 
  Percent, 
  RefreshCw, 
  SlidersHorizontal,
  Info,
  Layers,
  Activity
} from "lucide-react"
import { PageHeader, TransitionLoader } from "../shared"
import { formatCurrency, formatCurrencyCompact, formatPercent, formatNumber, formatSigned } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceArea,
  Cell
} from "recharts"
import type { 
  KPICardData, 
  RegistroMensualEstacionalidad, 
  RegistroInflacion, 
  CorrelacionInflacion, 
  MatrizEstacionalidadRow, 
  EstadisticasMes 
} from "@/lib/estacionalidad"

function DarkVariacionBadge({ value, label }: { value: number | null; label: string }) {
  if (value === null || value === undefined || isNaN(value)) {
    return (
      <span className="text-[11px] text-primary-foreground/60">
        {label}: <span className="font-mono">s/d</span>
      </span>
    )
  }
  const positivo = value >= 0
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums">
      <span className="text-primary-foreground/70">{label}:</span>
      <span
        className={cn(
          "inline-flex items-center px-1.5 py-0.2 rounded border text-[10px] font-bold",
          positivo
            ? "bg-emerald-500/25 text-emerald-300 border-emerald-400/40"
            : "bg-rose-500/25 text-rose-300 border-rose-400/40"
        )}
      >
        {positivo ? <ArrowUpRight className="h-3 w-3 shrink-0" /> : <ArrowDownRight className="h-3 w-3 shrink-0" />}
        {formatSigned(value)}
      </span>
    </span>
  )
}

const MESES_NOMBRES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

export function EstacionalidadView() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    aniosDisponibles: number[]
    ultimoMes: RegistroMensualEstacionalidad | null
    kpis: KPICardData[]
    datosMensuales: RegistroMensualEstacionalidad[]
    datosHistoricos: RegistroMensualEstacionalidad[]
    inflacion: RegistroInflacion[]
    correlaciones: CorrelacionInflacion[]
    matrizClientes: { matriz: MatrizEstacionalidadRow[]; estadisticas: EstadisticasMes[] }
    matrizFacturacion: { matriz: MatrizEstacionalidadRow[]; estadisticas: EstadisticasMes[] }
    fechaCorte: string | null
  } | null>(null)

  // Filtros
  const [filtroAnios, setFiltroAnios] = useState<string>("todos")
  const [pronosticoMeses, setPronosticoMeses] = useState<string>("12")
  const [activeTab, setActiveTab] = useState<string>("comercial")
  const [matrizCampo, setMatrizCampo] = useState<'varClientes' | 'varFacturacion'>("varClientes")

  const loadData = async () => {
    setLoading(true)
    try {
      let anioInicio: number | null = null
      let anioFin: number | null = null

      if (filtroAnios === "ultimos_2" && data?.aniosDisponibles.length) {
        const maxA = Math.max(...data.aniosDisponibles)
        anioInicio = maxA - 1
        anioFin = maxA
      } else if (filtroAnios === "ultimos_3" && data?.aniosDisponibles.length) {
        const maxA = Math.max(...data.aniosDisponibles)
        anioInicio = maxA - 2
        anioFin = maxA
      }

      const params = new URLSearchParams()
      if (anioInicio) params.set("anioInicio", anioInicio.toString())
      if (anioFin) params.set("anioFin", anioFin.toString())
      params.set("mesesPronostico", pronosticoMeses)

      const res = await fetch(`/api/estacionalidad?${params.toString()}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error("Error al cargar estacionalidad", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filtroAnios, pronosticoMeses])

  // Formateador de KPIs
  const fmtValor = (val: number, tipo: 'numero' | 'moneda' | 'decimal', sufijo: string) => {
    if (tipo === 'moneda') return `${formatCurrencyCompact(val)}${sufijo}`
    if (tipo === 'decimal') return `${val.toFixed(2)}${sufijo}`
    return `${formatNumber(val)}${sufijo}`
  }

  // Prepara datos combinados de ventas e inflación para gráficos comparativos
  const datosCombinados = useMemo(() => {
    if (!data) return []
    const infMap = new Map<string, RegistroInflacion>()
    ;(data.inflacion || []).forEach(i => infMap.set(i.periodoKey, i))

    return (data.datosMensuales || []).map(d => {
      const inf = infMap.get(d.fechaKey)
      return {
        key: d.fechaKey,
        label: d.fechaKey,
        clientes: d.clientes,
        productos: d.productos > 0 ? d.productos : null,
        facturacion: d.facturacion,
        changoPromedio: d.changoPromedio > 0 ? d.changoPromedio : null,
        ticketPromedio: d.ticketPromedio,
        varClientes: d.varClientes,
        varFacturacion: d.varFacturacion,
        varChangoPromedio: d.varChangoPromedio,
        varTicketPromedio: d.varTicketPromedio,
        inflacionMensual: inf ? inf.inflacionMensual : null,
        esProyectado: d.esProyectado
      }
    })
  }, [data])

  if (loading && !data) {
    return <TransitionLoader fullPage />
  }

  const kpisList = data?.kpis || []
  const ultimoFechaTxt = data?.ultimoMes ? `${data.ultimoMes.fechaKey}` : ''

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <PageHeader
        title="Estacionalidad Comercial & Análisis de Inflación"
        subtitle="Patrones estacionales, correlación con inflación y pronóstico de demanda con modelo Holt-Winters."
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={loadData} variant="outline" size="sm" className="gap-2 bg-card h-9">
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>
        }
      />

      {/* BANNER EJECUTIVO ESTACIONALIDAD - AZUL CORPORATIVO MONARCA */}
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
                Resumen Comercial Estacional
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent/20 text-accent-foreground border border-accent/40 lowercase">
                  corte {ultimoFechaTxt}
                </span>
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-primary-foreground/80">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="font-medium">Auditoría Histórica de Ventas</span>
          </div>
        </div>

        {/* Grid de 5 KPIs Unificados */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 relative z-10 divide-y sm:divide-y-0 lg:divide-x divide-primary-foreground/20">
          
          {/* KPI 1: Clientes */}
          {kpisList[0] && (
            <div className="flex flex-col justify-between space-y-3 lg:pr-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/90 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-accent" />
                  {kpisList[0].titulo}
                </span>
              </div>
              <div>
                <div className="text-2xl font-extrabold tracking-tight text-primary-foreground tabular-nums">
                  {fmtValor(kpisList[0].valorActual, kpisList[0].formato, kpisList[0].sufijo)}
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  <DarkVariacionBadge value={kpisList[0].mom} label="MoM" />
                  <DarkVariacionBadge value={kpisList[0].yoy} label="YoY" />
                  <DarkVariacionBadge value={kpisList[0].ytd} label="YTD" />
                </div>
              </div>
            </div>
          )}

          {/* KPI 2: Productos */}
          {kpisList[1] && (
            <div className="flex flex-col justify-between space-y-3 pt-6 sm:pt-0 lg:px-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/90 flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-accent" />
                  {kpisList[1].titulo}
                </span>
              </div>
              <div>
                <div className="text-2xl font-extrabold tracking-tight text-primary-foreground tabular-nums">
                  {fmtValor(kpisList[1].valorActual, kpisList[1].formato, kpisList[1].sufijo)}
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  <DarkVariacionBadge value={kpisList[1].mom} label="MoM" />
                  <DarkVariacionBadge value={kpisList[1].yoy} label="YoY" />
                  <DarkVariacionBadge value={kpisList[1].ytd} label="YTD" />
                </div>
              </div>
            </div>
          )}

          {/* KPI 3: Facturación */}
          {kpisList[2] && (
            <div className="flex flex-col justify-between space-y-3 pt-6 sm:pt-0 lg:px-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/90 flex items-center gap-1.5">
                  <Banknote className="h-4 w-4 text-accent" />
                  {kpisList[2].titulo}
                </span>
              </div>
              <div>
                <div className="text-2xl font-extrabold tracking-tight text-primary-foreground tabular-nums">
                  {fmtValor(kpisList[2].valorActual, kpisList[2].formato, kpisList[2].sufijo)}
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  <DarkVariacionBadge value={kpisList[2].mom} label="MoM" />
                  <DarkVariacionBadge value={kpisList[2].yoy} label="YoY" />
                  <DarkVariacionBadge value={kpisList[2].ytd} label="YTD" />
                </div>
              </div>
            </div>
          )}

          {/* KPI 4: Chango Promedio */}
          {kpisList[3] && (
            <div className="flex flex-col justify-between space-y-3 pt-6 sm:pt-0 lg:px-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/90 flex items-center gap-1.5">
                  <ShoppingCart className="h-4 w-4 text-accent" />
                  {kpisList[3].titulo}
                </span>
              </div>
              <div>
                <div className="text-2xl font-extrabold tracking-tight text-primary-foreground tabular-nums">
                  {fmtValor(kpisList[3].valorActual, kpisList[3].formato, kpisList[3].sufijo)}
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  <DarkVariacionBadge value={kpisList[3].mom} label="MoM" />
                  <DarkVariacionBadge value={kpisList[3].yoy} label="YoY" />
                  <DarkVariacionBadge value={kpisList[3].ytd} label="YTD" />
                </div>
              </div>
            </div>
          )}

          {/* KPI 5: Ticket Promedio */}
          {kpisList[4] && (
            <div className="flex flex-col justify-between space-y-3 pt-6 sm:pt-0 lg:pl-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/90 flex items-center gap-1.5">
                  <Ticket className="h-4 w-4 text-accent" />
                  {kpisList[4].titulo}
                </span>
              </div>
              <div>
                <div className="text-2xl font-extrabold tracking-tight text-primary-foreground tabular-nums">
                  {fmtValor(kpisList[4].valorActual, kpisList[4].formato, kpisList[4].sufijo)}
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  <DarkVariacionBadge value={kpisList[4].mom} label="MoM" />
                  <DarkVariacionBadge value={kpisList[4].yoy} label="YoY" />
                  <DarkVariacionBadge value={kpisList[4].ytd} label="YTD" />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* CONTROLES Y FILTROS */}
      <Card className="border-border bg-card shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">Filtros de Análisis:</span>
            
            {/* Rango de Años */}
            <Select value={filtroAnios} onValueChange={(v) => v && setFiltroAnios(v)}>
              <SelectTrigger className="w-[150px] bg-background h-9 text-xs">
                <SelectValue placeholder="Período de años" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los años</SelectItem>
                <SelectItem value="ultimos_2">Últimos 2 años</SelectItem>
                <SelectItem value="ultimos_3">Últimos 3 años</SelectItem>
              </SelectContent>
            </Select>

            {/* Pronóstico Holt-Winters */}
            <Select value={pronosticoMeses} onValueChange={(v) => v && setPronosticoMeses(v)}>
              <SelectTrigger className="w-[170px] bg-background h-9 text-xs">
                <SelectValue placeholder="Pronóstico Holt-Winters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sin pronóstico (0m)</SelectItem>
                <SelectItem value="6">Pronóstico 6 meses</SelectItem>
                <SelectItem value="12">Pronóstico 12 meses</SelectItem>
                <SelectItem value="18">Pronóstico 18 meses</SelectItem>
                <SelectItem value="24">Pronóstico 24 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* NAVEGACIÓN SUB-TABS */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList className="bg-muted p-1">
              <TabsTrigger value="comercial" className="gap-2 text-xs">
                <BarChart3 className="h-3.5 w-3.5" />
                Dashboard Comercial
              </TabsTrigger>
              <TabsTrigger value="matriz" className="gap-2 text-xs">
                <Grid3X3 className="h-3.5 w-3.5" />
                Matriz de Estacionalidad
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* CONTENIDO DE TABS */}
      {activeTab === "comercial" && (
        <div className="space-y-6">
          {/* TENDENCIAS DE MÉTRICAS */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Gráfico 1: Clientes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    Clientes (Mensual)
                  </span>
                  {parseInt(pronosticoMeses) > 0 && (
                    <Badge variant="secondary" className="bg-pink-500/20 text-pink-300 border-pink-500/30 text-[10px]">
                      Holt-Winters (+{pronosticoMeses}m)
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={datosCombinados} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="key" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => formatNumber(v)} />
                    <RechartsTooltip formatter={(v: any) => [formatNumber(v), "Clientes"]} />
                    {data?.fechaCorte && parseInt(pronosticoMeses) > 0 && (
                      <ReferenceArea x1={data.fechaCorte} fill="hsl(var(--accent))" fillOpacity={0.08} label="Zona Proyectada" />
                    )}
                    <Line type="monotone" dataKey="clientes" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico 2: Facturación */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-amber-500" />
                    Facturación Neta (Mensual ARS)
                  </span>
                  {parseInt(pronosticoMeses) > 0 && (
                    <Badge variant="secondary" className="bg-pink-500/20 text-pink-300 border-pink-500/30 text-[10px]">
                      Holt-Winters (+{pronosticoMeses}m)
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={datosCombinados} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="key" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => formatCurrencyCompact(v)} />
                    <RechartsTooltip formatter={(v: any) => [formatCurrency(v), "Facturación"]} />
                    {data?.fechaCorte && parseInt(pronosticoMeses) > 0 && (
                      <ReferenceArea x1={data.fechaCorte} fill="hsl(var(--accent))" fillOpacity={0.08} label="Zona Proyectada" />
                    )}
                    <Line type="monotone" dataKey="facturacion" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico 3: Ticket Promedio */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-rose-500" />
                  Ticket Promedio (Facturación/Cliente)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={datosCombinados} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="key" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => formatCurrencyCompact(v)} />
                    <RechartsTooltip formatter={(v: any) => [formatCurrency(v), "Ticket Promedio"]} />
                    <Line type="monotone" dataKey="ticketPromedio" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico 4: Chango Promedio */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-purple-500" />
                  Chango Promedio (Unidades/Cliente)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={datosCombinados.filter(d => d.changoPromedio !== null)} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="key" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={['auto', 'auto']} tickFormatter={(v) => v.toFixed(2)} />
                    <RechartsTooltip formatter={(v: any) => [`${Number(v).toFixed(2)} u/cli`, "Chango Promed."]} />
                    <Line type="monotone" dataKey="changoPromedio" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* CRUCE CON INFLACIÓN & CORRELACIONES */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Gráfico Comparativo Var. Facturación vs Inflación Mensual */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <span>Variación Facturación Neta vs Inflación Mensual (%)</span>
                  <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-500">
                    IPC Inflación
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={datosCombinados.filter(d => d.varFacturacion !== null)} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="key" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${v}%`} />
                    <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={11} tickFormatter={(v) => `${v}%`} />
                    <RechartsTooltip formatter={(v: any, name: any) => [`${Number(v).toFixed(2)}%`, name]} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="varFacturacion" name="Var. Facturación (%)" stroke="#3b82f6" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="inflacionMensual" name="Inflación Mensual (%)" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico de Barras Horizontales de Correlación vs Inflación */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">Correlación vs Inflación Mensual</CardTitle>
                <CardDescription className="text-xs">Coeficiente r de Pearson (-1 a +1)</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={data?.correlaciones || []} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" domain={[-1, 1]} tickFormatter={(v) => v.toFixed(2)} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis dataKey="indicador" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={85} />
                    <RechartsTooltip formatter={(v: any) => [Number(v).toFixed(3), "Coeficiente r"]} />
                    <Bar dataKey="r">
                      {(data?.correlaciones || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.r >= 0 ? "#10b981" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* TABLA RESUMEN DEL ÚLTIMO MES */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">Resumen Métricas Comercial — Último Mes Auditado ({ultimoFechaTxt})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground text-left text-xs uppercase font-semibold">
                      <th className="py-3 px-4">Indicador</th>
                      <th className="py-3 px-4 text-right">Valor Actual ({ultimoFechaTxt})</th>
                      <th className="py-3 px-4 text-right">Variación MoM</th>
                      <th className="py-3 px-4 text-right">Variación YoY</th>
                      <th className="py-3 px-4 text-right">Variación YTD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {kpisList.map((k) => (
                      <tr key={k.clave} className="hover:bg-muted/20">
                        <td className="py-3 px-4 font-semibold text-foreground flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-accent" />
                          {k.titulo}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-foreground tabular-nums">
                          {fmtValor(k.valorActual, k.formato, k.sufijo)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold tabular-nums">
                          {k.mom !== null ? (
                            <span className={k.mom >= 0 ? "text-emerald-500" : "text-rose-500"}>
                              {k.mom >= 0 ? "▲ " : "▼ "}{formatSigned(k.mom)}
                            </span>
                          ) : <span className="text-muted-foreground">s/d</span>}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold tabular-nums">
                          {k.yoy !== null ? (
                            <span className={k.yoy >= 0 ? "text-emerald-500" : "text-rose-500"}>
                              {k.yoy >= 0 ? "▲ " : "▼ "}{formatSigned(k.yoy)}
                            </span>
                          ) : <span className="text-muted-foreground">s/d</span>}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold tabular-nums">
                          {k.ytd !== null ? (
                            <span className={k.ytd >= 0 ? "text-emerald-500" : "text-rose-500"}>
                              {k.ytd >= 0 ? "▲ " : "▼ "}{formatSigned(k.ytd)}
                            </span>
                          ) : <span className="text-muted-foreground">s/d</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MATRIZ DE ESTACIONALIDAD HETEROGÉNEA (HEATMAP AÑO X MES) */}
      {activeTab === "matriz" && (
        <div className="space-y-6">
          {/* SELECTOR DE INDICADOR PARA HEATMAP */}
          <Card className="border-border bg-card shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Grid3X3 className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold">Variable para Matriz de Estacionalidad:</span>
                <Select value={matrizCampo} onValueChange={(v: any) => setMatrizCampo(v)}>
                  <SelectTrigger className="w-[200px] bg-background h-9 text-xs font-semibold">
                    <SelectValue placeholder="Seleccionar indicador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="varClientes">Variación % Clientes</SelectItem>
                    <SelectItem value="varFacturacion">Variación % Facturación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="outline" className="text-xs border-primary/30">
                Matriz Estacional Interanual
              </Badge>
            </CardContent>
          </Card>

          {/* TABLA HEATMAP MATRIZ AÑO X MES */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Grid3X3 className="h-4 w-4 text-accent" />
                Matriz de Variación Mensual ({matrizCampo === 'varClientes' ? 'Clientes' : 'Facturación'})
              </CardTitle>
              <CardDescription className="text-xs">
                Porcentaje de crecimiento o caída intermensual por cada mes y año auditado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse border border-border">
                  <thead>
                    <tr className="bg-primary text-primary-foreground font-bold">
                      <th className="p-2 text-left border border-border">Año</th>
                      {MESES_NOMBRES.map(m => (
                        <th key={m} className="p-2 text-center border border-border">{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(matrizCampo === 'varClientes' ? data?.matrizClientes.matriz : data?.matrizFacturacion.matriz)?.map((row) => (
                      <tr key={row.anio} className="border-b border-border">
                        <td className="p-2.5 font-bold text-foreground bg-muted/30 border border-border">{row.anio}</td>
                        {row.meses.map((val, idx) => {
                          let bgColor = "bg-muted/10 text-muted-foreground"
                          if (val !== null && !isNaN(val)) {
                            if (val >= 15) bgColor = "bg-emerald-600/90 text-white font-bold"
                            else if (val >= 5) bgColor = "bg-emerald-500/40 text-emerald-300 font-semibold"
                            else if (val > 0) bgColor = "bg-emerald-500/20 text-emerald-400"
                            else if (val <= -15) bgColor = "bg-rose-600/90 text-white font-bold"
                            else if (val <= -5) bgColor = "bg-rose-500/40 text-rose-300 font-semibold"
                            else if (val < 0) bgColor = "bg-rose-500/20 text-rose-400"
                          }

                          return (
                            <td key={idx} className={cn("p-2 text-center tabular-nums border border-border/50", bgColor)}>
                              {val !== null && !isNaN(val) ? `${formatSigned(val)}` : "—"}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ESTADÍSTICAS ESTACIONALES POR MES (MEDIA, DESVÍO, KURTOSIS) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Media Estacional */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                  Media Estacional por Mes (%)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(matrizCampo === 'varClientes' ? data?.matrizClientes.estadisticas : data?.matrizFacturacion.estadisticas) || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="mesNombre" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `${v}%`} />
                    <RechartsTooltip formatter={(v: any) => [`${Number(v).toFixed(2)}%`, "Media"]} />
                    <Bar dataKey="media">
                      {((matrizCampo === 'varClientes' ? data?.matrizClientes.estadisticas : data?.matrizFacturacion.estadisticas) || []).map((entry, idx) => (
                        <Cell key={idx} fill={entry.media >= 0 ? "#10b981" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Desvío Estándar por Mes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-500" />
                  Desvío Estándar (Volatilidad)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(matrizCampo === 'varClientes' ? data?.matrizClientes.estadisticas : data?.matrizFacturacion.estadisticas) || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="mesNombre" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `${v}%`} />
                    <RechartsTooltip formatter={(v: any) => [`${Number(v).toFixed(2)}%`, "Desvío Std"]} />
                    <Bar dataKey="std" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Kurtosis por Mes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-500" />
                  Kurtosis Estacional
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(matrizCampo === 'varClientes' ? data?.matrizClientes.estadisticas : data?.matrizFacturacion.estadisticas) || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="mesNombre" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <RechartsTooltip formatter={(v: any) => [Number(v).toFixed(2), "Kurtosis"]} />
                    <Bar dataKey="kurtosis" fill="#a855f7" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

// components/monarca/views/reportes/participacion-sucursales-panel.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import {
  PieChart as PieIcon,
  Store,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  Printer,
  Ban,
  DollarSign,
  Receipt,
  Award,
  BarChart3,
} from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { exportarExcelProfesional } from "@/lib/excel-styler"
import type { ParticipacionReporteResponse, ParticipacionSucursalItem } from "@/lib/reportes-data"

const PALETA_COLORES = [
  "#0046ad",
  "#FF5C15",
  "#10b981",
  "#8b5cf6",
  "#06b6d4",
  "#f59e0b",
  "#ec4899",
]

export function ParticipacionSucursalesPanel() {
  const [desde, setDesde] = useState<string>("")
  const [hasta, setHasta] = useState<string>("")
  const [sucursalesDisponibles, setSucursalesDisponibles] = useState<string[]>([])
  const [excluidas, setExcluidas] = useState<string[]>([])

  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [resultData, setResultData] = useState<ParticipacionReporteResponse | null>(null)
  const [activeViewMode, setActiveViewMode] = useState<"graficos" | "tabla">("graficos")

  useEffect(() => {
    fetch("/api/reportes/sucursales")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.sucursales)) {
          setSucursalesDisponibles(d.sucursales)
        }
      })
      .catch(() => {})

    // Carga inicial automática
    handleConsultar([])
  }, [])

  const toggleExcluirSucursal = (nombre: string) => {
    const nextExcluidas = excluidas.includes(nombre)
      ? excluidas.filter((s) => s !== nombre)
      : [...excluidas, nombre]
    setExcluidas(nextExcluidas)
    handleConsultar(nextExcluidas)
  }

  const handleIncluirTodas = () => {
    setExcluidas([])
    handleConsultar([])
  }

  const handleConsultar = async (excluidasList = excluidas) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/reportes/participacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desde, hasta, excluidas: excluidasList }),
      })

      const data = await res.json()
      if (data.ok) {
        setResultData(data)
      } else {
        setError(data.error || "Error al calcular la participación de sucursales.")
      }
    } catch (err: any) {
      setError(err.message || "Error de conexión con el servidor.")
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = async () => {
    if (!resultData || !resultData.data || resultData.data.length === 0) return

    await exportarExcelProfesional({
      titulo: "Reporte de Participación de Sucursales",
      subtitulo: `Período: ${resultData.periodo.desde} al ${resultData.periodo.hasta} | Sucursales Activas: ${resultData.sucursalesEvaluadas}`,
      nombreArchivo: `participacion-sucursales-monarca-${new Date().toISOString().slice(0, 10)}.xlsx`,
      nombreHoja: "Participación",
      kpis: [
        { label: "Facturación Total", value: `$${(resultData.totalVenta / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M` },
        { label: "Tickets Emitidos", value: resultData.totalTickets.toLocaleString("es-AR") },
        { label: "Ticket Promedio", value: `$${resultData.ticketPromedio.toLocaleString("es-AR", { maximumFractionDigits: 0 })}` },
        { label: "Sucursal Líder", value: `${resultData.data[0]?.sucursal || "-"} (${resultData.data[0]?.porcentajeTexto || "0%"})` },
      ],
      columnas: [
        { key: "posicion", header: "Posición", width: 12, type: "number", align: "center" },
        { key: "sucursal", header: "Sucursal", width: 26, type: "text", align: "left" },
        { key: "ventaTotal", header: "Venta Total ($)", width: 22, type: "currency", align: "right" },
        { key: "porcentaje", header: "Participación (%)", width: 18, type: "percent", align: "right" },
        { key: "tickets", header: "Tickets Emitidos", width: 18, type: "number", align: "right" },
        { key: "ticketPromedio", header: "Ticket Promedio ($)", width: 20, type: "currency", align: "right" },
      ],
      datos: resultData.data,
      totales: {
        posicion: "-",
        sucursal: "TOTAL CONSOLIDADO",
        ventaTotal: resultData.totalVenta,
        porcentaje: 100,
        tickets: resultData.totalTickets,
        ticketPromedio: resultData.ticketPromedio,
      },
    })
  }

  const chartData = useMemo(() => {
    if (!resultData?.data) return []
    return resultData.data.map((r, i) => ({
      name: r.sucursal,
      value: r.ventaTotal,
      porcentaje: r.porcentaje,
      color: PALETA_COLORES[i % PALETA_COLORES.length],
    }))
  }, [resultData])

  return (
    <div className="space-y-6">
      {/* Barra de Controles y Filtros */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Fecha Desde:
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Fecha Hasta:
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => handleConsultar()}
                disabled={loading}
                className="flex h-[38px] w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-xs font-bold text-accent-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>{loading ? "Calculando..." : "Actualizar"}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveViewMode(activeViewMode === "graficos" ? "tabla" : "graficos")}
              className="flex h-[38px] items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            >
              {activeViewMode === "graficos" ? <BarChart3 className="h-4 w-4" /> : <PieIcon className="h-4 w-4" />}
              <span>{activeViewMode === "graficos" ? "Ver Gráficos" : "Ver Tabla"}</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!resultData?.data?.length}
              className="flex h-[38px] items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-primary transition hover:bg-muted disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-accent" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* Exclusión Dinámica de Sucursales */}
        <div className="mt-4 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Filter className="h-3 w-3 text-accent" /> Exclusión dinámica:
            </span>
            {sucursalesDisponibles.map((suc) => {
              const isExcluida = excluidas.includes(suc)
              return (
                <button
                  key={suc}
                  type="button"
                  onClick={() => toggleExcluirSucursal(suc)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                    isExcluida
                      ? "bg-red-500/10 text-red-500 border border-red-500/30 line-through"
                      : "bg-muted text-foreground border border-border hover:border-accent"
                  }`}
                >
                  <Store className="h-3 w-3" />
                  {suc}
                  {isExcluida && <Ban className="h-3 w-3 text-red-500" />}
                </button>
              )
            })}
            {excluidas.length > 0 && (
              <button
                type="button"
                onClick={handleIncluirTodas}
                className="text-xs font-semibold text-accent underline hover:opacity-80"
              >
                Restablecer todas
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-medium text-red-500">
          {error}
        </div>
      )}

      {/* Tarjetas KPI Superiores */}
      {resultData && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Facturación Período</span>
              <DollarSign className="h-4 w-4 text-accent" />
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">
              ${(resultData.totalVenta / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {resultData.sucursalesEvaluadas} sucursales computadas
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Comprobantes Emitidos</span>
              <Receipt className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">
              {resultData.totalTickets.toLocaleString("es-AR")}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Tickets en el período seleccionado
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Ticket Promedio Red</span>
              <Award className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">
              ${resultData.ticketPromedio.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Promedio ponderado global
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Sucursal Líder</span>
              <Store className="h-4 w-4 text-purple-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">
              {resultData.data[0]?.sucursal || "-"}
            </div>
            <p className="mt-1 text-[11px] text-accent font-semibold">
              {resultData.data[0]?.porcentajeTexto || "0%"} de la facturación total
            </p>
          </div>
        </div>
      )}

      {/* Visualización Dual: Gráficos de Distribución + Tabla de Participación */}
      {resultData && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Gráfico de Torta / Distribución */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-5">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-accent" /> Distribución de Participación
            </h3>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`$${Number(val).toLocaleString("es-AR")}`, "Venta"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Leyenda con Porcentajes */}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-3">
              {chartData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="truncate text-muted-foreground">{entry.name}:</span>
                  <span className="font-bold text-foreground">{entry.porcentaje}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabla Desglosada con Barra Visual de Participación */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-7">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Store className="h-4 w-4 text-accent" /> Ranking de Participación
              </span>
              <span className="text-xs text-muted-foreground font-normal">
                Ordenado por volumen de ventas
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-2 font-bold">#</th>
                    <th className="pb-2 font-bold">Sucursal</th>
                    <th className="pb-2 text-right font-bold">Venta Total</th>
                    <th className="pb-2 text-right font-bold">Participación</th>
                    <th className="pb-2 text-right font-bold">Tickets</th>
                    <th className="pb-2 text-right font-bold">Ticket Prom.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {resultData.data.map((item, idx) => (
                    <tr key={item.sucursal} className="hover:bg-muted/50 transition">
                      <td className="py-3 font-black text-muted-foreground">
                        {item.posicion === 1 ? "🥇 1" : item.posicion === 2 ? "🥈 2" : item.posicion === 3 ? "🥉 3" : item.posicion}
                      </td>
                      <td className="py-3 font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: PALETA_COLORES[idx % PALETA_COLORES.length] }}
                          />
                          {item.sucursal}
                        </div>
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-foreground">
                        ${item.ventaTotal.toLocaleString("es-AR")}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-accent"
                              style={{ width: `${Math.min(100, item.porcentaje * 2.5)}%` }}
                            />
                          </div>
                          <span className="font-bold text-accent">{item.porcentajeTexto}</span>
                        </div>
                      </td>
                      <td className="py-3 text-right font-mono text-muted-foreground">
                        {item.tickets.toLocaleString("es-AR")}
                      </td>
                      <td className="py-3 text-right font-mono text-muted-foreground">
                        ${item.ticketPromedio.toLocaleString("es-AR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

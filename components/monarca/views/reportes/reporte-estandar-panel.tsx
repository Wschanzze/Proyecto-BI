// components/monarca/views/reportes/reporte-estandar-panel.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Filter,
  Download,
  Printer,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Receipt,
  Store,
  Calendar,
} from "lucide-react"
import * as XLSX from "xlsx"
import type { ReportTemplateDef } from "@/lib/reportes-data"

interface ReporteEstandarPanelProps {
  template: ReportTemplateDef
}

export function ReporteEstandarPanel({ template }: ReporteEstandarPanelProps) {
  const [desde, setDesde] = useState<string>("")
  const [hasta, setHasta] = useState<string>("")
  const [sucursal, setSucursal] = useState<string>("TODAS")
  const [sucursales, setSucursales] = useState<string[]>([])

  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any[]>([])
  const [reportGenerated, setReportGenerated] = useState<boolean>(false)

  // Búsqueda y paginación
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 20

  useEffect(() => {
    fetch("/api/reportes/sucursales")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.sucursales)) {
          setSucursales(["TODAS", ...d.sucursales])
        }
      })
      .catch(() => {})

    handleGenerar()
  }, [template.id])

  const handleGenerar = async () => {
    setLoading(true)
    setError(null)
    setReportGenerated(false)
    setCurrentPage(1)

    try {
      const res = await fetch("/api/reportes/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: template.queryType,
          desde: desde || null,
          hasta: hasta || null,
          sucursal: sucursal === "TODAS" ? null : sucursal,
        }),
      })

      const json = await res.json()
      if (json.ok) {
        setData(json.data || [])
        setReportGenerated(true)
      } else {
        setError(json.error || "Error al obtener datos del reporte")
        setData([])
      }
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servidor")
      setData([])
    } finally {
      setLoading(false)
    }
  }

  // Filtrado reactivo en cliente
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data
    const term = searchTerm.toLowerCase()
    return data.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(term))
    )
  }, [data, searchTerm])

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, currentPage, pageSize])

  const columnas = data.length > 0 ? Object.keys(data[0]) : []

  // KPIs dinámicos calculados según el tipo de reporte
  const kpis = useMemo(() => {
    if (!data || data.length === 0) return []

    if (template.id === "resumen-sucursal" || template.id === "ticket-promedio") {
      const ventaTotal = data.reduce((acc, r) => acc + Number(r.VentaTotal || 0), 0)
      const ticketsTotal = data.reduce((acc, r) => acc + Number(r.TotalTickets || 0), 0)
      const avgTicket = ticketsTotal > 0 ? ventaTotal / ticketsTotal : 0
      return [
        { label: "Facturación Total", value: `$${(ventaTotal / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`, sub: `${data.length} sucursales evaluadas` },
        { label: "Tickets Emitidos", value: ticketsTotal.toLocaleString("es-AR"), sub: "Comprobantes registrados" },
        { label: "Ticket Promedio", value: `$${avgTicket.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`, sub: "Promedio ponderado" },
      ]
    }

    if (template.id === "ventas-diarias") {
      const vTotal = data.reduce((acc, r) => acc + Number(r.VentaTotal || 0), 0)
      const tTotal = data.reduce((acc, r) => acc + Number(r.CantidadTickets || 0), 0)
      const vDiariaAvg = data.length > 0 ? vTotal / data.length : 0
      return [
        { label: "Total Período", value: `$${(vTotal / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`, sub: `${data.length} jornadas computadas` },
        { label: "Promedio Diario", value: `$${(vDiariaAvg / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`, sub: "Facturación por jornada" },
        { label: "Tickets Totales", value: tTotal.toLocaleString("es-AR"), sub: "Transacciones acumuladas" },
      ]
    }

    if (template.id === "top-productos") {
      const vTop = data.reduce((acc, r) => acc + Number(r.ImporteTotal || 0), 0)
      const uTop = data.reduce((acc, r) => acc + Number(r.CantidadVendida || 0), 0)
      return [
        { label: "Facturación Top", value: `$${(vTop / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`, sub: "Suma de los ítems líderes" },
        { label: "Unidades Totales", value: uTop.toLocaleString("es-AR"), sub: "Volumen acumulado" },
        { label: "Líder en Facturación", value: data[0]?.NombreProducto ? data[0].NombreProducto.substring(0, 18) + "..." : "-", sub: data[0] ? `$${Number(data[0].ImporteTotal || 0).toLocaleString("es-AR")}` : "" },
      ]
    }

    if (template.id === "horas-pico") {
      const horaMax = [...data].sort((a, b) => (b.VentaTotal || 0) - (a.VentaTotal || 0))[0]
      const totalTickets = data.reduce((acc, r) => acc + Number(r.TotalTickets || 0), 0)
      return [
        { label: "Hora de Mayor Afluencia", value: horaMax?.HoraDelDia || "-", sub: `$${Number(horaMax?.VentaTotal || 0).toLocaleString("es-AR")}` },
        { label: "Tickets Totales", value: totalTickets.toLocaleString("es-AR"), sub: "Operación de cajas" },
        { label: "Franjas Evaluadas", value: `${data.length} horas`, sub: "Rango comercial" },
      ]
    }

    if (template.id === "secos-quiebre") {
      const cantTotal = data.reduce((acc, r) => acc + Number(r.TotalCantidadVendida || 0), 0)
      const vPesos = data.reduce((acc, r) => acc + Number(r.VentaTotalPesos || 0), 0)
      return [
        { label: "Artículos Analizados", value: data.length.toString(), sub: "Ítems críticos" },
        { label: "Unidades SECOS", value: cantTotal.toLocaleString("es-AR"), sub: "Volumen vendido" },
        { label: "Facturación Pesos", value: `$${(vPesos / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`, sub: "En 15 días analizados" },
      ]
    }

    return [
      { label: "Registros Procesados", value: data.length.toLocaleString("es-AR"), sub: "Filas obtenidas" },
    ]
  }, [data, template.id])

  const handleExportExcel = () => {
    if (filteredData.length === 0) return
    const ws = XLSX.utils.json_to_sheet(filteredData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Reporte")
    XLSX.writeFile(wb, `reporte-monarca-${template.id}-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const handleExportCSV = () => {
    if (filteredData.length === 0) return
    const headers = Object.keys(filteredData[0])
    const csvContent = [
      headers.join(","),
      ...filteredData.map((row) =>
        headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `reporte-monarca-${template.id}-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
  }

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones de Exportación */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-foreground">{template.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
        </div>

        {reportGenerated && data.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <Download className="h-4 w-4" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground shadow transition hover:opacity-90"
            >
              <Download className="h-4 w-4" />
              <span>Excel (.xlsx)</span>
            </button>
          </div>
        )}
      </div>

      {/* Barra de Filtros */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Fecha Desde:
            </label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground outline-none transition focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Fecha Hasta:
            </label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground outline-none transition focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Sucursal:
            </label>
            <select
              value={sucursal}
              onChange={(e) => setSucursal(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground outline-none transition focus:border-accent"
            >
              {sucursales.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleGenerar}
              disabled={loading}
              className="flex h-[34px] w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-xs font-bold text-accent-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? "Generando..." : "Generar Reporte"}</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-medium text-red-500">
          {error}
        </div>
      )}

      {/* Tarjetas KPI */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map((kpi, idx) => (
            <div key={idx} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
              <div className="mt-2 text-2xl font-black text-foreground">{kpi.value}</div>
              <p className="mt-1 text-[11px] text-muted-foreground">{kpi.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Barra de Búsqueda Interna */}
      {data.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar en el reporte..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full rounded-lg border border-border bg-card py-1.5 pl-9 pr-3 text-xs font-medium text-foreground outline-none transition focus:border-accent"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {filteredData.length} filas
          </span>
        </div>
      )}

      {/* Tabla del Reporte */}
      {reportGenerated && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                  {columnas.map((col) => (
                    <th key={col} className="px-4 py-3 font-bold whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedData.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-muted/40 transition">
                    {columnas.map((col) => {
                      const val = row[col]
                      const isNumber = typeof val === "number"
                      const isMoney =
                        col.toLowerCase().includes("venta") ||
                        col.toLowerCase().includes("importe") ||
                        col.toLowerCase().includes("precio") ||
                        col.toLowerCase().includes("ticketpromedio")
                      return (
                        <td
                          key={col}
                          className={`px-4 py-2.5 whitespace-nowrap ${
                            isNumber ? "font-mono" : ""
                          }`}
                        >
                          {isMoney && isNumber
                            ? `$${val.toLocaleString("es-AR")}`
                            : isNumber
                            ? val.toLocaleString("es-AR")
                            : String(val ?? "-")}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={columnas.length} className="py-8 text-center text-xs text-muted-foreground">
                      No hay datos disponibles para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background transition hover:bg-muted disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background transition hover:bg-muted disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

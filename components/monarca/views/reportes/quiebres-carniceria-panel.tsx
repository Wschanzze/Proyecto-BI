// components/monarca/views/reportes/quiebres-carniceria-panel.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Flame,
  AlertTriangle,
  Clock,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Store,
} from "lucide-react"
import * as XLSX from "xlsx"
import type { QuiebreCarniceriaItem } from "@/lib/reportes-data"

export function QuiebresCarniceriaPanel() {
  const [desde, setDesde] = useState<string>("")
  const [hasta, setHasta] = useState<string>("")
  const [sucursal, setSucursal] = useState<string>("TODAS")
  const [sucursales, setSucursales] = useState<string[]>([])

  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [resultData, setResultData] = useState<QuiebreCarniceriaItem[]>([])
  const [resumen, setResumen] = useState<any>(null)

  // Filtros de búsqueda en cliente y paginación
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS")
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 20

  useEffect(() => {
    fetch("/api/reportes/sucursales")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.sucursales)) {
          setSucursales(["TODAS", ...d.sucursales.filter((s: string) => s !== "Monarca Virtual")])
        }
      })
      .catch(() => {})

    handleConsultar()
  }, [])

  const handleConsultar = async () => {
    setLoading(true)
    setError(null)
    setCurrentPage(1)

    try {
      const res = await fetch("/api/reportes/quiebres-carniceria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desde, hasta, sucursal }),
      })

      const data = await res.json()
      if (data.ok) {
        setResultData(data.data || [])
        setResumen(data.resumen)
      } else {
        setError(data.error || "Error al consultar los quiebres de carnicería.")
      }
    } catch (err: any) {
      setError(err.message || "Error de conexión con el servidor.")
    } finally {
      setLoading(false)
    }
  }

  // Filtrado reactivo en el cliente
  const filteredData = useMemo(() => {
    return resultData.filter((item) => {
      const matchSearch =
        searchTerm === "" ||
        item.producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.codBarra.includes(searchTerm) ||
        item.sucursal.toLowerCase().includes(searchTerm.toLowerCase())

      const matchEstado =
        filtroEstado === "TODOS" || item.estadoQuiebre === filtroEstado

      return matchSearch && matchEstado
    })
  }, [resultData, searchTerm, filtroEstado])

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, currentPage, pageSize])

  const handleExportExcel = () => {
    if (filteredData.length === 0) return

    const rows = filteredData.map((r) => ({
      "Fecha": r.fecha,
      "Sucursal": r.sucursal,
      "Cód. Barra": r.codBarra,
      "Producto": r.producto,
      "1ª Compra": r.primeraCompra,
      "Última Compra": r.ultimaCompra,
      "Kilos Vendidos": r.totalKilosVendidos,
      "Tickets": r.ticketsVendidos,
      "Estado Diagnóstico": r.estadoQuiebre,
      "Observación Operativa": r.observacion,
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Quiebres Carnicería")
    XLSX.writeFile(workbook, `quiebres-carniceria-monarca-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="space-y-6">
      {/* Barra de Filtros de Consulta */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Fecha Desde:
              </label>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground outline-none transition focus:border-accent"
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
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground outline-none transition focus:border-accent"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Sucursal:
              </label>
              <select
                value={sucursal}
                onChange={(e) => setSucursal(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground outline-none transition focus:border-accent"
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
                onClick={handleConsultar}
                disabled={loading}
                className="flex h-[38px] w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-xs font-bold text-accent-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>{loading ? "Analizando..." : "Consultar Quiebres"}</span>
              </button>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filteredData.length === 0}
              className="flex h-[38px] items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-primary transition hover:bg-muted disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-accent" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-medium text-red-500">
          {error}
        </div>
      )}

      {/* Tarjetas KPI de Quiebres */}
      {resumen && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <span className="text-xs font-medium text-muted-foreground">Cortes Evaluados</span>
            <div className="mt-2 text-2xl font-black text-foreground">{resumen.totalEvaluados}</div>
            <p className="mt-1 text-[11px] text-muted-foreground">Registros diarios analizados</p>
          </div>

          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 shadow-sm">
            <span className="text-xs font-bold text-red-500 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Quiebres Críticos
            </span>
            <div className="mt-2 text-2xl font-black text-red-600 dark:text-red-400">
              {resumen.quiebresCriticos}
            </div>
            <p className="mt-1 text-[11px] text-red-500/80">Última venta antes de 14:30 hs</p>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-sm">
            <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Alerta Temprana
            </span>
            <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
              {resumen.alertasTempranas}
            </div>
            <p className="mt-1 text-[11px] text-amber-500/80">Última venta entre 14:30 y 18:30 hs</p>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm">
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Cobertura Óptima
            </span>
            <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {resumen.coberturaNormal}
            </div>
            <p className="mt-1 text-[11px] text-emerald-500/80">Ventas hasta horario de cierre</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <span className="text-xs font-medium text-muted-foreground">Tasa de Quiebre</span>
            <div className="mt-2 text-2xl font-black text-accent">{resumen.tasaQuiebrePct}%</div>
            <p className="mt-1 text-[11px] text-muted-foreground">Incidencia sobre el mostrador</p>
          </div>
        </div>
      )}

      {/* Barra de Filtros Internos de la Tabla */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar corte o código..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-9 pr-3 text-xs font-medium text-foreground outline-none transition focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Estado:</span>
          {(["TODOS", "QUIEBRE_CRITICO", "ALERTA_TEMPRANA", "NORMAL"] as const).map((est) => (
            <button
              key={est}
              type="button"
              onClick={() => {
                setFiltroEstado(est)
                setCurrentPage(1)
              }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filtroEstado === est
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {est === "TODOS"
                ? "Todos"
                : est === "QUIEBRE_CRITICO"
                ? "Críticos"
                : est === "ALERTA_TEMPRANA"
                ? "Alertas"
                : "Normales"}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Quiebres */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                <th className="px-4 py-3 font-bold">Fecha</th>
                <th className="px-4 py-3 font-bold">Sucursal</th>
                <th className="px-4 py-3 font-bold">Cód. Barra</th>
                <th className="px-4 py-3 font-bold">Corte / Producto</th>
                <th className="px-4 py-3 font-bold">1ª Compra</th>
                <th className="px-4 py-3 font-bold">Última Compra</th>
                <th className="px-4 py-3 text-right font-bold">Kilos</th>
                <th className="px-4 py-3 text-right font-bold">Tickets</th>
                <th className="px-4 py-3 font-bold">Diagnóstico de Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedData.map((item) => {
                const isCritico = item.estadoQuiebre === "QUIEBRE_CRITICO"
                const isAlerta = item.estadoQuiebre === "ALERTA_TEMPRANA"
                return (
                  <tr key={item.id} className="hover:bg-muted/40 transition">
                    <td className="px-4 py-3 font-mono text-muted-foreground">{item.fecha}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{item.sucursal}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{item.codBarra}</td>
                    <td className="px-4 py-3 font-bold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <Flame className="h-3.5 w-3.5 text-accent" />
                        <span>{item.producto}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{item.primeraCompra} hs</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs font-bold ${
                          isCritico
                            ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                            : isAlerta
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        <Clock className="h-3 w-3" />
                        {item.ultimaCompra} hs
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                      {item.totalKilosVendidos} kg
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      {item.ticketsVendidos}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] font-semibold ${
                          isCritico
                            ? "text-red-500"
                            : isAlerta
                            ? "text-amber-500"
                            : "text-emerald-500"
                        }`}
                      >
                        {item.observacion}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-muted-foreground">
                    No se encontraron registros con los filtros actuales.
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
              Mostrando página {currentPage} de {totalPages} ({filteredData.length} registros)
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
    </div>
  )
}

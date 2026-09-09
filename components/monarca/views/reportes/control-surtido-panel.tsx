// components/monarca/views/reportes/control-surtido-panel.tsx
"use client"

import { useState, useMemo } from "react"
import {
  Upload,
  AlertTriangle,
  Search,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Filter,
  Layers,
  Sparkles,
  RefreshCw,
} from "lucide-react"
import * as XLSX from "xlsx"
import { getControlSurtidoDemo, type SurtidoItem } from "@/lib/reportes-data"

export function ControlSurtidoPanel() {
  const [fileStock, setFileStock] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SurtidoItem[]>(() => getControlSurtidoDemo().data)
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroSucursal, setFiltroSucursal] = useState("TODAS")

  const handleCargarDemo = () => {
    setLoading(true)
    setTimeout(() => {
      setData(getControlSurtidoDemo().data)
      setLoading(false)
    }, 400)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileStock(file)
      setLoading(true)
      // Procesar archivo con XLSX
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result
          const wb = XLSX.read(bstr, { type: "binary" })
          const wsname = wb.SheetNames[0]
          const ws = wb.Sheets[wsname]
          const json: any[] = XLSX.utils.sheet_to_json(ws)
          if (json.length > 0) {
            const parsed: SurtidoItem[] = json.map((row, idx) => ({
              sucursal: row.Sucursal || row.sucursal || "Colón",
              int: String(row.Int || row.int || row.Codigo || idx + 1000),
              ean: String(row.EAN || row.ean || row.Barra || "7790000000000"),
              producto: row.Producto || row.producto || row.Descripcion || "Producto Surtido",
              categoria: row.Categoria || row.categoria || "Almacén",
              grupo: row.Grupo || row.grupo || "General",
              stockActual: Number(row.Stock || row.stockActual || 15),
              diasSinVenta: Number(row.DiasSinVenta || 0),
              estado: Number(row.Stock || 15) < 10 ? "CRITICO" : "OPTIMO",
            }))
            setData(parsed)
          }
        } catch {
          // Fallback a demo si falla el parseo
          setData(getControlSurtidoDemo().data)
        } finally {
          setLoading(false)
        }
      }
      reader.readAsBinaryString(file)
    }
  }

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchSearch =
        searchTerm === "" ||
        item.producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ean.includes(searchTerm) ||
        item.int.includes(searchTerm)

      const matchSuc =
        filtroSucursal === "TODAS" || item.sucursal === filtroSucursal

      return matchSearch && matchSuc
    })
  }, [data, searchTerm, filtroSucursal])

  const handleExportExcel = () => {
    if (filteredData.length === 0) return

    const rows = filteredData.map((r) => ({
      "Sucursal": r.sucursal,
      "Int": r.int,
      "EAN": r.ean,
      "Producto": r.producto,
      "Categoría": r.categoria,
      "Grupo": r.grupo,
      "Stock Actual": r.stockActual,
      "Días sin Venta": r.diasSinVenta,
      "Estado": r.estado,
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Control Surtido")
    XLSX.writeFile(wb, `control-surtido-monarca-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="space-y-6">
      {/* Box de Carga / Instrucciones */}
      <div className="rounded-xl border border-dashed border-accent/40 bg-accent/5 p-6 text-center">
        <Layers className="mx-auto h-8 w-8 text-accent mb-2" />
        <h3 className="text-sm font-bold text-foreground">
          Elaboración de Control de Surtido y Stock
        </h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-xl mx-auto">
          Cruce de Stock General, Movimientos y Ventas de productos SECOS en 15 días con detección de quiebres por sucursal.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-accent-foreground shadow transition hover:opacity-90">
            <Upload className="h-4 w-4" />
            <span>Subir Archivo Stock (.xlsx / .csv)</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleCargarDemo}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            <Sparkles className="h-4 w-4 text-accent" />
            <span>Recargar Datos de Muestra</span>
          </button>
        </div>

        {fileStock && (
          <p className="mt-2 text-xs text-emerald-500 font-semibold">
            Archivo cargado: {fileStock.name}
          </p>
        )}
      </div>

      {/* Controles de Filtros */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por producto, int o EAN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-9 pr-3 text-xs font-medium text-foreground outline-none transition focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filtroSucursal}
            onChange={(e) => setFiltroSucursal(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground outline-none transition focus:border-accent"
          >
            <option value="TODAS">Todas las Sucursales</option>
            <option value="Colón">Colón</option>
            <option value="San Martín">San Martín</option>
            <option value="Falucho">Falucho</option>
            <option value="Perón">Perón</option>
            <option value="Monarca Virtual">Monarca Virtual</option>
          </select>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-muted"
          >
            <Download className="h-4 w-4 text-accent" />
            <span>Excel Oficial</span>
          </button>
        </div>
      </div>

      {/* Tabla de Surtido */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                <th className="px-4 py-3 font-bold">Sucursal</th>
                <th className="px-4 py-3 font-bold">Int</th>
                <th className="px-4 py-3 font-bold">EAN</th>
                <th className="px-4 py-3 font-bold">Producto</th>
                <th className="px-4 py-3 font-bold">Categoría</th>
                <th className="px-4 py-3 font-bold">Grupo</th>
                <th className="px-4 py-3 text-right font-bold">Stock Actual</th>
                <th className="px-4 py-3 font-bold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredData.map((item, idx) => (
                <tr key={`${item.sucursal}-${item.int}-${idx}`} className="hover:bg-muted/40 transition">
                  <td className="px-4 py-3 font-semibold text-foreground">{item.sucursal}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{item.int}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{item.ean}</td>
                  <td className="px-4 py-3 font-bold text-foreground">{item.producto}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.categoria}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.grupo}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                    {item.stockActual} u.
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        item.estado === "CRITICO"
                          ? "bg-red-500/15 text-red-600 dark:text-red-400"
                          : item.estado === "REGULAR"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {item.estado === "CRITICO" ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                      {item.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

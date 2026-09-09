// components/monarca/views/reportes/proveedores-panel.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  FileSpreadsheet,
  Clock,
  Building2,
  Receipt,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { exportarExcelProfesional, type ExcelColumnDef } from "@/lib/excel-styler"
import type {
  ProveedorCuentaCorriente,
  FacturaPendiente,
  AntiguedadSaldoItem,
  RankingProveedorItem,
  ReportTemplateDef,
} from "@/lib/reportes-data"

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })
const fmtN = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 })
const fmtPct = (n: number) => n.toFixed(1) + "%"
const fmtDate = (iso: string) => {
  if (!iso) return "-"
  const parts = iso.split("-")
  if (parts.length < 3) return iso
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

export function ProveedoresPanel({ template }: { template: ReportTemplateDef }) {
  if (template.id === "cuentas-corrientes") return <CuentasCorrientesView />
  if (template.id === "facturas-pendientes") return <FacturasPendientesView />
  if (template.id === "antiguedad-saldos") return <AntiguedadSaldosView />
  if (template.id === "ranking-proveedores") return <RankingProveedoresView />
  return null
}

function EstadoBadge({ estado }: { estado: string }) {
  const cls: Record<string, string> = {
    CORRIENTE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-400/30",
    "EN MORA": "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-400/30",
    BLOQUEADO: "bg-red-500/15 text-red-700 dark:text-red-300 ring-1 ring-red-400/30",
    VIGENTE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-400/30",
    VENCIDA: "bg-red-500/15 text-red-700 dark:text-red-300 ring-1 ring-red-400/30",
    "VENCE HOY": "bg-orange-500/15 text-orange-700 dark:text-orange-300 ring-1 ring-orange-400/30",
    "VENCE PRONTO": "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-400/30",
  }
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase " +
        (cls[estado] || "bg-muted text-muted-foreground")
      }
    >
      {estado}
    </span>
  )
}

function KpiCard({
  label,
  value,
  sub,
  colorClass = "text-foreground",
}: {
  label: string
  value: string
  sub?: string
  colorClass?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={"text-xl font-extrabold tabular-nums " + colorClass}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-xl text-xs">
      <p className="mb-1 font-bold text-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {fmt.format(p.value)}
        </p>
      ))}
    </div>
  )
}

// ── 1. CUENTAS CORRIENTES ─────────────────────────────────────────────────
function CuentasCorrientesView() {
  const [data, setData] = useState<ProveedorCuentaCorriente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("TODOS")
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 8

  useEffect(() => {
    import("@/lib/reportes-data").then((m) => {
      setData(m.getCuentasCorrientesDemo().data)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    let d = data
    if (filtroEstado !== "TODOS") d = d.filter((r) => r.estado === filtroEstado)
    if (search) {
      d = d.filter(
        (r) =>
          r.razonSocial.toLowerCase().includes(search.toLowerCase()) ||
          r.codProveedor.toLowerCase().includes(search.toLowerCase())
      )
    }
    return d
  }, [data, filtroEstado, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const kpis = useMemo(
    () => ({
      totalDeuda: data.reduce((s, r) => s + r.saldoActual, 0),
      totalMora: data.reduce((s, r) => s + r.deudaVencida, 0),
      bloqueados: data.filter((r) => r.estado === "BLOQUEADO").length,
      enMora: data.filter((r) => r.estado === "EN MORA").length,
    }),
    [data]
  )

  const chartData = useMemo(
    () =>
      data
        .slice()
        .sort((a, b) => b.saldoActual - a.saldoActual)
        .slice(0, 8)
        .map((r) => ({
          name: r.razonSocial.split(" ").slice(0, 2).join(" "),
          Vigente: r.deudaVigente,
          Vencido: r.deudaVencida,
        })),
    [data]
  )

  const handleExport = async () => {
    const cols: ExcelColumnDef[] = [
      { key: "codProveedor", header: "Código", width: 12 },
      { key: "razonSocial", header: "Razón Social", width: 36 },
      { key: "cuit", header: "CUIT", width: 16 },
      { key: "estado", header: "Estado", width: 14 },
      { key: "saldoActual", header: "Saldo Total", width: 18, type: "currency" as const },
      { key: "deudaVigente", header: "Deuda Vigente", width: 18, type: "currency" as const },
      { key: "deudaVencida", header: "Deuda Vencida", width: 18, type: "currency" as const },
      { key: "limiteCredito", header: "Límite Crédito", width: 18, type: "currency" as const },
      { key: "creditoDisponible", header: "Crédito Disponible", width: 18, type: "currency" as const },
      { key: "cantFacturasAbiertas", header: "Facturas Abiertas", width: 16, type: "number" as const },
      { key: "ultimaFactura", header: "Última Factura", width: 14, type: "date" as const },
      { key: "ultimoPago", header: "Último Pago", width: 14, type: "date" as const },
    ]
    await exportarExcelProfesional({
      titulo: "Cuentas Corrientes de Proveedores",
      subtitulo: "Supermercados Monarca — Gestión Contable y Cuentas a Pagar",
      nombreArchivo: "cuentas_corrientes_proveedores",
      nombreHoja: "Cuentas Corrientes",
      columnas: cols,
      datos: data,
      kpis: [
        { label: "Deuda Total", value: fmt.format(kpis.totalDeuda) },
        { label: "Deuda Vencida", value: fmt.format(kpis.totalMora) },
        { label: "Prov. Bloqueados", value: String(kpis.bloqueados) },
        { label: "Prov. en Mora", value: String(kpis.enMora) },
      ],
      totales: {
        codProveedor: "TOTALES",
        razonSocial: "",
        cuit: "",
        estado: "",
        saldoActual: data.reduce((s, r) => s + r.saldoActual, 0),
        deudaVigente: data.reduce((s, r) => s + r.deudaVigente, 0),
        deudaVencida: data.reduce((s, r) => s + r.deudaVencida, 0),
        limiteCredito: data.reduce((s, r) => s + r.limiteCredito, 0),
        creditoDisponible: data.reduce((s, r) => s + r.creditoDisponible, 0),
        cantFacturasAbiertas: data.reduce((s, r) => s + r.cantFacturasAbiertas, 0),
        ultimaFactura: "",
        ultimoPago: "",
      },
    })
  }

  if (loading) {
    return <div className="flex h-40 items-center justify-center text-muted-foreground text-sm animate-pulse">Cargando cuentas corrientes...</div>
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Deuda Total" value={fmt.format(kpis.totalDeuda)} sub={`${data.length} proveedores registrados`} />
        <KpiCard label="Deuda Vencida" value={fmt.format(kpis.totalMora)} colorClass="text-red-500" sub="Requiere gestión urgente" />
        <KpiCard label="Prov. en Mora" value={String(kpis.enMora)} colorClass="text-amber-500" sub="Con atraso en pagos" />
        <KpiCard label="Prov. Bloqueados" value={String(kpis.bloqueados)} colorClass="text-red-600" sub="Crédito agotado / suspendido" />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-3 text-sm font-bold text-foreground">Saldo por Proveedor — Top 8 (Vigente vs Vencido)</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Vigente" stackId="a" fill="#0046AD" />
            <Bar dataKey="Vencido" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Buscar por código o proveedor..."
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          {["TODOS", "CORRIENTE", "EN MORA", "BLOQUEADO"].map((e) => (
            <button
              key={e}
              onClick={() => {
                setFiltroEstado(e)
                setPage(1)
              }}
              className={
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition " +
                (filtroEstado === e
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "border border-border bg-background text-muted-foreground hover:bg-muted")
              }
            >
              {e}
            </button>
          ))}
          <button
            onClick={handleExport}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            <Download className="h-3.5 w-3.5" /> Exportar Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Código", "Razón Social", "CUIT", "Estado", "Saldo Total", "Vigente", "Vencida", "Crédito Disp.", "Facturas", "Último Pago"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((r, i) => (
                <tr key={r.codProveedor} className={"border-b border-border/50 hover:bg-muted/30 transition " + (i % 2 === 0 ? "" : "bg-muted/10")}>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">{r.codProveedor}</td>
                  <td className="px-3 py-2.5 font-semibold max-w-[200px] truncate">{r.razonSocial}</td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">{r.cuit}</td>
                  <td className="px-3 py-2.5"><EstadoBadge estado={r.estado} /></td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums">{fmt.format(r.saldoActual)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">{fmt.format(r.deudaVigente)}</td>
                  <td className={"px-3 py-2.5 text-right tabular-nums font-semibold " + (r.deudaVencida > 0 ? "text-red-500" : "text-muted-foreground")}>
                    {fmt.format(r.deudaVencida)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmt.format(r.creditoDisponible)}</td>
                  <td className="px-3 py-2.5 text-center font-semibold">{r.cantFacturasAbiertas}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-[10px]">{fmtDate(r.ultimoPago)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span>{filtered.length} proveedores listados</span>
            <div className="flex items-center gap-1">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded p-1 hover:bg-muted disabled:opacity-30">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="font-semibold">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="rounded p-1 hover:bg-muted disabled:opacity-30">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 2. FACTURAS PENDIENTES DE PAGO ─────────────────────────────────────────
function FacturasPendientesView() {
  const [data, setData] = useState<FacturaPendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("TODOS")
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 8

  useEffect(() => {
    import("@/lib/reportes-data").then((m) => {
      setData(m.getFacturasPendientesDemo().data)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    let d = data
    if (filtroEstado !== "TODOS") d = d.filter((r) => r.estado === filtroEstado)
    if (search) {
      d = d.filter(
        (r) =>
          r.proveedor.toLowerCase().includes(search.toLowerCase()) ||
          r.nroFactura.toLowerCase().includes(search.toLowerCase()) ||
          r.codProveedor.toLowerCase().includes(search.toLowerCase())
      )
    }
    return d
  }, [data, filtroEstado, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const kpis = useMemo(() => {
    const totalSaldo = data.reduce((s, r) => s + r.saldoPendiente, 0)
    const vencidas = data.filter((r) => r.estado === "VENCIDA")
    const pronto = data.filter((r) => r.estado === "VENCE PRONTO" || r.estado === "VENCE HOY")
    const totalIva = data.reduce((s, r) => s + r.iva21 + r.iva105, 0)
    return {
      totalSaldo,
      vencidasMonto: vencidas.reduce((s, r) => s + r.saldoPendiente, 0),
      vencidasCant: vencidas.length,
      prontoMonto: pronto.reduce((s, r) => s + r.saldoPendiente, 0),
      prontoCant: pronto.length,
      totalIva,
    }
  }, [data])

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {
      VENCIDA: 0,
      "VENCE HOY": 0,
      "VENCE PRONTO": 0,
      VIGENTE: 0,
    }
    data.forEach((r) => {
      counts[r.estado] = (counts[r.estado] || 0) + r.saldoPendiente
    })
    return [
      { name: "Vencidas", value: counts.VENCIDA, fill: "#EF4444" },
      { name: "Vence Hoy", value: counts["VENCE HOY"], fill: "#F97316" },
      { name: "Vence Pronto", value: counts["VENCE PRONTO"], fill: "#F59E0B" },
      { name: "Vigente", value: counts.VIGENTE, fill: "#10B981" },
    ]
  }, [data])

  const handleExport = async () => {
    const cols: ExcelColumnDef[] = [
      { key: "nroFactura", header: "N° Factura", width: 18 },
      { key: "tipoFactura", header: "Tipo", width: 8 },
      { key: "codProveedor", header: "Cód. Prov.", width: 12 },
      { key: "proveedor", header: "Proveedor", width: 34 },
      { key: "fechaEmision", header: "Emisión", width: 13, type: "date" as const },
      { key: "fechaVencimiento", header: "Vencimiento", width: 13, type: "date" as const },
      { key: "diasVencimiento", header: "Días Vto.", width: 12, type: "number" as const },
      { key: "netoGravado", header: "Neto Gravado", width: 16, type: "currency" as const },
      { key: "iva21", header: "IVA 21%", width: 14, type: "currency" as const },
      { key: "retenciones", header: "Retenciones", width: 14, type: "currency" as const },
      { key: "totalFactura", header: "Total Factura", width: 18, type: "currency" as const },
      { key: "saldoPendiente", header: "Saldo Pendiente", width: 18, type: "currency" as const },
      { key: "estado", header: "Estado", width: 14 },
      { key: "observaciones", header: "Observaciones", width: 25 },
    ]

    await exportarExcelProfesional({
      titulo: "Facturas Pendientes de Pago — Cuentas a Pagar",
      subtitulo: "Supermercados Monarca — Administración Contable",
      nombreArchivo: "facturas_pendientes_pago",
      nombreHoja: "Facturas Pendientes",
      columnas: cols,
      datos: data,
      kpis: [
        { label: "Deuda Pendiente Total", value: fmt.format(kpis.totalSaldo) },
        { label: "Monto Vencido", value: fmt.format(kpis.vencidasMonto) },
        { label: "Facturas Vencidas", value: `${kpis.vencidasCant} comp.` },
        { label: "IVA Discriminado", value: fmt.format(kpis.totalIva) },
      ],
      totales: {
        nroFactura: "TOTALES",
        tipoFactura: "",
        codProveedor: "",
        proveedor: "",
        fechaEmision: "",
        fechaVencimiento: "",
        diasVencimiento: 0,
        netoGravado: data.reduce((s, r) => s + r.netoGravado, 0),
        iva21: data.reduce((s, r) => s + r.iva21, 0),
        retenciones: data.reduce((s, r) => s + r.retenciones, 0),
        totalFactura: data.reduce((s, r) => s + r.totalFactura, 0),
        saldoPendiente: data.reduce((s, r) => s + r.saldoPendiente, 0),
        estado: "",
        observaciones: "",
      },
    })
  }

  if (loading) {
    return <div className="flex h-40 items-center justify-center text-muted-foreground text-sm animate-pulse">Cargando facturas...</div>
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Saldo Total Pendiente" value={fmt.format(kpis.totalSaldo)} sub={`${data.length} facturas activas`} />
        <KpiCard label="Facturas Vencidas" value={fmt.format(kpis.vencidasMonto)} colorClass="text-red-500" sub={`${kpis.vencidasCant} comprobantes vencidos`} />
        <KpiCard label="A Vencer en 10 Días" value={fmt.format(kpis.prontoMonto)} colorClass="text-amber-500" sub={`${kpis.prontoCant} comprobantes`} />
        <KpiCard label="Crédito Fiscal (IVA)" value={fmt.format(kpis.totalIva)} colorClass="text-blue-500" sub="IVA compras computables" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-2">
          <p className="mb-3 text-sm font-bold text-foreground">Distribución de Deuda por Vencimiento</p>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Monto">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
          <div>
            <p className="text-sm font-bold text-foreground">Resumen de Vencimientos</p>
            <p className="text-xs text-muted-foreground mt-1">Monitoreo de compromisos de caja en moneda local.</p>
          </div>
          <div className="my-3 space-y-2.5">
            {chartData.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.fill }} />
                  {c.name}
                </span>
                <span className="font-bold tabular-nums">{fmt.format(c.value)}</span>
              </div>
            ))}
          </div>
          <button
            onClick={handleExport}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            <Download className="h-3.5 w-3.5" /> Descargar Planilla Excel
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Buscar por N° factura o proveedor..."
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          {["TODOS", "VENCIDA", "VENCE HOY", "VENCE PRONTO", "VIGENTE"].map((e) => (
            <button
              key={e}
              onClick={() => {
                setFiltroEstado(e)
                setPage(1)
              }}
              className={
                "rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition " +
                (filtroEstado === e
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "border border-border bg-background text-muted-foreground hover:bg-muted")
              }
            >
              {e}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Comprobante", "Tipo", "Proveedor", "Emisión", "Vencimiento", "Días", "Neto Grav.", "IVA 21%", "Total Fac.", "Saldo Pend.", "Estado", "Notas"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((r, i) => (
                <tr key={r.nroFactura} className={"border-b border-border/50 hover:bg-muted/30 transition " + (i % 2 === 0 ? "" : "bg-muted/10")}>
                  <td className="px-3 py-2.5 font-mono font-semibold text-[11px] text-foreground">{r.nroFactura}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold">{r.tipoFactura}</span>
                  </td>
                  <td className="px-3 py-2.5 font-semibold max-w-[180px] truncate">{r.proveedor}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-[10px] text-muted-foreground">{fmtDate(r.fechaEmision)}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-[10px] text-muted-foreground">{fmtDate(r.fechaVencimiento)}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums">
                    <span
                      className={`font-semibold ${
                        r.diasVencimiento < 0
                          ? "text-red-500 font-bold"
                          : r.diasVencimiento === 0
                          ? "text-orange-500 font-bold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {r.diasVencimiento < 0 ? `${r.diasVencimiento}d` : `+${r.diasVencimiento}d`}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmt.format(r.netoGravado)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{fmt.format(r.iva21)}</td>
                  <td className="px-3 py-2.5 text-right font-medium tabular-nums">{fmt.format(r.totalFactura)}</td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums text-foreground">{fmt.format(r.saldoPendiente)}</td>
                  <td className="px-3 py-2.5"><EstadoBadge estado={r.estado} /></td>
                  <td className="px-3 py-2.5 text-muted-foreground max-w-[120px] truncate text-[11px]">{r.observaciones || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span>{filtered.length} comprobantes listados</span>
            <div className="flex items-center gap-1">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded p-1 hover:bg-muted disabled:opacity-30">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="font-semibold">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="rounded p-1 hover:bg-muted disabled:opacity-30">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 3. ANTIGÜEDAD DE SALDOS ─────────────────────────────────────────────────
function AntiguedadSaldosView() {
  const [data, setData] = useState<AntiguedadSaldoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [soloMora, setSoloMora] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 8

  useEffect(() => {
    import("@/lib/reportes-data").then((m) => {
      setData(m.getAntiguedadSaldosDemo().data)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    let d = data
    if (soloMora) d = d.filter((r) => r.porcentajeMora > 0)
    if (search) {
      d = d.filter(
        (r) =>
          r.proveedor.toLowerCase().includes(search.toLowerCase()) ||
          r.codProveedor.toLowerCase().includes(search.toLowerCase())
      )
    }
    return d
  }, [data, soloMora, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const kpis = useMemo(() => {
    const totalDeuda = data.reduce((s, r) => s + r.totalDeuda, 0)
    const corriente = data.reduce((s, r) => s + r.corriente, 0)
    const d1_30 = data.reduce((s, r) => s + r.dias1_30, 0)
    const d31_60 = data.reduce((s, r) => s + r.dias31_60, 0)
    const d61_90 = data.reduce((s, r) => s + r.dias61_90, 0)
    const dMas90 = data.reduce((s, r) => s + r.diasMas90, 0)
    const totalMora = d1_30 + d31_60 + d61_90 + dMas90
    return {
      totalDeuda,
      corriente,
      totalMora,
      pctMora: totalDeuda > 0 ? (totalMora / totalDeuda) * 100 : 0,
      d1_30,
      d31_60,
      d61_mas: d61_90 + dMas90,
    }
  }, [data])

  const chartData = useMemo(() => [
    { name: "Al Día", value: kpis.corriente, fill: "#10B981" },
    { name: "1-30 Días", value: kpis.d1_30, fill: "#F59E0B" },
    { name: "31-60 Días", value: kpis.d31_60, fill: "#F97316" },
    { name: "+60 Días", value: kpis.d61_mas, fill: "#EF4444" },
  ], [kpis])

  const handleExport = async () => {
    const cols: ExcelColumnDef[] = [
      { key: "codProveedor", header: "Código", width: 12 },
      { key: "proveedor", header: "Proveedor", width: 36 },
      { key: "corriente", header: "Al Día (Corriente)", width: 18, type: "currency" as const },
      { key: "dias1_30", header: "1 a 30 Días", width: 16, type: "currency" as const },
      { key: "dias31_60", header: "31 a 60 Días", width: 16, type: "currency" as const },
      { key: "dias61_90", header: "61 a 90 Días", width: 16, type: "currency" as const },
      { key: "diasMas90", header: "+90 Días", width: 16, type: "currency" as const },
      { key: "totalDeuda", header: "Total Deuda", width: 18, type: "currency" as const },
      { key: "porcentajeMora", header: "% en Mora", width: 14, type: "percent" as const },
    ]

    await exportarExcelProfesional({
      titulo: "Antigüedad de Saldos por Proveedor",
      subtitulo: "Supermercados Monarca — Clasificación de Deuda por Franjas de Días",
      nombreArchivo: "antiguedad_saldos_proveedores",
      nombreHoja: "Antigüedad de Saldos",
      columnas: cols,
      datos: data,
      kpis: [
        { label: "Deuda Total Consolidada", value: fmt.format(kpis.totalDeuda) },
        { label: "Deuda Corriente (Al Día)", value: fmt.format(kpis.corriente) },
        { label: "Deuda Vencida (En Mora)", value: fmt.format(kpis.totalMora) },
        { label: "% Global de Mora", value: fmtPct(kpis.pctMora) },
      ],
      totales: {
        codProveedor: "TOTALES",
        proveedor: "",
        corriente: data.reduce((s, r) => s + r.corriente, 0),
        dias1_30: data.reduce((s, r) => s + r.dias1_30, 0),
        dias31_60: data.reduce((s, r) => s + r.dias31_60, 0),
        dias61_90: data.reduce((s, r) => s + r.dias61_90, 0),
        diasMas90: data.reduce((s, r) => s + r.diasMas90, 0),
        totalDeuda: data.reduce((s, r) => s + r.totalDeuda, 0),
        porcentajeMora: kpis.pctMora,
      },
    })
  }

  if (loading) {
    return <div className="flex h-40 items-center justify-center text-muted-foreground text-sm animate-pulse">Cargando antigüedad de saldos...</div>
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Deuda Total" value={fmt.format(kpis.totalDeuda)} sub={`${data.length} proveedores`} />
        <KpiCard label="Al Día (Corriente)" value={fmt.format(kpis.corriente)} colorClass="text-emerald-600 dark:text-emerald-400" sub="Dentro del plazo acordado" />
        <KpiCard label="Deuda en Mora" value={fmt.format(kpis.totalMora)} colorClass="text-red-500" sub={`Representa ${fmtPct(kpis.pctMora)} del pasivo`} />
        <KpiCard label="Crítico (+60 Días)" value={fmt.format(kpis.d61_mas)} colorClass="text-red-600" sub="Riesgo de corte de entrega" />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-3 text-sm font-bold text-foreground">Composición de Cartera de Pago por Franja de Vencimiento</p>
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 30, left: 20, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" name="Monto" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Buscar por código o proveedor..."
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <button
            onClick={() => {
              setSoloMora(!soloMora)
              setPage(1)
            }}
            className={
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition " +
              (soloMora
                ? "bg-red-500/20 text-red-600 border border-red-500/40"
                : "border border-border bg-background text-muted-foreground hover:bg-muted")
            }
          >
            {soloMora ? "✓ Solo con Mora" : "Filtrar con Mora"}
          </button>
          <button
            onClick={handleExport}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            <Download className="h-3.5 w-3.5" /> Exportar Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Código", "Proveedor", "Al Día", "1 a 30 Días", "31 a 60 Días", "61 a 90 Días", "+90 Días", "Total Deuda", "% Mora"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((r, i) => (
                <tr key={r.codProveedor} className={"border-b border-border/50 hover:bg-muted/30 transition " + (i % 2 === 0 ? "" : "bg-muted/10")}>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">{r.codProveedor}</td>
                  <td className="px-3 py-2.5 font-semibold max-w-[200px] truncate">{r.proveedor}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">{fmt.format(r.corriente)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmt.format(r.dias1_30)}</td>
                  <td className={"px-3 py-2.5 text-right tabular-nums " + (r.dias31_60 > 0 ? "text-amber-500 font-semibold" : "text-muted-foreground")}>
                    {fmt.format(r.dias31_60)}
                  </td>
                  <td className={"px-3 py-2.5 text-right tabular-nums " + (r.dias61_90 > 0 ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                    {fmt.format(r.dias61_90)}
                  </td>
                  <td className={"px-3 py-2.5 text-right tabular-nums " + (r.diasMas90 > 0 ? "text-red-600 font-bold" : "text-muted-foreground")}>
                    {fmt.format(r.diasMas90)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums text-foreground">{fmt.format(r.totalDeuda)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={`inline-block rounded px-2 py-0.5 font-bold tabular-nums text-[10px] ${
                        r.porcentajeMora > 50
                          ? "bg-red-500/15 text-red-600 dark:text-red-400"
                          : r.porcentajeMora > 0
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {fmtPct(r.porcentajeMora)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span>{filtered.length} proveedores listados</span>
            <div className="flex items-center gap-1">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded p-1 hover:bg-muted disabled:opacity-30">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="font-semibold">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="rounded p-1 hover:bg-muted disabled:opacity-30">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 4. RANKING DE PROVEEDORES POR COMPRA ──────────────────────────────────
function RankingProveedoresView() {
  const [data, setData] = useState<RankingProveedorItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filtroRubro, setFiltroRubro] = useState("TODOS")
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 8

  useEffect(() => {
    import("@/lib/reportes-data").then((m) => {
      setData(m.getRankingProveedoresDemo().data)
      setLoading(false)
    })
  }, [])

  const rubros = useMemo(() => ["TODOS", ...Array.from(new Set(data.map((d) => d.rubro)))], [data])

  const filtered = useMemo(() => {
    let d = data
    if (filtroRubro !== "TODOS") d = d.filter((r) => r.rubro === filtroRubro)
    if (search) {
      d = d.filter(
        (r) =>
          r.proveedor.toLowerCase().includes(search.toLowerCase()) ||
          r.codProveedor.toLowerCase().includes(search.toLowerCase()) ||
          r.rubro.toLowerCase().includes(search.toLowerCase())
      )
    }
    return d
  }, [data, filtroRubro, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const kpis = useMemo(() => {
    const totalCompras = data.reduce((s, r) => s + r.importeTotal, 0)
    const totalFacturas = data.reduce((s, r) => s + r.cantFacturas, 0)
    const lider = data[0]
    const varPromedio = data.length > 0 ? data.reduce((s, r) => s + r.variacion, 0) / data.length : 0
    return {
      totalCompras,
      totalFacturas,
      liderNombre: lider?.proveedor || "-",
      liderPct: lider?.porcentaje || 0,
      varPromedio,
    }
  }, [data])

  const chartData = useMemo(
    () =>
      data.slice(0, 8).map((r) => ({
        name: r.proveedor.split(" ").slice(0, 2).join(" "),
        Importe: r.importeTotal,
      })),
    [data]
  )

  const handleExport = async () => {
    const cols: ExcelColumnDef[] = [
      { key: "posicion", header: "Pos.", width: 8, type: "number" as const },
      { key: "codProveedor", header: "Código", width: 12 },
      { key: "proveedor", header: "Proveedor", width: 36 },
      { key: "rubro", header: "Rubro", width: 20 },
      { key: "cantFacturas", header: "Cant. Facturas", width: 16, type: "number" as const },
      { key: "ticketPromedio", header: "Ticket Promedio", width: 18, type: "currency" as const },
      { key: "importeTotal", header: "Total Facturado", width: 20, type: "currency" as const },
      { key: "porcentaje", header: "% Participación", width: 16, type: "percent" as const },
      { key: "importeAnoAnterior", header: "Año Anterior", width: 18, type: "currency" as const },
      { key: "variacion", header: "Var. Interanual", width: 16, type: "percent" as const },
    ]

    await exportarExcelProfesional({
      titulo: "Ranking de Proveedores por Volumen de Compra",
      subtitulo: "Supermercados Monarca — Análisis de Concentración de Proveedores y Gastos",
      nombreArchivo: "ranking_proveedores_compras",
      nombreHoja: "Ranking Proveedores",
      columnas: cols,
      datos: data,
      kpis: [
        { label: "Volumen Total Compras", value: fmt.format(kpis.totalCompras) },
        { label: "Facturas Procesadas", value: `${kpis.totalFacturas} fact.` },
        { label: "Proveedor Líder", value: `${kpis.liderNombre} (${fmtPct(kpis.liderPct)})` },
        { label: "Variación Interanual", value: fmtPct(kpis.varPromedio) },
      ],
      totales: {
        posicion: 0,
        codProveedor: "TOTALES",
        proveedor: "",
        rubro: "",
        cantFacturas: data.reduce((s, r) => s + r.cantFacturas, 0),
        ticketPromedio: kpis.totalFacturas > 0 ? kpis.totalCompras / kpis.totalFacturas : 0,
        importeTotal: kpis.totalCompras,
        porcentaje: 100,
        importeAnoAnterior: data.reduce((s, r) => s + r.importeAnoAnterior, 0),
        variacion: kpis.varPromedio,
      },
    })
  }

  if (loading) {
    return <div className="flex h-40 items-center justify-center text-muted-foreground text-sm animate-pulse">Cargando ranking de proveedores...</div>
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Volumen Total Compras" value={fmt.format(kpis.totalCompras)} sub={`${data.length} proveedores evaluados`} />
        <KpiCard label="Facturas Procesadas" value={`${kpis.totalFacturas} comp.`} sub="Total en el período" />
        <KpiCard label="Proveedor #1" value={kpis.liderNombre.split(" ").slice(0, 2).join(" ")} colorClass="text-accent" sub={`${fmtPct(kpis.liderPct)} de participación`} />
        <KpiCard
          label="Crecimiento Anual"
          value={fmtPct(kpis.varPromedio)}
          colorClass={kpis.varPromedio >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}
          sub="Variación interanual promedio"
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-3 text-sm font-bold text-foreground">Top 8 Proveedores por Volumen de Compra Facturado</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="Importe" fill="#0046AD" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Buscar por proveedor o rubro..."
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          {rubros.slice(0, 5).map((r) => (
            <button
              key={r}
              onClick={() => {
                setFiltroRubro(r)
                setPage(1)
              }}
              className={
                "rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition " +
                (filtroRubro === r
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "border border-border bg-background text-muted-foreground hover:bg-muted")
              }
            >
              {r}
            </button>
          ))}
          <button
            onClick={handleExport}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            <Download className="h-3.5 w-3.5" /> Exportar Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["#", "Código", "Proveedor", "Rubro", "Facturas", "Ticket Prom.", "Total Compras", "% Part.", "Var. Anual"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((r, i) => (
                <tr key={r.codProveedor} className={"border-b border-border/50 hover:bg-muted/30 transition " + (i % 2 === 0 ? "" : "bg-muted/10")}>
                  <td className="px-3 py-2.5 font-bold text-[11px] text-muted-foreground">#{r.posicion}</td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">{r.codProveedor}</td>
                  <td className="px-3 py-2.5 font-semibold max-w-[200px] truncate">{r.proveedor}</td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium">{r.rubro}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center font-semibold tabular-nums">{r.cantFacturas}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{fmt.format(r.ticketPromedio)}</td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums text-foreground">{fmt.format(r.importeTotal)}</td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(100, r.porcentaje * 4)}%` }} />
                      </div>
                      <span className="w-9">{fmtPct(r.porcentaje)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-bold tabular-nums text-[10px] ${
                        r.variacion >= 0
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-red-500/15 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {r.variacion >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                      {fmtPct(r.variacion)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span>{filtered.length} proveedores listados</span>
            <div className="flex items-center gap-1">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded p-1 hover:bg-muted disabled:opacity-30">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="font-semibold">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="rounded p-1 hover:bg-muted disabled:opacity-30">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

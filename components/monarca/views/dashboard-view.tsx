"use client"

import { useMemo } from "react"
import {
  Banknote,
  TrendingUp,
  Wallet,
  Package,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader, PeriodoSelector } from "@/components/monarca/shared"
import { getCuadro, PERIODOS, tendenciaKPI } from "@/lib/data"
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatPercent,
  periodoLabel,
} from "@/lib/format"

// ── helpers ─────────────────────────────────────────────────────────────────

function kpiVar(actual: number, anterior: number | undefined | null): number | null {
  if (!anterior) return null
  return ((actual - anterior) / anterior) * 100
}



// ── Sparkline micro-chart ────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: { mes: string; value: number }[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={52}>
      <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <defs>
          <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const p = payload[0]
            return (
              <div className="rounded border border-border bg-card px-2 py-1 text-xs shadow">
                <span className="font-medium">{p.payload.mes}</span>
                <span className="ml-2 text-muted-foreground">{formatCurrencyCompact(Number(p.value))}</span>
              </div>
            )
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#sg-${color.replace("#", "")})`}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  sub,
  variacion,
  varLabel,
  sparkData,
  sparkColor,
  icon: Icon,
}: {
  label: string
  value: string
  sub?: string
  variacion: number | null
  varLabel?: string
  sparkData: { mes: string; value: number }[]
  sparkColor: string
  icon: React.ElementType
}) {
  const pos = variacion !== null && variacion >= 0
  return (
    <Card className="relative overflow-hidden border border-border/60 shadow-sm">
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: sparkColor }} />
      <CardContent className="px-4 pt-4 pb-2">
        {/* header row: icon + label + badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
              style={{ background: `${sparkColor}18` }}
            >
              <Icon className="h-3.5 w-3.5" style={{ color: sparkColor }} />
            </span>
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
          </div>
          {variacion !== null && (
            <span
              className="inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums"
              style={{
                background: pos ? "#dcfce7" : "#fee2e2",
                color: pos ? "#15803d" : "#b91c1c",
              }}
            >
              {pos ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(variacion).toFixed(1)}%
            </span>
          )}
        </div>

        {/* value */}
        <div className="mt-2">
          <span className="text-xl font-bold tabular-nums leading-none text-foreground">{value}</span>
          {sub && <span className="ml-2 text-[11px] text-muted-foreground">{sub}</span>}
        </div>

        {/* sparkline */}
        <div className="mt-2">
          <Sparkline data={sparkData} color={sparkColor} />
        </div>

        {/* footer label */}
        {variacion !== null && (
          <p className="mt-1 text-[10px] text-muted-foreground">{varLabel ?? "vs mes anterior"}</p>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function DashboardView({
  periodoKey,
  onPeriodoChange,
}: {
  periodoKey: string
  onPeriodoChange: (v: string) => void
}) {
  const cuadro = useMemo(() => getCuadro(periodoKey), [periodoKey])

  const prevKey = useMemo(() => {
    const p = PERIODOS.find((x) => x.key === periodoKey)
    return p ? PERIODOS.find((x) => x.index === p.index - 1)?.key : undefined
  }, [periodoKey])

  const cuadroPrev = useMemo(() => (prevKey ? getCuadro(prevKey) : null), [prevKey])

  const { total } = cuadro
  const totalPrev = cuadroPrev?.total

  // Sparkline trend data
  const tFact = useMemo(() => tendenciaKPI(periodoKey, "facturacion", 6), [periodoKey])
  const tRdoOp = useMemo(() => tendenciaKPI(periodoKey, "resultadoOperativo", 6), [periodoKey])
  const tRdoFin = useMemo(() => tendenciaKPI(periodoKey, "resultadoFinal", 6), [periodoKey])

  // Bar chart: resultado operativo y final por sección
  const seccionBarData = useMemo(
    () =>
      cuadro.secciones.map((s) => ({
        name: s.nombre,
        Operativo: s.total.resultadoOperativo,
        Final: s.total.resultadoFinal,
      })),
    [cuadro],
  )

  // Top categorías por facturación (max 8)
  const topCategorias = useMemo(
    () =>
      cuadro.secciones
        .flatMap((s) => s.categorias.map((c) => ({ ...c, seccion: s.nombre })))
        .sort((a, b) => b.metrics.facturacion - a.metrics.facturacion)
        .slice(0, 8),
    [cuadro],
  )

  return (
    <div>
      <PageHeader
        title="Panel de Resultados"
        subtitle={`Cuadro de resultados · ${periodoLabel(cuadro.periodo.anio, cuadro.periodo.mes)} · Tendencia de los últimos 6 meses`}
        actions={
          <>
            <PeriodoSelector value={periodoKey} onChange={onPeriodoChange} />
            <Button variant="outline" size="sm" className="gap-2 bg-card">
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </>
        }
      />

      {/* ── KPI row ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          label="Facturación s/IVA"
          value={formatCurrency(total.facturacion)}
          variacion={kpiVar(total.facturacion, totalPrev?.facturacion)}
          sparkData={tFact}
          sparkColor="#1e40af"
          icon={Banknote}
        />
        <KPICard
          label="Resultado Operativo"
          value={formatCurrency(total.resultadoOperativo)}
          sub={`${formatPercent((total.resultadoOperativo / total.facturacion) * 100)} s/ventas`}
          variacion={kpiVar(total.resultadoOperativo, totalPrev?.resultadoOperativo)}
          sparkData={tRdoOp}
          sparkColor="#0284c7"
          icon={TrendingUp}
        />
        <KPICard
          label="Resultado Final"
          value={formatCurrency(total.resultadoFinal)}
          sub={`${formatPercent((total.resultadoFinal / total.facturacion) * 100)} s/ventas`}
          variacion={kpiVar(total.resultadoFinal, totalPrev?.resultadoFinal)}
          sparkData={tRdoFin}
          sparkColor="#15803d"
          icon={Wallet}
        />
        <KPICard
          label="Artículos Activos"
          value={formatNumber(total.articulos)}
          sub="SKUs en el período"
          variacion={null}
          sparkData={tFact.map((d) => ({ ...d, value: total.articulos }))}
          sparkColor="#ea580c"
          icon={Package}
        />
      </div>

      {/* ── Second row: evolución mensual (área) + resultados por sección (barras) ── */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-5">

        {/* Evolución de facturación — últimos 6 meses */}
        <Card className="lg:col-span-3 border-border/60 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Evolución de Facturación — últimos 6 meses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={tFact} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-fact" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e40af" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#1e40af" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrencyCompact(v)} width={58} />
                <Tooltip
                  formatter={(v: number) => [formatCurrencyCompact(v), "Facturación"]}
                  contentStyle={{ fontSize: 12, borderRadius: 6 }}
                />
                <Area type="monotone" dataKey="value" stroke="#1e40af" strokeWidth={2} fill="url(#grad-fact)" dot={{ r: 3, fill: "#1e40af", strokeWidth: 0 }} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Resultados por sección — barras */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Resultado por Sección
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={seccionBarData} layout="vertical" barCategoryGap="25%" barGap={2} margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrencyCompact(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={60} />
                <Tooltip
                  formatter={(v: number, name: string) => [formatCurrencyCompact(v), name]}
                  contentStyle={{ fontSize: 12, borderRadius: 6 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Operativo" fill="#1e40af" radius={[0, 3, 3, 0]} />
                <Bar dataKey="Final" fill="#ea580c" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Third row: category ranking ── */}
      <div className="mt-6">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Ranking de Categorías — Facturación
              </CardTitle>
              <span className="text-xs text-muted-foreground">Top 8</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              {topCategorias.map((cat, i) => {
                const pct = (cat.metrics.facturacion / total.facturacion) * 100
                const varMa = cat.metrics.variacionMesAnterior
                const pos = varMa !== null && varMa >= 0
                return (
                  <div key={cat.id} className="flex items-center gap-3">
                    <span className="w-5 shrink-0 text-right text-xs font-bold text-muted-foreground/50">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium leading-none" title={cat.nombre}>
                          {cat.nombre}
                        </span>
                        <div className="flex shrink-0 items-center gap-2">
                          {varMa !== null && (
                            <span
                              className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
                              style={{
                                background: pos ? "#dcfce7" : "#fee2e2",
                                color: pos ? "#15803d" : "#b91c1c",
                              }}
                            >
                              {pos ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                              {Math.abs(varMa).toFixed(1)}%
                            </span>
                          )}
                          <span className="tabular-nums text-xs text-muted-foreground">
                            {formatCurrencyCompact(cat.metrics.facturacion)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${pct * 2.5}%`, maxWidth: "100%" }}
                        />
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground/70">{cat.seccion}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

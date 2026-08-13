"use client"

import { useEffect, useState, Fragment } from "react"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Search, 
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Users,
  DollarSign,
  TrendingUp,
  Globe,
  ChevronRight
} from "lucide-react"
import { PageHeader } from "@/components/monarca/shared"
import { formatNumber } from "@/lib/format"

interface AuditPeriodStatus {
  id: number
  key: string
  label: string
  anio: number
  mes: number
  resultadosCount: number
  costosFijosCount: number
  nominaCount: number
  costosEstructuralesCount: number
  costosGlobalesCount: number
}

export function ChequeoAdmin() {
  const [data, setData] = useState<AuditPeriodStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroAnio, setFiltroAnio] = useState<string>("Todos")
  const [periodosExpandidos, setPeriodosExpandidos] = useState<Set<string>>(new Set())

  const togglePeriodo = (key: string) => {
    setPeriodosExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  useEffect(() => {
    cargarAuditoria()
  }, [])

  const cargarAuditoria = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/admin/audit")
      if (!res.ok) throw new Error("Error al obtener los datos de auditoría")
      const audit = await res.json()
      setData(audit)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Error al conectar con el servidor")
    } finally {
      setLoading(false)
    }
  }

  // Obtener años únicos para el filtro
  const anios = ["Todos", ...Array.from(new Set(data.map(d => String(d.anio))))].sort((a, b) => b.localeCompare(a))

  const datosFiltrados = data.filter(d => {
    if (filtroAnio === "Todos") return true
    return String(d.anio) === filtroAnio
  })

  // Métricas rápidas del año/filtro actual
  const totalMeses = datosFiltrados.length
  const mesesCompletos = datosFiltrados.filter(d => 
    d.resultadosCount > 0 && 
    d.costosFijosCount > 0 && 
    d.nominaCount > 0 && 
    d.costosEstructuralesCount > 0
  ).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel de Chequeo & Auditoría de Cargas"
        subtitle="Control consolidado de la carga de datos del BI. Monitoreá el estado mensual para asegurar la consistencia del cuadro de resultados."
        actions={
          <Button onClick={cargarAuditoria} disabled={loading} variant="outline" size="sm" className="gap-2 h-9">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar Auditoría
          </Button>
        }
      />

      {error && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="text-sm font-medium text-destructive">{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Períodos Auditados</span>
              <h3 className="text-2xl font-bold">{totalMeses} meses</h3>
              <p className="text-xs text-muted-foreground">Filtro: Año {filtroAnio}</p>
            </div>
            <Layers className="h-10 w-10 text-primary/40" />
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-success/5">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Meses 100% Completos</span>
              <h3 className="text-2xl font-bold text-success">{mesesCompletos} meses</h3>
              <p className="text-xs text-muted-foreground">Con ventas, costos fijos y RRHH cargados</p>
            </div>
            <CheckCircle2 className="h-10 w-10 text-success/40" />
          </CardContent>
        </Card>

        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Cargas Pendientes</span>
              <h3 className="text-2xl font-bold text-warning">
                {datosFiltrados.reduce((acc, d) => {
                  let pendientes = 0
                  if (d.resultadosCount === 0) pendientes++
                  if (d.costosFijosCount === 0) pendientes++
                  if (d.nominaCount === 0) pendientes++
                  if (d.costosEstructuralesCount === 0) pendientes++
                  return acc + pendientes
                }, 0)} cargas
              </h3>
              <p className="text-xs text-muted-foreground">Archivos faltantes en el período seleccionado</p>
            </div>
            <XCircle className="h-10 w-10 text-warning/40" />
          </CardContent>
        </Card>
      </div>

      {/* Filtros y Tabla */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Estado de Sincronización por Mes
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Filtrar por Año:</span>
              <div className="flex rounded-lg border border-border p-0.5 bg-muted/40">
                {anios.map(anio => (
                  <button
                    key={anio}
                    onClick={() => setFiltroAnio(anio)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                      filtroAnio === anio 
                        ? "bg-card text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {anio}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm font-medium">Analizando base de datos de Supabase...</span>
            </div>
          ) : datosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <span className="text-sm font-semibold">No se encontraron períodos cargados</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="px-5 py-3.5 font-bold">Período</th>
                    <th className="px-5 py-3.5 font-bold">
                      <div className="flex items-center gap-1.5">
                        <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                        Cargar Datos
                      </div>
                      <span className="text-[10px] lowercase font-normal block text-muted-foreground/80">(Ventas y CMV)</span>
                    </th>
                    <th className="px-5 py-3.5 font-bold">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-success" />
                        Costos Fijos & Ingresos
                      </div>
                      <span className="text-[10px] lowercase font-normal block text-muted-foreground/80">(Consolidados)</span>
                    </th>
                    <th className="px-5 py-3.5 font-bold">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-warning" />
                        Nómina RRHH
                      </div>
                      <span className="text-[10px] lowercase font-normal block text-muted-foreground/80">(Gestión Cargas)</span>
                    </th>
                    <th className="px-5 py-3.5 font-bold">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-destructive" />
                        Costos Estructurales
                      </div>
                      <span className="text-[10px] lowercase font-normal block text-muted-foreground/80">(Gestión Cargas)</span>
                    </th>
                    <th className="px-5 py-3.5 font-bold">
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-info" />
                        Costos Globales
                      </div>
                      <span className="text-[10px] lowercase font-normal block text-muted-foreground/80">(Prorrateo Cadena)</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {datosFiltrados.map((p) => {
                    const isAllOk = p.resultadosCount > 0 && p.costosFijosCount > 0 && p.nominaCount > 0 && p.costosEstructuralesCount > 0
                    const isExpanded = periodosExpandidos.has(p.key)

                    return (
                      <Fragment key={p.key}>
                        <tr 
                          className={`transition-colors hover:bg-muted/10 ${isAllOk ? 'bg-success/[0.01]' : 'bg-warning/[0.01]'} ${isExpanded ? 'bg-muted/5' : ''}`}
                        >
                          <td 
                            className="px-5 py-4 font-bold text-foreground whitespace-nowrap cursor-pointer hover:text-primary transition-colors select-none"
                            onClick={() => togglePeriodo(p.key)}
                          >
                            <div className="flex items-center gap-2">
                              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90 text-primary' : ''}`} />
                              <span>{p.label.toUpperCase()}</span>
                              {isAllOk ? (
                                <Badge className="bg-success/10 text-success text-[10px] border-0 hover:bg-success/15 font-bold uppercase py-0.5">
                                  OK
                                </Badge>
                              ) : (
                                <Badge className="bg-warning/10 text-warning text-[10px] border-0 hover:bg-warning/15 font-bold uppercase py-0.5">
                                  Incompleto
                                </Badge>
                              )}
                            </div>
                          </td>

                          {/* Cargar Datos (Resultados Ventas/CMV) */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            {p.resultadosCount > 0 ? (
                              <Badge className="bg-success/10 text-success border-0 hover:bg-success/15 font-medium py-1 px-2.5">
                                Cargado ({formatNumber(p.resultadosCount)} reg)
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground/60 border-dashed py-1 px-2.5">
                                Pendiente
                              </Badge>
                            )}
                          </td>

                          {/* Costos Fijos & Ingresos Consolidados */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            {p.costosFijosCount > 0 ? (
                              <Badge className="bg-success/10 text-success border-0 hover:bg-success/15 font-medium py-1 px-2.5">
                                Distribuido ({formatNumber(p.costosFijosCount)} reg)
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground/60 border-dashed py-1 px-2.5">
                                Pendiente
                              </Badge>
                            )}
                          </td>

                          {/* Nómina RRHH (Gestion Cargas) */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            {p.nominaCount > 0 ? (
                              <Badge className="bg-success/10 text-success border-0 hover:bg-success/15 font-medium py-1 px-2.5">
                                Cargado ({formatNumber(p.nominaCount)} emp)
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground/60 border-dashed py-1 px-2.5">
                                Pendiente
                              </Badge>
                            )}
                          </td>

                          {/* Costos Estructurales (Gestion Cargas) */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            {p.costosEstructuralesCount > 0 ? (
                              <Badge className="bg-success/10 text-success border-0 hover:bg-success/15 font-medium py-1 px-2.5">
                                Cargado ({formatNumber(p.costosEstructuralesCount)} conceptos)
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground/60 border-dashed py-1 px-2.5">
                                Pendiente
                              </Badge>
                            )}
                          </td>

                          {/* Costos Globales (Prorrateo) */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            {p.costosGlobalesCount > 0 ? (
                              <Badge className="bg-info/10 text-info border-0 hover:bg-info/15 font-medium py-1 px-2.5">
                                Sincronizado ({formatNumber(p.costosGlobalesCount)} reg)
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground/40 border-dashed py-1 px-2.5">
                                Ninguno (opcional)
                              </Badge>
                            )}
                          </td>
                        </tr>

                        {/* Fila en cascada (Checklist) */}
                        {isExpanded && (
                          <tr className="bg-muted/10 border-b border-border/40 animate-[fadeIn_0.2s_ease]">
                            <td colSpan={6} className="px-8 py-4">
                              <div className="rounded-xl border border-border/80 bg-card p-5 space-y-4 max-w-4xl shadow-md">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    Checklist de Documentación Requerida — {p.label.toUpperCase()}
                                  </h4>
                                  <Badge className={`text-[10px] uppercase font-bold px-2 py-0.5 border-0 ${
                                    isAllOk ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                                  }`}>
                                    {isAllOk ? "100% Completado" : "Pendiente de Completar"}
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  
                                  {/* Item 1: Ventas y CMV */}
                                  <div className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                                    p.resultadosCount > 0 
                                      ? "border-success/20 bg-success/[0.02]" 
                                      : "border-destructive/20 bg-destructive/[0.02]"
                                  }`}>
                                    <span className="mt-0.5 shrink-0">
                                      {p.resultadosCount > 0 ? (
                                        <CheckCircle2 className="h-5 w-5 text-success" />
                                      ) : (
                                        <XCircle className="h-5 w-5 text-destructive" />
                                      )}
                                    </span>
                                    <div className="space-y-1">
                                      <p className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                        Planilla Ventas & CMV
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-muted">Cargar Datos</Badge>
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {p.resultadosCount > 0 
                                          ? `¡Confirmado! Se cargaron ${formatNumber(p.resultadosCount)} registros de salón.`
                                          : "Pendiente: Cargar archivo Excel/CSV con las facturaciones e IVAs de las sucursales."}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Item 2: Costos Fijos */}
                                  <div className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                                    p.costosFijosCount > 0 
                                      ? "border-success/20 bg-success/[0.02]" 
                                      : "border-destructive/20 bg-destructive/[0.02]"
                                  }`}>
                                    <span className="mt-0.5 shrink-0">
                                      {p.costosFijosCount > 0 ? (
                                        <CheckCircle2 className="h-5 w-5 text-success" />
                                      ) : (
                                        <XCircle className="h-5 w-5 text-destructive" />
                                      )}
                                    </span>
                                    <div className="space-y-1">
                                      <p className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                        Distribución Costos Fijos
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-muted">Costos Fijos & Ingresos</Badge>
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {p.costosFijosCount > 0 
                                          ? `¡Confirmado! ${formatNumber(p.costosFijosCount)} subcuentas distribuidas por sucursal.`
                                          : "Pendiente: Cargar, validar y distribuir los costos consolidados y financieros del período."}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Item 3: Nómina RRHH */}
                                  <div className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                                    p.nominaCount > 0 
                                      ? "border-success/20 bg-success/[0.02]" 
                                      : "border-destructive/20 bg-destructive/[0.02]"
                                  }`}>
                                    <span className="mt-0.5 shrink-0">
                                      {p.nominaCount > 0 ? (
                                        <CheckCircle2 className="h-5 w-5 text-success" />
                                      ) : (
                                        <XCircle className="h-5 w-5 text-destructive" />
                                      )}
                                    </span>
                                    <div className="space-y-1">
                                      <p className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                        Nómina Mensual RRHH
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-muted">Gestión Cargas</Badge>
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {p.nominaCount > 0 
                                          ? `¡Confirmado! Liquidación de ${formatNumber(p.nominaCount)} empleados cargada.`
                                          : "Pendiente: Subir planilla Excel con haberes y cargas sociales de personal."}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Item 4: Costos Estructurales */}
                                  <div className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                                    p.costosEstructuralesCount > 0 
                                      ? "border-success/20 bg-success/[0.02]" 
                                      : "border-destructive/20 bg-destructive/[0.02]"
                                  }`}>
                                    <span className="mt-0.5 shrink-0">
                                      {p.costosEstructuralesCount > 0 ? (
                                        <CheckCircle2 className="h-5 w-5 text-success" />
                                      ) : (
                                        <XCircle className="h-5 w-5 text-destructive" />
                                      )}
                                    </span>
                                    <div className="space-y-1">
                                      <p className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                        Costos Estructurales
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-muted">Gestión Cargas</Badge>
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {p.costosEstructuralesCount > 0 
                                          ? `¡Confirmado! ${formatNumber(p.costosEstructuralesCount)} conceptos de costos fijos cargados.`
                                          : "Pendiente: Subir planilla Excel con alquileres, impuestos y servicios del mes."}
                                      </p>
                                    </div>
                                  </div>

                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

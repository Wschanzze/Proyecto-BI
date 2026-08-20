"use client"

import { useEffect, useState, useMemo } from "react"
import { RefreshCw, AlertCircle, CheckCircle, TrendingUp, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/monarca/shared"
import { getMetricasConfigurables, actualizarMetrica } from "@/lib/metricas-admin"
import type { MetricaConfigurable } from "@/lib/data"
import { cn } from "@/lib/utils"

const METRICAS_BASE = [
  { claveBase: 'proy_facturacion', nombre: 'Facturación Esperada', tipo: 'monto', descripcion: 'Facturación total bruta esperada (con IVA)' },
  { claveBase: 'proy_cmv_pct', nombre: 'CMV Objetivo', tipo: 'porcentaje', descripcion: '% de Costo de Mercaderías Vendidas s/Venta Neta' },
  { claveBase: 'proy_rrhh_pct', nombre: 'RRHH Objetivo', tipo: 'porcentaje', descripcion: '% de Gastos de Personal s/Venta Neta' },
  { claveBase: 'proy_gastos_comerciales_pct', nombre: 'Gastos Comerciales Objetivo', tipo: 'porcentaje', descripcion: '% de Gastos Comerciales s/Venta Neta' },
  { claveBase: 'proy_mermas_pct', nombre: 'Mermas Objetivo', tipo: 'porcentaje', descripcion: '% de Mermas s/Venta Neta' },
]

const MESES_LABEL = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Meses con datos reales cargados en 2026 (Ene-Jul = índices 0..6)
const MESES_CON_DATOS_REALES = 7

function formatDisplayValue(valor: number, tipo: string): string {
  if (tipo === 'porcentaje') {
    return (valor * 100).toFixed(2)
  }
  // Monto: formatear en millones abreviado para display, raw para edicion
  return Math.round(valor).toString()
}

function formatMonto(valor: number): string {
  if (valor >= 1_000_000_000) {
    return `$${(valor / 1_000_000_000).toFixed(2)}B`
  }
  if (valor >= 1_000_000) {
    return `$${(valor / 1_000_000).toFixed(1)}M`
  }
  return `$${Math.round(valor).toLocaleString('es-AR')}`
}

export function ProyeccionesAdmin() {
  const [metricas, setMetricas] = useState<MetricaConfigurable[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState<Set<number>>(new Set())
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null)
  
  // Estado para los inputs editables (id -> string value)
  const [editando, setEditando] = useState<Map<number, string>>(new Map())

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getMetricasConfigurables()
      // Filtrar solo las proyecciones
      setMetricas(data.filter(m => m.categoria === 'proyecciones'))
    } catch (err) {
      console.error('Error al cargar proyecciones:', err)
      setMensaje({ tipo: 'error', texto: 'Error al cargar los supuestos de proyección.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleInputChange = (id: number, value: string) => {
    setEditando(prev => {
      const next = new Map(prev)
      next.set(id, value)
      return next
    })
  }

  const handleSave = async (metrica: MetricaConfigurable) => {
    const rawValue = editando.get(metrica.id)
    if (rawValue === undefined) return
    
    const parsed = parseFloat(rawValue)
    if (isNaN(parsed)) {
      setMensaje({ tipo: 'error', texto: 'Valor inválido.' })
      return
    }
    
    // Si es porcentaje en la UI, el usuario lo ve como 15, pero en la DB va como 0.15
    const finalValue = metrica.tipo === 'porcentaje' ? parsed / 100 : parsed

    setGuardando(prev => new Set(prev).add(metrica.id))
    try {
      const result = await actualizarMetrica(metrica.id, finalValue)
      if (result.success) {
        setMensaje({ tipo: 'success', texto: 'Supuesto actualizado correctamente.' })
        setMetricas(prev => prev.map(m => m.id === metrica.id ? { ...m, valor: finalValue } : m))
        
        // Quitar del modo edición
        setEditando(prev => {
          const next = new Map(prev)
          next.delete(metrica.id)
          return next
        })
      } else {
        setMensaje({ tipo: 'error', texto: result.error || 'Error al actualizar.' })
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error inesperado al guardar.' })
    } finally {
      setGuardando(prev => {
        const next = new Set(prev)
        next.delete(metrica.id)
        return next
      })
      setTimeout(() => setMensaje(null), 3000)
    }
  }

  // Agrupar métricas por base y mes (1 al 12)
  const matrizProyecciones = useMemo(() => {
    const map = new Map<string, (MetricaConfigurable | undefined)[]>()
    
    METRICAS_BASE.forEach(mb => {
      const arr = new Array(12).fill(undefined)
      for (let i = 1; i <= 12; i++) {
        const m = metricas.find(x => x.clave === `${mb.claveBase}_m${i}`)
        if (m) arr[i-1] = m
      }
      map.set(mb.claveBase, arr)
    })
    
    return map
  }, [metricas])

  const renderCeldaInput = (mb: typeof METRICAS_BASE[0], metrica?: MetricaConfigurable, mesIdx?: number) => {
    if (!metrica) return <span className="text-muted-foreground italic text-xs">Sin datos</span>
    
    const isEditing = editando.has(metrica.id)
    const isSaving = guardando.has(metrica.id)
    
    // Valor a mostrar (si no edita)
    const displayValue = formatDisplayValue(metrica.valor, metrica.tipo)
    const currentValue = isEditing ? editando.get(metrica.id)! : displayValue

    // Display formatted value
    const formattedDisplay = metrica.tipo === 'monto' 
      ? formatMonto(metrica.valor)
      : `${(metrica.valor * 100).toFixed(2)}%`

    return (
      <div className="flex flex-col items-center gap-1 group relative">
        <div className="relative w-full">
          {isEditing ? (
            <>
              {metrica.tipo === 'porcentaje' && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
              )}
              {metrica.tipo === 'monto' && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
              )}
              <input 
                type="number"
                step="any"
                value={currentValue}
                onChange={(e) => handleInputChange(metrica.id, e.target.value)}
                autoFocus
                className={cn(
                  "w-full rounded-md border border-primary bg-background text-right text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary pl-6 pr-2 py-1.5",
                )}
                disabled={isSaving}
              />
            </>
          ) : (
            <button
              onClick={() => handleInputChange(metrica.id, displayValue)}
              className="w-full text-right text-sm font-semibold rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60 hover:text-primary cursor-pointer"
              title={`Clic para editar: ${metrica.tipo === 'monto' ? Math.round(metrica.valor).toLocaleString('es-AR') : (metrica.valor * 100).toFixed(4) + '%'}`}
            >
              {formattedDisplay}
            </button>
          )}
        </div>
        {isEditing && (
          <Button 
            size="sm" 
            variant="default"
            className="mt-1 h-7 w-full text-xs shadow-md"
            onClick={() => handleSave(metrica)}
            disabled={isSaving}
          >
            {isSaving ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Guardar"}
          </Button>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Cargando supuestos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supuestos de Proyección Mensual"
        subtitle="Facturación esperada y ratios operativos objetivo mes a mes para alimentar el P&L matemático."
        actions={
          <Button onClick={loadData} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        }
      />

      {/* Leyenda */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span>Datos reales cargados (Ene–Jul 2026)</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-2.5 w-2.5 rounded-full bg-primary/60" />
          <span>Proyección estimada (Ago–Dic)</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground ml-2">
          <Info className="h-3.5 w-3.5" />
          <span>Clic en cualquier número para editar</span>
        </div>
      </div>

      {mensaje && (
        <div className={cn(
          "flex items-center gap-2 rounded-lg p-4 text-sm",
          mensaje.tipo === 'success' ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
        )}>
          {mensaje.tipo === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {mensaje.texto}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Planificación Mes a Mes (Ene a Dic)
          </CardTitle>
          <CardDescription>
            Los primeros 7 meses usan datos reales de facturación 2026. Los meses restantes se proyectan por estacionalidad histórica 2025 × crecimiento promedio YoY (+135%).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th rowSpan={2} className="sticky left-0 z-20 bg-card px-4 py-4 text-left font-bold text-sm min-w-[220px] border-r-2 border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] align-bottom">
                    Supuesto Estratégico
                  </th>
                  {MESES_LABEL.map((label, i) => {
                    const esReal = i < MESES_CON_DATOS_REALES
                    return (
                      <th key={i} className={cn("px-2 pt-3 pb-1 text-center min-w-[105px] whitespace-nowrap", esReal ? "bg-emerald-500/5" : "bg-primary/5")}>
                        <div className={cn("font-bold text-sm", esReal ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
                          {label}
                        </div>
                      </th>
                    )
                  })}
                </tr>
                <tr className="border-b-2 border-border/40 bg-muted/20">
                  {MESES_LABEL.map((_, i) => {
                    const esReal = i < MESES_CON_DATOS_REALES
                    return (
                      <th key={'badge-' + i} className={cn("px-2 pb-3 pt-1 text-center min-w-[105px] whitespace-nowrap", esReal ? "bg-emerald-500/5" : "bg-primary/5")}>
                        {esReal ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-[9px] uppercase tracking-wider font-semibold border-0 px-1.5">
                            Real
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 text-[9px] uppercase tracking-wider font-semibold border-0 px-1.5">
                            Estimado
                          </Badge>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {METRICAS_BASE.map((mb, mbIdx) => {
                  const arr = matrizProyecciones.get(mb.claveBase) || []
                  return (
                    <tr key={mb.claveBase} className={cn("group border-b border-border hover:bg-muted/30 transition-colors", mbIdx % 2 === 0 ? "" : "bg-muted/10")}>
                      <td className="sticky left-0 z-10 p-0 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r-2 border-border bg-card">
                        <div className="px-4 py-3 h-full w-full transition-colors group-hover:bg-muted/50 flex flex-col justify-center">
                          <span className="font-semibold text-foreground text-sm">{mb.nombre}</span>
                          <span className="text-xs text-muted-foreground mt-0.5">
                            {mb.descripcion}
                          </span>
                        </div>
                      </td>
                      {arr.map((metrica, i) => {
                        const esReal = i < MESES_CON_DATOS_REALES
                        return (
                          <td key={i} className={cn("px-1.5 py-2 align-middle", esReal ? "bg-emerald-500/[0.03]" : "")}>
                            {renderCeldaInput(mb, metrica, i)}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

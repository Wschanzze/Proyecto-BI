"use client"

import { useEffect, useState, useMemo } from "react"
import { Save, RefreshCw, AlertCircle, CheckCircle, TrendingUp, DollarSign, Percent } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/monarca/shared"
import { getMetricasConfigurables, actualizarMetrica } from "@/lib/metricas-admin"
import type { MetricaConfigurable } from "@/lib/data"
import { formatCurrency, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

const METRICAS_BASE = [
  { claveBase: 'proy_facturacion', nombre: 'Facturación Esperada', tipo: 'monto' },
  { claveBase: 'proy_cmv_pct', nombre: 'CMV Objetivo', tipo: 'porcentaje' },
  { claveBase: 'proy_rrhh_pct', nombre: 'RRHH Objetivo', tipo: 'porcentaje' },
  { claveBase: 'proy_gastos_comerciales_pct', nombre: 'Gastos Comerciales Objetivo', tipo: 'porcentaje' },
  { claveBase: 'proy_mermas_pct', nombre: 'Mermas Objetivo', tipo: 'porcentaje' },
]

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

  const renderCeldaInput = (mb: typeof METRICAS_BASE[0], metrica?: MetricaConfigurable) => {
    if (!metrica) return <span className="text-muted-foreground italic text-xs">Falta DB</span>
    
    const isEditing = editando.has(metrica.id)
    const isSaving = guardando.has(metrica.id)
    
    // Valor a mostrar (si no edita)
    let displayValue = ""
    if (metrica.tipo === 'porcentaje') {
      displayValue = (metrica.valor * 100).toFixed(1)
    } else {
      displayValue = metrica.valor.toString() // Monto exacto
    }
    
    const currentValue = isEditing ? editando.get(metrica.id)! : displayValue

    return (
      <div className="flex flex-col items-center gap-2 group relative">
        <div className="relative w-full">
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
            className={cn(
              "w-full rounded-md border border-transparent bg-transparent text-right text-sm font-medium transition-colors hover:border-border hover:bg-muted/50 focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50",
              metrica.tipo === 'porcentaje' ? "pl-6 pr-2 py-1.5" : "pl-6 pr-2 py-1.5",
              isEditing && "border-primary bg-background"
            )}
            disabled={isSaving}
          />
        </div>
        {isEditing && (
          <Button 
            size="sm" 
            variant="default"
            className="absolute -bottom-8 right-0 z-20 h-7 w-full text-xs shadow-md"
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
        subtitle="Definí los montos de facturación esperados y ratios operativos objetivo mes a mes para alimentar el P&L matemático."
        actions={
          <Button onClick={loadData} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        }
      />

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
            Hacé clic en cualquier número para editar el supuesto de ese mes específico. 
            Modificá la facturación para ver cómo impacta estacionalmente, y ajustá tus objetivos operativos.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                {/* Cabecera Split Profesional */}
                <tr className="border-b border-border/50 bg-muted/30">
                  <th rowSpan={2} className="sticky left-0 z-20 bg-card px-4 py-4 text-left font-bold text-base min-w-[250px] border-r-2 border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] align-bottom">
                    Supuesto Estratégico
                  </th>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <th key={i} className="px-3 pt-4 pb-2 text-center min-w-[120px] whitespace-nowrap">
                      <div className="font-bold text-base text-foreground">Mes {i + 1}</div>
                    </th>
                  ))}
                </tr>
                <tr className="border-b-2 border-primary/20 bg-muted/30">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <th key={'badge-' + i} className="px-3 pb-4 pt-2 text-center min-w-[120px] whitespace-nowrap">
                      <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 text-[10px] uppercase tracking-wider font-semibold border-0">
                        Proyectado
                      </Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICAS_BASE.map(mb => {
                  const arr = matrizProyecciones.get(mb.claveBase) || []
                  return (
                    <tr key={mb.claveBase} className="group border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="sticky left-0 z-10 p-0 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r-2 border-border bg-card">
                        <div className="px-4 py-3 h-full w-full transition-colors group-hover:bg-muted/50 flex flex-col justify-center">
                          <span className="font-medium text-foreground">{mb.nombre}</span>
                          <span className="text-xs text-muted-foreground mt-0.5 capitalize">
                            Tipo: {mb.tipo}
                          </span>
                        </div>
                      </td>
                      {arr.map((metrica, i) => (
                        <td key={i} className="px-2 py-2 align-top">
                          {renderCeldaInput(mb, metrica)}
                        </td>
                      ))}
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

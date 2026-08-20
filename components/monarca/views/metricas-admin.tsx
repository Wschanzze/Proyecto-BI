// components/monarca/views/metricas-admin.tsx
"use client"

import { useEffect, useState } from "react"
import {
  Settings,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Percent,
  DollarSign,
  Hash,
  Info,
  Edit3,
  Plus,
  Trash2,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/monarca/shared"
import {
  getMetricasConfigurables,
  actualizarMetrica,
  crearMetrica,
  desactivarMetrica,
  getMetricasPorCategoria,
} from "@/lib/metricas-admin"
import type { MetricaConfigurable } from "@/lib/data"
import { formatPercent, formatCurrency, formatNumber } from "@/lib/format"

interface MetricaEditando {
  id: number
  valor: string
  original: number
}

const CATEGORIAS_ADMIN = [
  { id: 'ratios', nombre: 'Ratios P&L', descripcion: 'Porcentajes aplicados sobre ventas sin IVA', icon: Percent },
  { id: 'impuestos', nombre: 'Impuestos', descripcion: 'Tasas impositivas específicas', icon: DollarSign },
  { id: 'estimaciones', nombre: 'Estimaciones CMV', descripcion: 'Costos de mercadería por categoría', icon: Hash },
  { id: 'kpis', nombre: 'KPIs Base', descripcion: 'Métricas de referencia para cálculos', icon: Settings },
]

function getIconoTipo(tipo: string) {
  switch (tipo) {
    case 'porcentaje': return <Percent className="h-3 w-3" />
    case 'monto': return <DollarSign className="h-3 w-3" />
    case 'cantidad': return <Hash className="h-3 w-3" />
    default: return <Settings className="h-3 w-3" />
  }
}

function formatearValor(valor: number, tipo: string, unidad: string) {
  switch (tipo) {
    case 'porcentaje':
      return formatPercent(valor * 100)
    case 'monto':
      return formatCurrency(valor)
    case 'cantidad':
      return `${formatNumber(valor)} ${unidad}`
    default:
      return valor.toString()
  }
}

export function MetricasAdmin() {
  const [metricas, setMetricas] = useState<MetricaConfigurable[]>([])
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas')
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState<Set<number>>(new Set())
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null)
  const [editando, setEditando] = useState<Map<number, MetricaEditando>>(new Map())

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getMetricasConfigurables()
      setMetricas(data)
    } catch (err) {
      console.error('Error al cargar métricas:', err)
      setMensaje({ tipo: 'error', texto: 'Error al cargar las métricas configurables' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const metricasFiltradas = metricas.filter(m => 
    categoriaFiltro === 'todas' || m.categoria === categoriaFiltro
  )

  const iniciarEdicion = (metrica: MetricaConfigurable) => {
    const nuevasEditando = new Map(editando)
    nuevasEditando.set(metrica.id, {
      id: metrica.id,
      valor: metrica.valor.toString(),
      original: metrica.valor
    })
    setEditando(nuevasEditando)
  }

  const cancelarEdicion = (id: number) => {
    const nuevasEditando = new Map(editando)
    nuevasEditando.delete(id)
    setEditando(nuevasEditando)
  }

  const cambiarValor = (id: number, nuevoValor: string) => {
    const nuevasEditando = new Map(editando)
    const actual = nuevasEditando.get(id)
    if (actual) {
      actual.valor = nuevoValor
      setEditando(nuevasEditando)
    }
  }

  const guardarMetrica = async (id: number) => {
    const editandoActual = editando.get(id)
    if (!editandoActual) return

    const nuevoValor = parseFloat(editandoActual.valor)
    if (isNaN(nuevoValor)) {
      setMensaje({ tipo: 'error', texto: 'El valor debe ser un número válido' })
      return
    }

    setGuardando(prev => new Set(prev).add(id))
    
    try {
      const resultado = await actualizarMetrica(id, nuevoValor)
      
      if (resultado.success) {
        // Actualizar en el estado local
        setMetricas(prev => prev.map(m => 
          m.id === id ? { ...m, valor: nuevoValor } : m
        ))
        cancelarEdicion(id)
        setMensaje({ tipo: 'success', texto: 'Métrica actualizada correctamente' })
      } else {
        setMensaje({ tipo: 'error', texto: resultado.error || 'Error al actualizar' })
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error inesperado al guardar' })
    } finally {
      setGuardando(prev => {
        const nuevo = new Set(prev)
        nuevo.delete(id)
        return nuevo
      })
    }
  }

  // Auto-hide mensajes después de 5 segundos
  useEffect(() => {
    if (mensaje) {
      const timer = setTimeout(() => setMensaje(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [mensaje])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración de Métricas P&L"
        subtitle="Administrá los ratios, impuestos y estimaciones que se usan en el Cuadro de Resultado Mensual."
        actions={
          <div className="flex items-center gap-2">
            <Select value={categoriaFiltro} onValueChange={(val) => { if (val) setCategoriaFiltro(val) }}>
              <SelectTrigger className="w-[180px] bg-card">
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                {CATEGORIAS_ADMIN.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={loadData} variant="outline" size="sm" className="gap-2 bg-card">
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>
        }
      />

      {/* Mensaje de estado */}
      {mensaje && (
        <Card className={`border-l-4 ${
          mensaje.tipo === 'success' 
            ? 'border-l-success bg-success/5' 
            : 'border-l-destructive bg-destructive/5'
        }`}>
          <CardContent className="flex items-center gap-3 p-4">
            {mensaje.tipo === 'success' 
              ? <CheckCircle className="h-5 w-5 text-success" />
              : <AlertCircle className="h-5 w-5 text-destructive" />
            }
            <span className="text-sm font-medium">{mensaje.texto}</span>
          </CardContent>
        </Card>
      )}

      {/* Categorías organizadas */}
      <div className="grid gap-6">
        {CATEGORIAS_ADMIN.map(categoria => {
          const metricasCategoria = metricasFiltradas.filter(m => m.categoria === categoria.id)
          
          if (metricasCategoria.length === 0 && categoriaFiltro !== 'todas' && categoriaFiltro !== categoria.id) {
            return null
          }

          return (
            <Card key={categoria.id} className="border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <categoria.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <CardTitle className="text-lg font-bold">{categoria.nombre}</CardTitle>
                      <p className="text-sm text-muted-foreground">{categoria.descripcion}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {metricasCategoria.length} métricas
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {metricasCategoria.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-center">
                    <div>
                      <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                      <p className="text-sm text-muted-foreground">No hay métricas en esta categoría</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {metricasCategoria.map(metrica => {
                      const estaEditando = editando.has(metrica.id)
                      const estaGuardando = guardando.has(metrica.id)
                      const valorEditando = editando.get(metrica.id)

                      return (
                        <div key={metrica.id} className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getIconoTipo(metrica.tipo)}
                              <h4 className="font-semibold text-sm">{metrica.nombre}</h4>
                              <Badge variant="outline" className="text-xs">
                                {metrica.tipo}
                              </Badge>
                            </div>
                            {metrica.descripcion && (
                              <p className="text-xs text-muted-foreground mb-2">{metrica.descripcion}</p>
                            )}
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">Clave:</span>
                              <code className="text-xs font-mono bg-accent/50 px-2 py-0.5 rounded">
                                {metrica.clave}
                              </code>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 ml-4">
                            {estaEditando ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="any"
                                  value={valorEditando?.valor || ''}
                                  onChange={(e) => cambiarValor(metrica.id, e.target.value)}
                                  className="w-24 px-2 py-1 text-sm border rounded text-right"
                                  placeholder="0.00"
                                />
                                <span className="text-xs text-muted-foreground min-w-[30px]">
                                  {metrica.unidad}
                                </span>
                                <Button
                                  onClick={() => guardarMetrica(metrica.id)}
                                  disabled={estaGuardando}
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  {estaGuardando ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Save className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  onClick={() => cancelarEdicion(metrica.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  ×
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-semibold min-w-[80px] text-right">
                                  {formatearValor(metrica.valor, metrica.tipo, metrica.unidad)}
                                </span>
                                <Button
                                  onClick={() => iniciarEdicion(metrica)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Info de impacto */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-primary mb-1">Impacto de los cambios:</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Los cambios se aplican inmediatamente al Cuadro de Resultado P&L.</li>
                <li>• Las métricas por sucursal específica tienen prioridad sobre las generales.</li>
                <li>• Los períodos históricos mantienen los valores vigentes al momento de cálculo.</li>
                <li>• Recomendamos validar los nuevos ratios con datos reales antes de aplicar.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
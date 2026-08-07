// components/monarca/views/carga-costos-fijos.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Calculator, 
  TrendingUp, 
  Upload, 
  CheckCircle2, 
  AlertCircle,
  Info
} from "lucide-react"
import { PageHeader } from "@/components/monarca/shared"
import { distribuirCostosFijos, distribuirIngresosFinancieros } from "@/lib/distribucion-costos"
import { formatCurrency } from "@/lib/format"
import type { Periodo } from "@/lib/data"
import type { DBSucursal } from "@/lib/supabase"

interface CostosFijosForm {
  alquileres: string
  honorarios: string
  tasas_servicios: string
  mantenimiento_servicios_tecnicos: string
  perdida_gestion_inventarios: string
  seguridad_vigilancia: string
  otros_servicios: string
  gastos_personal: string
  otros_gastos: string
  comisiones_gastos_bancarios: string
  gastos_extraordinarios: string
  gastos_comercializacion: string
  gastos_administracion: string
  gastos_financiacion: string
  diferencias_caja_perdida: string
}

interface IngresosFinancierosForm {
  operatoria_financiera: string
  rendimientos_financieros: string
}

const COSTOS_FIJOS_LABELS = [
  { key: 'alquileres', label: 'Alquileres' },
  { key: 'honorarios', label: 'Honorarios' },
  { key: 'tasas_servicios', label: 'Tasas y Servicios' },
  { key: 'mantenimiento_servicios_tecnicos', label: 'Mantenimiento y Servicios Técnicos' },
  { key: 'perdida_gestion_inventarios', label: 'Pérdida en Gestión de Inventarios' },
  { key: 'seguridad_vigilancia', label: 'Seguridad y Vigilancia' },
  { key: 'otros_servicios', label: 'Otros Servicios' },
  { key: 'gastos_personal', label: 'Gastos en Personal' },
  { key: 'otros_gastos', label: 'Otros Gastos' },
  { key: 'comisiones_gastos_bancarios', label: 'Comisiones y Gastos Bancarios' },
  { key: 'gastos_extraordinarios', label: 'Gastos Extraordinarios' },
  { key: 'gastos_comercializacion', label: 'Gastos de Comercialización' },
  { key: 'gastos_administracion', label: 'Gastos de Administración' },
  { key: 'gastos_financiacion', label: 'Gastos de Financiación' },
  { key: 'diferencias_caja_perdida', label: 'Diferencias de Caja - Pérdida' },
] as const

export function CargaCostosFijos({
  periodoKey,
  onPeriodoChange,
  periodos,
  sucursales,
}: {
  periodoKey: string
  onPeriodoChange: (v: string) => void
  periodos: Periodo[]
  sucursales: DBSucursal[]
}) {
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<{ success: boolean; message: string; detalles?: any[] } | null>(null)
  
  const [costosFijos, setCostosFijos] = useState<CostosFijosForm>({
    alquileres: '',
    honorarios: '',
    tasas_servicios: '',
    mantenimiento_servicios_tecnicos: '',
    perdida_gestion_inventarios: '',
    seguridad_vigilancia: '',
    otros_servicios: '',
    gastos_personal: '',
    otros_gastos: '',
    comisiones_gastos_bancarios: '',
    gastos_extraordinarios: '',
    gastos_comercializacion: '',
    gastos_administracion: '',
    gastos_financiacion: '',
    diferencias_caja_perdida: '',
  })

  const [ingresosFinancieros, setIngresosFinancieros] = useState<IngresosFinancierosForm>({
    operatoria_financiera: '',
    rendimientos_financieros: '',
  })

  const handleCostoChange = (key: keyof CostosFijosForm, value: string) => {
    // Permitir solo números y punto decimal
    const cleaned = value.replace(/[^0-9.]/g, '')
    setCostosFijos(prev => ({ ...prev, [key]: cleaned }))
  }

  const handleIngresoChange = (key: keyof IngresosFinancierosForm, value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '')
    setIngresosFinancieros(prev => ({ ...prev, [key]: cleaned }))
  }

  const calcularTotal = () => {
    return Object.values(costosFijos).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
  }

  const calcularTotalIngresos = () => {
    return Object.values(ingresosFinancieros).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
  }

  const handleSubmitCostos = async () => {
    setLoading(true)
    setResultado(null)

    try {
      const costosData: any = {}
      Object.entries(costosFijos).forEach(([key, value]) => {
        costosData[key] = parseFloat(value) || 0
      })

      const result = await distribuirCostosFijos(periodoKey, costosData)

      if (result.success) {
        setResultado({
          success: true,
          message: `Costos Fijos distribuidos exitosamente entre ${result.detalles?.length} sucursales`,
          detalles: result.detalles
        })
      } else {
        setResultado({
          success: false,
          message: result.error || 'Error al distribuir costos'
        })
      }
    } catch (error) {
      setResultado({
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitIngresos = async () => {
    setLoading(true)
    setResultado(null)

    try {
      const ingresosData = {
        operatoria_financiera: parseFloat(ingresosFinancieros.operatoria_financiera) || 0,
        rendimientos_financieros: parseFloat(ingresosFinancieros.rendimientos_financieros) || 0,
      }

      const result = await distribuirIngresosFinancieros(periodoKey, ingresosData)

      if (result.success) {
        setResultado({
          success: true,
          message: `Ingresos Financieros distribuidos exitosamente entre ${result.detalles?.length} sucursales`,
          detalles: result.detalles
        })
      } else {
        setResultado({
          success: false,
          message: result.error || 'Error al distribuir ingresos'
        })
      }
    } catch (error) {
      setResultado({
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido'
      })
    } finally {
      setLoading(false)
    }
  }

  const totalCostos = calcularTotal()
  const totalIngresos = calcularTotalIngresos()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Cargas & Datos — RRHH/Costos"
        subtitle="Carga de Costos Fijos e Ingresos Financieros con distribución automática por sucursal según participación en ventas."
      />

      {/* Selector de Período */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4" />
            Período de Carga
          </CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={periodoKey}
            onChange={(e) => onPeriodoChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            {periodos.map(p => (
              <option key={p.key} value={p.key}>
                {p.label || `${p.anio} - ${String(p.mes).padStart(2, '0')}`}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Nota Informativa */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm space-y-2">
              <p className="font-medium text-primary">Distribución Automática por Participación en Ventas</p>
              <p className="text-muted-foreground">
                Los costos fijos e ingresos financieros se cargan como <strong>totales consolidados</strong> y luego se distribuyen automáticamente entre todas las sucursales según su participación porcentual en las ventas del período seleccionado.
              </p>
              <p className="text-muted-foreground text-xs">
                <strong>Requisito:</strong> Debe haber datos de facturación cargados para el período antes de distribuir costos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección 1: Costos Fijos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Costos Fijos — Total Consolidado
            </CardTitle>
            <Badge variant="outline" className="text-sm">
              Total: {formatCurrency(totalCostos)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {COSTOS_FIJOS_LABELS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <label className="w-1/2 text-sm font-medium">
                  {label}
                </label>
                <div className="w-1/2 flex items-center">
                  <span className="mr-2 text-muted-foreground">$</span>
                  <input
                    type="text"
                    value={costosFijos[key as keyof CostosFijosForm]}
                    onChange={(e) => handleCostoChange(key as keyof CostosFijosForm, e.target.value)}
                    placeholder="0.00"
                    className="flex-1 px-3 py-2 border rounded-md text-right"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t">
            <Button 
              onClick={handleSubmitCostos} 
              disabled={loading || totalCostos === 0}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {loading ? 'Distribuyendo...' : 'Distribuir Costos Fijos por Sucursal'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sección 2: Ingresos Financieros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Ingresos Financieros — Total Consolidado
            </CardTitle>
            <Badge variant="outline" className="text-sm">
              Total: {formatCurrency(totalIngresos)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="w-1/2 text-sm font-medium">
                Operatoria Financiera
              </label>
              <div className="w-1/2 flex items-center">
                <span className="mr-2 text-muted-foreground">$</span>
                <input
                  type="text"
                  value={ingresosFinancieros.operatoria_financiera}
                  onChange={(e) => handleIngresoChange('operatoria_financiera', e.target.value)}
                  placeholder="0.00"
                  className="flex-1 px-3 py-2 border rounded-md text-right"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="w-1/2 text-sm font-medium">
                Rendimientos Financieros
              </label>
              <div className="w-1/2 flex items-center">
                <span className="mr-2 text-muted-foreground">$</span>
                <input
                  type="text"
                  value={ingresosFinancieros.rendimientos_financieros}
                  onChange={(e) => handleIngresoChange('rendimientos_financieros', e.target.value)}
                  placeholder="0.00"
                  className="flex-1 px-3 py-2 border rounded-md text-right"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <Button 
              onClick={handleSubmitIngresos} 
              disabled={loading || totalIngresos === 0}
              className="w-full"
              variant="secondary"
            >
              <Upload className="h-4 w-4 mr-2" />
              {loading ? 'Distribuyendo...' : 'Distribuir Ingresos Financieros por Sucursal'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      {resultado && (
        <Card className={resultado.success ? "border-success/50 bg-success/5" : "border-destructive/50 bg-destructive/5"}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {resultado.success ? (
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${resultado.success ? 'text-success' : 'text-destructive'}`}>
                  {resultado.message}
                </p>
                {resultado.detalles && (
                  <div className="mt-3 space-y-1 text-sm">
                    <p className="font-medium">Distribución por sucursal:</p>
                    {resultado.detalles.map((detalle, idx) => (
                      <div key={idx} className="flex justify-between text-muted-foreground">
                        <span>{detalle.sucursalId}</span>
                        <span>{detalle.porcentaje.toFixed(2)}% → {formatCurrency(detalle.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

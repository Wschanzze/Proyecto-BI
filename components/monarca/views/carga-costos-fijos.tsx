// components/monarca/views/carga-costos-fijos.tsx
"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Calculator, 
  TrendingUp, 
  Upload, 
  CheckCircle2, 
  AlertCircle,
  Info,
  FileText,
  Download
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  
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

  // Procesar archivo CSV
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split('\n').map(line => line.trim()).filter(line => line)
        
        if (lines.length < 2) {
          setResultado({
            success: false,
            message: 'El archivo CSV está vacío o no tiene el formato correcto'
          })
          return
        }

        // Procesar líneas (ignorar header)
        const newCostos: Partial<CostosFijosForm> = {}
        const newIngresos: Partial<IngresosFinancierosForm> = {}
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i]
          const parts = line.split(',').map(p => p.trim().replace(/"/g, ''))
          
          if (parts.length < 2) continue
          
          const denominacion = parts[0].toLowerCase()
          const monto = parts[1].replace(/[^0-9.]/g, '')
          
          // Mapear denominaciones a campos
          if (denominacion.includes('alquiler')) newCostos.alquileres = monto
          else if (denominacion.includes('honorario')) newCostos.honorarios = monto
          else if (denominacion.includes('tasas') || denominacion.includes('servicio')) newCostos.tasas_servicios = monto
          else if (denominacion.includes('mantenimiento') || denominacion.includes('tecnico')) newCostos.mantenimiento_servicios_tecnicos = monto
          else if (denominacion.includes('perdida') || denominacion.includes('inventario')) newCostos.perdida_gestion_inventarios = monto
          else if (denominacion.includes('seguridad') || denominacion.includes('vigilancia')) newCostos.seguridad_vigilancia = monto
          else if (denominacion.includes('otros servicios')) newCostos.otros_servicios = monto
          else if (denominacion.includes('gastos en personal') || denominacion.includes('gasto personal')) newCostos.gastos_personal = monto
          else if (denominacion.includes('otros gastos')) newCostos.otros_gastos = monto
          else if (denominacion.includes('comision') || denominacion.includes('bancario')) newCostos.comisiones_gastos_bancarios = monto
          else if (denominacion.includes('extraordinario')) newCostos.gastos_extraordinarios = monto
          else if (denominacion.includes('comercializ')) newCostos.gastos_comercializacion = monto
          else if (denominacion.includes('administra')) newCostos.gastos_administracion = monto
          else if (denominacion.includes('financia')) newCostos.gastos_financiacion = monto
          else if (denominacion.includes('diferencia') || denominacion.includes('caja')) newCostos.diferencias_caja_perdida = monto
          else if (denominacion.includes('operatoria financiera')) newIngresos.operatoria_financiera = monto
          else if (denominacion.includes('rendimiento')) newIngresos.rendimientos_financieros = monto
        }
        
        setCostosFijos(prev => ({ ...prev, ...newCostos }))
        setIngresosFinancieros(prev => ({ ...prev, ...newIngresos }))
        
        setResultado({
          success: true,
          message: `Archivo cargado exitosamente. Se importaron ${Object.keys(newCostos).length} costos fijos y ${Object.keys(newIngresos).length} ingresos financieros.`
        })
      } catch (error) {
        setResultado({
          success: false,
          message: `Error al procesar el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`
        })
      }
    }
    reader.readAsText(file)
  }

  // Descargar plantilla CSV
  const handleDownloadTemplate = () => {
    const template = `Denominación,Total,Mes
Alquileres,0,${periodoKey}
Honorarios,0,${periodoKey}
Tasas y Servicios,0,${periodoKey}
Mantenimiento y Servicios Técnicos,0,${periodoKey}
Pérdida en Gestión de Inventarios,0,${periodoKey}
Seguridad y Vigilancia,0,${periodoKey}
Otros Servicios,0,${periodoKey}
Gastos en Personal,0,${periodoKey}
Otros Gastos,0,${periodoKey}
Comisiones y Gastos Bancarios,0,${periodoKey}
Gastos Extraordinarios,0,${periodoKey}
Gastos de Comercialización,0,${periodoKey}
Gastos de Administración,0,${periodoKey}
Gastos de Financiación,0,${periodoKey}
Diferencias de Caja - Pérdida,0,${periodoKey}
Operatoria Financiera,0,${periodoKey}
Rendimientos Financieros,0,${periodoKey}`

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `plantilla_costos_fijos_${periodoKey}.csv`
    link.click()
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

      {/* Tabs para carga manual o desde archivo */}
      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Carga Manual</TabsTrigger>
          <TabsTrigger value="archivo">Carga desde Archivo CSV</TabsTrigger>
        </TabsList>

        {/* Tab: Carga Manual */}
        <TabsContent value="manual" className="space-y-6 mt-6">
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
        </TabsContent>

        {/* Tab: Carga desde Archivo CSV */}
        <TabsContent value="archivo" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Importar desde CSV
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Información sobre el formato */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h4 className="text-sm font-semibold mb-2">Formato del Archivo CSV</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  El archivo CSV debe tener 3 columnas: <strong>Denominación</strong>, <strong>Total</strong>, <strong>Mes</strong>
                </p>
                <div className="text-xs font-mono bg-background p-3 rounded border border-border overflow-x-auto">
                  <div>Denominación,Total,Mes</div>
                  <div className="text-muted-foreground">Alquileres,22022608.27,jun-26</div>
                  <div className="text-muted-foreground">Honorarios,589438.00,jun-26</div>
                  <div className="text-muted-foreground">...</div>
                </div>
              </div>

              {/* Botón para descargar plantilla */}
              <Button
                onClick={handleDownloadTemplate}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar Plantilla CSV
              </Button>

              {/* Input de archivo oculto */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Botón para seleccionar archivo */}
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="secondary"
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Seleccionar Archivo CSV
              </Button>

              {/* Mensaje informativo */}
              <p className="text-xs text-muted-foreground text-center">
                Una vez cargado el archivo, los valores se completarán automáticamente en los formularios.
                Cambiá a la pestaña "Carga Manual" para revisar y distribuir.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mostrar vista previa de datos cargados */}
      {(totalCostos > 0 || totalIngresos > 0) && (
        <Card className="border-success/30 bg-success/5">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Datos Cargados - Listos para Distribuir
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">Total Costos Fijos:</span>
              <span className="text-lg font-bold">{formatCurrency(totalCostos)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Total Ingresos Financieros:</span>
              <span className="text-lg font-bold">{formatCurrency(totalIngresos)}</span>
            </div>
            <div className="mt-4 pt-3 border-t space-y-2">
              <Button 
                onClick={handleSubmitCostos} 
                disabled={loading || totalCostos === 0}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {loading ? 'Distribuyendo...' : 'Distribuir Costos Fijos por Sucursal'}
              </Button>
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
      )}

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

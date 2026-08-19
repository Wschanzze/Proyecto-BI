// components/monarca/views/carga-costos-fijos.tsx
"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { getCostosFijosSubcuentas } from "@/lib/costos-fijos-subcuentas"
import { getIngresosFinancierosSubcuentas } from "@/lib/ingresos-financieros-subcuentas"
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

  // Estado de modo multi-período (independiente del filtro externo)
  const [periodoInterno, setPeriodoInterno] = useState<string>('multi')

  // Período efectivo: si multi, se usa el del CSV. Para carga manual usa periodoKey externo.
  const periodoEfectivo = periodoInterno === 'multi' ? periodoKey : periodoInterno

  // Generar lista de períodos 2024–2026
  const periodosDisponibles: Periodo[] = []
  for (let anio = 2024; anio <= 2026; anio++) {
    for (let mes = 1; mes <= 12; mes++) {
      const key = `${anio}-${String(mes).padStart(2, '0')}`
      periodosDisponibles.push({ key, anio, mes, index: (anio - 2024) * 12 + mes })
    }
  }

  // Cargar datos existentes desde la base de datos al cambiar de período
  useEffect(() => {
    async function cargarDatosExistentes() {
      // En modo multi no precargamos (no hay un período único definido)
      if (periodoInterno === 'multi') return
      const pk = periodoInterno
      if (!pk) return
      setLoading(true)
      try {
        const [cfData, ifData] = await Promise.all([
          getCostosFijosSubcuentas(pk, '__consolidado__'),
          getIngresosFinancierosSubcuentas(pk, '__consolidado__')
        ])

        if (cfData) {
          setCostosFijos({
            alquileres: cfData.alquileres ? String(cfData.alquileres) : '',
            honorarios: cfData.honorarios ? String(cfData.honorarios) : '',
            tasas_servicios: cfData.tasas_servicios ? String(cfData.tasas_servicios) : '',
            mantenimiento_servicios_tecnicos: cfData.mantenimiento_servicios_tecnicos ? String(cfData.mantenimiento_servicios_tecnicos) : '',
            perdida_gestion_inventarios: cfData.perdida_gestion_inventarios ? String(cfData.perdida_gestion_inventarios) : '',
            seguridad_vigilancia: cfData.seguridad_vigilancia ? String(cfData.seguridad_vigilancia) : '',
            otros_servicios: cfData.otros_servicios ? String(cfData.otros_servicios) : '',
            gastos_personal: cfData.gastos_personal ? String(cfData.gastos_personal) : '',
            otros_gastos: cfData.otros_gastos ? String(cfData.otros_gastos) : '',
            comisiones_gastos_bancarios: cfData.comisiones_gastos_bancarios ? String(cfData.comisiones_gastos_bancarios) : '',
            gastos_extraordinarios: cfData.gastos_extraordinarios ? String(cfData.gastos_extraordinarios) : '',
            gastos_comercializacion: cfData.gastos_comercializacion ? String(cfData.gastos_comercializacion) : '',
            gastos_administracion: cfData.gastos_administracion ? String(cfData.gastos_administracion) : '',
            gastos_financiacion: cfData.gastos_financiacion ? String(cfData.gastos_financiacion) : '',
            diferencias_caja_perdida: cfData.diferencias_caja_perdida ? String(cfData.diferencias_caja_perdida) : '',
          })
        } else {
          // Resetear si no hay datos
          setCostosFijos({
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
        }

        if (ifData) {
          setIngresosFinancieros({
            operatoria_financiera: ifData.operatoria_financiera ? String(ifData.operatoria_financiera) : '',
            rendimientos_financieros: ifData.rendimientos_financieros ? String(ifData.rendimientos_financieros) : '',
          })
        } else {
          setIngresosFinancieros({
            operatoria_financiera: '',
            rendimientos_financieros: '',
          })
        }
      } catch (err) {
        console.error("Error al cargar datos existentes de costos/ingresos:", err)
      } finally {
        setLoading(false)
      }
    }

    cargarDatosExistentes()
  }, [periodoInterno])

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

  // Convierte 'ene-26' → '2026-01', 'feb-26' → '2026-02', etc.
  const parseMesLabel = (mesRaw: string): string | null => {
    const MESES: Record<string, string> = {
      ene: '01', feb: '02', mar: '03', abr: '04',
      may: '05', jun: '06', jul: '07', ago: '08',
      sep: '09', oct: '10', nov: '11', dic: '12'
    }
    const cleaned = mesRaw.toLowerCase().trim()
    // Formatos: 'ene-26', 'ene-2026', '01-26', '01-2026'
    const match = cleaned.match(/^([a-z]{3}|\d{2})[-/](\d{2,4})$/)
    if (!match) return null
    const mesStr = match[1]
    const anioStr = match[2]
    const mesNum = MESES[mesStr] || (mesStr.length === 2 ? mesStr : null)
    if (!mesNum) return null
    const anio = anioStr.length === 2 ? `20${anioStr}` : anioStr
    return `${anio}-${mesNum}`
  }

  // Mapea la denominación al campo de costo fijo correspondiente
  const mapDenominacion = (denominacion: string): { tipo: 'costo' | 'ingreso'; campo: string } | null => {
    const d = denominacion.toLowerCase()
    if (d.includes('alquiler')) return { tipo: 'costo', campo: 'alquileres' }
    if (d.includes('honorario')) return { tipo: 'costo', campo: 'honorarios' }
    if (d.includes('tasas') || (d.includes('servicio') && !d.includes('otros'))) return { tipo: 'costo', campo: 'tasas_servicios' }
    if (d.includes('mantenimiento') || d.includes('tecnico')) return { tipo: 'costo', campo: 'mantenimiento_servicios_tecnicos' }
    if (d.includes('perdida') || d.includes('inventario')) return { tipo: 'costo', campo: 'perdida_gestion_inventarios' }
    if (d.includes('seguridad') || d.includes('vigilancia')) return { tipo: 'costo', campo: 'seguridad_vigilancia' }
    if (d.includes('otros servicios')) return { tipo: 'costo', campo: 'otros_servicios' }
    if (d.includes('gastos en personal') || d.includes('gastos personal')) return { tipo: 'costo', campo: 'gastos_personal' }
    if (d.includes('otros gastos')) return { tipo: 'costo', campo: 'otros_gastos' }
    if (d.includes('comision') || d.includes('bancario')) return { tipo: 'costo', campo: 'comisiones_gastos_bancarios' }
    if (d.includes('extraordinario')) return { tipo: 'costo', campo: 'gastos_extraordinarios' }
    if (d.includes('comercializ')) return { tipo: 'costo', campo: 'gastos_comercializacion' }
    if (d.includes('administra')) return { tipo: 'costo', campo: 'gastos_administracion' }
    if (d.includes('gastos de financiacion') || d.includes('gastos financiacion')) return { tipo: 'costo', campo: 'gastos_financiacion' }
    if (d.includes('diferencia') || d.includes('caja')) return { tipo: 'costo', campo: 'diferencias_caja_perdida' }
    if (d.includes('operatoria financiera')) return { tipo: 'ingreso', campo: 'operatoria_financiera' }
    if (d.includes('rendimiento')) return { tipo: 'ingreso', campo: 'rendimientos_financieros' }
    return null
  }

  // Procesar archivo CSV con soporte multi-período (lee columna Mes)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    // Reset el input para permitir re-subir el mismo archivo
    event.target.value = ''

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split('\n').map(line => line.trim()).filter(line => line)

        if (lines.length < 2) {
          setResultado({ success: false, message: 'El archivo CSV está vacío o no tiene datos.' })
          return
        }

        // Detectar separador (coma o punto y coma)
        const header = lines[0]
        const sep = header.includes(';') ? ';' : ','

        // Agrupar filas por período (periodoKey)
        const costosPorPeriodo: Record<string, Record<string, number>> = {}
        const ingresosPorPeriodo: Record<string, Record<string, number>> = {}
        let filasSinMes = 0
        let filasIgnoradas = 0

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(sep).map(p => p.trim().replace(/"/g, ''))
          if (parts.length < 2) continue

          const denominacion = parts[0]
          // El monto puede tener separadores de miles (puntos) → limpiar correctamente
          const montoRaw = parts[1].replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '')
          const monto = parseFloat(montoRaw) || 0
          if (monto === 0) continue

          // Columna Mes (índice 2) — si no existe, usar periodoKey activo
          let periodoTarget = periodoKey
          if (parts.length >= 3 && parts[2].trim()) {
            const parsed = parseMesLabel(parts[2].trim())
            if (parsed) {
              periodoTarget = parsed
            } else {
              filasSinMes++
            }
          } else {
            filasSinMes++
          }

          const mapeo = mapDenominacion(denominacion)
          if (!mapeo) { filasIgnoradas++; continue }

          if (mapeo.tipo === 'costo') {
            if (!costosPorPeriodo[periodoTarget]) costosPorPeriodo[periodoTarget] = {}
            costosPorPeriodo[periodoTarget][mapeo.campo] = (costosPorPeriodo[periodoTarget][mapeo.campo] || 0) + monto
          } else {
            if (!ingresosPorPeriodo[periodoTarget]) ingresosPorPeriodo[periodoTarget] = {}
            ingresosPorPeriodo[periodoTarget][mapeo.campo] = (ingresosPorPeriodo[periodoTarget][mapeo.campo] || 0) + monto
          }
        }

        const periodosDetectados = [...new Set([...Object.keys(costosPorPeriodo), ...Object.keys(ingresosPorPeriodo)])]

        if (periodosDetectados.length === 0) {
          setResultado({ success: false, message: 'No se encontraron datos válidos en el archivo.' })
          return
        }

        // Si solo hay un período (o filas sin mes), mostrar en formulario para revisión manual
        if (periodosDetectados.length === 1 && filasSinMes === Object.keys(costosPorPeriodo[periodosDetectados[0]] || {}).length) {
          const p = periodosDetectados[0]
          const costos = costosPorPeriodo[p] || {}
          const ingresos = ingresosPorPeriodo[p] || {}
          setCostosFijos(prev => ({ ...prev, ...Object.fromEntries(Object.entries(costos).map(([k, v]) => [k, String(v)])) }))
          setIngresosFinancieros(prev => ({ ...prev, ...Object.fromEntries(Object.entries(ingresos).map(([k, v]) => [k, String(v)])) }))
          setResultado({ success: true, message: `Archivo cargado para ${p}. Revisá los valores y hacé clic en "Distribuir".` })
          return
        }

        // MODO MULTI-PERÍODO: distribuir directamente cada período
        setLoading(true)
        setResultado(null)
        const erroresPeriodos: string[] = []
        let periodosExitosos = 0

        for (const pk of periodosDetectados) {
          const costos = costosPorPeriodo[pk]
          const ingresos = ingresosPorPeriodo[pk]

          if (costos && Object.keys(costos).length > 0) {
            const res = await distribuirCostosFijos(pk, costos)
            if (!res.success) erroresPeriodos.push(`Costos ${pk}: ${res.error}`)
            else periodosExitosos++
          }
          if (ingresos && Object.keys(ingresos).length > 0) {
            const res = await distribuirIngresosFinancieros(pk, ingresos)
            if (!res.success) erroresPeriodos.push(`Ingresos ${pk}: ${res.error}`)
          }
        }

        setLoading(false)
        if (erroresPeriodos.length > 0) {
          setResultado({
            success: false,
            message: `Se procesaron ${periodosExitosos} períodos con errores: ${erroresPeriodos.join(' | ')}`
          })
        } else {
          setResultado({
            success: true,
            message: `✅ ${periodosDetectados.length} períodos procesados y distribuidos correctamente: ${periodosDetectados.join(', ')}${filasIgnoradas > 0 ? ` (${filasIgnoradas} filas no reconocidas ignoradas)` : ''}`,
            detalles: periodosDetectados.map(pk => ({
              sucursalId: pk,
              porcentaje: 100 / periodosDetectados.length,
              total: Object.values(costosPorPeriodo[pk] || {}).reduce((s, v) => s + v, 0)
            }))
          })
        }
      } catch (error) {
        setLoading(false)
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
      if (periodoInterno === 'multi') {
        setResultado({ success: false, message: 'Para carga manual seleccioná un período específico en el selector.' })
        setLoading(false)
        return
      }
      const costosData: any = {}
      Object.entries(costosFijos).forEach(([key, value]) => {
        costosData[key] = parseFloat(value) || 0
      })

      const result = await distribuirCostosFijos(periodoInterno, costosData)

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
      if (periodoInterno === 'multi') {
        setResultado({ success: false, message: 'Para carga manual seleccioná un período específico en el selector.' })
        setLoading(false)
        return
      }
      const ingresosData = {
        operatoria_financiera: parseFloat(ingresosFinancieros.operatoria_financiera) || 0,
        rendimientos_financieros: parseFloat(ingresosFinancieros.rendimientos_financieros) || 0,
      }

      const result = await distribuirIngresosFinancieros(periodoInterno, ingresosData)

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
      <Card className={periodoInterno === 'multi' ? 'border-amber-500/30 bg-amber-500/5' : ''}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4" />
            Período de Carga
            {periodoInterno === 'multi' && (
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 border border-amber-400/40">MULTI-PERÍODO</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Select value={periodoInterno} onValueChange={setPeriodoInterno}>
            <SelectTrigger className="bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="multi">📅 Multi-período (lee columna Mes del archivo CSV)</SelectItem>
              {periodosDisponibles.slice().reverse().map(p => (
                <SelectItem key={p.key} value={p.key}>
                  {p.anio} — {String(p.mes).padStart(2, '0')} ({new Date(p.anio, p.mes - 1).toLocaleString('es-AR', { month: 'long' })})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {periodoInterno === 'multi' && (
            <p className="text-[10px] text-amber-600">
              El CSV debe tener una columna <strong>Mes</strong> por fila (ej: ene-26). El sistema asignará cada fila al período correcto automáticamente.
            </p>
          )}
          {periodoInterno !== 'multi' && (
            <p className="text-[10px] text-muted-foreground">
              Período seleccionado: <strong>{periodoInterno}</strong>. Se aplicará a la carga manual y a las filas sin columna Mes.
            </p>
          )}
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
                Los costos e ingresos se distribuyen entre sucursales según su participación en ventas del período.
                Podés cargar <strong>múltiples meses en un solo CSV</strong> seleccionando el modo Multi-período.
              </p>
              <p className="text-muted-foreground text-xs">
                <strong>Requisito:</strong> Debe haber datos de facturación cargados para cada período.
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
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <h4 className="text-sm font-semibold">Formato del Archivo CSV</h4>
                <p className="text-sm text-muted-foreground">
                  El archivo debe tener 3 columnas: <strong>Denominación</strong>, <strong>Total</strong>, <strong>Mes</strong>.
                  Podés incluir <strong>múltiples meses en un solo archivo</strong> — el sistema detecta la columna Mes y distribuye cada fila al período correcto automáticamente.
                </p>
                <div className="text-xs font-mono bg-background p-3 rounded border border-border overflow-x-auto">
                  <div className="font-bold">Denominación,Total,Mes</div>
                  <div className="text-muted-foreground">Alquileres,19082,ene-26</div>
                  <div className="text-muted-foreground">Honorarios,110500,ene-26</div>
                  <div className="text-muted-foreground">Alquileres,19082,feb-26</div>
                  <div className="text-muted-foreground">Honorarios,110500,feb-26</div>
                  <div className="text-muted-foreground">...</div>
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>Meses aceptados:</strong> ene, feb, mar, abr, may, jun, jul, ago, sep, oct, nov, dic (con formato <code>mmm-AA</code> o <code>mmm-AAAA</code>)
                </p>
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
                Si el CSV contiene múltiples meses, se distribuyen <strong>automáticamente por período</strong> sin necesidad de pasos adicionales.
                Si contiene un solo mes o filas sin columna Mes, se precargan en el formulario para revisión.
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

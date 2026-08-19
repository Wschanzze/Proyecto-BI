// components/monarca/views/gestion-cargas.tsx
"use client"

import { useEffect, useState } from "react"
import {
  Users,
  DollarSign,
  Download,
  Upload,
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  Calendar,
  Building2,
  Calculator,
  FileText,
  Plus,
  Trash2,
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
  getPlantillaEmpleados,
  cargarNominaMensual,
  cargarCostosEstructurales,
  getNominaMensual,
  getCostosEstructurales,
  getResumenRRHHPorSucursal,
  getResumenCostosPorCategoria,
} from "@/lib/rrhh-costos"
import type { 
  PlantillaEmpleado, 
  TemplateRRHH, 
  TemplateCosto,
  Periodo 
} from "@/lib/data"
import type { DBSucursal } from "@/lib/supabase"
import { formatCurrency, formatNumber, periodoLabel } from "@/lib/format"
import * as XLSX from 'xlsx'

interface CargaResultado {
  tipo: 'rrhh' | 'costos'
  success: boolean
  insertados: number
  errores: string[]
  archivo?: string
}

export function GestionCargas() {
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<string>('colon')
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>('2026-08')
  const [plantillaEmpleados, setPlantillaEmpleados] = useState<PlantillaEmpleado[]>([])
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error' | 'info'; texto: string } | null>(null)
  const [ultimaCarga, setUltimaCarga] = useState<CargaResultado | null>(null)
  const [sistemaListo, setSistemaListo] = useState(false)
  const [modoIncremental, setModoIncremental] = useState<boolean>(false)

  // Helper universal: parsear etiqueta de mes a periodo key (prioriza formato argentino DD-MM-YYYY: 01-01-2026 = Ene, 01-02-2026 = Feb, etc.)
  const parseMesAKey = (mesRaw: any): string | null => {
    if (mesRaw === null || mesRaw === undefined) return null

    if (typeof mesRaw === 'number') {
      const s = String(mesRaw)
      if (s.length === 6 && s.startsWith('20')) return `${s.slice(0, 4)}-${s.slice(4, 6)}`
      if (mesRaw > 30000 && mesRaw < 60000) {
        const date = new Date(Math.round((mesRaw - 25569) * 86400 * 1000))
        if (!isNaN(date.getTime())) {
          return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
        }
      }
    }

    if (mesRaw instanceof Date && !isNaN(mesRaw.getTime())) {
      return `${mesRaw.getUTCFullYear()}-${String(mesRaw.getUTCMonth() + 1).padStart(2, '0')}`
    }

    const cleaned = String(mesRaw).toLowerCase().trim()
    if (!cleaned) return null

    // 1. Formato Argentina DD-MM-YYYY o DD/MM/YYYY (ej: 01-01-2026 = Enero, 01-02-2026 = Febrero, 01-06-2026 = Junio)
    const ddMmYyyy = cleaned.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b/)
    if (ddMmYyyy) {
      return `${ddMmYyyy[3]}-${ddMmYyyy[2].padStart(2, '0')}`
    }

    // 2. Formato YYYY-MM-DD o YYYY/MM/DD (ej: 2026-01-01, 2026-06-15)
    const yyyyMmDd = cleaned.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/)
    if (yyyyMmDd) {
      return `${yyyyMmDd[1]}-${yyyyMmDd[2].padStart(2, '0')}`
    }

    // 3. Nombres de meses en español
    const MESES_MAP: Record<string, string> = {
      enero: '01', ene: '01',
      febrero: '02', feb: '02',
      marzo: '03', mar: '03',
      abril: '04', abr: '04',
      mayo: '05', may: '05',
      junio: '06', jun: '06',
      julio: '07', jul: '07',
      agosto: '08', ago: '08',
      septiembre: '09', setiembre: '09', sep: '09',
      octubre: '10', oct: '10',
      noviembre: '11', nov: '11',
      diciembre: '12', dic: '12'
    }

    for (const [nombre, num] of Object.entries(MESES_MAP)) {
      if (cleaned.includes(nombre)) {
        const yearMatch = cleaned.match(/\b(20\d{2}|\d{2})\b/)
        const year = yearMatch ? (yearMatch[1].length === 2 ? `20${yearMatch[1]}` : yearMatch[1]) : '2026'
        return `${year}-${num}`
      }
    }

    // 4. Formato MM-YYYY o MM/YYYY
    const mmYyyy = cleaned.match(/\b(0?[1-9]|1[0-2])[-/.](20\d{2})\b/)
    if (mmYyyy) return `${mmYyyy[2]}-${mmYyyy[1].padStart(2, '0')}`

    // 5. Formato YYYY-MM o YYYY/MM
    const yyyyMm = cleaned.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])\b/)
    if (yyyyMm) return `${yyyyMm[1]}-${yyyyMm[2].padStart(2, '0')}`

    // 6. Formato MM/YY o MM-YY
    const mmYy = cleaned.match(/\b(0?[1-9]|1[0-2])[-/.](2[4-9]|3[0-9])\b/)
    if (mmYy) return `20${mmYy[2]}-${mmYy[1].padStart(2, '0')}`

    return null
  }

  // Períodos disponibles: 2024-01 a 2026-12
  const generarPeriodos = (): Periodo[] => {
    const result: Periodo[] = []
    for (let anio = 2024; anio <= 2026; anio++) {
      for (let mes = 1; mes <= 12; mes++) {
        const key = `${anio}-${String(mes).padStart(2, '0')}`
        result.push({ key, anio, mes, index: (anio - 2024) * 12 + mes })
      }
    }
    return result
  }

  const sucursales: DBSucursal[] = [
    { id: 'colon', nombre: 'Colón', orden: 1 },
    { id: 'san-martin', nombre: 'San Martín', orden: 2 },
    { id: 'falucho', nombre: 'Falucho', orden: 3 },
    { id: 'peron', nombre: 'Perón', orden: 4 },
    { id: 'virtual', nombre: 'Virtual', orden: 5 },
  ]
  const periodos = generarPeriodos()

  // Plantilla de fallback para cuando no hay datos en la DB
  const plantillaFallback: PlantillaEmpleado[] = [
    // Colón
    { id: 1, sucursal_id: 'colon', legajo: '1001', apellido: 'Gonzalez', nombre: 'Juan Carlos', puesto: 'Gerente', categoria: 'gerencial', sueldo_basico_default: 450000, activo: true, orden_carga: 1 },
    { id: 2, sucursal_id: 'colon', legajo: '1002', apellido: 'Martinez', nombre: 'Ana Maria', puesto: 'Cajera Senior', categoria: 'operativo', sueldo_basico_default: 180000, activo: true, orden_carga: 2 },
    { id: 3, sucursal_id: 'colon', legajo: '1003', apellido: 'Rodriguez', nombre: 'Carlos', puesto: 'Repositor', categoria: 'operativo', sueldo_basico_default: 160000, activo: true, orden_carga: 3 },
    
    // San Martín
    { id: 4, sucursal_id: 'san-martin', legajo: '2001', apellido: 'Perez', nombre: 'Laura', puesto: 'Gerente', categoria: 'gerencial', sueldo_basico_default: 450000, activo: true, orden_carga: 1 },
    { id: 5, sucursal_id: 'san-martin', legajo: '2002', apellido: 'Garcia', nombre: 'Roberto', puesto: 'Cajero', categoria: 'operativo', sueldo_basico_default: 175000, activo: true, orden_carga: 2 },
    { id: 6, sucursal_id: 'san-martin', legajo: '2003', apellido: 'Sanchez', nombre: 'Maria', puesto: 'Cajera', categoria: 'operativo', sueldo_basico_default: 175000, activo: true, orden_carga: 3 },
    
    // Falucho
    { id: 7, sucursal_id: 'falucho', legajo: '3001', apellido: 'Vargas', nombre: 'Alberto', puesto: 'Gerente', categoria: 'gerencial', sueldo_basico_default: 420000, activo: true, orden_carga: 1 },
    { id: 8, sucursal_id: 'falucho', legajo: '3002', apellido: 'Diaz', nombre: 'Valeria', puesto: 'Cajera', categoria: 'operativo', sueldo_basico_default: 170000, activo: true, orden_carga: 2 },
    
    // Perón  
    { id: 9, sucursal_id: 'peron', legajo: '4001', apellido: 'Herrera', nombre: 'Marcelo', puesto: 'Gerente', categoria: 'gerencial', sueldo_basico_default: 440000, activo: true, orden_carga: 1 },
    { id: 10, sucursal_id: 'peron', legajo: '4002', apellido: 'Ramos', nombre: 'Silvia', puesto: 'Cajera Senior', categoria: 'operativo', sueldo_basico_default: 180000, activo: true, orden_carga: 2 },
    
    // Virtual
    { id: 11, sucursal_id: 'virtual', legajo: '5001', apellido: 'Alvarez', nombre: 'Ricardo', puesto: 'Director General', categoria: 'gerencial', sueldo_basico_default: 600000, activo: true, orden_carga: 1 },
    { id: 12, sucursal_id: 'virtual', legajo: '5002', apellido: 'Jimenez', nombre: 'Monica', puesto: 'Contadora', categoria: 'administrativo', sueldo_basico_default: 350000, activo: true, orden_carga: 2 },
  ]

  useEffect(() => {
    cargarPlantillaEmpleados()
  }, [sucursalSeleccionada])

  const cargarPlantillaEmpleados = async () => {
    try {
      setLoading(true)
      const plantilla = await getPlantillaEmpleados(sucursalSeleccionada)
      
      if (plantilla && plantilla.length > 0) {
        setPlantillaEmpleados(plantilla)
        setSistemaListo(true)
        setMensaje({ 
          tipo: 'success', 
          texto: `Plantilla cargada: ${plantilla.length} empleados de ${sucursales.find(s => s.id === sucursalSeleccionada)?.nombre}` 
        })
      } else {
        // Usar plantilla de fallback filtrada por sucursal
        const fallback = plantillaFallback.filter(emp => emp.sucursal_id === sucursalSeleccionada)
        setPlantillaEmpleados(fallback)
        setSistemaListo(false)
        setMensaje({ 
          tipo: 'info', 
          texto: 'Usando plantilla de ejemplo. Para datos reales, verificar que se ejecutó la migración seed en Supabase.' 
        })
      }
    } catch (err) {
      console.error('Error al cargar plantilla:', err)
      
      // Usar plantilla de fallback en caso de error
      const fallback = plantillaFallback.filter(emp => emp.sucursal_id === sucursalSeleccionada)
      setPlantillaEmpleados(fallback)
      setSistemaListo(false)
      setMensaje({ 
        tipo: 'error', 
        texto: 'Error de conexión con Supabase. Usando datos de ejemplo. Verificar configuración de BD.' 
      })
    } finally {
      setLoading(false)
    }
  }

  // ===== GENERACIÓN DE TEMPLATES =====

  const generarTemplateRRHH = () => {
    const wb = XLSX.utils.book_new()
    
    // Crear datos de ejemplo basados en la plantilla
    const datosEjemplo: any[] = plantillaEmpleados.map(emp => ({
      legajo: emp.legajo,
      apellido: emp.apellido,
      nombre: emp.nombre,
      puesto: emp.puesto,
      sueldo_basico: emp.sueldo_basico_default,
      horas_extras: 0,
      premios: 0,
      bonificaciones: 0,
      viaticos: 0,
      dias_trabajados: 30,
      ausentismos: 0,
      observaciones: ''
    }))

    // Agregar fila de instrucciones
    datosEjemplo.unshift({
      legajo: 'INSTRUCCIONES:',
      apellido: 'No modificar columnas legajo, apellido, nombre, puesto',
      nombre: 'Completar solo los valores numéricos',
      puesto: 'Dias_trabajados: máximo 30',
      sueldo_basico: 'OBLIGATORIO',
      horas_extras: 'Opcional (0 si no aplica)',
      premios: 'Opcional',
      bonificaciones: 'Opcional', 
      viaticos: 'No remunerativo',
      dias_trabajados: 30,
      ausentismos: 'Cantidad de días',
      observaciones: 'Texto libre'
    })

    const ws = XLSX.utils.json_to_sheet(datosEjemplo)
    
    // Configurar anchos de columna
    ws['!cols'] = [
      { wch: 12 }, // legajo
      { wch: 20 }, // apellido
      { wch: 20 }, // nombre
      { wch: 25 }, // puesto
      { wch: 15 }, // sueldo_basico
      { wch: 12 }, // horas_extras
      { wch: 12 }, // premios
      { wch: 15 }, // bonificaciones
      { wch: 12 }, // viaticos
      { wch: 12 }, // dias_trabajados
      { wch: 12 }, // ausentismos
      { wch: 30 }, // observaciones
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'RRHH_Template')

    // Crear hoja de información
    const wsInfo = XLSX.utils.aoa_to_sheet([
      ['TEMPLATE DE CARGA - NÓMINA MENSUAL RRHH'],
      [''],
      ['INSTRUCCIONES:'],
      ['1. Complete SOLO las columnas numéricas (sueldo_basico es obligatorio)'],
      ['2. NO modifique las columnas: legajo, apellido, nombre, puesto'],
      ['3. Días trabajados: máximo 30 días por mes'],
      ['4. Ausentismos: cantidad de días de ausencia'],
      ['5. Los cálculos de descuentos y aportes se realizan automáticamente'],
      [''],
      ['CÁLCULOS AUTOMÁTICOS:'],
      ['• Jubilación: 11% del total remunerativo'],
      ['• Obra Social: 3% del total remunerativo'],
      ['• Aportes Patronales: 23.5% del total remunerativo'],
      ['• ART: 1.2% del total remunerativo'],
      [''],
      [`SUCURSAL: ${sucursales.find(s => s.id === sucursalSeleccionada)?.nombre}`],
      [`PERÍODO: ${periodoLabel(parseInt(periodoSeleccionado.split('-')[0]), parseInt(periodoSeleccionado.split('-')[1]))}`],
      [`GENERADO: ${new Date().toLocaleDateString('es-AR')}`],
    ])
    
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Instrucciones')

    // Descargar archivo
    const fileName = `RRHH_Template_${sucursalSeleccionada}_${periodoSeleccionado}.xlsx`
    XLSX.writeFile(wb, fileName)

    setMensaje({ 
      tipo: 'success', 
      texto: `Template RRHH generado: ${fileName}` 
    })
  }

  const generarTemplateCostos = () => {
    const wb = XLSX.utils.book_new()

    // Datos de ejemplo para costos estructurales
    const datosEjemplo = [
      {
        categoria_costo: 'INSTRUCCIONES',
        subcategoria: 'Ver hoja "Instrucciones" para detalles',
        descripcion: 'Completar todas las filas con datos reales',
        importe: 'OBLIGATORIO (número)',
        importe_variable: 'Opcional (parte variable)',
        importe_fijo: 'Opcional (parte fija)',
        tipo_gasto: 'operativo/administrativo/comercial/financiero',
        proveedor: 'Nombre del proveedor',
        numero_factura: 'Número de factura',
        fecha_vencimiento: 'YYYY-MM-DD',
        observaciones: 'Texto libre'
      },
      // Ejemplos por categoría
      {
        categoria_costo: 'servicios',
        subcategoria: 'luz',
        descripcion: 'Factura energía eléctrica',
        importe: 45000,
        importe_variable: 0,
        importe_fijo: 45000,
        tipo_gasto: 'operativo',
        proveedor: 'EDESUR',
        numero_factura: 'E-001234567',
        fecha_vencimiento: '2026-09-15',
        observaciones: ''
      },
      {
        categoria_costo: 'servicios',
        subcategoria: 'gas',
        descripcion: 'Factura gas natural',
        importe: 18000,
        importe_variable: 8000,
        importe_fijo: 10000,
        tipo_gasto: 'operativo',
        proveedor: 'METROGAS',
        numero_factura: 'G-987654321',
        fecha_vencimiento: '2026-09-10',
        observaciones: 'Consumo variable por calefacción'
      },
      {
        categoria_costo: 'alquileres',
        subcategoria: 'alquiler_local',
        descripcion: 'Alquiler local comercial',
        importe: 120000,
        importe_variable: 0,
        importe_fijo: 120000,
        tipo_gasto: 'operativo',
        proveedor: 'Inmobiliaria Central',
        numero_factura: 'A-2026-08-001',
        fecha_vencimiento: '2026-09-01',
        observaciones: 'Contrato 3 años'
      },
      {
        categoria_costo: 'seguros',
        subcategoria: 'seguro_integral',
        descripcion: 'Seguro integral comercio',
        importe: 35000,
        importe_variable: 0,
        importe_fijo: 35000,
        tipo_gasto: 'operativo',
        proveedor: 'La Segunda Seguros',
        numero_factura: 'S-789123456',
        fecha_vencimiento: '2026-09-20',
        observaciones: 'Cobertura completa'
      },
      {
        categoria_costo: 'mantenimiento',
        subcategoria: 'equipos_refrigeracion',
        descripcion: 'Service heladeras y freezers',
        importe: 28000,
        importe_variable: 15000,
        importe_fijo: 13000,
        tipo_gasto: 'operativo',
        proveedor: 'Frío Técnico SA',
        numero_factura: 'FT-456789',
        fecha_vencimiento: '2026-09-05',
        observaciones: 'Mantenimiento mensual'
      },
      {
        categoria_costo: 'marketing',
        subcategoria: 'publicidad_local',
        descripcion: 'Volantes y promoción local',
        importe: 15000,
        importe_variable: 15000,
        importe_fijo: 0,
        tipo_gasto: 'comercial',
        proveedor: 'Gráfica Express',
        numero_factura: 'GE-2026-234',
        fecha_vencimiento: '2026-08-30',
        observaciones: 'Campaña mes patrio'
      }
    ]

    const ws = XLSX.utils.json_to_sheet(datosEjemplo)
    
    // Configurar anchos
    ws['!cols'] = [
      { wch: 18 }, // categoria_costo
      { wch: 20 }, // subcategoria  
      { wch: 30 }, // descripcion
      { wch: 15 }, // importe
      { wch: 15 }, // importe_variable
      { wch: 15 }, // importe_fijo
      { wch: 15 }, // tipo_gasto
      { wch: 25 }, // proveedor
      { wch: 18 }, // numero_factura
      { wch: 15 }, // fecha_vencimiento
      { wch: 30 }, // observaciones
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Costos_Template')

    // Hoja de información
    const wsInfo = XLSX.utils.aoa_to_sheet([
      ['TEMPLATE DE CARGA - COSTOS ESTRUCTURALES'],
      [''],
      ['INSTRUCCIONES:'],
      ['1. Eliminar la fila de "INSTRUCCIONES" antes de cargar'],
      ['2. Completar todos los campos obligatorios'],
      ['3. Las categorías válidas son: servicios, alquileres, seguros, impuestos, mantenimiento, marketing, otros'],
      ['4. Los tipos de gasto válidos son: operativo, administrativo, comercial, financiero'],
      ['5. Si no especifica importe_fijo/variable, se asume todo como fijo'],
      [''],
      ['CATEGORÍAS DE COSTOS:'],
      ['• servicios: luz, gas, teléfono, internet, agua, etc.'],
      ['• alquileres: alquiler_local, alquiler_equipos, etc.'],
      ['• seguros: seguro_integral, seguro_mercaderia, etc.'],
      ['• impuestos: municipal, provincial, nacional, etc.'],
      ['• mantenimiento: equipos_refrigeracion, limpieza, reparaciones, etc.'],
      ['• marketing: publicidad_local, promociones, etc.'],
      ['• otros: varios, extraordinarios, etc.'],
      [''],
      ['FORMATO DE FECHAS: YYYY-MM-DD (ej: 2026-09-15)'],
      [''],
      [`SUCURSAL: ${sucursales.find(s => s.id === sucursalSeleccionada)?.nombre}`],
      [`PERÍODO: ${periodoLabel(parseInt(periodoSeleccionado.split('-')[0]), parseInt(periodoSeleccionado.split('-')[1]))}`],
      [`GENERADO: ${new Date().toLocaleDateString('es-AR')}`],
    ])
    
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Instrucciones')

    const fileName = `Costos_Template_${sucursalSeleccionada}_${periodoSeleccionado}.xlsx`
    XLSX.writeFile(wb, fileName)

    setMensaje({ 
      tipo: 'success', 
      texto: `Template Costos generado: ${fileName}` 
    })
  }
  // ===== MANEJO DE ARCHIVOS =====

  const handleArchivoRRHH = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''

    setLoading(true)
    setMensaje(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      const headers = (jsonData[0] as string[]).map(h => String(h || '').toLowerCase().trim())
      const filas = jsonData.slice(1) as any[][]

      // Filtrar fila de instrucciones
      const filasDatos = filas.filter(fila =>
        fila[0] && fila[0] !== 'INSTRUCCIONES:' && typeof fila[0] === 'string'
      )

      // Buscar columna de mes (puede llamarse 'mes', 'periodo', 'period', 'month')
      const mesColuIdx = headers.findIndex(h => h === 'mes' || h === 'periodo' || h === 'period' || h === 'month')
      const modoMulti = periodoSeleccionado === 'multi' || mesColuIdx >= 0

      if (modoMulti && mesColuIdx >= 0) {
        // MODO MULTI-PERÍODO: agrupar filas por período
        const filasPorPeriodo: Record<string, TemplateRRHH[]> = {}
        for (const fila of filasDatos) {
          const mesRaw = fila[mesColuIdx]
          const pk = parseMesAKey(String(mesRaw || '')) ?? (periodoSeleccionado !== 'multi' ? periodoSeleccionado : null)
          if (!pk) continue
          const empleado: TemplateRRHH = {
            legajo: String(fila[headers.indexOf('legajo')] || fila[0] || ''),
            apellido: String(fila[headers.indexOf('apellido')] || fila[1] || ''),
            nombre: String(fila[headers.indexOf('nombre')] || fila[2] || ''),
            sueldo_basico: Number(fila[headers.indexOf('sueldo_basico')] ?? fila[4]) || 0,
            horas_extras: Number(fila[headers.indexOf('horas_extras')] ?? fila[5]) || 0,
            premios: Number(fila[headers.indexOf('premios')] ?? fila[6]) || 0,
            bonificaciones: Number(fila[headers.indexOf('bonificaciones')] ?? fila[7]) || 0,
            viaticos: Number(fila[headers.indexOf('viaticos')] ?? fila[8]) || 0,
            dias_trabajados: Number(fila[headers.indexOf('dias_trabajados')] ?? fila[9]) || 30,
            ausentismos: Number(fila[headers.indexOf('ausentismos')] ?? fila[10]) || 0,
            observaciones: String(fila[headers.indexOf('observaciones')] ?? fila[11] ?? '')
          }
          if (!filasPorPeriodo[pk]) filasPorPeriodo[pk] = []
          filasPorPeriodo[pk].push(empleado)
        }

        const periodosDetectados = Object.keys(filasPorPeriodo)
        let totalInsertados = 0
        const erroresAcumulados: string[] = []

        for (const pk of periodosDetectados) {
          const [anio, mes] = pk.split('-').map(Number)
          const resultado = await cargarNominaMensual(
            anio * 100 + mes,
            sucursalSeleccionada,
            filasPorPeriodo[pk],
            file.name,
            modoIncremental
          )
          totalInsertados += resultado.insertados
          if (!resultado.success) erroresAcumulados.push(...resultado.errores.map(e => `[${pk}] ${e}`))
        }

        setUltimaCarga({ tipo: 'rrhh', success: erroresAcumulados.length === 0, insertados: totalInsertados, errores: erroresAcumulados, archivo: file.name })
        setMensaje({
          tipo: erroresAcumulados.length === 0 ? 'success' : 'error',
          texto: `✅ RRHH Multi-Período: ${periodosDetectados.length} meses procesados (${totalInsertados} registros). Períodos: ${periodosDetectados.join(', ')}`
        })
      } else {
        // MODO PERÍODO ÚNICO
        if (periodoSeleccionado === 'multi') {
          setMensaje({ tipo: 'error', texto: 'El archivo no tiene columna "Mes". Seleccioná un período específico o agregá la columna Mes al archivo.' })
          setLoading(false)
          return
        }
        const datosRRHH: TemplateRRHH[] = filasDatos.map(fila => ({
          legajo: String(fila[0] || ''),
          apellido: String(fila[1] || ''),
          nombre: String(fila[2] || ''),
          sueldo_basico: Number(fila[4]) || 0,
          horas_extras: Number(fila[5]) || 0,
          premios: Number(fila[6]) || 0,
          bonificaciones: Number(fila[7]) || 0,
          viaticos: Number(fila[8]) || 0,
          dias_trabajados: Number(fila[9]) || 30,
          ausentismos: Number(fila[10]) || 0,
          observaciones: String(fila[11] || '')
        }))
        const [anio, mes] = periodoSeleccionado.split('-').map(Number)
        const resultado = await cargarNominaMensual(anio * 100 + mes, sucursalSeleccionada, datosRRHH, file.name, modoIncremental)
        setUltimaCarga({ tipo: 'rrhh', success: resultado.success, insertados: resultado.insertados, errores: resultado.errores, archivo: file.name })
        setMensaje({
          tipo: resultado.success ? 'success' : 'error',
          texto: resultado.success ? `RRHH cargado: ${resultado.insertados} empleados procesados` : `Error RRHH: ${resultado.errores.join(', ')}`
        })
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: `Error al procesar archivo RRHH: ${err instanceof Error ? err.message : 'Error desconocido'}` })
    } finally {
      setLoading(false)
    }
  }

  const handleArchivoCostos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''

    setLoading(true)
    setMensaje(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      const headers = (jsonData[0] as string[]).map(h => String(h || '').toLowerCase().trim())
      const filas = jsonData.slice(1) as any[][]

      const filasDatos = filas.filter(fila =>
        fila[0] && fila[0] !== 'INSTRUCCIONES' && fila[0] !== 'categoria_costo'
      )

      // Buscar columna de mes
      const mesColuIdx = headers.findIndex(h => h === 'mes' || h === 'periodo' || h === 'period' || h === 'month')
      const modoMulti = periodoSeleccionado === 'multi' || mesColuIdx >= 0

      const parseFila = (fila: any[]): TemplateCosto => ({
        categoria_costo: String(fila[headers.indexOf('categoria_costo')] ?? fila[0] ?? ''),
        subcategoria: String(fila[headers.indexOf('subcategoria')] ?? fila[1] ?? ''),
        descripcion: String(fila[headers.indexOf('descripcion')] ?? fila[2] ?? ''),
        importe: Number(fila[headers.indexOf('importe')] ?? fila[3]) || 0,
        importe_variable: Number(fila[headers.indexOf('importe_variable')] ?? fila[4]) || 0,
        importe_fijo: Number(fila[headers.indexOf('importe_fijo')] ?? fila[5]) || 0,
        tipo_gasto: String(fila[headers.indexOf('tipo_gasto')] ?? fila[6] ?? 'operativo'),
        proveedor: String(fila[headers.indexOf('proveedor')] ?? fila[7] ?? ''),
        numero_factura: String(fila[headers.indexOf('numero_factura')] ?? fila[8] ?? ''),
        fecha_vencimiento: fila[headers.indexOf('fecha_vencimiento')] ? String(fila[headers.indexOf('fecha_vencimiento')]) : undefined,
        observaciones: String(fila[headers.indexOf('observaciones')] ?? fila[10] ?? '')
      })

      if (modoMulti && mesColuIdx >= 0) {
        // MODO MULTI-PERÍODO
        const filasPorPeriodo: Record<string, TemplateCosto[]> = {}
        for (const fila of filasDatos) {
          const mesRaw = fila[mesColuIdx]
          const pk = parseMesAKey(String(mesRaw || '')) ?? (periodoSeleccionado !== 'multi' ? periodoSeleccionado : null)
          if (!pk) continue
          if (!filasPorPeriodo[pk]) filasPorPeriodo[pk] = []
          filasPorPeriodo[pk].push(parseFila(fila))
        }

        const periodosDetectados = Object.keys(filasPorPeriodo)
        let totalInsertados = 0
        const erroresAcumulados: string[] = []

        for (const pk of periodosDetectados) {
          const [anio, mes] = pk.split('-').map(Number)
          const resultado = await cargarCostosEstructurales(anio * 100 + mes, sucursalSeleccionada, filasPorPeriodo[pk], file.name, modoIncremental)
          totalInsertados += resultado.insertados
          if (!resultado.success) erroresAcumulados.push(...resultado.errores.map(e => `[${pk}] ${e}`))
        }

        setUltimaCarga({ tipo: 'costos', success: erroresAcumulados.length === 0, insertados: totalInsertados, errores: erroresAcumulados, archivo: file.name })
        setMensaje({
          tipo: erroresAcumulados.length === 0 ? 'success' : 'error',
          texto: `✅ Costos Multi-Período: ${periodosDetectados.length} meses procesados (${totalInsertados} conceptos). Períodos: ${periodosDetectados.join(', ')}`
        })
      } else {
        if (periodoSeleccionado === 'multi') {
          setMensaje({ tipo: 'error', texto: 'El archivo no tiene columna "Mes". Seleccioná un período específico o agregá la columna Mes al archivo.' })
          setLoading(false)
          return
        }
        const datosCostos = filasDatos.map(parseFila)
        const [anio, mes] = periodoSeleccionado.split('-').map(Number)
        const resultado = await cargarCostosEstructurales(anio * 100 + mes, sucursalSeleccionada, datosCostos, file.name, modoIncremental)
        setUltimaCarga({ tipo: 'costos', success: resultado.success, insertados: resultado.insertados, errores: resultado.errores, archivo: file.name })
        setMensaje({
          tipo: resultado.success ? 'success' : 'error',
          texto: resultado.success ? `Costos cargados: ${resultado.insertados} conceptos procesados` : `Error Costos: ${resultado.errores.join(', ')}`
        })
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: `Error al procesar archivo Costos: ${err instanceof Error ? err.message : 'Error desconocido'}` })
    } finally {
      setLoading(false)
    }
  }

  // Auto-hide mensajes después de 8 segundos
  useEffect(() => {
    if (mensaje) {
      const timer = setTimeout(() => setMensaje(null), 8000)
      return () => clearTimeout(timer)
    }
  }, [mensaje])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Cargas & Datos RRHH/Costos"
        subtitle="Sistema de carga masiva para nómina mensual, costos estructurales y gestión de plantillas de empleados."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Fase 2 - RRHH
            </Badge>
            <Button onClick={cargarPlantillaEmpleados} variant="outline" size="sm" className="gap-2">
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
            : mensaje.tipo === 'error'
            ? 'border-l-destructive bg-destructive/5'
            : 'border-l-primary bg-primary/5'
        }`}>
          <CardContent className="flex items-center gap-3 p-4">
            {mensaje.tipo === 'success' && <CheckCircle className="h-5 w-5 text-success" />}
            {mensaje.tipo === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
            {mensaje.tipo === 'info' && <Info className="h-5 w-5 text-primary" />}
            <div>
              <span className="text-sm font-medium">{mensaje.texto}</span>
              {ultimaCarga && ultimaCarga.errores.length > 0 && (
                <div className="mt-1 text-xs text-muted-foreground">
                  <details>
                    <summary className="cursor-pointer">Ver detalles de errores ({ultimaCarga.errores.length})</summary>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {ultimaCarga.errores.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros principales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">Sucursal</span>
            </div>
            <Select value={sucursalSeleccionada} onValueChange={setSucursalSeleccionada}>
              <SelectTrigger className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sucursales.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className={`border-success/20 ${periodoSeleccionado === 'multi' ? 'bg-amber-500/5 border-amber-500/30' : 'bg-success/5'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-success" />
              <span className="font-semibold text-sm">Período</span>
              {periodoSeleccionado === 'multi' && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 border border-amber-400/40">MULTI-PERÍODO</span>
              )}
            </div>
            <Select value={periodoSeleccionado} onValueChange={setPeriodoSeleccionado}>
              <SelectTrigger className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multi">📅 Multi-período (lee columna Mes del archivo)</SelectItem>
                {periodos.slice().reverse().map(p => (
                  <SelectItem key={p.key} value={p.key}>
                    {periodoLabel(p.anio, p.mes)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {periodoSeleccionado === 'multi' && (
              <p className="text-[10px] text-amber-600 mt-1.5">
                El archivo debe tener una columna <strong>Mes</strong> (ej: ene-26) por fila.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-warning" />
              <span className="font-semibold text-sm">Sistema RRHH</span>
            </div>
            <div className="text-lg font-bold">
              {formatNumber(plantillaEmpleados.length)} empleados
            </div>
            <p className="text-xs text-muted-foreground">
              {sistemaListo ? 'Conectado a Supabase' : 'Modo ejemplo/fallback'}
            </p>
            {!sistemaListo && (
              <Badge variant="outline" className="mt-1 text-[10px]">
                Verificar BD
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modo de Carga */}
      <Card className="border-primary/20 bg-card">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-primary flex items-center gap-2">
              Modo de Carga de Archivos
            </h4>
            <p className="text-xs text-muted-foreground">
              Define el comportamiento al subir planillas Excel de Nómina o Costos Estructurales para la sucursal y período seleccionados.
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={modoIncremental}
                onChange={(e) => setModoIncremental(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
              <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                Modo Incremental
              </span>
            </label>
            <Badge className={`text-[10px] uppercase font-bold px-2.5 py-0.5 border-0 ${
              modoIncremental ? "bg-success/20 text-success hover:bg-success/30" : "bg-warning/20 text-warning hover:bg-warning/30"
            }`}>
              {modoIncremental ? "Fusión / Agregar" : "Reemplazar Existente"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Sección RRHH */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Nómina Mensual RRHH</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Carga de sueldos, cargas sociales y liquidación mensual
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              Excel → Supabase
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                1. Descargar Template
              </h4>
              <p className="text-xs text-muted-foreground">
                Template pre-cargado con empleados de {sucursales.find(s => s.id === sucursalSeleccionada)?.nombre}
              </p>
              <Button 
                onClick={generarTemplateRRHH} 
                variant="outline" 
                size="sm" 
                className="w-full gap-2"
                disabled={plantillaEmpleados.length === 0}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Descargar Template RRHH
              </Button>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Upload className="h-4 w-4 text-success" />
                2. Subir Archivo Completado
              </h4>
              <p className="text-xs text-muted-foreground">
                Archivo Excel completado con datos de nómina del mes
              </p>
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleArchivoRRHH}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={loading}
                />
                <Button 
                  variant="default" 
                  size="sm" 
                  className="w-full gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {loading ? 'Procesando...' : 'Cargar Archivo RRHH'}
                </Button>
              </div>
            </div>
          </div>

          {/* Plantilla de empleados */}
          {plantillaEmpleados.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-sm mb-2">Empleados en Plantilla:</h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {plantillaEmpleados.slice(0, 6).map(emp => (
                  <div key={emp.legajo} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-xs">
                    <Badge variant="outline" className="text-[10px]">{emp.legajo}</Badge>
                    <span className="font-medium">{emp.apellido}, {emp.nombre}</span>
                    <span className="text-muted-foreground">({emp.puesto})</span>
                  </div>
                ))}
                {plantillaEmpleados.length > 6 && (
                  <div className="flex items-center justify-center p-2 rounded bg-muted/30 text-xs text-muted-foreground">
                    +{plantillaEmpleados.length - 6} más...
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Sección Costos Estructurales */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Costos Estructurales</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Servicios, alquileres, seguros, impuestos y otros costos fijos
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              Excel → Supabase
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                1. Descargar Template
              </h4>
              <p className="text-xs text-muted-foreground">
                Template con ejemplos de costos típicos por categoría
              </p>
              <Button 
                onClick={generarTemplateCostos} 
                variant="outline" 
                size="sm" 
                className="w-full gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Descargar Template Costos
              </Button>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Upload className="h-4 w-4 text-destructive" />
                2. Subir Archivo Completado
              </h4>
              <p className="text-xs text-muted-foreground">
                Archivo Excel con todos los costos del período
              </p>
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleArchivoCostos}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={loading}
                />
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="w-full gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {loading ? 'Procesando...' : 'Cargar Archivo Costos'}
                </Button>
              </div>
            </div>
          </div>

          {/* Categorías de costos */}
          <div className="mt-4">
            <h4 className="font-semibold text-sm mb-2">Categorías de Costos Soportadas:</h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {[
                { cat: 'servicios', icon: '⚡', desc: 'Luz, gas, agua, tel.' },
                { cat: 'alquileres', icon: '🏢', desc: 'Local, equipos' },
                { cat: 'seguros', icon: '🛡️', desc: 'Integral, mercadería' },
                { cat: 'impuestos', icon: '📊', desc: 'Municipal, provincial' },
                { cat: 'mantenimiento', icon: '🔧', desc: 'Equipos, limpieza' },
                { cat: 'marketing', icon: '📢', desc: 'Publicidad, promoción' },
                { cat: 'otros', icon: '📋', desc: 'Varios, extraordinarios' }
              ].map(item => (
                <div key={item.cat} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-xs">
                  <span className="text-base">{item.icon}</span>
                  <div>
                    <div className="font-medium capitalize">{item.cat}</div>
                    <div className="text-muted-foreground text-[10px]">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen de última carga */}
      {ultimaCarga && (
        <Card className={`border-l-4 ${
          ultimaCarga.success ? 'border-l-success bg-success/5' : 'border-l-destructive bg-destructive/5'
        }`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              {ultimaCarga.success ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              Resumen de Última Carga
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <span className="text-xs text-muted-foreground">Tipo:</span>
                <div className="font-semibold capitalize">
                  {ultimaCarga.tipo === 'rrhh' ? 'Nómina RRHH' : 'Costos Estructurales'}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Registros:</span>
                <div className="font-semibold">
                  {formatNumber(ultimaCarga.insertados)} insertados
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Archivo:</span>
                <div className="font-semibold text-xs">
                  {ultimaCarga.archivo || 'Sin nombre'}
                </div>
              </div>
            </div>
            
            {ultimaCarga.errores.length > 0 && (
              <div className="mt-3 p-3 rounded bg-destructive/10 border border-destructive/20">
                <h5 className="font-semibold text-sm text-destructive mb-2">
                  Errores encontrados ({ultimaCarga.errores.length}):
                </h5>
                <div className="max-h-32 overflow-y-auto">
                  <ul className="text-xs space-y-1 text-destructive/80">
                    {ultimaCarga.errores.map((error, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-destructive">•</span>
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Información técnica */}
      <Card className="border-muted">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Información Técnica:</p>
              <p>• Los templates se generan dinámicamente basados en la sucursal y período seleccionados.</p>
              <p>• Los empleados se crean automáticamente desde la plantilla si no existen en la base de datos.</p>
              <p>• Los cálculos de descuentos, aportes patronales y ART se realizan automáticamente.</p>
              <p>• Los archivos pueden procesarse múltiples veces (upsert) - se actualizan registros existentes.</p>
              <p>• Formatos soportados: .xlsx y .xls. El archivo debe seguir exactamente la estructura del template.</p>
              <p>• Las validaciones incluyen: empleados en plantilla, importes &gt; 0, categorías válidas.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
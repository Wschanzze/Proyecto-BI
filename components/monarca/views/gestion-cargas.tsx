// components/monarca/views/gestion-cargas.tsx
"use client"

import { useState, useRef, useEffect } from "react"
import * as XLSX from "xlsx"
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
import {
  Users,
  Upload,
  CheckCircle2,
  AlertCircle,
  Info,
  FileSpreadsheet,
  Download,
  Calculator,
  RefreshCw,
  Table
} from "lucide-react"
import { PageHeader } from "@/components/monarca/shared"
import { distribuirRRHHSubcuentas } from "@/lib/distribucion-costos"
import { getRRHHSubcuentas, upsertRRHHSubcuentas, type RRHHSubcuentas, type RRHHSubcuentasCarga } from "@/lib/rrhh-subcuentas"
import { formatCurrency, periodoLabel } from "@/lib/format"
import type { Periodo } from "@/lib/data"

interface RRHHForm {
  sueldos: string
  cargas_sociales: string
  indemnizaciones: string
  tabla_merito: string
}

export function GestionCargas() {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>("2026-07")
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error' | 'info'; texto: string } | null>(null)
  
  // Estado del formulario manual
  const [rrhhForm, setRrhhForm] = useState<RRHHForm>({
    sueldos: '0',
    cargas_sociales: '0',
    indemnizaciones: '0',
    tabla_merito: '0',
  })

  // Lista de resumen de subcuentas cargadas en DB
  const [subcuentasExistentes, setSubcuentasExistentes] = useState<{ periodoKey: string; data: RRHHSubcuentas }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Universal month parser: handles '01-ene', '01-feb', '2026-01', Spanish month names & Excel dates
  const parseMesUniversal = (mesRaw: any): string | null => {
    if (mesRaw === null || mesRaw === undefined) return null

    if (typeof mesRaw === 'number') {
      const s = String(mesRaw)
      if (s.length === 6 && s.startsWith('20')) {
        return `${s.slice(0, 4)}-${s.slice(4, 6)}`
      }
      if (mesRaw > 30000 && mesRaw < 60000) {
        const date = new Date(Math.round((mesRaw - 25569) * 86400 * 1000))
        if (!isNaN(date.getTime())) {
          const y = date.getUTCFullYear()
          const m = String(date.getUTCMonth() + 1).padStart(2, '0')
          return `${y}-${m}`
        }
      }
    }

    if (mesRaw instanceof Date && !isNaN(mesRaw.getTime())) {
      const y = mesRaw.getUTCFullYear()
      const m = String(mesRaw.getUTCMonth() + 1).padStart(2, '0')
      return `${y}-${m}`
    }

    const cleaned = String(mesRaw).toLowerCase().trim()
    if (!cleaned) return null

    // 1. Formato ISO / YYYY-MM-DD / YYYY-MM (ej: 2026-02-01, 2026-02)
    const yyyyFirst = cleaned.match(/\b(202[4-9])[-/.](0?[1-9]|1[0-2])(?:[-/.](0?[1-9]|[12]\d|3[01]))?\b/)
    if (yyyyFirst) {
      return `${yyyyFirst[1]}-${yyyyFirst[2].padStart(2, '0')}`
    }

    // 2. Formato Argentina DD-MM-YYYY o DD/MM/YYYY (ej: 01-02-2026, 15/06/2026)
    const ddMmYyyy = cleaned.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](202[4-9])\b/)
    if (ddMmYyyy) {
      return `${ddMmYyyy[3]}-${ddMmYyyy[2].padStart(2, '0')}`
    }

    // 3. Nombres de meses en español (ej: "01-ene", "01-feb", "01-mar", "ene-26")
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
        const year4Match = cleaned.match(/\b(202[4-9])\b/)
        if (year4Match) return `${year4Match[1]}-${num}`

        const year2Match = cleaned.match(/[-/.](2[4-9])$/)
        if (year2Match) return `20${year2Match[1]}-${num}`

        return `2026-${num}`
      }
    }

    // 4. Formato MM-YYYY o MM/YYYY (ej: 06/2026, 01-2026)
    const mmYyyy = cleaned.match(/\b(0?[1-9]|1[0-2])[-/.](202[4-9])\b/)
    if (mmYyyy) return `${mmYyyy[2]}-${mmYyyy[1].padStart(2, '0')}`

    // 5. Formato MM/YY o MM-YY (ej: 06/26)
    const mmYy = cleaned.match(/\b(0?[1-9]|1[0-2])[-/.](2[4-9]|3[0-9])\b/)
    if (mmYy) return `20${mmYy[2]}-${mmYy[1].padStart(2, '0')}`

    return null
  }

  // Generar lista de períodos 2024-01 a 2026-12
  const periodosDisponibles: Periodo[] = (() => {
    const res: Periodo[] = []
    for (let anio = 2024; anio <= 2026; anio++) {
      for (let mes = 1; mes <= 12; mes++) {
        const key = `${anio}-${String(mes).padStart(2, '0')}`
        res.push({ key, anio, mes, index: (anio - 2024) * 12 + mes })
      }
    }
    return res
  })()

  // Cargar datos actuales de RRHH para el período seleccionado
  const loadPeriodoData = async () => {
    if (periodoSeleccionado === 'multi') return
    try {
      const data = await getRRHHSubcuentas(periodoSeleccionado, '__consolidado__')
      if (data) {
        setRrhhForm({
          sueldos: String(data.sueldos || 0),
          cargas_sociales: String(data.cargas_sociales || 0),
          indemnizaciones: String(data.indemnizaciones || 0),
          tabla_merito: String(data.tabla_merito || 0),
        })
      } else {
        setRrhhForm({ sueldos: '0', cargas_sociales: '0', indemnizaciones: '0', tabla_merito: '0' })
      }
    } catch (err) {
      console.error('Error al cargar datos RRHH:', err)
    }
  }

  // Cargar lista de todos los períodos con datos de RRHH (una sola query, sin 406)
  const loadSubcuentasExistentes = async () => {
    try {
      const { data: periodos } = await import('@/lib/supabase').then(m => 
        m.supabaseAdmin
          .from('periodos')
          .select('id, key')
          .order('key')
      )
      if (!periodos || periodos.length === 0) return

      // Obtener todos los rrhh_subcuentas en una sola query
      const periodoIds = periodos.map(p => p.id)
      const { data: subcuentas } = await import('@/lib/supabase').then(m =>
        m.supabaseAdmin
          .from('rrhh_subcuentas')
          .select('periodo_id, sueldos, cargas_sociales, indemnizaciones, tabla_merito, total_rrhh')
          .in('periodo_id', periodoIds)
      )

      if (!subcuentas || subcuentas.length === 0) return

      // Agrupar por periodo_id y sumar (consolidado de sucursales)
      const periodoMap = new Map(periodos.map(p => [p.id, p.key]))
      const consolidado = new Map<string, RRHHSubcuentas>()

      for (const row of subcuentas) {
        const pk = periodoMap.get(row.periodo_id)
        if (!pk) continue

        if (!consolidado.has(pk)) {
          consolidado.set(pk, {
            periodo_id: row.periodo_id,
            sucursal_id: '__consolidado__',
            sueldos: 0, cargas_sociales: 0, indemnizaciones: 0, tabla_merito: 0, total_rrhh: 0
          })
        }
        const agg = consolidado.get(pk)!
        agg.sueldos += Number(row.sueldos || 0)
        agg.cargas_sociales += Number(row.cargas_sociales || 0)
        agg.indemnizaciones += Number(row.indemnizaciones || 0)
        agg.tabla_merito += Number(row.tabla_merito || 0)
        agg.total_rrhh += Number(row.total_rrhh || 0)
      }

      const list = Array.from(consolidado.entries())
        .filter(([, d]) => d.total_rrhh > 0)
        .map(([periodoKey, data]) => ({ periodoKey, data }))
        .sort((a, b) => a.periodoKey.localeCompare(b.periodoKey))

      setSubcuentasExistentes(list)
    } catch (err) {
      console.error('Error al cargar historial RRHH:', err)
    }
  }

  useEffect(() => {
    loadPeriodoData()
  }, [periodoSeleccionado])

  useEffect(() => {
    loadSubcuentasExistentes()
  }, [])

  const handleInputChange = (field: keyof RRHHForm, val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, '')
    setRrhhForm(prev => ({ ...prev, [field]: cleaned }))
  }

  const totalCalculado = () => {
    const s = parseFloat(rrhhForm.sueldos) || 0
    const c = parseFloat(rrhhForm.cargas_sociales) || 0
    const i = parseFloat(rrhhForm.indemnizaciones) || 0
    const m = parseFloat(rrhhForm.tabla_merito) || 0
    return s + c + i + m
  }

  // Carga manual desde el formulario
  const handleGuardarManual = async () => {
    if (periodoSeleccionado === 'multi') {
      setMensaje({ tipo: 'error', texto: 'Seleccioná un período específico para la carga manual.' })
      return
    }

    setLoading(true)
    setMensaje(null)

    const rrhhData: RRHHSubcuentasCarga = {
      sueldos: parseFloat(rrhhForm.sueldos) || 0,
      cargas_sociales: parseFloat(rrhhForm.cargas_sociales) || 0,
      indemnizaciones: parseFloat(rrhhForm.indemnizaciones) || 0,
      tabla_merito: parseFloat(rrhhForm.tabla_merito) || 0,
    }

    const res = await distribuirRRHHSubcuentas(periodoSeleccionado, rrhhData)
    setLoading(false)

    if (res.success) {
      setMensaje({
        tipo: 'success',
        texto: `✅ Datos de RRHH para ${periodoSeleccionado} guardados y distribuidos entre sucursales exitosamente.`
      })
      loadSubcuentasExistentes()
    } else {
      setMensaje({ tipo: 'error', texto: `Error: ${res.error}` })
    }
  }

  // Generar Template de RRHH con los 4 conceptos exactos
  const handleDescargarTemplate = () => {
    const wb = XLSX.utils.book_new()
    const datosEjemplo = [
      { Mes: '01-ene', SUELDO: 709342757.8, CCSS: 172667187.2, INDEMNIZATORIOS: 16914061.88, MERITO: 5404267.43 },
      { Mes: '01-feb', SUELDO: 729924761.4, CCSS: 176530320.8, INDEMNIZATORIOS: 15336380.77, MERITO: 7198140.99 },
      { Mes: '01-mar', SUELDO: 732103404.9, CCSS: 175948803.7, INDEMNIZATORIOS: 16049553.98, MERITO: 7673472.61 },
      { Mes: '01-abr', SUELDO: 758937710.1, CCSS: 188623665.2, INDEMNIZATORIOS: 18816195.79, MERITO: 6896210.67 },
      { Mes: '01-may', SUELDO: 741985200.2, CCSS: 187394353.1, INDEMNIZATORIOS: 3233933.80, MERITO: 6729186.49 },
      { Mes: '01-jun', SUELDO: 786843181.6, CCSS: 191227138.3, INDEMNIZATORIOS: 13907217.20, MERITO: 5121670.60 },
      { Mes: '01-jul', SUELDO: 796078245.5, CCSS: 195666800.5, INDEMNIZATORIOS: 13383195.85, MERITO: 7348110.54 },
    ]

    const ws = XLSX.utils.json_to_sheet(datosEjemplo)
    ws['!cols'] = [
      { wch: 12 }, // Mes
      { wch: 18 }, // SUELDO
      { wch: 18 }, // CCSS
      { wch: 20 }, // INDEMNIZATORIOS
      { wch: 18 }, // MERITO
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'RRHH_Subcuentas')
    XLSX.writeFile(wb, 'Template_Carga_RRHH_Subcuentas.xlsx')
    setMensaje({ tipo: 'info', texto: 'Template de RRHH descargado. Podés completarlo y subirlo en la sección de carga.' })
  }

  // Cargar archivo Excel/CSV multi-período (Soporta Tablas Verticales y Matrices Horizontales)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''

    setLoading(true)
    setMensaje(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 })

      if (!rows || rows.length < 2) {
        setMensaje({ tipo: 'error', texto: 'El archivo está vacío o no contiene filas de datos.' })
        setLoading(false)
        return
      }

      const parseMonto = (val: any): number => {
        if (typeof val === 'number') return isNaN(val) ? 0 : val
        if (typeof val === 'string') {
          const clean = val.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
          return parseFloat(clean) || 0
        }
        return 0
      }

      const rrhhPorPeriodo: Record<string, RRHHSubcuentasCarga> = {}

      // 1. DETECTAR SI ES MATRIZ HORIZONTAL (Meses en las cabeceras de columnas)
      let horizontalHeaderIdx = -1
      const colToPeriodMap: Record<number, string> = {}
      let colDenominacionHoriz = 0

      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const row = rows[i] || []
        let monthColsFound = 0
        const tempMap: Record<number, string> = {}

        row.forEach((cell: any, colIdx: number) => {
          const cellStr = String(cell || '').trim().toLowerCase()
          if (cellStr.includes('total') || cellStr.includes('acumulado') || cellStr.includes('consolidado') || cellStr.includes('suma')) {
            return
          }
          const pk = parseMesUniversal(cell)
          if (pk) {
            tempMap[colIdx] = pk
            monthColsFound++
          }
        })

        if (monthColsFound >= 2) {
          horizontalHeaderIdx = i
          Object.assign(colToPeriodMap, tempMap)
          const denIdx = row.findIndex((cell: any, idx: number) => !tempMap[idx] && String(cell || '').trim().length > 0)
          colDenominacionHoriz = denIdx >= 0 ? denIdx : 0
          break
        }
      }

      if (horizontalHeaderIdx >= 0) {
        // --- MODO A: MATRIZ HORIZONTAL ---
        for (let i = horizontalHeaderIdx + 1; i < rows.length; i++) {
          const row = rows[i]
          if (!row || row.length === 0) continue

          const denRaw = String(row[colDenominacionHoriz] ?? '').trim().toLowerCase()
          if (!denRaw || denRaw.startsWith('instruccion') || denRaw.startsWith('total')) continue

          let campo: keyof RRHHSubcuentasCarga | null = null
          if (denRaw.includes('sueldo') || denRaw.includes('remunerativo') || denRaw.includes('basico') || denRaw.includes('personal')) {
            campo = 'sueldos'
          } else if (denRaw.includes('ccss') || denRaw.includes('cargas') || denRaw.includes('aporte') || denRaw.includes('contribucion')) {
            campo = 'cargas_sociales'
          } else if (denRaw.includes('indemn') || denRaw.includes('despido') || denRaw.includes('baja')) {
            campo = 'indemnizaciones'
          } else if (denRaw.includes('merito') || denRaw.includes('desempeño') || denRaw.includes('bono')) {
            campo = 'tabla_merito'
          }

          if (!campo) continue

          Object.entries(colToPeriodMap).forEach(([colStr, pk]) => {
            const colIdx = Number(colStr)
            const monto = parseMonto(row[colIdx])
            if (monto === 0) return

            if (!rrhhPorPeriodo[pk]) {
              rrhhPorPeriodo[pk] = { sueldos: 0, cargas_sociales: 0, indemnizaciones: 0, tabla_merito: 0 }
            }
            rrhhPorPeriodo[pk][campo!] = (rrhhPorPeriodo[pk][campo!] || 0) + monto
          })
        }
      } else {
        // --- MODO B: TABLA VERTICAL (Columna Mes + columnas de conceptos por fila) ---
        let headerIdx = -1
        let colMes = -1
        let colSueldo = -1
        let colCCSS = -1
        let colIndem = -1
        let colMerito = -1

        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const r = (rows[i] || []).map(cell => String(cell || '').toLowerCase().trim())
          
          const idxM = r.findIndex(c => c === 'mes' || c === 'periodo' || c === 'fecha' || c === 'date')
          const idxS = r.findIndex(c => c.includes('sueldo') || c.includes('remunerativo') || c.includes('basico'))
          const idxC = r.findIndex(c => c.includes('ccss') || c.includes('cargas') || c.includes('aporte') || c.includes('contribucion'))
          const idxI = r.findIndex(c => c.includes('indemn') || c.includes('despido'))
          const idxMer = r.findIndex(c => c.includes('merito') || c.includes('desempeño') || c.includes('bono'))

          if (idxS >= 0 || idxC >= 0 || idxM >= 0) {
            headerIdx = i
            colMes = idxM >= 0 ? idxM : 0
            colSueldo = idxS
            colCCSS = idxC
            colIndem = idxI
            colMerito = idxMer
            break
          }
        }

        if (headerIdx === -1) {
          headerIdx = 0
          colMes = 0
          colSueldo = 1
          colCCSS = 2
          colIndem = 3
          colMerito = 4
        }

        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = rows[i]
          if (!row || row.length === 0) continue

          const mesCell = row[colMes]
          if (mesCell === undefined || mesCell === null || String(mesCell).trim() === '') continue
          const cellStr = String(mesCell).toLowerCase().trim()
          if (cellStr.includes('total') || cellStr.includes('acumulado') || cellStr.includes('suma')) continue

          const pk = parseMesUniversal(mesCell) ?? (periodoSeleccionado !== 'multi' ? periodoSeleccionado : null)
          if (!pk) continue

          const sueldos = colSueldo >= 0 ? parseMonto(row[colSueldo]) : 0
          const cargas_sociales = colCCSS >= 0 ? parseMonto(row[colCCSS]) : 0
          const indemnizaciones = colIndem >= 0 ? parseMonto(row[colIndem]) : 0
          const tabla_merito = colMerito >= 0 ? parseMonto(row[colMerito]) : 0

          if (!rrhhPorPeriodo[pk]) {
            rrhhPorPeriodo[pk] = { sueldos: 0, cargas_sociales: 0, indemnizaciones: 0, tabla_merito: 0 }
          }

          rrhhPorPeriodo[pk].sueldos = (rrhhPorPeriodo[pk].sueldos || 0) + sueldos
          rrhhPorPeriodo[pk].cargas_sociales = (rrhhPorPeriodo[pk].cargas_sociales || 0) + cargas_sociales
          rrhhPorPeriodo[pk].indemnizaciones = (rrhhPorPeriodo[pk].indemnizaciones || 0) + indemnizaciones
          rrhhPorPeriodo[pk].tabla_merito = (rrhhPorPeriodo[pk].tabla_merito || 0) + tabla_merito
        }
      }

      const periodosDetectados = Object.keys(rrhhPorPeriodo).sort()

      if (periodosDetectados.length === 0) {
        setMensaje({ tipo: 'error', texto: 'No se encontraron períodos válidos en el archivo.' })
        setLoading(false)
        return
      }

      const erroresList: string[] = []
      let exitosos = 0

      for (const pk of periodosDetectados) {
        const res = await distribuirRRHHSubcuentas(pk, rrhhPorPeriodo[pk])
        if (!res.success) erroresList.push(`[${pk}]: ${res.error}`)
        else exitosos++
      }

      setLoading(false)
      if (erroresList.length > 0) {
        setMensaje({
          tipo: 'error',
          texto: `Se procesaron ${exitosos} de ${periodosDetectados.length} períodos con errores: ${erroresList.join(' | ')}`
        })
      } else {
        setMensaje({
          tipo: 'success',
          texto: `✅ Se cargaron y distribuyeron exitosamente ${periodosDetectados.length} períodos de RRHH: ${periodosDetectados.join(', ')}.`
        })
        loadSubcuentasExistentes()
        loadPeriodoData()
      }
    } catch (err) {
      setLoading(false)
      setMensaje({
        tipo: 'error',
        texto: `Error al procesar el archivo: ${err instanceof Error ? err.message : 'Error desconocido'}`
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Cargas — RRHH"
        description="Carga y distribución de subcuentas de Personal y Cargas Sociales (Sueldos, CCSS, Indemnizaciones y Tabla Mérito)"
      />

      {/* Selector de Período y Modo Multi-período */}
      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-foreground">
                Período de Trabajo / Carga
              </label>
              <p className="text-xs text-muted-foreground">
                Seleccioná un período para carga manual o eligí Multi-período para subir archivos con varios meses.
              </p>
            </div>
            <div className="w-full sm:w-[260px]">
              <Select value={periodoSeleccionado} onValueChange={setPeriodoSeleccionado}>
                <SelectTrigger className="w-full font-medium">
                  <SelectValue placeholder="Seleccionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multi">📅 Multi-período (lee columna Mes del archivo)</SelectItem>
                  {periodosDisponibles.map(p => (
                    <SelectItem key={p.key} value={p.key}>
                      {periodoLabel(p.anio, p.mes)} ({p.key})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas de Resultado */}
      {mensaje && (
        <div
          className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${
            mensaje.tipo === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : mensaje.tipo === 'error'
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
          }`}
        >
          {mensaje.tipo === 'success' && <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />}
          {mensaje.tipo === 'error' && <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />}
          {mensaje.tipo === 'info' && <Info className="h-5 w-5 shrink-0 mt-0.5" />}
          <div className="flex-1 font-medium leading-relaxed">{mensaje.texto}</div>
        </div>
      )}

      {/* Grid con dos secciones: Carga masiva via Excel/CSV vs Carga Manual */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Card 1: Carga Masiva (Excel / CSV) */}
        <Card className="border-border flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Carga Masiva vía Archivo (Excel / CSV)</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Subí tu plantilla con las columnas: Mes, SUELDO, CCSS, INDEMNIZATORIOS, MERITO
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="rounded-lg border border-dashed border-border p-4 text-center bg-muted/30">
                <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground mb-3">
                  Soporta archivos Excel (<code className="text-primary font-mono">.xlsx, .xls</code>) o CSV.
                  Detecta fechas estilo <code className="text-primary font-mono">01-ene</code>, <code className="text-primary font-mono">01-feb</code>, <code className="text-primary font-mono">2026-01</code>.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="gap-2"
                  >
                    {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {loading ? 'Procesando...' : 'Subir Archivo RRHH'}
                  </Button>

                  <Button
                    onClick={handleDescargarTemplate}
                    variant="outline"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4 text-primary" />
                    Descargar Template
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1 border border-border/50">
              <span className="font-semibold text-foreground flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-primary" /> Mapeo automático de cuentas:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
                <li><strong>SUELDO</strong>: Sueldos brutos totales</li>
                <li><strong>CCSS</strong>: Cargas Sociales (Aportes patronales + ART)</li>
                <li><strong>INDEMNIZATORIOS</strong>: Indemnizaciones y bajas</li>
                <li><strong>MERITO</strong>: Tabla Mérito / Bonos por desempeño</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Carga / Edición Manual */}
        <Card className="border-border flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Carga Manual de Subcuentas RRHH</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Ingresá los montos totales para {periodoSeleccionado === 'multi' ? 'el período seleccionado' : periodoSeleccionado}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Campo Sueldos */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  SUELDO (Sueldos Brutos)
                </label>
                <input
                  type="text"
                  value={rrhhForm.sueldos}
                  onChange={(e) => handleInputChange('sueldos', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0"
                />
              </div>

              {/* Campo CCSS */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  CCSS (Cargas Sociales)
                </label>
                <input
                  type="text"
                  value={rrhhForm.cargas_sociales}
                  onChange={(e) => handleInputChange('cargas_sociales', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0"
                />
              </div>

              {/* Campo Indemnizatorios */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  INDEMNIZATORIOS (Indemnizaciones)
                </label>
                <input
                  type="text"
                  value={rrhhForm.indemnizaciones}
                  onChange={(e) => handleInputChange('indemnizaciones', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0"
                />
              </div>

              {/* Campo Mérito */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  MERITO (Tabla Mérito)
                </label>
                <input
                  type="text"
                  value={rrhhForm.tabla_merito}
                  onChange={(e) => handleInputChange('tabla_merito', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Total Calculado */}
            <div className="rounded-lg bg-emerald-500/10 p-3 flex items-center justify-between border border-emerald-500/20">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Total RRHH Período:
              </span>
              <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalCalculado())}
              </span>
            </div>

            <Button
              onClick={handleGuardarManual}
              disabled={loading || periodoSeleccionado === 'multi'}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
              Guardar y Distribuir RRHH ({periodoSeleccionado})
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Períodos Cargados de RRHH */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Table className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-bold">Histórico de Subcuentas de RRHH Cargadas</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {subcuentasExistentes.length} Períodos en BD
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {subcuentasExistentes.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No hay subcuentas de RRHH cargadas actualmente. Usá el formulario o subí un archivo para comenzar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                  <tr>
                    <th className="p-2.5 font-semibold">Período</th>
                    <th className="p-2.5 font-semibold text-right">SUELDO</th>
                    <th className="p-2.5 font-semibold text-right">CCSS</th>
                    <th className="p-2.5 font-semibold text-right">INDEMNIZATORIOS</th>
                    <th className="p-2.5 font-semibold text-right">MERITO</th>
                    <th className="p-2.5 font-semibold text-right">TOTAL RRHH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subcuentasExistentes.map(({ periodoKey, data }) => (
                    <tr key={periodoKey} className="hover:bg-muted/30 font-mono">
                      <td className="p-2.5 font-sans font-bold text-foreground">
                        {periodoKey}
                      </td>
                      <td className="p-2.5 text-right">{formatCurrency(data.sueldos)}</td>
                      <td className="p-2.5 text-right">{formatCurrency(data.cargas_sociales)}</td>
                      <td className="p-2.5 text-right">{formatCurrency(data.indemnizaciones)}</td>
                      <td className="p-2.5 text-right">{formatCurrency(data.tabla_merito)}</td>
                      <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(data.total_rrhh)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
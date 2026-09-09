// components/monarca/views/gestion-ingresos-financieros.tsx
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
  TrendingUp,
  Upload,
  CheckCircle2,
  AlertCircle,
  Info,
  FileSpreadsheet,
  Download,
  Table
} from "lucide-react"
import { PageHeader } from "@/components/monarca/shared"
import { distribuirIngresosFinancieros } from "@/lib/distribucion-costos"
import { getIngresosFinancierosSubcuentas, type IngresosFinancierosSubcuentas, type IngresosFinancierosSubcuentasCarga } from "@/lib/ingresos-financieros-subcuentas"
import { formatCurrency, periodoLabel } from "@/lib/format"
import type { Periodo } from "@/lib/data"

interface IngresosForm {
  operatoria_financiera: string
  rendimientos_financieros: string
}

export function GestionIngresosFinancieros() {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>("2026-07")
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error' | 'info'; texto: string } | null>(null)
  
  // Estado del formulario manual
  const [ingresosForm, setIngresosForm] = useState<IngresosForm>({
    operatoria_financiera: '0',
    rendimientos_financieros: '0',
  })

  // Lista de resumen de subcuentas cargadas en DB
  const [subcuentasExistentes, setSubcuentasExistentes] = useState<{ periodoKey: string; data: IngresosFinancierosSubcuentas }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Universal month parser: handles '01/01/2026', '01-feb', '2026-01', Spanish month names & Excel dates
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

    // 1. Formato ISO / YYYY-MM-DD / YYYY-MM
    const yyyyFirst = cleaned.match(/\b(202[4-9])[-/.](0?[1-9]|1[0-2])(?:[-/.](0?[1-9]|[12]\d|3[01]))?\b/)
    if (yyyyFirst) {
      return `${yyyyFirst[1]}-${yyyyFirst[2].padStart(2, '0')}`
    }

    // 2. Formato Argentina DD-MM-YYYY o DD/MM/YYYY (ej: 01/01/2026, 01/02/2026)
    const ddMmYyyy = cleaned.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](202[4-9])\b/)
    if (ddMmYyyy) {
      return `${ddMmYyyy[3]}-${ddMmYyyy[2].padStart(2, '0')}`
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
        const year4Match = cleaned.match(/\b(202[4-9])\b/)
        if (year4Match) return `${year4Match[1]}-${num}`
        return `2026-${num}`
      }
    }

    // 4. MM-YYYY
    const mmYyyy = cleaned.match(/\b(0?[1-9]|1[0-2])[-/.](202[4-9])\b/)
    if (mmYyyy) return `${mmYyyy[2]}-${mmYyyy[1].padStart(2, '0')}`

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

  // Cargar datos actuales de Ingresos Financieros para el período seleccionado
  const loadPeriodoData = async () => {
    if (periodoSeleccionado === 'multi') return
    try {
      const data = await getIngresosFinancierosSubcuentas(periodoSeleccionado, '__consolidado__')
      if (data) {
        setIngresosForm({
          operatoria_financiera: String(data.operatoria_financiera || 0),
          rendimientos_financieros: String(data.rendimientos_financieros || 0),
        })
      } else {
        setIngresosForm({ operatoria_financiera: '0', rendimientos_financieros: '0' })
      }
    } catch (err) {
      console.error('Error al cargar Ingresos Financieros:', err)
    }
  }

  // Cargar lista de todos los períodos con datos de Ingresos Financieros en modo demo
  const loadSubcuentasExistentes = async () => {
    try {
      const { getPeriodosDB } = await import('@/lib/data-db')
      const { getIngresosFinancierosSubcuentas } = await import('@/lib/ingresos-financieros-subcuentas')
      const periodos = await getPeriodosDB()
      if (!periodos || periodos.length === 0) return

      const list: { periodoKey: string; data: IngresosFinancierosSubcuentas }[] = []
      for (const p of periodos.slice(-6)) {
        const sub = await getIngresosFinancierosSubcuentas(p.key, '__consolidado__')
        if (sub) {
          list.push({ periodoKey: p.key, data: sub })
        }
      }
      setSubcuentasExistentes(list)
    } catch (err) {
      console.error('Error al cargar historial Ingresos Financieros:', err)
    }
  }

  useEffect(() => {
    loadPeriodoData()
    loadSubcuentasExistentes()
  }, [periodoSeleccionado])

  const totalIngresos = (parseFloat(ingresosForm.operatoria_financiera) || 0) + 
                        (parseFloat(ingresosForm.rendimientos_financieros) || 0)

  // Guardar formulario manual
  const handleGuardarManual = async () => {
    if (periodoSeleccionado === 'multi') {
      setMensaje({ tipo: 'error', texto: 'Selecciona un período específico para la carga manual.' })
      return
    }
    setLoading(true)
    setMensaje(null)

    try {
      const datos: IngresosFinancierosSubcuentasCarga = {
        operatoria_financiera: parseFloat(ingresosForm.operatoria_financiera) || 0,
        rendimientos_financieros: parseFloat(ingresosForm.rendimientos_financieros) || 0,
      }

      const res = await distribuirIngresosFinancieros(periodoSeleccionado, datos)

      if (res.success) {
        setMensaje({
          tipo: 'success',
          texto: `✅ Ingresos Financieros para ${periodoSeleccionado} distribuidos exitosamente entre las 5 sucursales. Total: ${formatCurrency(totalIngresos)}`
        })
        await loadSubcuentasExistentes()
      } else {
        setMensaje({ tipo: 'error', texto: `Error: ${res.error}` })
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: `Error inesperado: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setLoading(false)
    }
  }

  // Parser numérico de monedas
  const parseMonto = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val
    if (typeof val === 'string') {
      let clean = val.trim().replace(/[^0-9.,-]/g, '')
      const dots = (clean.match(/\./g) || []).length
      const commas = (clean.match(/,/g) || []).length

      if (dots === 1 && commas === 0) {
        // "123456.78"
      } else if (commas === 1 && dots === 0) {
        // "123456,78"
        clean = clean.replace(',', '.')
      } else if (dots > 0 && commas === 1) {
        // "65.093.738,70"
        clean = clean.replace(/\./g, '').replace(',', '.')
      } else if (commas > 0 && dots === 1) {
        // "65,093,738.70"
        clean = clean.replace(/,/g, '')
      } else if (dots > 1 && commas === 0) {
        clean = clean.replace(/\./g, '')
      } else if (commas > 1 && dots === 0) {
        clean = clean.replace(/,/g, '')
      }

      return parseFloat(clean) || 0
    }
    return 0
  }

  // Carga desde archivo Excel/CSV
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''

    setLoading(true)
    setMensaje(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheet]
      const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 })

      if (!rows || rows.length < 2) {
        setMensaje({ tipo: 'error', texto: 'El archivo está vacío o no contiene filas de datos.' })
        setLoading(false)
        return
      }

      const ingresosPorPeriodo: Record<string, IngresosFinancierosSubcuentasCarga> = {}

      // MODO A: Multi-columna por concepto (Mes | Rendimientos Financieros | Operatoria Financiera)
      let multiConceptHeaderIdx = -1
      let colMesMulti = -1
      const conceptColsMap: Record<number, keyof IngresosFinancierosSubcuentasCarga> = {}

      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const r = rows[i] || []
        const rLower = r.map((c: any) => String(c || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim())
        const idxMes = rLower.findIndex(c => c === 'mes' || c === 'periodo' || c === 'period' || c === 'fecha' || c === 'date')

        if (idxMes >= 0) {
          let matchedConcepts = 0
          const tempMap: Record<number, keyof IngresosFinancierosSubcuentasCarga> = {}

          r.forEach((cell: any, colIdx: number) => {
            if (colIdx === idxMes) return
            const cStr = String(cell || '').toLowerCase().trim()
            if (!cStr || cStr.includes('total')) return

            if (cStr.includes('operatoria') || cStr.includes('intereses ganados')) {
              tempMap[colIdx] = 'operatoria_financiera'
              matchedConcepts++
            } else if (cStr.includes('rendimiento') || cStr.includes('inversion') || cStr.includes('fci') || cStr.includes('plazo fijo')) {
              tempMap[colIdx] = 'rendimientos_financieros'
              matchedConcepts++
            }
          })

          if (matchedConcepts >= 1) {
            multiConceptHeaderIdx = i
            colMesMulti = idxMes
            Object.assign(conceptColsMap, tempMap)
            break
          }
        }
      }

      if (multiConceptHeaderIdx >= 0) {
        // --- MODO A: Multi-columna de conceptos ---
        for (let i = multiConceptHeaderIdx + 1; i < rows.length; i++) {
          const row = rows[i]
          if (!row || row.length === 0) continue

          const rawMes = row[colMesMulti]
          if (rawMes === undefined || rawMes === null) continue

          const pk = parseMesUniversal(rawMes)
          if (!pk) continue

          if (!ingresosPorPeriodo[pk]) {
            ingresosPorPeriodo[pk] = { operatoria_financiera: 0, rendimientos_financieros: 0 }
          }

          Object.entries(conceptColsMap).forEach(([colStr, campo]) => {
            const colIdx = Number(colStr)
            const monto = parseMonto(row[colIdx])
            if (monto > 0) {
              ingresosPorPeriodo[pk][campo] = (ingresosPorPeriodo[pk][campo] || 0) + monto
            }
          })
        }
      } else {
        // --- MODO B: Tabla vertical estándar (Concepto/Denominación | Monto | Mes) ---
        let headerIdx = -1
        let colMes = -1
        let colDenominacion = -1
        let colMonto = -1

        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const r = (rows[i] || []).map(cell => String(cell || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim())
          const idxMes = r.findIndex(c => c === 'mes' || c === 'periodo' || c === 'fecha')
          const idxDen = r.findIndex(c => c === 'denominacion' || c === 'concepto' || c === 'descripcion' || c === 'subcuenta' || c === 'cuenta' || c === 'nombre')
          const idxMon = r.findIndex(c => c === 'total' || c === 'monto' || c === 'importe' || c === 'valor')

          if (idxDen >= 0 || idxMon >= 0 || idxMes >= 0) {
            headerIdx = i
            colMes = idxMes
            colDenominacion = idxDen >= 0 ? idxDen : 0
            colMonto = idxMon >= 0 ? idxMon : (idxDen === 0 ? 1 : 0)
            break
          }
        }

        if (headerIdx === -1) headerIdx = 0
        if (colDenominacion === -1) colDenominacion = 0
        if (colMonto === -1) colMonto = 1

        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = rows[i]
          if (!row || row.length === 0) continue

          const denRaw = String(row[colDenominacion] ?? '').trim().toLowerCase()
          if (!denRaw || denRaw.startsWith('total')) continue

          const monto = parseMonto(row[colMonto])
          if (monto === 0) continue

          let periodoTarget = periodoSeleccionado !== 'multi' ? periodoSeleccionado : '2026-07'
          if (colMes >= 0 && row[colMes] !== undefined && row[colMes] !== null) {
            const parsed = parseMesUniversal(row[colMes])
            if (parsed) periodoTarget = parsed
          }

          if (!ingresosPorPeriodo[periodoTarget]) {
            ingresosPorPeriodo[periodoTarget] = { operatoria_financiera: 0, rendimientos_financieros: 0 }
          }

          if (denRaw.includes('operatoria') || denRaw.includes('intereses ganados')) {
            ingresosPorPeriodo[periodoTarget].operatoria_financiera = (ingresosPorPeriodo[periodoTarget].operatoria_financiera || 0) + monto
          } else if (denRaw.includes('rendimiento') || denRaw.includes('inversion') || denRaw.includes('fci') || denRaw.includes('plazo fijo')) {
            ingresosPorPeriodo[periodoTarget].rendimientos_financieros = (ingresosPorPeriodo[periodoTarget].rendimientos_financieros || 0) + monto
          }
        }
      }

      const periodosDetectados = Object.keys(ingresosPorPeriodo).sort()

      if (periodosDetectados.length === 0) {
        setMensaje({ tipo: 'error', texto: 'No se encontraron datos numéricos de Ingresos Financieros en el archivo.' })
        setLoading(false)
        return
      }

      const errores: string[] = []
      let exitosos = 0

      for (const pk of periodosDetectados) {
        const datos = ingresosPorPeriodo[pk]
        const totalPk = (datos.operatoria_financiera || 0) + (datos.rendimientos_financieros || 0)
        if (totalPk === 0) continue

        const res = await distribuirIngresosFinancieros(pk, datos)
        if (res.success) exitosos++
        else errores.push(`${pk}: ${res.error}`)
      }

      setLoading(false)
      if (errores.length > 0) {
        setMensaje({
          tipo: 'error',
          texto: `Se procesaron ${exitosos} períodos con errores: ${errores.join(' | ')}`
        })
      } else {
        setMensaje({
          tipo: 'success',
          texto: `✅ ${periodosDetectados.length} períodos de Ingresos Financieros procesados y distribuidos correctamente: ${periodosDetectados.join(', ')}`
        })
        await loadSubcuentasExistentes()
      }
    } catch (error) {
      setLoading(false)
      setMensaje({
        tipo: 'error',
        texto: `Error al procesar el archivo: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  }

  // Descargar plantilla CSV
  const handleDownloadTemplate = () => {
    const template = `Mes,Rendimientos Financieros,Operatoria Financiera
01/01/2026,65093738.70,0
01/02/2026,50937426.65,7092746.80
01/03/2026,73475484.40,9206111.40
01/04/2026,46089943.33,10227010.00
01/05/2026,46264731.19,9054559.20
01/06/2026,58811239.15,7643106.00
01/07/2026,76666746.76,13550399.00`
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `plantilla_ingresos_financieros.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Cargas — Ingresos Financieros"
        subtitle="Carga y distribución de subcuentas de Ingresos Financieros (Operatoria Financiera y Rendimientos Financieros) con prorrateo automático por sucursal según ventas."
        actions={
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Descargar Plantilla CSV
          </Button>
        }
      />

      {/* Banner de mensajes */}
      {mensaje && (
        <div className={`p-4 rounded-lg flex items-center gap-3 border ${
          mensaje.tipo === 'success' 
            ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400' 
            : mensaje.tipo === 'error'
              ? 'bg-destructive/10 text-destructive border-destructive/30'
              : 'bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400'
        }`}>
          {mensaje.tipo === 'success' && <CheckCircle2 className="h-5 w-5 flex-shrink-0" />}
          {mensaje.tipo === 'error' && <AlertCircle className="h-5 w-5 flex-shrink-0" />}
          {mensaje.tipo === 'info' && <Info className="h-5 w-5 flex-shrink-0" />}
          <span className="text-sm font-medium">{mensaje.texto}</span>
        </div>
      )}

      {/* Selector de Período y Métodos de Carga */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna 1: Carga desde Archivo (Multi-mes) */}
        <Card className="lg:col-span-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Carga Masiva desde Archivo (Excel / CSV) — Multi-Período
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Sube tu archivo de Ingresos Financieros. Soporta múltiples meses por filas (ej. <code className="bg-muted px-1 rounded">Mes | Rendimientos Financieros | Operatoria Financiera</code>) o matrices horizontales.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
                id="ingresos-file-input"
              />
              <Button
                type="button"
                variant="default"
                className="w-full sm:w-auto"
                disabled={loading}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {loading ? 'Procesando e insertando...' : 'Seleccionar Archivo Excel / CSV'}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Plantilla CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Columna 2: Carga Manual de Un Período */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Carga Manual por Período
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Período a Cargar
              </label>
              <Select value={periodoSeleccionado} onValueChange={setPeriodoSeleccionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar Período" />
                </SelectTrigger>
                <SelectContent>
                  {[...periodosDisponibles].reverse().map(p => (
                    <SelectItem key={p.key} value={p.key}>
                      {periodoLabel(p.anio, p.mes)} ({p.key})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Operatoria Financiera ($)
                </label>
                <input
                  type="number"
                  step="any"
                  value={ingresosForm.operatoria_financiera}
                  onChange={e => setIngresosForm(prev => ({ ...prev, operatoria_financiera: e.target.value }))}
                  className="w-full px-3 py-1.5 text-sm border rounded bg-background"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Rendimientos Financieros ($)
                </label>
                <input
                  type="number"
                  step="any"
                  value={ingresosForm.rendimientos_financieros}
                  onChange={e => setIngresosForm(prev => ({ ...prev, rendimientos_financieros: e.target.value }))}
                  className="w-full px-3 py-1.5 text-sm border rounded bg-background"
                />
              </div>

              <div className="pt-2 border-t flex items-center justify-between font-bold text-sm">
                <span>Total Ingresos:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(totalIngresos)}</span>
              </div>

              <Button
                onClick={handleGuardarManual}
                disabled={loading || totalIngresos === 0}
                className="w-full mt-2"
                size="sm"
              >
                {loading ? 'Guardando...' : 'Distribuir por Sucursal'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla del Histórico en Base de Datos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Table className="h-5 w-5 text-primary" />
              Histórico de Ingresos Financieros Cargados
            </CardTitle>
            <Badge variant="secondary" className="text-xs font-semibold">
              {subcuentasExistentes.length} Períodos en BD
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {subcuentasExistentes.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No hay subcuentas de Ingresos Financieros cargadas aún en la base de datos.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs font-bold text-muted-foreground uppercase">
                    <th className="px-4 py-3 text-left">Período</th>
                    <th className="px-4 py-3 text-right">Rendimientos Financieros</th>
                    <th className="px-4 py-3 text-right">Operatoria Financiera</th>
                    <th className="px-4 py-3 text-right font-black text-foreground">TOTAL INGRESOS FINANCIEROS</th>
                  </tr>
                </thead>
                <tbody>
                  {subcuentasExistentes.map(({ periodoKey, data }) => (
                    <tr key={periodoKey} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">{periodoKey}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono text-muted-foreground">
                        {formatCurrency(data.rendimientos_financieros)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono text-muted-foreground">
                        {formatCurrency(data.operatoria_financiera)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                        {formatCurrency(data.total_ingresos_financieros)}
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

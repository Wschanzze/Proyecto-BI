// components/monarca/views/estacionalidad-admin.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Calendar, 
  Users, 
  Package, 
  Banknote, 
  ArrowRight,
  RefreshCw,
  Sparkles,
  Info
} from "lucide-react"
import * as XLSX from "xlsx"
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

const MESES_MAP: Record<string, number> = {
  'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6,
  'JUL': 7, 'AGO': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12,
  'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4, 'MAYO': 5, 'JUNIO': 6,
  'JULIO': 7, 'AGOSTO': 8, 'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12
}

function parseExcelDate(val: any): Date | null {
  if (!val) return null
  if (val instanceof Date) return val
  if (typeof val === 'number') {
    return new Date((val - (25567 + 2)) * 86400 * 1000)
  }
  const str = String(val).trim()
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

export function EstacionalidadAdmin() {
  // Estado Inflación
  const [fileInf, setFileInf] = useState<File | null>(null)
  const [parsedInf, setParsedInf] = useState<any[] | null>(null)
  const [loadingInf, setLoadingInf] = useState(false)
  const [msgInf, setMsgInf] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Estado Ventas
  const [fileVentas, setFileVentas] = useState<File | null>(null)
  const [parsedVentas, setParsedVentas] = useState<any[] | null>(null)
  const [loadingVentas, setLoadingVentas] = useState(false)
  const [msgVentas, setMsgVentas] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 1. Procesar Archivo de Inflación
  const handleInfFileChange = (file: File) => {
    setFileInf(file)
    setMsgInf(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows: any[] = XLSX.utils.sheet_to_json(firstSheet)

        const procesados: any[] = []
        rows.forEach(r => {
          const anio = parseInt(r['Año'] || r['Anio'] || r['anio'])
          const mesStr = String(r['Mes'] || r['mes'] || '').trim().toUpperCase()
          const mesNum = MESES_MAP[mesStr] || parseInt(mesStr)
          const infM = parseFloat(r['Inflacion_Mensual'] || r['inflacion_mensual'] || r['Inflacion Mensual'] || 0) || 0
          const infA = parseFloat(r['Inflacion_Anual'] || r['inflacion_anual'] || r['Inflacion Anual'] || 0) || 0

          if (anio && mesNum >= 1 && mesNum <= 12) {
            procesados.push({
              anio,
              mes: mesNum,
              inflacionMensual: infM,
              inflacionAnual: infA
            })
          }
        })

        setParsedInf(procesados)
      } catch (err) {
        console.error("Error al leer Excel de Inflación", err)
        setMsgInf({ type: 'error', text: 'Error al interpretar las columnas del Excel de Inflación.' })
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const uploadInflacion = async () => {
    if (!parsedInf || parsedInf.length === 0) return
    setLoadingInf(true)
    setMsgInf(null)
    try {
      const res = await fetch('/api/admin/estacionalidad/upload-inflacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registros: parsedInf })
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setMsgInf({ type: 'success', text: json.message || `¡Se actualizaron ${parsedInf.length} meses de inflación exitosamente!` })
        setFileInf(null)
        setParsedInf(null)
      } else {
        throw new Error(json.error || 'Error al guardar')
      }
    } catch (err: any) {
      setMsgInf({ type: 'error', text: err.message || 'Error al procesar la carga de inflación' })
    } finally {
      setLoadingInf(false)
    }
  }

  // 2. Procesar Archivo de Ventas Diarias
  const handleVentasFileChange = (file: File) => {
    setFileVentas(file)
    setMsgVentas(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows: any[] = XLSX.utils.sheet_to_json(firstSheet)

        const procesados: any[] = []
        rows.forEach(r => {
          const fObj = parseExcelDate(r['Fecha'] || r['fecha'])
          if (!fObj) return

          const fechaStr = fObj.toISOString().split('T')[0]
          const c = parseInt(r['Cantidad'] || r['clientes'] || r['Clientes'] || 0) || 0
          const p = parseInt(r['Productos'] || r['productos'] || 0) || 0
          const fact = parseFloat(r['Facturacion'] || r['facturacion'] || 0) || 0

          procesados.push({
            fecha: fechaStr,
            clientes: c,
            productos: p,
            facturacion: fact
          })
        })

        setParsedVentas(procesados)
      } catch (err) {
        console.error("Error al leer Excel de Ventas", err)
        setMsgVentas({ type: 'error', text: 'Error al interpretar las columnas del Excel de Ventas.' })
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const uploadVentas = async () => {
    if (!parsedVentas || parsedVentas.length === 0) return
    setLoadingVentas(true)
    setMsgVentas(null)
    try {
      const res = await fetch('/api/admin/estacionalidad/upload-ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registros: parsedVentas })
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setMsgVentas({ type: 'success', text: json.message || `¡Se cargaron ${parsedVentas.length} ventas diarias exitosamente!` })
        setFileVentas(null)
        setParsedVentas(null)
      } else {
        throw new Error(json.error || 'Error al guardar')
      }
    } catch (err: any) {
      setMsgVentas({ type: 'error', text: err.message || 'Error al procesar la carga de ventas diarias' })
    } finally {
      setLoadingVentas(false)
    }
  }

  // Resumenes de vista previa
  const totalFacturacionPreview = parsedVentas ? parsedVentas.reduce((acc, r) => acc + r.facturacion, 0) : 0
  const totalClientesPreview = parsedVentas ? parsedVentas.reduce((acc, r) => acc + r.clientes, 0) : 0
  const totalProductosPreview = parsedVentas ? parsedVentas.reduce((acc, r) => acc + r.productos, 0) : 0

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      {/* Header Sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-accent" />
            Carga de Estacionalidad Comercial e Inflación
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Actualizá el histórico mensual de inflación y el registro diario de tickets y facturación para alimentar el modelo estacional.
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-accent/40 bg-accent/10 text-accent font-semibold px-3 py-1">
          Histórico & Estacionalidad
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* DROPZONE 1: INFLACIÓN MENSUAL */}
        <Card className="border-2 border-border/80 shadow-md">
          <CardHeader className="bg-muted/30 border-b border-border">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              1. Cargar Inflación Mensual (IPC)
            </CardTitle>
            <CardDescription className="text-xs">
              Soporta columnas: <code className="font-mono text-primary">Año</code>, <code className="font-mono text-primary">Mes</code>, <code className="font-mono text-primary">Inflacion_Mensual</code>, <code className="font-mono text-primary">Inflacion_Anual</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Input Dropzone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-3",
                fileInf ? "border-amber-500 bg-amber-500/5" : "border-border hover:border-primary/50 hover:bg-muted/20"
              )}
              onClick={() => document.getElementById('file-input-inf')?.click()}
            >
              <input
                id="file-input-inf"
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleInfFileChange(e.target.files[0])}
              />
              <FileSpreadsheet className={cn("h-10 w-10", fileInf ? "text-amber-500" : "text-muted-foreground")} />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {fileInf ? fileInf.name : "Arrastrá el archivo de Inflación aquí o hacé click"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Formato Excel (.xlsx, .csv)</p>
              </div>
            </div>

            {/* Preview de datos cargados */}
            {parsedInf && parsedInf.length > 0 && (
              <div className="rounded-lg bg-card border border-border p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {parsedInf.length} meses detectados
                  </span>
                  <span className="text-muted-foreground">
                    Años: {Math.min(...parsedInf.map(r => r.anio))} - {Math.max(...parsedInf.map(r => r.anio))}
                  </span>
                </div>
                <Button 
                  onClick={uploadInflacion} 
                  disabled={loadingInf}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold h-10 gap-2"
                >
                  {loadingInf ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Guardar Inflación Mensual
                </Button>
              </div>
            )}

            {/* Mensajes de respuesta */}
            {msgInf && (
              <div className={cn(
                "p-3 rounded-lg border flex items-start gap-2.5 text-xs font-medium",
                msgInf.type === 'success'
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
              )}>
                {msgInf.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                <div>
                  <div className="font-bold">{msgInf.type === 'success' ? 'Carga exitosa' : 'Error en carga'}</div>
                  <div>{msgInf.text}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* DROPZONE 2: VENTAS DIARIAS */}
        <Card className="border-2 border-border/80 shadow-md">
          <CardHeader className="bg-muted/30 border-b border-border">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Banknote className="h-5 w-5 text-blue-500" />
              2. Cargar Ventas Diarias (Tickets & Facturación)
            </CardTitle>
            <CardDescription className="text-xs">
              Soporta columnas: <code className="font-mono text-primary">Fecha</code>, <code className="font-mono text-primary">Cantidad (Clientes)</code>, <code className="font-mono text-primary">Productos</code>, <code className="font-mono text-primary">Facturacion</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Input Dropzone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-3",
                fileVentas ? "border-blue-500 bg-blue-500/5" : "border-border hover:border-primary/50 hover:bg-muted/20"
              )}
              onClick={() => document.getElementById('file-input-ventas')?.click()}
            >
              <input
                id="file-input-ventas"
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleVentasFileChange(e.target.files[0])}
              />
              <FileSpreadsheet className={cn("h-10 w-10", fileVentas ? "text-blue-500" : "text-muted-foreground")} />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {fileVentas ? fileVentas.name : "Arrastrá el archivo de Ventas Diarias aquí o hacé click"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Formato Excel (.xlsx, .csv)</p>
              </div>
            </div>

            {/* Preview de datos cargados */}
            {parsedVentas && parsedVentas.length > 0 && (
              <div className="rounded-lg bg-card border border-border p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center border-b border-border/50 pb-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Registros</div>
                    <div className="font-bold text-sm text-foreground">{formatNumber(parsedVentas.length)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Clientes</div>
                    <div className="font-bold text-sm text-foreground">{formatNumber(totalClientesPreview)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Facturación</div>
                    <div className="font-bold text-sm text-foreground">{formatCurrency(totalFacturacionPreview)}</div>
                  </div>
                </div>

                <Button 
                  onClick={uploadVentas} 
                  disabled={loadingVentas}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-10 gap-2"
                >
                  {loadingVentas ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Guardar Ventas Diarias
                </Button>
              </div>
            )}

            {/* Mensajes de respuesta */}
            {msgVentas && (
              <div className={cn(
                "p-3 rounded-lg border flex items-start gap-2.5 text-xs font-medium",
                msgVentas.type === 'success'
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
              )}>
                {msgVentas.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                <div>
                  <div className="font-bold">{msgVentas.type === 'success' ? 'Carga exitosa' : 'Error en carga'}</div>
                  <div>{msgVentas.text}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

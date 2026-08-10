// components/monarca/views/cargar-datos.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  RefreshCw, 
  History, 
  Trash2, 
  FileText, 
  Calendar, 
  Database,
  ArrowRight,
  HardDrive
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/monarca/shared"

type Estado = "idle" | "loading" | "error" | "guardado"

interface PeriodoHistorial {
  id: number
  key: string
  label: string
  anio: number
  mes: number
  fecha_carga: string
  archivo_nombre: string
  total_registros: number
}

export function CargarDatos() {
  const [activeTab, setActiveTab] = useState<"cargar" | "historial">("cargar")
  
  // Estado de Carga
  const [estado, setEstado] = useState<Estado>("idle")
  const [archivo, setArchivo] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [infoCarga, setInfoCarga] = useState<{ period: string; records: number; warnings: string | null; detallesIgnorados?: string[] } | null>(null)
  const [modoIncremental, setModoIncremental] = useState(false) // Nuevo estado
  const inputRef = useRef<HTMLInputElement>(null)

  // Estado de Historial
  const [historial, setHistorial] = useState<PeriodoHistorial[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<PeriodoHistorial | null>(null)

  const cargarHistorial = async () => {
    setLoadingHistorial(true)
    try {
      const res = await fetch("/api/periodos")
      const data = await res.json()
      if (data.ok) {
        setHistorial(data.periodos)
      }
    } catch (err) {
      console.error("Error al cargar historial de períodos:", err)
    } finally {
      setLoadingHistorial(false)
    }
  }

  useEffect(() => {
    cargarHistorial()
  }, [])

  const onFiles = (files: FileList | null) => {
    if (!files || !files.length) return
    const file = files[0]
    setArchivo(file)
    subirArchivo(file)
  }

  const subirArchivo = async (file: File) => {
    setEstado("loading")
    setErrorMsg("")
    
    const formData = new FormData()
    formData.append("file", file)
    if (modoIncremental) {
      formData.append("incremental", "true")
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Ocurrió un error al procesar el archivo")
      }

      setInfoCarga({
        period: data.period,
        records: data.records,
        warnings: data.warning,
        detallesIgnorados: data.detallesIgnorados || [],
      })
      setEstado("guardado")
      cargarHistorial() // Actualizar el historial automáticamente
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "Error al conectar con el servidor.")
      setEstado("error")
    }
  }

  const reset = () => {
    setArchivo(null)
    setEstado("idle")
    setErrorMsg("")
    setInfoCarga(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const confirmarEliminar = async (periodo: PeriodoHistorial) => {
    setDeletingKey(periodo.key)
    try {
      const res = await fetch(`/api/periodos?key=${periodo.key}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar el período")
      }
      setDeleteConfirmKey(null)
      cargarHistorial()
    } catch (err: any) {
      alert(`No se pudo eliminar el período: ${err.message}`)
    } finally {
      setDeletingKey(null)
    }
  }

  const formatFecha = (isoStr: string) => {
    if (!isoStr) return "Fecha no registrada"
    try {
      const d = new Date(isoStr)
      return `${d.toLocaleDateString("es-AR")} ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs`
    } catch {
      return isoStr
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Cargas & Datos"
        subtitle="Subí nuevos archivos mensuales de resultados o administrá el historial de datos registrados en Supabase."
      />

      {/* Tabs de Navegación Principal */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("cargar")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === "cargar"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <UploadCloud className="h-4 w-4" />
          Cargar Nuevo Archivo
        </button>

        <button
          onClick={() => {
            setActiveTab("historial")
            cargarHistorial()
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === "historial"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="h-4 w-4" />
          Historial y Eliminación de Cargas
          {historial.length > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0.2 text-xs">
              {historial.length}
            </Badge>
          )}
        </button>
      </div>

      {/* CONTENIDO TAB 1: CARGAR ARCHIVO */}
      {activeTab === "cargar" && (
        <>
          {estado === "guardado" && infoCarga ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
                  <CheckCircle2 className="h-8 w-8" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">¡Carga procesada con éxito!</h3>
                  <p className="mt-2 text-sm font-medium text-primary">
                    Período registrado: <span className="uppercase">{infoCarga.period}</span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Se importaron {infoCarga.records} registros de resultados agrupados por sucursal × grupo.
                  </p>
                  {infoCarga.warnings && (
                    <div className="mt-4 flex flex-col items-start gap-2 rounded bg-warning/10 p-3 text-left text-xs text-warning border border-warning/20 max-w-lg">
                      <div className="flex items-center gap-2 font-semibold">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{infoCarga.warnings}</span>
                      </div>
                      {infoCarga.detallesIgnorados && infoCarga.detallesIgnorados.length > 0 && (
                        <div className="mt-1 w-full text-[11px] text-muted-foreground">
                          <p className="mb-1 font-medium text-foreground">Muestra de subgrupos no vinculados:</p>
                          <ul className="list-disc pl-4 space-y-0.5 max-h-32 overflow-y-auto font-mono">
                            {infoCarga.detallesIgnorados.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-2">
                  <Button onClick={reset} variant="outline" className="bg-card">
                    Cargar otro período
                  </Button>
                  <Button 
                    onClick={() => {
                      setActiveTab("historial")
                      cargarHistorial()
                    }} 
                    className="gap-2"
                  >
                    Ver en Historial
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : estado === "error" ? (
            <Card className="border-destructive">
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <X className="h-8 w-8" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Error al cargar el archivo</h3>
                  <p className="mt-2 max-w-md text-sm text-destructive-foreground font-medium">
                    {errorMsg}
                  </p>
                  <p className="mt-2 max-w-md text-xs text-muted-foreground">
                    Verificá que el archivo contenga las columnas "subgrupo" (o "Grupo"), "Sucursal", "Mes", "Facturación" y "Costo".
                  </p>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button onClick={reset} variant="outline" className="bg-card">
                    Intentar de nuevo
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                {estado === "loading" ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                      <div>
                        <p className="font-semibold">Procesando archivo Excel...</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Leyendo subgrupos, vinculando contra el catálogo e insertando datos en Supabase.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => inputRef.current?.click()}
                    onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOver(true)
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOver(false)
                      onFiles(e.dataTransfer.files)
                    }}
                    className={`flex min-h-[260px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                      dragOver ? "border-accent bg-accent/5" : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UploadCloud className="h-7 w-7" />
                    </span>
                    <div>
                      <p className="font-medium text-foreground">Arrastrá el archivo aquí o hacé clic para seleccionar</p>
                      <p className="mt-1 text-sm text-muted-foreground">Formatos aceptados: .xlsx, .xls, .csv</p>
                    </div>
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => onFiles(e.target.files)}
                    />
                  </div>
                )}
              </div>

              {/* Panel lateral informativo */}
              <div className="space-y-6">
                {/* Modo de carga */}
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-base font-bold text-primary">Modo de Carga</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={modoIncremental}
                        onChange={(e) => setModoIncremental(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      />
                      <div>
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          Modo Incremental
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Activá esta opción si querés cargar solo algunos grupos (ej: solo FRESCOS) sin reemplazar los datos existentes de otros grupos (ej: SALON).
                        </p>
                      </div>
                    </label>
                    
                    <div className={`rounded-lg p-3 text-xs border transition-colors ${
                      modoIncremental 
                        ? "bg-success/5 border-success/20 text-success-foreground" 
                        : "bg-warning/5 border-warning/20 text-warning-foreground"
                    }`}>
                      <p className="font-semibold mb-1">
                        {modoIncremental ? "✓ Modo Incremental Activo" : "⚠ Modo Reemplazo (por defecto)"}
                      </p>
                      <p>
                        {modoIncremental 
                          ? "Los grupos del archivo se agregarán o actualizarán sin borrar datos de otros grupos."
                          : "Los grupos del archivo reemplazarán completamente los datos existentes de esos grupos para el período."
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-bold text-primary">Estructura esperada del Excel</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      El importador procesa automáticamente las siguientes columnas de tu planilla:
                    </p>
                    <ul className="list-disc pl-4 space-y-1.5 text-xs">
                      <li><strong className="text-foreground">Sucursal</strong>: Colón, San Martín, Falucho, Perón, Virtual</li>
                      <li><strong className="text-foreground">subgrupo</strong>: ACEITES, ACETOS Y VINAGRES, ADEREZOS, etc.</li>
                      <li><strong className="text-foreground">Grupo</strong>: ALMACEN, BEBES Y NIÑOS, etc.</li>
                      <li><strong className="text-foreground">Mes</strong>: "01/06/2026", "01/01/2025" o "jun-26"</li>
                      <li><strong className="text-foreground">Facturación</strong>, <strong className="text-foreground">IVA</strong> y <strong className="text-foreground">Costo</strong></li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      {/* CONTENIDO TAB 2: HISTORIAL Y ELIMINACIÓN */}
      {activeTab === "historial" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg font-bold">Historial de Períodos en Base de Datos</CardTitle>
              <CardDescription>
                Listado de todos los meses de datos financieros almacenados en Supabase. Podés eliminar cualquier mes si necesitás volver a cargarlo.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={cargarHistorial} disabled={loadingHistorial} className="gap-2">
              <RefreshCw className={`h-3.5 w-3.5 ${loadingHistorial ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </CardHeader>
          <CardContent>
            {loadingHistorial ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin mb-2 text-primary" />
                <p className="text-sm">Cargando períodos desde Supabase...</p>
              </div>
            ) : historial.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-lg">
                <HardDrive className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <h4 className="font-semibold text-foreground">Sin períodos cargados</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Aún no hay archivos importados en la base de datos. Utilizá la pestaña "Cargar Nuevo Archivo" para subir tu primer mes.
                </p>
                <Button 
                  onClick={() => setActiveTab("cargar")} 
                  size="sm" 
                  className="mt-4 gap-2"
                >
                  <UploadCloud className="h-4 w-4" />
                  Ir a Cargar Archivo
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border border rounded-lg overflow-hidden">
                {historial.map((periodo) => (
                  <div key={periodo.key} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card hover:bg-muted/30 transition-colors gap-4">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground uppercase tracking-wide">
                            {periodo.label}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {periodo.key}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            {periodo.archivo_nombre}
                          </span>
                          <span className="flex items-center gap-1">
                            <Database className="h-3.5 w-3.5 text-primary" />
                            <strong className="text-foreground">{periodo.total_registros}</strong> registros
                          </span>
                          <span>
                            Cargado: {formatFecha(periodo.fecha_carga)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmKey(periodo)}
                      disabled={deletingKey === periodo.key}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 self-end sm:self-center gap-1.5"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar Carga
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {deleteConfirmKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md shadow-2xl border-destructive/30 animate-in fade-in zoom-in-95">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-destructive font-semibold">
                <AlertTriangle className="h-5 w-5" />
                Eliminar Período {deleteConfirmKey.label.toUpperCase()}
              </div>
              <CardDescription className="pt-1 text-xs">
                Esta acción es irreversible y borrará la totalidad de las filas de este mes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded bg-muted p-3 text-xs space-y-1">
                <p><strong className="text-foreground">Período:</strong> {deleteConfirmKey.label.toUpperCase()} ({deleteConfirmKey.key})</p>
                <p><strong className="text-foreground">Archivo original:</strong> {deleteConfirmKey.archivo_nombre}</p>
                <p><strong className="text-foreground">Registros a eliminar:</strong> {deleteConfirmKey.total_registros} filas</p>
              </div>
              <p className="text-xs text-muted-foreground">
                ¿Estás seguro de que querés borrar este período de la base de datos de Supabase?
              </p>
            </CardContent>
            <div className="flex items-center justify-end gap-2 p-4 border-t bg-muted/20 rounded-b-lg">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmKey(null)}
                disabled={deletingKey === deleteConfirmKey.key}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => confirmarEliminar(deleteConfirmKey)}
                disabled={deletingKey === deleteConfirmKey.key}
                className="gap-2"
              >
                {deletingKey === deleteConfirmKey.key ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Sí, Eliminar
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

// components/monarca/views/cargar-datos.tsx
"use client"

import { useRef, useState } from "react"
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, X, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/monarca/shared"

type Estado = "idle" | "loading" | "error" | "guardado"

export function CargarDatos() {
  const [estado, setEstado] = useState<Estado>("idle")
  const [archivo, setArchivo] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [infoCarga, setInfoCarga] = useState<{ period: string; records: number; warnings: string | null } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
      })
      setEstado("guardado")
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

  return (
    <div>
      <PageHeader
        title="Cargar Datos"
        subtitle="Subí el archivo Excel (.xlsx, .xls) con el cuadro de resultados mensual. El sistema detectará el mes, mapeará los sectores y registrará las métricas reales en Supabase."
      />

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
                <div className="mt-4 flex items-start gap-2 rounded bg-warning/10 p-3 text-left text-xs text-warning border border-warning/20">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{infoCarga.warnings}</span>
                </div>
              )}
            </div>
            <Button onClick={reset} variant="outline" className="bg-card mt-2">
              Cargar otro período
            </Button>
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
                Verificá que el archivo tenga la columna "Mes" (ej: "01/06/2026", "01/01/2025" o "jun-26") y columnas válidas para "Sucursal", "SECTOR", "GRUPO", "Facturación" y "Costo".
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
                      Leyendo hojas, cruzando grupos con catálogo de base de datos y guardando resultados.
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
                  <p className="mt-1 text-sm text-muted-foreground">Formatos aceptados: .xlsx, .xls</p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => onFiles(e.target.files)}
                />
              </div>
            )}
          </div>

          {/* Panel lateral informativo */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold text-primary">Estructura del archivo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  El cargador procesa hojas de cálculo en formato estándar con las siguientes columnas obligatorias:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong className="text-foreground">Sucursal</strong>: Colón, San Martín, Falucho, Perón, Virtual</li>
                  <li><strong className="text-foreground">Mes</strong>: mes y año correspondiente (ej: <code className="text-foreground">ene-25</code>, <code className="text-foreground">jun-26</code>)</li>
                  <li><strong className="text-foreground">SECTOR</strong>: Almacén, Limpieza, Carnicería, Verdulería, etc.</li>
                  <li><strong className="text-foreground">GRUPO</strong>: Aceites, Conservas, Pañales, Vacuno, etc.</li>
                  <li><strong className="text-foreground">Facturación</strong> y <strong className="text-foreground">Costo</strong>: valores numéricos o monetarios</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

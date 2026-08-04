"use client"

import { useRef, useState } from "react"
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/monarca/shared"
import { getCuadro, PERIODOS_SELECCIONABLES, PERIODO_ACTUAL } from "@/lib/data"
import { formatCurrency, periodoLabel } from "@/lib/format"

const CAMPOS_DESTINO = [
  "Facturación s/IVA",
  "Participación Facturación",
  "Variación mes anterior",
  "Artículos",
  "Variación año anterior",
  "CMg",
  "Resultado Operativo",
  "Participación Rdo. Operativo",
  "RRHH/Ventas",
  "Rdo. Op/Ventas",
  "Acciones s/Ventas",
  "Rdo. Final/Ventas",
  "Resultado Final",
]

type Estado = "idle" | "preview" | "guardado"

export function CargarDatos() {
  const [estado, setEstado] = useState<Estado>("idle")
  const [archivo, setArchivo] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const previewCuadro = getCuadro(PERIODO_ACTUAL.key)
  const previewCats = previewCuadro.secciones.flatMap((s) => s.categorias).slice(0, 6)

  const onFiles = (files: FileList | null) => {
    if (!files || !files.length) return
    setArchivo(files[0])
    setEstado("preview")
  }

  const reset = () => {
    setArchivo(null)
    setEstado("idle")
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div>
      <PageHeader
        title="Cargar Datos"
        subtitle="Subí el archivo Excel/CSV del cuadro de resultados mensual. Se validará la estructura y podrás previsualizar los datos antes de guardarlos."
      />

      {estado === "guardado" ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-8 w-8" />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Carga confirmada</h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Los datos se procesaron correctamente. Al conectar Supabase, el archivo original se guardará en Storage
                y los datos normalizados en Postgres para trazabilidad.
              </p>
            </div>
            <Button onClick={reset} variant="outline" className="bg-card">
              Cargar otro período
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {estado === "idle" ? (
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
            ) : (
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    Vista previa
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={reset} className="gap-1 text-muted-foreground">
                    <X className="h-4 w-4" />
                    Descartar
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex items-center gap-3 rounded-md border border-border bg-muted/40 p-3">
                    <FileSpreadsheet className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{archivo?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {archivo ? (archivo.size / 1024).toFixed(1) : 0} KB
                      </p>
                    </div>
                    <Badge className="gap-1 bg-success/10 text-success hover:bg-success/10">
                      <CheckCircle2 className="h-3 w-3" />
                      Estructura válida
                    </Badge>
                  </div>

                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                          <th className="px-3 py-2 text-left font-semibold">Categoría</th>
                          <th className="px-3 py-2 text-right font-semibold">Facturación</th>
                          <th className="px-3 py-2 text-right font-semibold">Rdo. Operativo</th>
                          <th className="px-3 py-2 text-right font-semibold">Rdo. Final</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewCats.map((c) => (
                          <tr key={c.id} className="border-b border-border/50">
                            <td className="px-3 py-2 font-medium">{c.nombre}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(c.metrics.facturacion)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {formatCurrency(c.metrics.resultadoOperativo)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {formatCurrency(c.metrics.resultadoFinal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 text-accent" />
                    Mostrando 6 de {previewCuadro.secciones.flatMap((s) => s.categorias).length} categorías detectadas.
                  </p>

                  <div className="mt-5 flex justify-end gap-2">
                    <Button variant="outline" onClick={reset} className="bg-card">
                      Cancelar
                    </Button>
                    <Button onClick={() => setEstado("guardado")}>Confirmar y guardar</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Panel lateral: mapeo de columnas + cargas recientes */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mapeo de columnas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="mb-2 text-xs text-muted-foreground">
                  Ajustá el mapeo si el formato del archivo varía levemente.
                </p>
                {CAMPOS_DESTINO.map((campo) => (
                  <div key={campo} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-muted-foreground">{campo}</span>
                    <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      Col. auto
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cargas recientes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[...PERIODOS_SELECCIONABLES]
                  .reverse()
                  .slice(0, 5)
                  .map((p) => (
                    <div key={p.key} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{periodoLabel(p.anio, p.mes)}</span>
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <FileSpreadsheet className="h-3 w-3" />
                        cuadro_{p.key}.xlsx
                      </Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { Database, Layers, ShieldCheck, Workflow } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/monarca/shared"

const TABLAS = [
  { nombre: "secciones", desc: "id, nombre — ej. Salón, Frescos" },
  { nombre: "categorias", desc: "id, seccion_id, nombre" },
  { nombre: "grupos", desc: "id, categoria_id, nombre" },
  { nombre: "subgrupos", desc: "id, grupo_id, nombre" },
  { nombre: "periodos", desc: "id, mes, año, fecha_carga, archivo_origen_url" },
  {
    nombre: "resultados_categoria",
    desc: "periodo_id, categoria_id, facturacion_s_iva, participacion, variaciones, cmg, resultado_operativo, resultado_final…",
  },
  { nombre: "resultados_grupo / resultados_subgrupo", desc: "misma estructura, para el detalle interno" },
  { nombre: "totales_seccion", desc: "periodo_id, seccion_id, ganancia_total" },
]

export function Documentacion() {
  return (
    <div>
      <PageHeader
        title="Documentación"
        subtitle="Estructura de datos, jerarquía del cuadro y hoja de ruta hacia la integración con Supabase."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-5 w-5 text-accent" />
              Jerarquía del cuadro
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="mb-3">La estructura es jerárquica y flexible a nuevas secciones a futuro:</p>
            <div className="flex flex-wrap items-center gap-2 font-medium text-foreground">
              <span className="rounded bg-primary/10 px-2 py-1 text-primary">Sección</span>
              <span aria-hidden>→</span>
              <span className="rounded bg-primary/10 px-2 py-1 text-primary">Categoría</span>
              <span aria-hidden>→</span>
              <span className="rounded bg-primary/10 px-2 py-1 text-primary">Grupo</span>
              <span aria-hidden>→</span>
              <span className="rounded bg-primary/10 px-2 py-1 text-primary">Subgrupo</span>
            </div>
            <p className="mt-3">
              Al seleccionar una categoría se despliega su detalle de rentabilidad interno (grupos y subgrupos).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-accent" />
              Seguridad y permisos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="list-disc space-y-1.5 pl-4">
              <li>Row Level Security (RLS) habilitado desde el diseño inicial.</li>
              <li>Preparado para permisos diferenciados: carga vs. solo lectura.</li>
              <li>Archivos Excel originales en Supabase Storage para auditoría.</li>
              <li>Datos parseados y normalizados en Postgres.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-5 w-5 text-accent" />
              Modelo de datos propuesto (Supabase / Postgres)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TABLAS.map((t) => (
                <div key={t.nombre} className="rounded-md border border-border bg-muted/30 p-3">
                  <p className="font-mono text-sm font-semibold text-primary">{t.nombre}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-accent/40 bg-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Workflow className="h-5 w-5 text-accent" />
              Estado actual y próximos pasos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ol className="list-decimal space-y-1.5 pl-4">
              <li>
                <span className="font-medium text-foreground">Actual:</span> aplicación con datos de ejemplo
                determinísticos (18 meses de historia) para validar vistas y navegación.
              </li>
              <li>Conectar Supabase (Postgres + Auth + Storage) y crear las tablas del modelo.</li>
              <li>Implementar el parser de Excel/CSV real y persistir en Postgres + Storage.</li>
              <li>Activar RLS y roles de carga / solo lectura.</li>
              <li>Futuro: carga automática desde SQL Server (tabla dbo.SECOS), fuera del alcance inicial.</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// components/monarca/views/proyectado-view.tsx
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, TrendingUp, Calendar, Target } from "lucide-react"

export function ProyectadoView() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-16rem)]">
      <Card className="max-w-2xl w-full border-2 border-dashed border-muted">
        <CardContent className="p-12 flex flex-col items-center text-center space-y-6">
          {/* Iconos decorativos */}
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-full bg-primary/10">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <div className="p-4 rounded-full bg-accent/10">
              <Calendar className="h-8 w-8 text-accent" />
            </div>
            <div className="p-4 rounded-full bg-success/10">
              <Target className="h-8 w-8 text-success" />
            </div>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
              <Sparkles className="h-6 w-6 text-accent" />
              Proyectado
            </h2>
            <p className="text-5xl font-light text-muted-foreground/60">
              Próximamente
            </p>
          </div>

          {/* Descripción */}
          <div className="max-w-md space-y-3">
            <p className="text-muted-foreground">
              Estamos trabajando en una nueva funcionalidad que te permitirá proyectar 
              tu estado de resultados y compararlo con los datos reales a medida que 
              transcurren los meses.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
              <div className="flex items-start gap-2 text-left">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                <span className="text-sm text-muted-foreground">
                  Proyecciones mensuales y anuales
                </span>
              </div>
              <div className="flex items-start gap-2 text-left">
                <div className="h-2 w-2 rounded-full bg-accent mt-1.5" />
                <span className="text-sm text-muted-foreground">
                  Comparación con datos reales
                </span>
              </div>
              <div className="flex items-start gap-2 text-left">
                <div className="h-2 w-2 rounded-full bg-success mt-1.5" />
                <span className="text-sm text-muted-foreground">
                  Análisis de variaciones
                </span>
              </div>
              <div className="flex items-start gap-2 text-left">
                <div className="h-2 w-2 rounded-full bg-warning mt-1.5" />
                <span className="text-sm text-muted-foreground">
                  Alertas y notificaciones
                </span>
              </div>
            </div>
          </div>

          {/* Badge */}
          <div className="pt-4">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              En desarrollo
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

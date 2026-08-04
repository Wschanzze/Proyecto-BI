"use client"

import { useState } from "react"
import { TopBar } from "./top-bar"
import { NavTabs, type TabId } from "./nav-tabs"
import { DashboardView } from "./views/dashboard-view"
import { CuadroDetallado } from "./views/cuadro-detallado"
import { CuadroSimplificado } from "./views/cuadro-simplificado"
import { CargarDatos } from "./views/cargar-datos"
import { Documentacion } from "./views/documentacion"
import { PERIODO_ACTUAL } from "@/lib/data"

export function AppShell() {
  const [tab, setTab] = useState<TabId>("dashboard")
  const [periodoKey, setPeriodoKey] = useState(PERIODO_ACTUAL.key)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar />
      <NavTabs active={tab} onChange={setTab} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 md:px-6 md:py-8">
        {tab === "dashboard" && <DashboardView periodoKey={periodoKey} onPeriodoChange={setPeriodoKey} />}
        {tab === "detallado" && <CuadroDetallado periodoKey={periodoKey} onPeriodoChange={setPeriodoKey} />}
        {tab === "simplificado" && <CuadroSimplificado periodoKey={periodoKey} onPeriodoChange={setPeriodoKey} />}
        {tab === "cargar" && <CargarDatos />}
        {tab === "documentacion" && <Documentacion />}
      </main>
      <footer className="border-t border-border bg-card py-4">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-1 px-4 text-xs text-muted-foreground md:flex-row md:px-6">
          <span>Supermercados Monarca · Cuadro de Resultados</span>
          <span>Datos de ejemplo — pendiente de conexión a Supabase</span>
        </div>
      </footer>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { TopBar } from "./top-bar"
import { NavTabs, type TabId } from "./nav-tabs"
import { DashboardView } from "./views/dashboard-view"
import { CuadroDetallado } from "./views/cuadro-detallado"
import { CuadroSimplificado } from "./views/cuadro-simplificado"
import { CargarDatos } from "./views/cargar-datos"
import { PERIODO_ACTUAL, type Periodo } from "@/lib/data"
import type { DBSucursal } from "@/lib/supabase"

export function AppShell() {
  const [tab, setTab] = useState<TabId>("dashboard")
  const [periodoKey, setPeriodoKey] = useState(PERIODO_ACTUAL.key)
  const [sucursalId, setSucursalId] = useState("__consolidado__")

  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [sucursales, setSucursales] = useState<DBSucursal[]>([])

  useEffect(() => {
    async function init() {
      try {
        const { getPeriodosDB, getSucursalesDB } = await import("@/lib/data-db")
        const [p, s] = await Promise.all([getPeriodosDB(), getSucursalesDB()])
        setPeriodos(p)
        setSucursales(s)
        if (p.length > 0) {
          // Seleccionar el período más reciente cargado en DB por defecto
          setPeriodoKey(p[p.length - 1].key)
        }
      } catch (err) {
        console.error("Error al cargar períodos/sucursales:", err)
      }
    }
    init()
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar />
      <NavTabs active={tab} onChange={setTab} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 md:px-6 md:py-8">
        {tab === "dashboard" && (
          <DashboardView
            periodoKey={periodoKey}
            onPeriodoChange={setPeriodoKey}
            sucursalId={sucursalId}
            onSucursalChange={setSucursalId}
            periodos={periodos}
            sucursales={sucursales}
          />
        )}
        {tab === "detallado" && (
          <CuadroDetallado
            periodoKey={periodoKey}
            onPeriodoChange={setPeriodoKey}
            sucursalId={sucursalId}
            onSucursalChange={setSucursalId}
            periodos={periodos}
            sucursales={sucursales}
          />
        )}
        {tab === "simplificado" && (
          <CuadroSimplificado
            periodoKey={periodoKey}
            onPeriodoChange={setPeriodoKey}
            sucursalId={sucursalId}
            onSucursalChange={setSucursalId}
            periodos={periodos}
            sucursales={sucursales}
          />
        )}
        {tab === "cargar" && <CargarDatos />}

      </main>
      <footer className="border-t border-border bg-card py-4">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-1 px-4 text-xs text-muted-foreground md:flex-row md:px-6">
          <span>Supermercados Monarca · Cuadro de Resultados</span>
          <span className="flex items-center gap-1.5 font-medium text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Conectado a Supabase (Datos Reales)
          </span>
        </div>
      </footer>
    </div>
  )
}

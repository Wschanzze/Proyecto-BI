// components/monarca/app-shell.tsx
"use client"

import { useEffect, useState } from "react"
import { TopBar } from "./top-bar"
import { NavTabs, type TabId } from "./nav-tabs"
import { DashboardView } from "./views/dashboard-view"
import { CuadroDetallado } from "./views/cuadro-detallado"
import { CuadroSimplificado } from "./views/cuadro-simplificado"
import { ProyectadoView } from "./views/proyectado-view"
import { CargarDatos } from "./views/cargar-datos"
import { LoginView } from "./views/login-view"
import { PERIODO_ACTUAL, type Periodo } from "@/lib/data"
import type { DBSucursal } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"
import { TransitionLoader } from "./shared"

export function AppShell() {
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [tab, setTab] = useState<TabId>("dashboard")
  const [periodoKey, setPeriodoKey] = useState(PERIODO_ACTUAL.key)
  const [sucursalId, setSucursalId] = useState("__consolidado__")

  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [sucursales, setSucursales] = useState<DBSucursal[]>([])
  
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingTab, setLoadingTab] = useState(false)

  // 1. Escuchar sesión de Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 2. Cargar catálogo de períodos/sucursales
  useEffect(() => {
    if (!user) return
    async function init() {
      try {
        const { getPeriodosDB, getSucursalesDB } = await import("@/lib/data-db")
        const [p, s] = await Promise.all([getPeriodosDB(), getSucursalesDB()])
        setPeriodos(p)
        setSucursales(s)
        if (p.length > 0) {
          setPeriodoKey(p[p.length - 1].key)
        }
      } catch (err) {
        console.error("Error al cargar períodos/sucursales:", err)
      } finally {
        setTimeout(() => {
          setLoadingInitial(false)
        }, 500)
      }
    }
    init()
  }, [user])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const handleTabChange = (newTab: TabId) => {
    if (newTab === tab) return
    setLoadingTab(true)
    setTab(newTab)
    setTimeout(() => {
      setLoadingTab(false)
    }, 400)
  }

  // Si está verificando sesión de Auth
  if (authLoading) {
    return <TransitionLoader fullPage />
  }

  // Si no hay usuario autenticado, renderizar pantalla de Login
  if (!user) {
    return <LoginView onLoginSuccess={(email) => setUser({ email })} />
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar userEmail={user.email} onLogout={handleLogout} />
      <NavTabs active={tab} onChange={handleTabChange} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 md:px-6 md:py-8">
        {loadingInitial || loadingTab ? (
          <TransitionLoader fullPage={loadingInitial} />
        ) : (
          <>
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
            {tab === "proyectado" && <ProyectadoView />}
            {tab === "cargar" && <CargarDatos />}
          </>
        )}
      </main>
      <footer className="border-t border-border bg-card py-4">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-1 px-4 text-xs text-muted-foreground md:flex-row md:px-6">
          <span>Supermercados Monarca · Cuadro de Resultados</span>
          <span className="flex items-center gap-1.5 font-medium text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Conectado a Supabase (Sesión Protegida)
          </span>
        </div>
      </footer>
    </div>
  )
}

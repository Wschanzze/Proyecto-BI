// components/monarca/app-shell.tsx
"use client"

import { useEffect, useState } from "react"
import { TopBar } from "./top-bar"
import { NavTabs, type TabId } from "./nav-tabs"
import { DashboardView } from "./views/dashboard-view"
import { CuadroDetallado } from "./views/cuadro-detallado"
import { CuadroSimplificado } from "./views/cuadro-simplificado"
import { ProyectadoView } from "./views/proyectado-view"
import { EstacionalidadView } from "./views/estacionalidad-view"
import { ReportesView } from "./views/reportes/reportes-view"
import { CargarDatos } from "./views/cargar-datos"
import { LoginView } from "./views/login-view"
import { PERIODO_ACTUAL, type Periodo } from "@/lib/data"
import type { DBSucursal } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"
import { TransitionLoader } from "./shared"

export function AppShell() {
  const [user, setUser] = useState<any>({ email: "demo@monarca-bi.com" })
  const [authLoading, setAuthLoading] = useState(false)

  const [tab, setTab] = useState<TabId>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("monarca_tab") as TabId
      if (saved) return saved
    }
    return "dashboard"
  })
  
  const [periodoKey, setPeriodoKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("monarca_periodoKey")
      if (saved) return saved
    }
    return PERIODO_ACTUAL.key
  })

  const [sucursalId, setSucursalId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("monarca_sucursalId")
      if (saved) return saved
    }
    return "__consolidado__"
  })

  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [sucursales, setSucursales] = useState<DBSucursal[]>([])
  
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingTab, setLoadingTab] = useState(false)

  // Guardar filtros en sessionStorage cuando cambian
  const handlePeriodoChange = (newKey: string) => {
    setPeriodoKey(newKey)
    if (typeof window !== "undefined") {
      sessionStorage.setItem("monarca_periodoKey", newKey)
    }
  }

  const handleSucursalChange = (newSucursal: string) => {
    setSucursalId(newSucursal)
    if (typeof window !== "undefined") {
      sessionStorage.setItem("monarca_sucursalId", newSucursal)
    }
  }

  // 1. Escuchar sesión de Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }: any) => {
      const session = data?.session
      setUser(session?.user ?? { email: "demo@monarca-bi.com" })
      setAuthLoading(false)
    })

    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: any, session: any) => {
      const newUser = session?.user ?? { email: "demo@monarca-bi.com" }
      setUser((prevUser: any) => {
        // Si el usuario es el mismo (ej: token refresh al cambiar de pestaña), no actualizar referencia de estado
        if (prevUser?.id === newUser?.id && prevUser?.email === newUser?.email) {
          return prevUser
        }
        return newUser
      })
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 2. Cargar catálogo de períodos/sucursales (solo cuando cambia el ID del usuario)
  const userId = user?.id || user?.email || null

  useEffect(() => {
    if (!userId) return
    async function init() {
      try {
        const { getPeriodosDB, getSucursalesDB } = await import("@/lib/data-db")
        const [p, s] = await Promise.all([getPeriodosDB(), getSucursalesDB()])
        setPeriodos(p)
        setSucursales(s)
        
        setPeriodoKey((prev) => {
          if (prev && p.some(item => item.key === prev)) {
            return prev
          }
          const defaultKey = p.length > 0 ? p[p.length - 1].key : prev
          if (typeof window !== "undefined") {
            sessionStorage.setItem("monarca_periodoKey", defaultKey)
          }
          return defaultKey
        })
      } catch (err) {
        console.error("Error al cargar períodos/sucursales:", err)
      } finally {
        setTimeout(() => {
          setLoadingInitial(false)
        }, 300)
      }
    }
    init()
  }, [userId])

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("monarca_tab")
      sessionStorage.removeItem("monarca_periodoKey")
      sessionStorage.removeItem("monarca_sucursalId")
    }
    await supabase.auth.signOut()
    setUser(null)
  }

  const handleTabChange = (newTab: TabId) => {
    if (newTab === tab) return
    if (typeof window !== "undefined") {
      sessionStorage.setItem("monarca_tab", newTab)
    }
    setLoadingTab(true)
    setTab(newTab)
    setTimeout(() => {
      setLoadingTab(false)
    }, 300)
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
                onPeriodoChange={handlePeriodoChange}
                sucursalId={sucursalId}
                onSucursalChange={handleSucursalChange}
                periodos={periodos}
                sucursales={sucursales}
              />
            )}
            {tab === "detallado" && (
              <CuadroDetallado
                periodoKey={periodoKey}
                onPeriodoChange={handlePeriodoChange}
                sucursalId={sucursalId}
                onSucursalChange={handleSucursalChange}
                periodos={periodos}
                sucursales={sucursales}
              />
            )}
            {tab === "simplificado" && (
              <CuadroSimplificado
                periodoKey={periodoKey}
                onPeriodoChange={handlePeriodoChange}
                sucursalId={sucursalId}
                onSucursalChange={handleSucursalChange}
                periodos={periodos}
                sucursales={sucursales}
              />
            )}
            {tab === "proyectado" && (
              <ProyectadoView
                sucursalId={sucursalId}
                onSucursalChange={handleSucursalChange}
                sucursales={sucursales}
              />
            )}
            {tab === "estacionalidad" && <EstacionalidadView />}
            {tab === "reportes" && <ReportesView />}
            {tab === "cargar" && <CargarDatos />}
          </>
        )}
      </main>
      <footer className="border-t border-border bg-card py-4">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-1 px-4 text-xs text-muted-foreground md:flex-row md:px-6">
          <span>Supermercados Monarca · Cuadro de Resultados</span>
          <span className="flex items-center gap-1.5 font-medium text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Modo Demostración Activo · Datos Simulados
          </span>
        </div>
      </footer>
    </div>
  )
}

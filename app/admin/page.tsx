"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { 
  ArrowLeft, Lock, Eye, EyeOff, LogOut,
  Database, TrendingUp, ShieldCheck, 
  FileSpreadsheet, Users, Building2, Landmark, 
  CalendarDays, Sliders, Target, CheckCircle2, BookOpen,
  ChevronRight, Sparkles
} from "lucide-react"
import { CargarDatos } from "@/components/monarca/views/cargar-datos"
import { Documentacion } from "@/components/monarca/views/documentacion"
import { MetricasAdmin } from "@/components/monarca/views/metricas-admin"
import { ProyeccionesAdmin } from "@/components/monarca/views/proyecciones-admin"
import { GestionCargas } from "@/components/monarca/views/gestion-cargas"
import { CargaCostosFijos } from "@/components/monarca/views/carga-costos-fijos"
import { GestionIngresosFinancieros } from "@/components/monarca/views/gestion-ingresos-financieros"
import { EstacionalidadAdmin } from "@/components/monarca/views/estacionalidad-admin"
import { ChequeoAdmin } from "@/components/monarca/views/chequeo-admin"
import { TopBar } from "@/components/monarca/top-bar"
import { getPeriodosDB, getSucursalesDB } from "@/lib/data-db"
import type { Periodo } from "@/lib/data"
import type { DBSucursal } from "@/lib/supabase"
import { cn } from "@/lib/utils"

const ADMIN_PIN = "1234"
const PIN_LENGTH = 4

// ─── Persistencia de Sesión Admin ──────────────────────────────────────────
const ADMIN_SESSION_KEY = "monarca_admin_unlocked"
const ADMIN_EXPIRY_KEY = "monarca_admin_expiry"
const SESSION_DURATION_HOURS = 12
const SESSION_DURATION_MS = SESSION_DURATION_HOURS * 60 * 60 * 1000

function checkIsUnlocked(): boolean {
  if (typeof window === "undefined") return false
  try {
    const val = localStorage.getItem(ADMIN_SESSION_KEY)
    const expiry = localStorage.getItem(ADMIN_EXPIRY_KEY)
    if (val === "true" && expiry) {
      if (Date.now() < parseInt(expiry, 10)) {
        return true
      }
    }
  } catch (e) {
    console.error("Error al leer sesión de admin:", e)
  }
  return false
}

function saveUnlockSession() {
  try {
    localStorage.setItem(ADMIN_SESSION_KEY, "true")
    localStorage.setItem(ADMIN_EXPIRY_KEY, (Date.now() + SESSION_DURATION_MS).toString())
  } catch (e) {
    console.error("Error al guardar sesión de admin:", e)
  }
}

function clearUnlockSession() {
  try {
    localStorage.removeItem(ADMIN_SESSION_KEY)
    localStorage.removeItem(ADMIN_EXPIRY_KEY)
  } catch (e) {
    console.error("Error al limpiar sesión de admin:", e)
  }
}

type CategoryGroup = "cargas" | "modelado" | "control"

type AdminTab = 
  | "cargar" 
  | "gestion-cargas" 
  | "costos-fijos" 
  | "ingresos-financieros" 
  | "estacionalidad" 
  | "metricas" 
  | "proyecciones" 
  | "chequeo" 
  | "documentacion"

interface TabDef {
  id: AdminTab
  label: string
  shortLabel?: string
  icon: any
  badge?: string
  description?: string
}

interface GroupDef {
  id: CategoryGroup
  label: string
  icon: any
  description: string
  tabs: TabDef[]
}

const CATEGORY_GROUPS: GroupDef[] = [
  {
    id: "cargas",
    label: "Gestión de Cargas",
    icon: Database,
    description: "Importación masiva de resultados y cargas por módulo",
    tabs: [
      { id: "cargar", label: "Resultados Ventas", shortLabel: "Ventas CSV", icon: FileSpreadsheet, badge: "CSV", description: "Carga de ventas y CMV mensual" },
      { id: "gestion-cargas", label: "Gastos de Personal", shortLabel: "RRHH", icon: Users, badge: "Nómina", description: "Detalle de sueldos y cargas sociales" },
      { id: "costos-fijos", label: "Costos Fijos Estructurales", shortLabel: "Gastos Fijos", icon: Building2, badge: "Gastos", description: "Servicios y costos fijos por sucursal" },
      { id: "ingresos-financieros", label: "Ingresos Financieros", shortLabel: "Ingresos Fin.", icon: Landmark, badge: "Finanzas", description: "Operativa y rendimientos financieros" },
    ]
  },
  {
    id: "modelado",
    label: "Modelado & Proyecciones",
    icon: TrendingUp,
    description: "Estacionalidad histórica, ratios P&L y supuestos estratégicos",
    tabs: [
      { id: "estacionalidad", label: "Estacionalidad & Inflación", shortLabel: "Estacionalidad", icon: CalendarDays, badge: "Histórico", description: "Índices diarios e inflación mensual" },
      { id: "metricas", label: "Métricas & Ratios P&L", shortLabel: "Métricas", icon: Sliders, badge: "Parámetros", description: "Ratios operativos configurables" },
      { id: "proyecciones", label: "Supuestos de Proyección", shortLabel: "Proyecciones", icon: Target, badge: "Planificación", description: "Facturación esperada mes a mes" },
    ]
  },
  {
    id: "control",
    label: "Control & Ayuda",
    icon: ShieldCheck,
    description: "Diagnóstico de base de datos y guías de administración",
    tabs: [
      { id: "chequeo", label: "Chequeo & Auditoría DB", shortLabel: "Diagnóstico DB", icon: CheckCircle2, badge: "Auditoría", description: "Consistencia e integridad de la DB" },
      { id: "documentacion", label: "Documentación & Manuales", shortLabel: "Manuales", icon: BookOpen, badge: "Guías", description: "Guías técnicas y manual del sistema" },
    ]
  }
]

/* ─── PIN gate ─────────────────────────────────────────────────────────── */
function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(""))
  const [show, setShow] = useState(false)
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const refs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  function handleChange(idx: number, val: string) {
    const cleaned = val.replace(/\D/g, "").slice(-1)
    const next = [...digits]
    next[idx] = cleaned
    setDigits(next)
    setError(false)

    if (cleaned && idx < PIN_LENGTH - 1) {
      refs.current[idx + 1]?.focus()
    }
    if (cleaned && idx === PIN_LENGTH - 1) {
      const pin = [...next.slice(0, PIN_LENGTH - 1), cleaned].join("")
      verify(pin)
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus()
    }
  }

  function verify(pin: string) {
    if (pin === ADMIN_PIN) {
      onUnlock()
    } else {
      setShake(true)
      setError(true)
      setDigits(Array(PIN_LENGTH).fill(""))
      setTimeout(() => {
        setShake(false)
        refs.current[0]?.focus()
      }, 500)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    verify(digits.join(""))
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar />
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
            <div className="mb-6 flex justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-8 w-8 text-primary" />
              </span>
            </div>

            <h1 className="mb-1 text-center text-xl font-bold text-foreground">Zona de Administración</h1>
            <p className="mb-8 text-center text-sm text-muted-foreground">
              Ingresá el PIN de 4 dígitos para continuar <span className="font-semibold text-foreground">(PIN Demo: 1234)</span>.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <div
                className={`mb-2 flex justify-center gap-3 transition-transform ${shake ? "animate-[shake_0.4s_ease]" : ""}`}
              >
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { refs.current[i] = el }}
                    type={show ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    aria-label={`Dígito ${i + 1}`}
                    className={`h-14 w-14 rounded-lg border-2 bg-background text-center text-2xl font-bold tracking-widest text-foreground outline-none transition-colors focus:border-primary ${
                      error
                        ? "border-destructive text-destructive"
                        : d
                          ? "border-primary"
                          : "border-border"
                    }`}
                  />
                ))}
              </div>

              <p className={`mb-4 text-center text-sm font-medium text-destructive transition-opacity ${error ? "opacity-100" : "opacity-0"}`}>
                PIN incorrecto. Intentá nuevamente.
              </p>

              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="mx-auto mb-6 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {show ? "Ocultar" : "Mostrar"} dígitos
              </button>

              <button
                type="submit"
                className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                disabled={digits.some((d) => !d)}
              >
                Ingresar
              </button>

              <button
                type="button"
                onClick={onUnlock}
                className="w-full mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                🔓 Desbloqueo Rápido Modo Demo (1234)
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver al panel principal
              </Link>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  )
}

/* ─── Admin shell (after unlock) ───────────────────────────────────────── */
function AdminShell({ onLock }: { onLock?: () => void }) {
  const [activeGroup, setActiveGroup] = useState<CategoryGroup>("cargas")
  const [tab, setTab] = useState<AdminTab>("cargar")
  const [periodoKey, setPeriodoKey] = useState("2026-07")
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [sucursales, setSucursales] = useState<DBSucursal[]>([])
  const [loading, setLoading] = useState(true)

  // Cargar períodos y sucursales desde la DB al montar
  useEffect(() => {
    async function loadData() {
      try {
        const [periodosData, sucursalesData] = await Promise.all([
          getPeriodosDB(),
          getSucursalesDB()
        ])
        
        setPeriodos(periodosData)
        setSucursales(sucursalesData)
        
        if (periodosData.length > 0) {
          const ultimoPeriodo = periodosData[periodosData.length - 1]
          setPeriodoKey(ultimoPeriodo.key)
        }
      } catch (error) {
        console.error('Error al cargar datos:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  // Cambiar grupo mantención / default del primer tab del grupo
  const handleGroupChange = (group: GroupDef) => {
    setActiveGroup(group.id)
    const existsInGroup = group.tabs.some(t => t.id === tab)
    if (!existsInGroup) {
      setTab(group.tabs[0].id)
    }
  }

  // Obtener grupo actual
  const currentGroupDef = CATEGORY_GROUPS.find(g => g.id === activeGroup) || CATEGORY_GROUPS[0]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── HEADER 1: Global App TopBar ──────────────────────────────────────── */}
      <TopBar />

      {/* ── HEADER 2: Module Title & Category Group Navigation ───────────────── */}
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-3 md:px-6 lg:flex-row lg:items-center lg:justify-between">
          
          {/* Title & Badge */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-foreground md:text-lg">Panel de Administración BI</h1>
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
                  Configuración
                </span>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Gestión integral de cargas, parámetros P&L, proyecciones y diagnóstico del sistema.
              </p>
            </div>
          </div>

          {/* 3 Main Category Groups */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {CATEGORY_GROUPS.map((group) => {
              const Icon = group.icon
              const isActive = activeGroup === group.id
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => handleGroupChange(group)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                  <span>{group.label}</span>
                  <span className={cn(
                    "ml-1 rounded-full px-1.5 py-0.2 text-[10px]",
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/15 text-muted-foreground"
                  )}>
                    {group.tabs.length}
                  </span>
                </button>
              )
            })}
          </div>

        </div>
      </header>

      {/* ── HEADER 3: Sub-Nav Bar (Active Group Items) ───────────────────────── */}
      <nav className="border-b border-border bg-card/40 shadow-xs">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 md:px-6">
          
          {/* Sub-tabs list */}
          <div className="flex items-center gap-1 overflow-x-auto py-2">
            {currentGroupDef.tabs.map((t) => {
              const TabIcon = t.icon
              const isSelected = tab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "group relative flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer",
                    isSelected
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <TabIcon className={cn("h-3.5 w-3.5", isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  <span>{t.label}</span>
                  {t.badge && (
                    <span className={cn(
                      "rounded px-1.5 py-0.2 text-[9px] uppercase font-bold tracking-wider",
                      isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {t.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Action buttons on the right */}
          <div className="flex items-center gap-2 shrink-0">
            {onLock && (
              <button
                type="button"
                onClick={onLock}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                title="Bloquear sesión de administración"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Bloquear</span>
              </button>
            )}
            <Link
              href="/"
              className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Volver al panel</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── MAIN CONTENT AREA ────────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 md:px-6 md:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="mt-4 text-sm text-muted-foreground">Cargando datos del sistema...</p>
            </div>
          </div>
        ) : (
          <>
            {tab === "cargar" && <CargarDatos />}
            {tab === "gestion-cargas" && <GestionCargas />}
            {tab === "costos-fijos" && (
              <CargaCostosFijos 
                periodoKey={periodoKey}
                onPeriodoChange={setPeriodoKey}
                periodos={periodos}
                sucursales={sucursales}
              />
            )}
            {tab === "ingresos-financieros" && <GestionIngresosFinancieros />}
            {tab === "estacionalidad" && <EstacionalidadAdmin />}
            {tab === "metricas" && <MetricasAdmin />}
            {tab === "proyecciones" && <ProyeccionesAdmin />}
            {tab === "chequeo" && <ChequeoAdmin />}
            {tab === "documentacion" && <Documentacion />}
          </>
        )}
      </main>

      <footer className="border-t border-border bg-card py-4">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 text-xs text-muted-foreground md:px-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Sistema BI Monarca — Módulo de Administración</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              Sesión activa (12h)
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ─── Page entry point ──────────────────────────────────────────────────── */
export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (checkIsUnlocked()) {
      setUnlocked(true)
    }
    setChecking(false)
  }, [])

  const handleUnlock = () => {
    saveUnlockSession()
    setUnlocked(true)
  }

  const handleLock = () => {
    clearUnlockSession()
    setUnlocked(false)
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    )
  }

  if (!unlocked) {
    return <PinGate onUnlock={handleUnlock} />
  }

  return <AdminShell onLock={handleLock} />
}

"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Lock, Eye, EyeOff } from "lucide-react"
import { CargarDatos } from "@/components/monarca/views/cargar-datos"
import { Documentacion } from "@/components/monarca/views/documentacion"
import { MetricasAdmin } from "@/components/monarca/views/metricas-admin"
import { TopBar } from "@/components/monarca/top-bar"

const ADMIN_PIN = "1234"
const PIN_LENGTH = 4

type AdminTab = "cargar" | "documentacion" | "metricas"

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
    // auto-submit when last digit filled
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
            {/* Icon */}
            <div className="mb-6 flex justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-8 w-8 text-primary" />
              </span>
            </div>

            <h1 className="mb-1 text-center text-xl font-bold text-foreground">Zona de Administración</h1>
            <p className="mb-8 text-center text-sm text-muted-foreground">
              Ingresá el PIN de 4 dígitos para continuar.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              {/* PIN inputs */}
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

              {/* Error message */}
              <p className={`mb-4 text-center text-sm font-medium text-destructive transition-opacity ${error ? "opacity-100" : "opacity-0"}`}>
                PIN incorrecto. Intentá nuevamente.
              </p>

              {/* Show/hide toggle */}
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
const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: "cargar", label: "Cargar Datos" },
  { id: "documentacion", label: "Documentación" },
  { id: "metricas", label: "Métricas P&L" },
]

function AdminShell() {
  const [tab, setTab] = useState<AdminTab>("cargar")

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar />

      {/* Sub-nav */}
      <nav className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 md:px-6">
          <ul className="flex items-center gap-1">
            {ADMIN_TABS.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`whitespace-nowrap border-b-[3px] px-4 py-3.5 text-sm font-medium transition-colors ${
                    tab === t.id
                      ? "border-accent text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  aria-current={tab === t.id ? "page" : undefined}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al panel
          </Link>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 md:px-6 md:py-8">
        {tab === "cargar" && <CargarDatos />}
        {tab === "documentacion" && <Documentacion />}
        {tab === "metricas" && <MetricasAdmin />}
      </main>

      <footer className="border-t border-border bg-card py-4">
        <div className="mx-auto flex max-w-[1600px] items-center justify-center px-4 text-xs text-muted-foreground">
          Zona de administración — acceso restringido
        </div>
      </footer>
    </div>
  )
}

/* ─── Page entry point ──────────────────────────────────────────────────── */
export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false)

  if (!unlocked) {
    return <PinGate onUnlock={() => setUnlocked(true)} />
  }

  return <AdminShell />
}

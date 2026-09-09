// components/monarca/views/login-view.tsx
"use client"

import { useState } from "react"
import { Lock, Mail, Eye, EyeOff, LogIn, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

interface LoginViewProps {
  onLoginSuccess: (userEmail: string) => void
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState("demo@monarca-bi.com")
  const [password, setPassword] = useState("demo1234")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg("")

    try {
      // Iniciar sesión en modo demo de inmediato
      onLoginSuccess(email || "demo@monarca-bi.com")
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "Error al iniciar sesión.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Glow de fondo decorativo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md shadow-2xl border-primary/20 bg-card/95 backdrop-blur-md relative z-10 animate-in fade-in zoom-in-95 duration-300">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 p-3 shadow-inner">
            <img
              src="/supermercados_monarca_logo-removebg-preview__2_-1777696368463.ico"
              alt="Monarca BI"
              className="h-14 w-14 object-contain select-none"
            />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              Supermercados Monarca
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Plataforma Analytics & BI · Cuadro de Resultados
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          <Button
            type="button"
            onClick={() => onLoginSuccess("demo@monarca-bi.com")}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 shadow-lg gap-2 text-sm"
          >
            <CheckCircle2 className="h-4 w-4" />
            Acceso Rápido · Modo Demostración
          </Button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-border w-full" />
            <span className="bg-card px-2 text-[11px] text-muted-foreground uppercase tracking-wider relative">
              o con credenciales
            </span>
          </div>

          {errorMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" />
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@admin.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" />
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={loading} className="w-full h-10 gap-2 font-semibold shadow-md">
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Verificando credenciales...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Iniciar Sesión
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

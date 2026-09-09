// components/monarca/top-bar.tsx
import Link from "next/link"
import { User, Settings, LogOut } from "lucide-react"

export function TopBar({ userEmail, onLogout }: { userEmail?: string; onLogout?: () => void }) {
  return (
    <header className="bg-primary text-primary-foreground border-b-4 border-accent">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-4">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/monarca-header-full-KHQtz9DKN8TaqYyecT7jiQZcu0tBw6.gif"
            alt="Monarca"
            className="h-9 w-auto object-contain"
          />
          <div className="hidden h-9 w-px bg-primary-foreground/25 sm:block" />
          <div className="hidden flex-col leading-tight sm:flex">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">Analytics</span>
              <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent-foreground">
                BI
              </span>
            </div>
            <span className="text-xs text-primary-foreground/70">Panel de Control de Datos</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1.5 text-xs font-medium ring-1 ring-primary-foreground/20">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Modo Demo
          </span>

          {userEmail && (
            <div className="hidden items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium md:flex border border-primary-foreground/20">
              <User className="h-3.5 w-3.5 text-accent" />
              <span>{userEmail}</span>
            </div>
          )}

          <Link
            href="/admin"
            aria-label="Administración"
            className="flex h-9 w-9 items-center justify-center rounded-full text-primary-foreground/80 transition-colors hover:text-primary-foreground hover:bg-primary-foreground/10"
            title="Gestión de Cargas y Períodos"
          >
            <Settings className="h-4 w-4" />
          </Link>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Cerrar Sesión"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/80 text-white transition-transform hover:scale-105 hover:bg-destructive shadow-xs"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

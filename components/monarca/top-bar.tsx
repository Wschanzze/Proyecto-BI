import Link from "next/link"
import { User, Settings } from "lucide-react"

export function TopBar() {
  return (
    <header className="bg-primary text-primary-foreground border-b-4 border-accent">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-4">
          {/* Official logo */}
          <img
            src="/supermercados_monarca_logo-removebg-preview__2_-1777696368463.ico"
            alt="Supermercados Monarca"
            className="h-10 w-auto object-contain"
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
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Datos reales
          </span>
          <Link
            href="/admin"
            aria-label="Administración"
            className="flex h-9 w-9 items-center justify-center rounded-full text-primary-foreground/50 transition-colors hover:text-primary-foreground/90"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <button
            type="button"
            aria-label="Perfil de usuario"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground text-primary transition-transform hover:scale-105"
          >
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  )
}

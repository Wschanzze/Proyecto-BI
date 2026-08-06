// lib/supabase.ts
// Cliente Supabase singleton — funciona tanto en browser como en server (Next.js)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
})

// Tipos que reflejan el esquema de la base de datos
export interface DBSeccion {
  id: string
  nombre: string
  orden: number
}

export interface DBCategoria {
  id: string
  seccion_id: string
  nombre: string
  orden: number
}

export interface DBGrupo {
  id: string
  categoria_id: string
  nombre: string
  orden: number
}

export interface DBPeriodo {
  id: number
  key: string
  anio: number
  mes: number
  fecha_carga: string
  archivo_nombre: string | null
}

export interface DBResultadoGrupo {
  id: number
  periodo_id: number
  grupo_id: string
  facturacion: number
  articulos: number
  cmg_pct: number
  resultado_operativo: number
  rrhh_pct: number
  acciones_pct: number
  resultado_final: number
}

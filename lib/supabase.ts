// lib/supabase.ts
// Cliente Supabase singleton — funciona tanto en browser como en server (Next.js)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
})

// ──────────────────────────────────────────────────────────────────────────────
// Tipos del esquema de base de datos
// ──────────────────────────────────────────────────────────────────────────────

export interface DBSucursal {
  id: string      // slug sin tilde: 'colon', 'san-martin', ...
  nombre: string  // con tilde: 'Colón', 'San Martín', ...
  orden: number
}

export interface DBCategoria {
  id: string      // 'salon', 'frescos'
  nombre: string  // 'Salon', 'Frescos'
  orden: number
}

export interface DBSector {
  id: string          // 'salon-almacen'
  categoria_id: string
  nombre: string      // 'ALMACEN', 'BEBES Y NIÑOS', ...
  orden: number
}

export interface DBGrupo {
  id: string         // 'salon-almacen-aceites'
  sector_id: string
  nombre: string     // 'ACEITES', 'ADEREZOS', ...
  orden: number
}

export interface DBPeriodo {
  id: number
  key: string         // '2026-06'
  anio: number
  mes: number
  label: string       // 'jun-26'
  fecha_carga: string
  archivo_nombre: string | null
}

/** Resultado crudo tal como viene del archivo — una fila por sucursal × grupo × período */
export interface DBResultado {
  id: number
  periodo_id: number
  sucursal_id: string
  grupo_id: string
  cantidad: number
  facturacion: number
  iva: number
  costo: number
}

/** Input para insertar/actualizar resultados desde la pantalla de carga */
export interface ResultadoInput {
  sucursal_id: string
  grupo_id: string
  cantidad: number
  facturacion: number
  iva: number
  costo: number
}

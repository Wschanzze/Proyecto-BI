// lib/supabase.ts
// Cliente de compatibilidad y soporte para modo DEMO autónomo.

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

export interface ResultadoInput {
  sucursal_id: string
  grupo_id: string
  cantidad: number
  facturacion: number
  iva: number
  costo: number
}

// Mock chainable query builder
function createMockQueryBuilder() {
  const handler: any = {
    select: () => handler,
    insert: () => handler,
    update: () => handler,
    delete: () => handler,
    upsert: () => handler,
    eq: () => handler,
    neq: () => handler,
    in: () => handler,
    order: () => handler,
    limit: () => handler,
    single: async () => ({ data: null, error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
    then: (resolve: any) => Promise.resolve({ data: [], error: null, count: 0 }).then(resolve),
  }
  return handler
}

const mockAuth = {
  getSession: async () => ({
    data: {
      session: {
        user: { id: "demo-user-id", email: "demo@monarca-bi.com", user_metadata: { name: "Usuario Demo" } },
      },
    },
    error: null,
  }),
  onAuthStateChange: (callback: any) => {
    // Invocar inicialmente con la sesión demo
    setTimeout(() => {
      callback("SIGNED_IN", {
        user: { id: "demo-user-id", email: "demo@monarca-bi.com", user_metadata: { name: "Usuario Demo" } },
      })
    }, 10)
    return { data: { subscription: { unsubscribe: () => {} } } }
  },
  signInWithPassword: async ({ email }: { email?: string; password?: string }) => ({
    data: {
      user: { id: "demo-user-id", email: email || "demo@monarca-bi.com", user_metadata: { name: "Usuario Demo" } },
      session: { user: { id: "demo-user-id", email: email || "demo@monarca-bi.com" } },
    },
    error: null,
  }),
  signOut: async () => ({ error: null }),
}

export const supabase: any = {
  auth: mockAuth,
  from: () => createMockQueryBuilder(),
  rpc: async () => ({ data: null, error: null }),
}

export const supabaseAdmin: any = {
  ...supabase,
  auth: mockAuth,
}

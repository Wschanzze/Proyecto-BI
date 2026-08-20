// scripts/test-get-rrhh.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function getRRHHSubcuentas(periodoKey, sucursalId = '__consolidado__') {
  const { data: periodo } = await admin
    .from('periodos')
    .select('id')
    .eq('key', periodoKey)
    .maybeSingle()

  if (!periodo) return null

  if (sucursalId === '__consolidado__') {
    const { data, error } = await admin
      .from('rrhh_subcuentas')
      .select('*')
      .eq('periodo_id', periodo.id)

    if (error) throw error
    if (!data || data.length === 0) return null

    return {
      periodo_id: periodo.id,
      sucursal_id: '__consolidado__',
      sueldos: data.reduce((sum, r) => sum + Number(r.sueldos || 0), 0),
      cargas_sociales: data.reduce((sum, r) => sum + Number(r.cargas_sociales || 0), 0),
      indemnizaciones: data.reduce((sum, r) => sum + Number(r.indemnizaciones || 0), 0),
      tabla_merito: data.reduce((sum, r) => sum + Number(r.tabla_merito || 0), 0),
      total_rrhh: data.reduce((sum, r) => sum + Number(r.total_rrhh || 0), 0),
    }
  }
}

async function main() {
  const keys = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07']
  for (const k of keys) {
    const res = await getRRHHSubcuentas(k, '__consolidado__')
    console.log(`Period ${k}:`, res)
  }
}

main().catch(console.error)

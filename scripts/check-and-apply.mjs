// scripts/check-and-apply.mjs
// Verifica periodos existentes y aplica la función RPC via pg directo

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
})

async function main() {
  // 1. Ver todos los periodos existentes
  const { data: periodos, error: perErr } = await admin.from('periodos').select('id, key').order('key')
  if (perErr) {
    console.error('Error fetching periodos:', perErr.message)
  } else {
    console.log('📅 Periodos en la tabla:', periodos.length)
    periodos.forEach(p => console.log(`  - ${p.key} (id: ${p.id})`))
  }

  // 2. Ver rrhh_subcuentas existentes
  const { data: rrhh, error: rErr } = await admin
    .from('rrhh_subcuentas')
    .select('periodo_id, sucursal_id, sueldos, cargas_sociales, indemnizaciones, tabla_merito')
    .limit(20)
  if (rErr) {
    console.error('\nError fetching rrhh_subcuentas:', rErr.message)
  } else {
    console.log('\n📊 RRHH subcuentas rows:', rrhh.length)
    rrhh.forEach(r => console.log(`  - periodo_id: ${r.periodo_id}, sucursal: ${r.sucursal_id}, sueldos: ${r.sueldos}`))
  }
}

main().catch(console.error)

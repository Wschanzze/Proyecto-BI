// scripts/check-proy-cmv.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  const { data } = await admin.from('metricas_configurables').select('*').eq('categoria', 'proyecciones').like('clave', 'proy_cmv_pct%')
  console.log('CMV % en metricas_configurables:')
  for (const m of data || []) {
    console.log(`  ${m.clave}: ${m.valor} (${(m.valor * 100).toFixed(2)}%) [activo: ${m.activo}]`)
  }

  // Also check proy_facturacion_m6
  const { data: factData } = await admin.from('metricas_configurables').select('*').eq('categoria', 'proyecciones').like('clave', 'proy_facturacion%')
  console.log('\nFacturacion proyectada:')
  for (const m of factData || []) {
    console.log(`  ${m.clave}: $${Number(m.valor).toLocaleString('es-AR')}`)
  }
}

main().catch(console.error)

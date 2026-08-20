// scripts/check-ingresos-costos.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  const { data: periodos } = await admin.from('periodos').select('id, key').order('key')
  const pMap = new Map(periodos?.map(p => [p.id, p.key]))

  console.log('--- COSTOS FIJOS ROWS ---')
  const { data: cf } = await admin.from('costos_fijos_subcuentas').select('*').limit(50)
  console.log(`Total rows in costos_fijos_subcuentas: ${cf?.length || 0}`)
  if (cf && cf.length > 0) {
    cf.forEach(r => console.log(`  Period ${pMap.get(r.periodo_id)} | Sucursal: ${r.sucursal_id} | Total: ${r.total_costos_fijos}`))
  }

  console.log('\n--- INGRESOS FINANCIEROS ROWS ---')
  const { data: ing } = await admin.from('ingresos_financieros_subcuentas').select('*').limit(50)
  console.log(`Total rows in ingresos_financieros_subcuentas: ${ing?.length || 0}`)
  if (ing && ing.length > 0) {
    ing.forEach(r => console.log(`  Period ${pMap.get(r.periodo_id)} | Sucursal: ${r.sucursal_id} | Op: ${r.operatoria_financiera} | Rend: ${r.rendimientos_financieros} | Total: ${r.total_ingresos_financieros}`))
  }
}

main().catch(console.error)

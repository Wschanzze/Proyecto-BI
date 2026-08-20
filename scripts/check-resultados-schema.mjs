// scripts/check-resultados-schema.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  // Get one row to see the schema
  const { data, error } = await admin.from('resultados').select('*').limit(1)
  if (error) { console.error(error); return }
  if (data?.length) {
    console.log('Columns:', Object.keys(data[0]))
    console.log('Sample:', JSON.stringify(data[0], null, 2))
  } else {
    console.log('No rows in resultados table')
  }

  // Get all periods with consolidated facturacion
  const { data: periodos } = await admin.from('periodos').select('id, key').order('key')
  const pMap = new Map(periodos?.map(p => [p.id, p.key]))

  const { data: res2, error: e2 } = await admin.from('resultados').select('periodo_id, sucursal_id, facturacion').order('periodo_id')
  if (e2) { console.error(e2); return }
  
  const byPeriodo = new Map()
  for (const r of res2 || []) {
    const pk = pMap.get(r.periodo_id)
    if (!pk) continue
    if (!byPeriodo.has(pk)) byPeriodo.set(pk, 0)
    byPeriodo.set(pk, byPeriodo.get(pk) + Number(r.facturacion || 0))
  }
  
  console.log('\n=== FACTURACIÓN CONSOLIDADA POR PERIODO ===')
  for (const [pk, v] of [...byPeriodo.entries()].sort()) {
    console.log(`  ${pk} | facturacion: ${Math.round(v).toLocaleString('es-AR')}`)
  }

  // Check estacionalidad - try different table names
  for (const tbl of ['estacionalidad', 'estacionalidades', 'indices_estacionalidad', 'estacionalidad_ventas']) {
    const { data: e, error: err } = await admin.from(tbl).select('*').limit(5)
    if (!err) {
      console.log(`\nFound table: ${tbl}`)
      if (e?.length) console.log('Sample row:', JSON.stringify(e[0], null, 2))
    }
  }
}

main().catch(console.error)

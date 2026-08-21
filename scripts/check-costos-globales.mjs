// scripts/check-costos-globales.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  console.log('=== INSPECCIONANDO LA TABLA costos_globales ===\n')

  const { data: rows, error } = await supabase.from('costos_globales').select('*')
  if (error) {
    console.error('Error al consultar costos_globales:', error)
    return
  }

  console.log(`Total registros en costos_globales: ${rows ? rows.length : 0}`)
  if (!rows || rows.length === 0) {
    console.log('⚠️ LA TABLA costos_globales ESTÁ COMPLETAMENTE VACÍA.')
  } else {
    for (const r of rows) {
      console.log(`  Período: ${r.periodo_key} | Grupo: ${r.grupo_id} | Costo Total: $${Number(r.costo_total).toLocaleString('es-AR')}`)
    }
  }

  // Also check lotes_costos table if it exists
  const { data: lotes, error: lotesErr } = await supabase.from('lotes_costos').select('*')
  console.log('\nLotes de costos cargados:', lotesErr ? lotesErr.message : lotes)
}

main().catch(console.error)

// scripts/check-metricas-fechas.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  const { data, error } = await admin
    .from('metricas_configurables')
    .select('id, clave, valor, activo, fecha_desde, fecha_hasta, sucursal_id')
    .eq('categoria', 'proyecciones')
    .order('clave')
  
  if (error) { console.error(error); return }
  
  const now = new Date()
  console.log(`Now: ${now.toISOString()}`)
  console.log(`\n${data?.length} proyecciones metrics:`)
  
  for (const r of data || []) {
    const fechaDesde = new Date(r.fecha_desde)
    const fechaHasta = r.fecha_hasta ? new Date(r.fecha_hasta) : null
    const passesFilter = r.activo && fechaDesde <= now && (fechaHasta === null || fechaHasta >= now)
    console.log(`  ${r.clave} = ${r.valor} | activo=${r.activo} | fecha_desde=${r.fecha_desde} | fecha_hasta=${r.fecha_hasta} | passes=${passesFilter}`)
  }
}

main().catch(console.error)

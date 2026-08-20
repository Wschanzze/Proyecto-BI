// scripts/check-all-facturacion.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  // Get all periods
  const { data: periodos } = await admin.from('periodos').select('id, key').order('key')
  const pMap = new Map(periodos?.map(p => [p.id, p.key]))
  console.log('Periodos in DB:', periodos?.map(p => p.key))

  // Get ALL resultados with pagination
  let allResultados = []
  let page = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await admin
      .from('resultados')
      .select('periodo_id, facturacion, iva')
      .range(page * pageSize, (page + 1) * pageSize - 1)
    if (error || !data || data.length === 0) break
    allResultados = allResultados.concat(data)
    if (data.length < pageSize) break
    page++
  }

  console.log(`Total resultados rows: ${allResultados.length}`)

  const byPeriodo = new Map()
  for (const r of allResultados) {
    const pk = pMap.get(r.periodo_id)
    if (!pk) continue
    if (!byPeriodo.has(pk)) byPeriodo.set(pk, { facturacion: 0, iva: 0 })
    byPeriodo.get(pk).facturacion += Number(r.facturacion || 0)
    byPeriodo.get(pk).iva += Number(r.iva || 0)
  }

  console.log('\n=== FACTURACIÓN REAL POR PERIODO (CONSOLIDADA TODAS SUCURSALES) ===')
  for (const [pk, v] of [...byPeriodo.entries()].sort()) {
    const sinIva = v.facturacion - v.iva
    console.log(`  ${pk} | Facturacion c/IVA: ${Math.round(v.facturacion).toLocaleString('es-AR')} | Sin IVA: ${Math.round(sinIva).toLocaleString('es-AR')}`)
  }

  // Check estacionalidad data in metricas_configurables
  const { data: estMet } = await admin
    .from('metricas_configurables')
    .select('*')
    .ilike('clave', '%estac%')
    .order('clave')
  console.log('\n=== Estacionalidad en metricas_configurables ===')
  if (estMet?.length) estMet.forEach(r => console.log(`  ${r.clave} = ${r.valor}`))
  else console.log('No estacionalidad rows found')

  // Check all categories
  const { data: cats } = await admin
    .from('metricas_configurables')
    .select('categoria')
  const uniqueCats = [...new Set(cats?.map(c => c.categoria))]
  console.log('\n=== Categorías en metricas_configurables ===', uniqueCats)
}

main().catch(console.error)

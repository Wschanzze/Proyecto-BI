// scripts/check-proyecciones-db.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  // 1. Check existing projection rows
  console.log('=== PROYECCIONES en metricas_configurables ===')
  const { data: proy, error: pe } = await admin
    .from('metricas_configurables')
    .select('*')
    .eq('categoria', 'proyecciones')
    .order('clave')
  if (pe) console.error(pe)
  else console.log(`Total rows: ${proy?.length || 0}`)
  if (proy?.length) proy.forEach(r => console.log(`  ${r.clave} = ${r.valor} (tipo: ${r.tipo})`))

  // 2. Check estacionalidad
  console.log('\n=== ESTACIONALIDAD ===')
  const { data: est, error: ee } = await admin
    .from('estacionalidad')
    .select('*')
    .order('anio, mes')
  if (ee) console.error(ee)
  else {
    console.log(`Total rows: ${est?.length || 0}`)
    if (est?.length) est.forEach(r => console.log(`  ${r.anio}-${String(r.mes).padStart(2,'0')} | indice: ${r.indice_estacionalidad} | vtas: ${r.ventas_reales_promedio}`))
  }

  // 3. Real facturacion by month (periodos + resultados)
  console.log('\n=== FACTURACIÓN REAL POR PERIODO (tabla: resultados) ===')
  const { data: periodos } = await admin.from('periodos').select('id, key').order('key')
  const pMap = new Map(periodos?.map(p => [p.id, p.key]))

  const { data: resultados, error: re } = await admin
    .from('resultados')
    .select('periodo_id, sucursal_id, facturacion, venta_neta')
    .order('periodo_id')
  if (re) console.error(re)
  else {
    // Consolidate by period
    const byPeriodo = new Map()
    for (const r of resultados || []) {
      const pk = pMap.get(r.periodo_id)
      if (!pk) continue
      if (!byPeriodo.has(pk)) byPeriodo.set(pk, { facturacion: 0, venta_neta: 0 })
      byPeriodo.get(pk).facturacion += Number(r.facturacion || 0)
      byPeriodo.get(pk).venta_neta += Number(r.venta_neta || 0)
    }
    for (const [pk, v] of [...byPeriodo.entries()].sort()) {
      console.log(`  ${pk} | facturacion: ${v.facturacion.toLocaleString('es-AR')} | venta_neta: ${v.venta_neta.toLocaleString('es-AR')}`)
    }
  }
}

main().catch(console.error)

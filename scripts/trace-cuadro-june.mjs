// scripts/trace-cuadro-june.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  console.log('=== INVESTIGANDO CÓMO REGISTRA CADA GRUPO EL COSTO EN 2026-06 ===\n')

  const { data: periodo } = await supabase.from('periodos').select('id, key').eq('key', '2026-06').single()
  const { data: resultados } = await supabase.from('resultados').select('grupo_id, sucursal_id, facturacion, iva, costo').eq('periodo_id', periodo.id)

  const mapPorGrupo = {}
  let totFact = 0, totIva = 0, totCosto = 0
  for (const r of resultados) {
    const f = Number(r.facturacion || 0)
    const i = Number(r.iva || 0)
    const c = Number(r.costo || 0)
    totFact += f
    totIva += i
    totCosto += c
    if (!mapPorGrupo[r.grupo_id]) mapPorGrupo[r.grupo_id] = { facturacion: 0, iva: 0, costo: 0 }
    mapPorGrupo[r.grupo_id].facturacion += f
    mapPorGrupo[r.grupo_id].iva += i
    mapPorGrupo[r.grupo_id].costo += c
  }

  console.log(`GLOBAL 2026-06:`)
  console.log(`  Facturación: $${Math.round(totFact).toLocaleString('es-AR')}`)
  console.log(`  IVA: $${Math.round(totIva).toLocaleString('es-AR')}`)
  console.log(`  Ventas sin IVA: $${Math.round(totFact - totIva).toLocaleString('es-AR')}`)
  console.log(`  Costo (CMV): $${Math.round(totCosto).toLocaleString('es-AR')}`)
  console.log(`  CMg: $${Math.round(totFact - totIva - totCosto).toLocaleString('es-AR')} (${(((totFact - totIva - totCosto)/(totFact - totIva))*100).toFixed(2)}%)\n`)

  console.log('GRUPOS CON COSTO = 0 O COSTO MUY BAJO (O ROTISERIA):')
  for (const [gId, d] of Object.entries(mapPorGrupo)) {
    const vSinIva = d.facturacion - d.iva
    const cmgPct = vSinIva > 0 ? ((vSinIva - d.costo)/vSinIva)*100 : 0
    if (d.costo === 0 || cmgPct > 80 || cmgPct < 10) {
      console.log(`  Grupo ${gId}: Fact: $${Math.round(d.facturacion).toLocaleString('es-AR')} | Costo: $${Math.round(d.costo).toLocaleString('es-AR')} | CMg: ${cmgPct.toFixed(1)}%`)
    }
  }

  // Also check table costos_globales if it exists
  const { data: costosGlobales } = await supabase.from('costos_globales').select('*').eq('periodo_id', periodo.id)
  console.log('\nCostos globales cargados para 2026-06:', costosGlobales)
}

main().catch(console.error)

// scripts/test-salon-frescos.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  console.log('=== TESTEANDO SALÓN SOLO VS FRESCOS EN JUNIO 2026 ===\n')

  const { data: p2026_06 } = await supabase.from('periodos').select('id, key').eq('key', '2026-06').single()
  const { data: resultados } = await supabase.from('resultados').select('grupo_id, facturacion, iva, costo').eq('periodo_id', p2026_06.id)

  let salonFact = 0, salonIva = 0, salonCosto = 0
  let frescosFact = 0, frescosIva = 0, frescosCosto = 0

  for (const r of resultados) {
    const f = Number(r.facturacion || 0)
    const i = Number(r.iva || 0)
    const c = Number(r.costo || 0)
    if (r.grupo_id.startsWith('frescos-')) {
      frescosFact += f
      frescosIva += i
      frescosCosto += c
    } else {
      salonFact += f
      salonIva += i
      salonCosto += c
    }
  }

  const salonVSinIva = salonFact - salonIva
  const salonCMg = salonVSinIva - salonCosto

  const frescosVSinIva = frescosFact - frescosIva
  const frescosCMg = frescosVSinIva - frescosCosto

  console.log(`SALÓN SOLO (2026-06):`)
  console.log(`  Facturación: $${Math.round(salonFact).toLocaleString('es-AR')}`)
  console.log(`  Ventas sin IVA: $${Math.round(salonVSinIva).toLocaleString('es-AR')}`)
  console.log(`  Costo (CMV): $${Math.round(salonCosto).toLocaleString('es-AR')}`)
  console.log(`  CMg Salón: $${Math.round(salonCMg).toLocaleString('es-AR')} (${((salonCMg/salonVSinIva)*100).toFixed(1)}% s/Ventas sin IVA)\n`)

  console.log(`FRESCOS SOLO (2026-06):`)
  console.log(`  Facturación: $${Math.round(frescosFact).toLocaleString('es-AR')}`)
  console.log(`  Ventas sin IVA: $${Math.round(frescosVSinIva).toLocaleString('es-AR')}`)
  console.log(`  Costo (CMV): $${Math.round(frescosCosto).toLocaleString('es-AR')}`)
  console.log(`  CMg Frescos: $${Math.round(frescosCMg).toLocaleString('es-AR')} (${((frescosCMg/frescosVSinIva)*100).toFixed(1)}% s/Ventas sin IVA)\n`)
}

main().catch(console.error)

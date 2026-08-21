// scripts/test-rotiseria-iva.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  console.log('=== TESTEANDO CÁLCULO DE IVA Y COSTO DE ROTISERÍA ===\n')

  const { data: p2026_06 } = await supabase.from('periodos').select('id, key').eq('key', '2026-06').single()
  const { data: resultados } = await supabase.from('resultados').select('grupo_id, sucursal_id, facturacion, iva, costo').eq('periodo_id', p2026_06.id)

  const rotiseriaRows = resultados.filter(r => r.grupo_id.startsWith('frescos-rot-'))

  let rotFactBruta = 0
  let rotIvaCargado = 0
  let rotCostoCargado = 0

  for (const r of rotiseriaRows) {
    rotFactBruta += Number(r.facturacion || 0)
    rotIvaCargado += Number(r.iva || 0)
    rotCostoCargado += Number(r.costo || 0)
  }

  // IVA calculado al 21% automáticamente
  const rotVentasSinIvaCalc = rotFactBruta / 1.21
  const rotIvaCalc = rotFactBruta - rotVentasSinIvaCalc
  const rotCostoFormula = rotFactBruta / 1.4
  const rotCMg = rotVentasSinIvaCalc - rotCostoFormula

  console.log(`DATOS DE ROTISERÍA EN JUNIO 2026:`)
  console.log(`  Facturación Bruta (con IVA): $${Math.round(rotFactBruta).toLocaleString('es-AR')}`)
  console.log(`  IVA Cargado en CSV/DB: $${Math.round(rotIvaCargado).toLocaleString('es-AR')}`)
  console.log(`  IVA Calculado Automáticamente (21%): $${Math.round(rotIvaCalc).toLocaleString('es-AR')}`)
  console.log(`  Ventas sin IVA (Fact/1.21): $${Math.round(rotVentasSinIvaCalc).toLocaleString('es-AR')}`)
  console.log(`  Costo por Fórmula (Fact/1.4): $${Math.round(rotCostoFormula).toLocaleString('es-AR')}`)
  console.log(`  Contribución Marginal Rotisería $: $${Math.round(rotCMg).toLocaleString('es-AR')} (${((rotCMg/rotVentasSinIvaCalc)*100).toFixed(2)}% s/Ventas sin IVA)`)
}

main().catch(console.error)

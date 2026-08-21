// scripts/test-getcuadro-june.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  console.log('=== TESTEANDO getCuadroFromDB PARA JUNIO 2026 CON COSTOS GLOBALES ===\n')

  // We load catalogo and database as data-db does
  const { data: p2026_06 } = await supabase.from('periodos').select('id, key').eq('key', '2026-06').single()
  const { data: resultados } = await supabase.from('resultados').select('grupo_id, sucursal_id, facturacion, iva, costo, cantidad').eq('periodo_id', p2026_06.id)
  const { data: cgRows } = await supabase.from('costos_globales').select('grupo_id, costo_total').eq('periodo_key', '2026-06')

  console.log(`Filas de resultados: ${resultados.length}`)
  console.log(`Filas de costos_globales: ${cgRows.length}`)

  let totFact = 0, totIva = 0, totCostoRaw = 0
  for (const r of resultados) {
    totFact += Number(r.facturacion || 0)
    totIva += Number(r.iva || 0)
    totCostoRaw += Number(r.costo || 0)
  }

  let totCostoGlobales = 0
  for (const cg of cgRows) {
    totCostoGlobales += Number(cg.costo_total || 0)
  }

  console.log(`\nVALORES EN DB:`)
  console.log(`  Facturación Total: $${Math.round(totFact).toLocaleString('es-AR')}`)
  console.log(`  IVA Total: $${Math.round(totIva).toLocaleString('es-AR')}`)
  console.log(`  Ventas sin IVA Total: $${Math.round(totFact - totIva).toLocaleString('es-AR')}`)
  console.log(`  Costo Raw (Sucursales): $${Math.round(totCostoRaw).toLocaleString('es-AR')}`)
  console.log(`  Costos Globales Cargados: $${Math.round(totCostoGlobales).toLocaleString('es-AR')}`)

  const costoTotalRealIntegrado = totCostoRaw + totCostoGlobales
  const cmgRealIntegrado = (totFact - totIva) - costoTotalRealIntegrado
  const cmgPctRealIntegrado = (cmgRealIntegrado / (totFact - totIva)) * 100

  console.log(`\nTOTAL COSTO INTEGRADO (Costo Raw + Costos Globales):`)
  console.log(`  Costo Total Integrado: $${Math.round(costoTotalRealIntegrado).toLocaleString('es-AR')}`)
  console.log(`  Contribución Marginal REAL Integrada: $${Math.round(cmgRealIntegrado).toLocaleString('es-AR')} (${cmgPctRealIntegrado.toFixed(2)}% s/Ventas sin IVA)`)
  console.log(`  CMg s/Facturación Bruta: $${Math.round(totFact - costoTotalRealIntegrado).toLocaleString('es-AR')} (${(((totFact - costoTotalRealIntegrado)/totFact)*100).toFixed(2)}% s/Facturación Bruta)`)
}

main().catch(console.error)

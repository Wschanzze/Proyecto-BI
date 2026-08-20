// scripts/fix-cmv-ratio.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  // Real CMV ratios from actual 2026 data (costo is the actual purchase cost = CMV)
  // Note: resultados.facturacion is SIN IVA (that's the base for % calculations in P&L)
  // But the CMV ratio in proyecciones is applied to ventasSinIva
  // However, looking at the data: facturacion in resultados is TOTAL (with IVA) since venta_neta doesn't exist
  // Actually from previous run:
  //   2026-01: VentasSinIVA=6.516.504.060 (this is actually WITH IVA based on the raw data)
  // Let me re-check: the "facturacion" field in resultados is SIN IVA (confirmed by original schema notes)
  // But the values: 6.5B sin IVA vs 7.5B con IVA per month - these match, so facturacion IS sin IVA
  // Real CMV ratios (costo / facturacion_sin_iva):
  const realCmvRatios = [0.3647, 0.3645, 0.3673, 0.3695, 0.3696, 0.3640, 0.3674]
  const avgCmv = realCmvRatios.reduce((a, b) => a + b, 0) / realCmvRatios.length

  console.log(`Average CMV ratio: ${(avgCmv * 100).toFixed(2)}%`)

  // All 12 months: use real for Jan-Jul, average for Aug-Dec
  const cmvByMonth = [
    ...realCmvRatios, // Jan-Jul
    avgCmv, avgCmv, avgCmv, avgCmv, avgCmv // Aug-Dec
  ]

  const { data: cmvMetricas } = await admin
    .from('metricas_configurables')
    .select('id, clave, valor')
    .eq('categoria', 'proyecciones')
    .ilike('clave', 'proy_cmv_pct_m%')
    .order('clave')

  console.log('\nUpdating CMV ratios...')
  for (let mes = 1; mes <= 12; mes++) {
    const clave = `proy_cmv_pct_m${mes}`
    const metrica = cmvMetricas?.find(m => m.clave === clave)
    if (!metrica) { console.log(`  ⚠ Not found: ${clave}`); continue }
    
    const nuevoValor = parseFloat(cmvByMonth[mes - 1].toFixed(6))
    const { error } = await admin
      .from('metricas_configurables')
      .update({ valor: nuevoValor, actualizado_en: new Date().toISOString() })
      .eq('id', metrica.id)
    
    if (error) console.log(`  ✗ ${clave}: ${error.message}`)
    else console.log(`  ✓ ${clave} = ${(nuevoValor * 100).toFixed(2)}% (era: ${(metrica.valor * 100).toFixed(2)}%)`)
  }

  console.log('\n=== DONE ===')
}

main().catch(console.error)

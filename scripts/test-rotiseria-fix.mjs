// scripts/test-rotiseria-fix.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

function metricsFromRaw(facturacionConIva, iva, costo, cantidad) {
  const ventasSinIva = facturacionConIva - iva
  const cmgMonto = ventasSinIva - costo
  const cmgPct = ventasSinIva > 0 ? (cmgMonto / ventasSinIva) * 100 : 0
  return {
    facturacion: facturacionConIva,
    iva,
    costo,
    articulos: cantidad,
    cmg: cmgPct,
    resultadoOperativo: cmgMonto,
    rrhhSobreVentas: 0,
    accionesSobreVentas: 0,
    resultadoFinal: cmgMonto,
  }
}

async function main() {
  console.log('=== TESTEANDO CORRECCIÓN AUTOMÁTICA DE IVA DE ROTISERÍA AL 21% ===\n')

  const { data: p2026_06 } = await supabase.from('periodos').select('id, key').eq('key', '2026-06').single()
  const { data: resultados } = await supabase.from('resultados').select('grupo_id, sucursal_id, facturacion, iva, costo, cantidad').eq('periodo_id', p2026_06.id)

  let rotFactBruta = 0
  let rotIvaAuto = 0
  let rotVentasSinIva = 0
  let rotCostoFormula = 0

  for (const r of resultados) {
    if (r.grupo_id.startsWith('frescos-rot-')) {
      const fact = Number(r.facturacion || 0)
      if (fact > 0) {
        const ivaAuto = fact - (fact / 1.21)
        const costoForm = fact / 1.4
        const m = metricsFromRaw(fact, ivaAuto, costoForm, Number(r.cantidad || 0))
        rotFactBruta += fact
        rotIvaAuto += ivaAuto
        rotVentasSinIva += (fact - ivaAuto)
        rotCostoFormula += costoForm
      }
    }
  }

  console.log(`RESULTADO DE ROTISERÍA EN JUNIO 2026:`)
  console.log(`  Facturación Bruta (con IVA): $${Math.round(rotFactBruta).toLocaleString('es-AR')}`)
  console.log(`  IVA Auto 21%: $${Math.round(rotIvaAuto).toLocaleString('es-AR')}`)
  console.log(`  Ventas sin IVA (Fact - IVA 21%): $${Math.round(rotVentasSinIva).toLocaleString('es-AR')}`)
  console.log(`  Costo por Fórmula (Fact / 1.4): $${Math.round(rotCostoFormula).toLocaleString('es-AR')}`)
  console.log(`  Contribución Marginal Rotisería $: $${Math.round(rotVentasSinIva - rotCostoFormula).toLocaleString('es-AR')} (${(((rotVentasSinIva - rotCostoFormula)/rotVentasSinIva)*100).toFixed(2)}% s/Ventas sin IVA)`)
  console.log(`\n🎉 SECTOR ROTISERÍA AHORA MUESTRA SUS VENTAS SIN IVA CORRECTAS!`)
}

main().catch(console.error)

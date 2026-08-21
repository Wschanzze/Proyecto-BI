// scripts/compare-views-june.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  console.log('=== COMPARANDO CÁLCULO DE CUADRO DETALLADO VS SIMPLIFICADO ===\n')

  const { data: p2026_06 } = await supabase.from('periodos').select('id, key').eq('key', '2026-06').single()
  
  // Fetch raw records
  const { data: resultados } = await supabase.from('resultados').select('grupo_id, sucursal_id, facturacion, iva, costo').eq('periodo_id', p2026_06.id)

  let facturacionTotal = 0
  let ivaTotal = 0
  let costoTotal = 0

  for (const r of resultados) {
    facturacionTotal += Number(r.facturacion || 0)
    ivaTotal += Number(r.iva || 0)
    costoTotal += Number(r.costo || 0)
  }

  const ventasSinIva = facturacionTotal - ivaTotal
  const cmgReal = ventasSinIva - costoTotal
  const cmgPctReal = (cmgReal / ventasSinIva) * 100

  console.log(`SUMATORIA DIRECTA DB (Sin transformaciones):`)
  console.log(`  Facturación: $${Math.round(facturacionTotal).toLocaleString('es-AR')}`)
  console.log(`  IVA: $${Math.round(ivaTotal).toLocaleString('es-AR')}`)
  console.log(`  Ventas sin IVA: $${Math.round(ventasSinIva).toLocaleString('es-AR')}`)
  console.log(`  Costo (CMV): $${Math.round(costoTotal).toLocaleString('es-AR')}`)
  console.log(`  Contribución Marginal: $${Math.round(cmgReal).toLocaleString('es-AR')} (${cmgPctReal.toFixed(2)}% s/Ventas sin IVA)\n`)

  // Let's check how Rotisería markup formula changes total cost
  let costoConRotiseria = 0
  for (const r of resultados) {
    let costoRow = Number(r.costo || 0)
    // Check if group is rotiseria
    if (r.grupo_id.startsWith('frescos-rot-')) {
      costoRow = Number(r.facturacion || 0) / 1.4
    }
    costoConRotiseria += costoRow
  }
  const cmgRotiseria = ventasSinIva - costoConRotiseria
  console.log(`SUMATORIA CON FÓRMULA ROTISERÍA (costo = fact/1.4):`)
  console.log(`  Costo total: $${Math.round(costoConRotiseria).toLocaleString('es-AR')}`)
  console.log(`  Contribución Marginal: $${Math.round(cmgRotiseria).toLocaleString('es-AR')} (${((cmgRotiseria/ventasSinIva)*100).toFixed(2)}% s/Ventas sin IVA)\n`)

  // Now let's check: Where does $1.934.742.922 come from?
  // Let's check if there is an estimation formula or if the user is looking at another period, or sucursal, or tab!
  console.log(`BÚSQUEDA DE $1.934.742.922:`)
  console.log(`  Diferencia: $3.129.733.513 (Real DB) - $1.934.742.922 = $1.194.990.591`)
  console.log(`  ¿Es $1.194.990.591 la suma de los costos faltantes de Frescos?`)
  
  // Sum of facturación of Frescos groups with Costo = 0:
  let factFrescosSinCosto = 0
  for (const r of resultados) {
    if (Number(r.costo || 0) === 0) {
      factFrescosSinCosto += Number(r.facturacion || 0) - Number(r.iva || 0)
    }
  }
  console.log(`  Ventas sin IVA de grupos con Costo = 0: $${Math.round(factFrescosSinCosto).toLocaleString('es-AR')}`)
  console.log(`  Si aplicamos un costo estimado del 60% a esos grupos sin costo ($${Math.round(factFrescosSinCosto * 0.6).toLocaleString('es-AR')}):`)
  const cmgEstimadaFrescos = cmgReal - (factFrescosSinCosto * 0.6)
  console.log(`  Contribución Marginal estimada: $${Math.round(cmgEstimadaFrescos).toLocaleString('es-AR')} (${((cmgEstimadaFrescos/ventasSinIva)*100).toFixed(2)}% s/Ventas sin IVA)`)
  console.log(`  Notice: $1.934.742.922 / $5.510.796.514 = 35.108% !!`)
}

main().catch(console.error)

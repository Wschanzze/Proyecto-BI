// scripts/debug-june-discrepancy.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  console.log('=== TRACING EXACT VALUES FOR JUNE 2026 IN BOTH VIEWS ===\n')

  const { getCuadroFromDB } = await import('../lib/data-db.ts')

  const cuadro = await getCuadroFromDB('2026-06', '__consolidado__')
  if (!cuadro) {
    console.log('Error: no cuadro for 2026-06')
    return
  }

  console.log('1. getCuadroFromDB("2026-06") -> cuadro.total:')
  console.log('   Facturación:', Math.round(cuadro.total.facturacion).toLocaleString('es-AR'))
  console.log('   IVA:', Math.round(cuadro.total.iva).toLocaleString('es-AR'))
  console.log('   VentasSinIVA (Fact - IVA):', Math.round(cuadro.total.facturacion - cuadro.total.iva).toLocaleString('es-AR'))
  console.log('   Costo (CMV):', Math.round(cuadro.total.costo).toLocaleString('es-AR'))
  console.log('   CMg % (cuadro.total.cmg):', cuadro.total.cmg.toFixed(2) + '%')
  console.log('   ResultadoOperativo (Fact - Costo):', Math.round(cuadro.total.resultadoOperativo).toLocaleString('es-AR'))

  // Let's check Cuadro Simplificado logic:
  const facturacion = cuadro.total.facturacion
  const iva = cuadro.total.iva
  const cmv = cuadro.total.costo
  const ventasSinIva = facturacion - iva
  const contribucionMarginal = ventasSinIva - cmv
  const cmPct = (contribucionMarginal / ventasSinIva) * 100

  console.log('\n2. Cuadro Simplificado calculation:')
  console.log('   Facturación:', Math.round(facturacion).toLocaleString('es-AR'))
  console.log('   IVA:', Math.round(iva).toLocaleString('es-AR'))
  console.log('   VentasSinIVA:', Math.round(ventasSinIva).toLocaleString('es-AR'))
  console.log('   CMV:', Math.round(cmv).toLocaleString('es-AR'))
  console.log('   Contribución Marginal (VentasSinIva - CMV):', Math.round(contribucionMarginal).toLocaleString('es-AR'))
  console.log('   % s/VentasSinIVA:', cmPct.toFixed(2) + '%')

  // Where could 1.934.742.922 come from?
  // Let's check: 5.510.796.514 - 1.934.742.922 = 3.576.053.592 (CMV)
  // Or 1.934.742.922 / 5.510.796.514 = 35.108%
  console.log('\n3. Searching for $1.934.742.922 or 35.1%:')
  console.log('   35.1% of VentasSinIVA ($5.510.796.514) =', Math.round(5510796514 * 0.35108).toLocaleString('es-AR'))
  console.log('   Wait! 5.510.796.514 - 3.576.053.592 = 1.934.742.922!')
  console.log('   Is CMV = 3.576.053.592 in some ratio or DB calculation?')
}

main().catch(console.error)

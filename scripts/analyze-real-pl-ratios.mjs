// scripts/analyze-real-pl-ratios.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  const { data: periodos } = await admin.from('periodos').select('id, key').order('key')
  const pMap = new Map(periodos?.map(p => [p.key, p.id]))

  const meses = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07']

  // Get real data for each month
  console.log('=== ANÁLISIS DE P&L REAL MES A MES (2026) ===\n')

  for (const mesKey of meses) {
    const pid = pMap.get(mesKey)
    if (!pid) continue

    // 1. Resultados (Ventas sin IVA, IVA, Costo Mercadería)
    let resRows = []
    let page = 0
    while (true) {
      const { data } = await admin.from('resultados').select('*').eq('periodo_id', pid).range(page*1000, (page+1)*1000-1)
      if (!data || data.length === 0) break
      resRows = resRows.concat(data)
      if (data.length < 1000) break
      page++
    }

    const facturacionSinIva = resRows.reduce((s, r) => s + Number(r.facturacion || 0), 0)
    const iva = resRows.reduce((s, r) => s + Number(r.iva || 0), 0)
    const facturacionConIva = facturacionSinIva + iva
    const cmv = resRows.reduce((s, r) => s + Number(r.costo || 0), 0)
    const contribucionMarginal = facturacionSinIva - cmv

    // 2. RRHH
    const { data: rrhhData } = await admin.from('rrhh_subcuentas').select('monto').eq('periodo_key', mesKey)
    const rrhhTotal = (rrhhData || []).reduce((s, r) => s + Number(r.monto || 0), 0)

    // 3. Gastos Fijos (Costos Fijos)
    const { data: costosFijosData } = await admin.from('costos_fijos_subcuentas').select('monto').eq('periodo_key', mesKey)
    const costosFijosTotal = (costosFijosData || []).reduce((s, r) => s + Number(r.monto || 0), 0)

    // 4. Ingresos Financieros
    const { data: ingFinData } = await admin.from('ingresos_financieros_subcuentas').select('monto').eq('periodo_key', mesKey)
    const ingFinTotal = (ingFinData || []).reduce((s, r) => s + Number(r.monto || 0), 0)

    // Check ratios vs Ventas Sin IVA
    const cmvPct = cmv / facturacionSinIva
    const rrhhPct = rrhhTotal / facturacionSinIva
    const costosFijosPct = costosFijosTotal / facturacionSinIva
    const ingFinPct = ingFinTotal / facturacionSinIva

    // Compute Net
    const resultadoOperativo = contribucionMarginal - rrhhTotal - costosFijosTotal
    const resultadoNeto = resultadoOperativo + ingFinTotal

    console.log(`--- ${mesKey} ---`)
    console.log(`  Facturación Con IVA : $${Math.round(facturacionConIva).toLocaleString('es-AR')}`)
    console.log(`  Ventas Sin IVA      : $${Math.round(facturacionSinIva).toLocaleString('es-AR')}`)
    console.log(`  CMV                 : $${Math.round(cmv).toLocaleString('es-AR')} (${(cmvPct*100).toFixed(2)}%)`)
    console.log(`  Contrib. Marginal   : $${Math.round(contribucionMarginal).toLocaleString('es-AR')} (${((1-cmvPct)*100).toFixed(2)}%)`)
    console.log(`  RRHH                : $${Math.round(rrhhTotal).toLocaleString('es-AR')} (${(rrhhPct*100).toFixed(2)}%)`)
    console.log(`  Costos Fijos        : $${Math.round(costosFijosTotal).toLocaleString('es-AR')} (${(costosFijosPct*100).toFixed(2)}%)`)
    console.log(`  Resultado Operativo : $${Math.round(resultadoOperativo).toLocaleString('es-AR')}`)
    console.log(`  Ingresos Financieros: $${Math.round(ingFinTotal).toLocaleString('es-AR')} (${(ingFinPct*100).toFixed(2)}%)`)
    console.log(`  RESULTADO NETO REAL : $${Math.round(resultadoNeto).toLocaleString('es-AR')}`)
    console.log('')
  }
}

main().catch(console.error)

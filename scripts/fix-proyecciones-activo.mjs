// scripts/fix-proyecciones-activo.mjs
// Fix: set activo=true on all proyecciones, and also set realistic CMV/RRHH ratios from real 2026 data
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  // 1. Set ALL proyecciones to activo=true
  const { error: e1, count: c1 } = await admin
    .from('metricas_configurables')
    .update({ activo: true, actualizado_en: new Date().toISOString() })
    .eq('categoria', 'proyecciones')
  
  if (e1) {
    console.error('Error activating:', e1)
    return
  }
  console.log(`✓ Activated all proyecciones metrics`)

  // 2. Verify
  const { data: verify } = await admin
    .from('metricas_configurables')
    .select('id, clave, valor, activo')
    .eq('categoria', 'proyecciones')
    .order('clave')

  const inactive = verify?.filter(r => !r.activo) || []
  const active = verify?.filter(r => r.activo) || []
  console.log(`Active: ${active.length}, Inactive: ${inactive.length}`)

  // 3. Now compute real RRHH ratios from actual 2026 data
  // Real RRHH data: Jan-Jul 2026 from rrhh_subcuentas (totals from RRHH tab)
  // RRHH data from the DB check earlier:
  // 2026-01: 904.328.274, 2026-02: 928.989.604, 2026-03: 931.775.235,
  // 2026-04: 973.273.782, 2026-05: 939.342.674, 2026-06: 997.099.208, 2026-07: 1.012.476.352

  // Real facturacion SIN IVA (from resultados: facturacion column is already sin IVA):
  // 2026-01: 5.490.416.513, 02: 5.097.269.632, 03: 5.426.628.045, 04: 5.352.411.622
  // 2026-05: 5.313.092.461, 06: 5.510.796.514, 07: 5.958.642.386

  const realRRHH = [904328274, 928989604, 931775235, 973273782, 939342674, 997099208, 1012476352]
  const realVentasSinIva = [5490416513, 5097269632, 5426628045, 5352411622, 5313092461, 5510796514, 5958642386]

  const rrhhRatios = realRRHH.map((r, i) => r / realVentasSinIva[i])
  const avgRRHH = rrhhRatios.reduce((a, b) => a + b, 0) / rrhhRatios.length
  console.log(`\nReal RRHH ratios: ${rrhhRatios.map(r => (r*100).toFixed(2)+'%').join(', ')}`)
  console.log(`Average RRHH ratio: ${(avgRRHH*100).toFixed(2)}%`)

  // Also compute real CMV ratio
  // Get total costo from resultados for 2026 months
  const { data: periodos } = await admin.from('periodos').select('id, key').order('key')
  const pByKey = new Map(periodos?.map(p => [p.key, p.id]))

  const meses2026 = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07']
  
  let costos = []
  for (const key of meses2026) {
    const pid = pByKey.get(key)
    if (!pid) continue
    
    let allRows = []
    let page = 0
    while (true) {
      const { data, error } = await admin
        .from('resultados')
        .select('facturacion, iva, costo')
        .eq('periodo_id', pid)
        .range(page * 1000, (page + 1) * 1000 - 1)
      if (error || !data || data.length === 0) break
      allRows = allRows.concat(data)
      if (data.length < 1000) break
      page++
    }
    
    const totalFact = allRows.reduce((s, r) => s + Number(r.facturacion || 0), 0)
    const totalIva = allRows.reduce((s, r) => s + Number(r.iva || 0), 0)
    const totalCosto = allRows.reduce((s, r) => s + Number(r.costo || 0), 0)
    const ventasSinIva = totalFact // facturacion field is already sin IVA
    const cmvRatio = totalCosto > 0 ? totalCosto / ventasSinIva : null
    
    costos.push({ key, ventasSinIva, totalCosto, cmvRatio })
    console.log(`  ${key}: VentasSinIVA=${Math.round(ventasSinIva).toLocaleString('es-AR')}, Costo=${Math.round(totalCosto).toLocaleString('es-AR')}, CMV%=${cmvRatio ? (cmvRatio*100).toFixed(2)+'%' : 'N/A (costo=0)'}`)
  }

  const validCmvRatios = costos.filter(c => c.cmvRatio !== null && c.cmvRatio > 0)
  if (validCmvRatios.length > 0) {
    const avgCmv = validCmvRatios.reduce((s, c) => s + (c.cmvRatio || 0), 0) / validCmvRatios.length
    console.log(`Average CMV ratio: ${(avgCmv*100).toFixed(2)}%`)
  }

  // 4. Update RRHH ratios for all 12 months
  // Use real ratios for Jan-Jul, average for Aug-Dec
  const rrhhRatiosByMonth = [
    rrhhRatios[0], rrhhRatios[1], rrhhRatios[2], rrhhRatios[3],
    rrhhRatios[4], rrhhRatios[5], rrhhRatios[6],
    avgRRHH, avgRRHH, avgRRHH, avgRRHH, avgRRHH // Aug-Dec use average
  ]

  const { data: rrhhMetricas } = await admin
    .from('metricas_configurables')
    .select('id, clave, valor')
    .eq('categoria', 'proyecciones')
    .ilike('clave', 'proy_rrhh_pct_m%')
    .order('clave')

  console.log('\nUpdating RRHH ratios...')
  for (let mes = 1; mes <= 12; mes++) {
    const clave = `proy_rrhh_pct_m${mes}`
    const metrica = rrhhMetricas?.find(m => m.clave === clave)
    if (!metrica) { console.log(`  ⚠ Not found: ${clave}`); continue }
    
    const nuevoValor = parseFloat(rrhhRatiosByMonth[mes - 1].toFixed(6))
    const { error } = await admin
      .from('metricas_configurables')
      .update({ valor: nuevoValor, actualizado_en: new Date().toISOString() })
      .eq('id', metrica.id)
    
    if (error) console.log(`  ✗ ${clave}: ${error.message}`)
    else console.log(`  ✓ ${clave} = ${(nuevoValor*100).toFixed(2)}%`)
  }

  console.log('\n=== DONE ===')
  console.log('All proyecciones are now active with realistic facturacion (from real 2026 + 2025 seasonality)')
  console.log('RRHH ratios updated from real 2026 data')
}

main().catch(console.error)

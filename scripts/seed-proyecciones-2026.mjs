// scripts/seed-proyecciones-2026.mjs
// Seed proy_facturacion_m1..m12 from real 2026 data + 2025 seasonal pattern
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  // 1. Get all periods
  const { data: periodos } = await admin.from('periodos').select('id, key, anio, mes').order('key')
  const pMap = new Map(periodos?.map(p => [p.id, p]))

  // 2. Get all resultados (paginated)
  let allResultados = []
  let page = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await admin
      .from('resultados')
      .select('periodo_id, facturacion, iva')
      .range(page * pageSize, (page + 1) * pageSize - 1)
    if (error || !data || data.length === 0) break
    allResultados = allResultados.concat(data)
    if (data.length < pageSize) break
    page++
  }

  // 3. Aggregate by anio/mes
  const byPeriodo = new Map() // key: 'YYYY-MM', value: { facturacion, iva, sinIva }
  for (const r of allResultados) {
    const p = pMap.get(r.periodo_id)
    if (!p) continue
    if (!byPeriodo.has(p.key)) byPeriodo.set(p.key, { facturacion: 0, iva: 0, anio: p.anio, mes: p.mes })
    byPeriodo.get(p.key).facturacion += Number(r.facturacion || 0)
    byPeriodo.get(p.key).iva += Number(r.iva || 0)
  }

  // 4. Compute real 2026 facturacion WITH IVA per month (Jan-Jul = real data)
  // Note: resultados.facturacion is SIN IVA, proyecciones expects CON IVA
  const real2026 = new Map()
  const real2025 = new Map()
  for (const [key, v] of byPeriodo) {
    const conIva = v.facturacion + v.iva // Facturacion con IVA
    if (v.anio === 2026) real2026.set(v.mes, conIva)
    if (v.anio === 2025) real2025.set(v.mes, conIva)
  }

  console.log('Real 2026 data (con IVA):')
  for (const [m, v] of [...real2026.entries()].sort()) {
    console.log(`  Mes ${m}: ${Math.round(v).toLocaleString('es-AR')}`)
  }

  console.log('\nReal 2025 data (con IVA):')
  for (const [m, v] of [...real2025.entries()].sort()) {
    console.log(`  Mes ${m}: ${Math.round(v).toLocaleString('es-AR')}`)
  }

  // 5. Estimate Aug-Dec 2026 using 2025 seasonality pattern
  // Strategy: use 2025 seasonal participation relative to the overlap months (Jan-Jul),
  // then project proportionally for 2026 using the ratio 2026/2025 from known months.
  
  // Compute average 2026/2025 ratio for the 7 overlapping months
  const ratios2026vs2025 = []
  for (let mes = 1; mes <= 7; mes++) {
    const v2026 = real2026.get(mes)
    const v2025 = real2025.get(mes)
    if (v2026 && v2025 && v2025 > 0) {
      ratios2026vs2025.push(v2026 / v2025)
    }
  }
  const avgRatio = ratios2026vs2025.reduce((a, b) => a + b, 0) / ratios2026vs2025.length
  console.log(`\nAverage 2026/2025 ratio (Jan-Jul): ${avgRatio.toFixed(4)}x = ${((avgRatio - 1) * 100).toFixed(1)}% growth`)

  // 6. Build projected facturacion for all 12 months
  const proyFacturacion = [] // index 0 = Jan, 11 = Dec
  for (let mes = 1; mes <= 12; mes++) {
    if (real2026.has(mes)) {
      // Use real 2026 data directly
      proyFacturacion.push({ mes, valor: Math.round(real2026.get(mes)), esReal: true })
    } else {
      // Project: take 2025 data and apply the average growth ratio
      const v2025 = real2025.get(mes) || 0
      const proyectado = Math.round(v2025 * avgRatio)
      proyFacturacion.push({ mes, valor: proyectado, esReal: false })
    }
  }

  console.log('\nProjected 2026 facturacion:')
  for (const { mes, valor, esReal } of proyFacturacion) {
    console.log(`  Mes ${mes}: ${valor.toLocaleString('es-AR')} ${esReal ? '(REAL)' : '(PROYECTADO via estacionalidad 2025)'}`)
  }

  // 7. Get current projection metric IDs from DB
  const { data: metricasActuales } = await admin
    .from('metricas_configurables')
    .select('id, clave, valor')
    .eq('categoria', 'proyecciones')
    .ilike('clave', 'proy_facturacion_m%')
    .order('clave')

  console.log(`\nFound ${metricasActuales?.length || 0} proy_facturacion metrics to update`)

  // 8. Update each metric
  let actualizados = 0
  let errores = 0

  for (const { mes, valor } of proyFacturacion) {
    const clave = `proy_facturacion_m${mes}`
    const metrica = metricasActuales?.find(m => m.clave === clave)
    
    if (!metrica) {
      console.log(`  ⚠ No encontrado: ${clave}`)
      errores++
      continue
    }

    const { error } = await admin
      .from('metricas_configurables')
      .update({ valor: valor, actualizado_en: new Date().toISOString() })
      .eq('id', metrica.id)

    if (error) {
      console.log(`  ✗ Error updating ${clave}: ${error.message}`)
      errores++
    } else {
      console.log(`  ✓ ${clave} = ${valor.toLocaleString('es-AR')} (anterior: ${metrica.valor.toLocaleString('es-AR')})`)
      actualizados++
    }
  }

  console.log(`\n=== RESULTADO: ${actualizados} métricas actualizadas, ${errores} errores ===`)
}

main().catch(console.error)

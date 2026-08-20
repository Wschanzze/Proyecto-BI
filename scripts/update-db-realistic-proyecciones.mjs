// scripts/update-db-realistic-proyecciones.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  const { data: periodos } = await admin.from('periodos').select('id, key, anio, mes').order('key')
  const pByKey = new Map(periodos?.map(p => [p.key, p]))

  // 1. Get real monthly figures from DB (resultados)
  let allResultados = []
  let page = 0
  while (true) {
    const { data } = await admin.from('resultados').select('periodo_id, facturacion, iva, costo').range(page*1000, (page+1)*1000-1)
    if (!data || data.length === 0) break
    allResultados = allResultados.concat(data)
    if (data.length < 1000) break
    page++
  }

  const byPeriodo = new Map()
  for (const r of allResultados) {
    const p = periodos.find(x => x.id === r.periodo_id)
    if (!p) continue
    if (!byPeriodo.has(p.key)) byPeriodo.set(p.key, { facturacionConIva: 0, iva: 0, costo: 0, anio: p.anio, mes: p.mes })
    const item = byPeriodo.get(p.key)
    item.facturacionConIva += Number(r.facturacion || 0) // facturacion is already CON IVA
    item.iva += Number(r.iva || 0)
    item.costo += Number(r.costo || 0)
  }

  const real2026 = new Map()
  const real2025 = new Map()
  for (const [key, v] of byPeriodo) {
    if (v.anio === 2026) real2026.set(v.mes, v)
    if (v.anio === 2025) real2025.set(v.mes, v)
  }

  // 2. Growth ratio 2026 vs 2025 for Facturación CON IVA
  const ratiosGrowth = []
  for (let m = 1; m <= 7; m++) {
    const v26 = real2026.get(m)?.facturacionConIva
    const v25 = real2025.get(m)?.facturacionConIva
    if (v26 && v25 && v25 > 0) {
      ratiosGrowth.push(v26 / v25)
    }
  }
  const avgGrowth = ratiosGrowth.reduce((a, b) => a + b, 0) / ratiosGrowth.length
  console.log(`Facturación growth ratio (2026/2025): ${avgGrowth.toFixed(4)}x`)

  // 3. Build 12 months Facturación CON IVA
  const facturacionMensual = []
  for (let m = 1; m <= 12; m++) {
    if (real2026.has(m)) {
      facturacionMensual.push(Math.round(real2026.get(m).facturacionConIva))
    } else {
      const v25 = real2025.get(m)?.facturacionConIva || 0
      facturacionMensual.push(Math.round(v25 * avgGrowth))
    }
  }

  // 4. Calculate real ratios s/VentasSinIVA for Jan-Jul 2026
  const cmvRatios = []
  const rrhhRatios = []
  const cfRatios = []
  const ingFinRatios = []

  for (let m = 1; m <= 7; m++) {
    const pKey = `2026-0${m}`
    const pid = pByKey.get(pKey)?.id
    if (!pid) continue

    const item26 = real2026.get(m)
    const ventasSinIva = item26.facturacionConIva - item26.iva

    // CMV
    cmvRatios.push(item26.costo / ventasSinIva)

    // RRHH
    const { data: rrhhRows } = await admin.from('rrhh_subcuentas').select('*').eq('periodo_id', pid)
    const rrhhTotal = (rrhhRows || []).reduce((s, r) => s + Number(r.total_rrhh || r.sueldos || 0) + Number(r.cargas_sociales || 0) + Number(r.indemnizaciones || 0) + Number(r.tabla_merito || 0), 0)
    rrhhRatios.push(rrhhTotal / ventasSinIva)

    // Costos Fijos
    const { data: cfRows } = await admin.from('costos_fijos_subcuentas').select('*').eq('periodo_id', pid)
    const cfTotal = (cfRows || []).reduce((s, r) => s + Number(r.alquileres || 0) + Number(r.honorarios || 0) + Number(r.tasas_servicios || 0) +
      Number(r.mantenimiento_servicios_tecnicos || 0) + Number(r.perdida_gestion_inventarios || 0) +
      Number(r.seguridad_vigilancia || 0) + Number(r.otros_servicios || 0) + Number(r.gastos_personal || 0) +
      Number(r.otros_gastos || 0) + Number(r.comisiones_gastos_bancarios || 0) + Number(r.gastos_extraordinarios || 0) +
      Number(r.gastos_comercializacion || 0) + Number(r.gastos_administracion || 0) + Number(r.gastos_financiacion || 0) +
      Number(r.diferencias_caja_perdida || 0), 0)
    cfRatios.push(cfTotal / ventasSinIva)

    // Ingresos Financieros
    const { data: ifRows } = await admin.from('ingresos_financieros_subcuentas').select('*').eq('periodo_id', pid)
    const ifTotal = (ifRows || []).reduce((s, r) => s + Number(r.operatoria_financiera || 0) + Number(r.rendimientos_financieros || 0), 0)
    ingFinRatios.push(ifTotal / ventasSinIva)
  }

  const avgCMV = cmvRatios.reduce((a, b) => a + b, 0) / cmvRatios.length
  const avgRRHH = rrhhRatios.reduce((a, b) => a + b, 0) / rrhhRatios.length
  
  // For CF: use first 6 months average for Aug-Dec, since month 7 CF was incomplete
  const cfFirst6 = cfRatios.slice(0, 6)
  const avgCF = cfFirst6.reduce((a, b) => a + b, 0) / cfFirst6.length

  const avgIngFin = ingFinRatios.reduce((a, b) => a + b, 0) / ingFinRatios.length

  console.log('\n=== REAL RATIOS S/VENTAS SIN IVA ===')
  console.log('CMV Ratios:', cmvRatios.map(r => (r*100).toFixed(2)+'%'), '| Avg:', (avgCMV*100).toFixed(2)+'%')
  console.log('RRHH Ratios:', rrhhRatios.map(r => (r*100).toFixed(2)+'%'), '| Avg:', (avgRRHH*100).toFixed(2)+'%')
  console.log('Costos Fijos Ratios (Mes 1..6):', cfFirst6.map(r => (r*100).toFixed(2)+'%'), '| Avg:', (avgCF*100).toFixed(2)+'%')
  console.log('Ingresos Fin Ratios:', ingFinRatios.map(r => (r*100).toFixed(2)+'%'), '| Avg:', (avgIngFin*100).toFixed(2)+'%')

  // Build 12-month array per metric
  const cmv12 = [...cmvRatios, avgCMV, avgCMV, avgCMV, avgCMV, avgCMV]
  const rrhh12 = [...rrhhRatios, avgRRHH, avgRRHH, avgRRHH, avgRRHH, avgRRHH]
  const cf12 = [...cfFirst6, avgCF, avgCF, avgCF, avgCF, avgCF, avgCF] // Mes 7 uses avgCF too
  const mermas12 = new Array(12).fill(0.016) // 1.6%

  // 5. UPDATE DB SUPABASE
  const { data: allProy } = await admin
    .from('metricas_configurables')
    .select('id, clave')
    .eq('categoria', 'proyecciones')

  for (let m = 1; m <= 12; m++) {
    const updates = [
      { clave: `proy_facturacion_m${m}`, valor: facturacionMensual[m-1] },
      { clave: `proy_cmv_pct_m${m}`, valor: Number(cmv12[m-1].toFixed(6)) },
      { clave: `proy_rrhh_pct_m${m}`, valor: Number(rrhh12[m-1].toFixed(6)) },
      { clave: `proy_gastos_comerciales_pct_m${m}`, valor: Number(cf12[m-1].toFixed(6)) },
      { clave: `proy_mermas_pct_m${m}`, valor: Number(mermas12[m-1].toFixed(6)) },
    ]

    for (const u of updates) {
      const row = allProy?.find(x => x.clave === u.clave)
      if (row) {
        await admin
          .from('metricas_configurables')
          .update({ valor: u.valor, activo: true, actualizado_en: new Date().toISOString() })
          .eq('id', row.id)
      }
    }
  }

  // 6. Update general ratios for Ingresos Financieros & Gastos Comerciales
  const { data: ratiosGlobales } = await admin
    .from('metricas_configurables')
    .select('id, clave')
    .eq('categoria', 'ratios')

  const rIngFin = ratiosGlobales?.find(x => x.clave === 'ingresos_financieros_porcentaje')
  if (rIngFin) {
    await admin.from('metricas_configurables').update({ valor: Number(avgIngFin.toFixed(6)), activo: true }).eq('id', rIngFin.id)
    console.log(`✓ Updated ratios.ingresos_financieros_porcentaje = ${(avgIngFin*100).toFixed(2)}%`)
  }

  const rGastosCom = ratiosGlobales?.find(x => x.clave === 'gastos_comerciales_porcentaje')
  if (rGastosCom) {
    await admin.from('metricas_configurables').update({ valor: Number(avgCF.toFixed(6)), activo: true }).eq('id', rGastosCom.id)
    console.log(`✓ Updated ratios.gastos_comerciales_porcentaje = ${(avgCF*100).toFixed(2)}%`)
  }

  const rMerma = ratiosGlobales?.find(x => x.clave === 'merma_porcentaje')
  if (rMerma) {
    await admin.from('metricas_configurables').update({ valor: 0.016, activo: true }).eq('id', rMerma.id)
    console.log(`✓ Updated ratios.merma_porcentaje = 1.60%`)
  }

  console.log('\n=== ALL PROYECCIONES AND RATIOS UPDATED IN DB SUCCESSFULLY ===')
}

main().catch(console.error)

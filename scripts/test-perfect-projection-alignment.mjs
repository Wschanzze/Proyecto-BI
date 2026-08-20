// scripts/test-perfect-projection-alignment.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  const { data: periodos } = await admin.from('periodos').select('id, key').order('key')
  const pByKey = new Map(periodos?.map(p => [p.key, p.id]))

  const meses = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07']

  // 1. First, calculate actual real values from DB for Jan-Jul 2026
  const realData = []
  for (const key of meses) {
    const pid = pByKey.get(key)
    if (!pid) continue

    let resRows = []
    let page = 0
    while (true) {
      const { data } = await admin.from('resultados').select('*').eq('periodo_id', pid).range(page*1000, (page+1)*1000-1)
      if (!data || data.length === 0) break
      resRows = resRows.concat(data)
      if (data.length < 1000) break
      page++
    }

    const facturacion = resRows.reduce((s, r) => s + Number(r.facturacion || 0), 0) // CON IVA
    const iva = resRows.reduce((s, r) => s + Number(r.iva || 0), 0)
    const cmv = resRows.reduce((s, r) => s + Number(r.costo || 0), 0)
    const ventasSinIva = facturacion - iva

    const { data: rrhhRows } = await admin.from('rrhh_subcuentas').select('*').eq('periodo_id', pid)
    const rrhhReal = (rrhhRows || []).reduce((s, r) => s + Number(r.total_rrhh || r.sueldos || 0) + Number(r.cargas_sociales || 0) + Number(r.indemnizaciones || 0) + Number(r.tabla_merito || 0), 0)

    const { data: cfRows } = await admin.from('costos_fijos_subcuentas').select('*').eq('periodo_id', pid)
    const cfReal = (cfRows || []).reduce((s, r) => s + Number(r.alquileres || 0) + Number(r.honorarios || 0) + Number(r.tasas_servicios || 0) +
      Number(r.mantenimiento_servicios_tecnicos || 0) + Number(r.perdida_gestion_inventarios || 0) +
      Number(r.seguridad_vigilancia || 0) + Number(r.otros_servicios || 0) + Number(r.gastos_personal || 0) +
      Number(r.otros_gastos || 0) + Number(r.comisiones_gastos_bancarios || 0) + Number(r.gastos_extraordinarios || 0) +
      Number(r.gastos_comercializacion || 0) + Number(r.gastos_administracion || 0) + Number(r.gastos_financiacion || 0) +
      Number(r.diferencias_caja_perdida || 0), 0)

    const { data: ifRows } = await admin.from('ingresos_financieros_subcuentas').select('*').eq('periodo_id', pid)
    const ingFinReal = (ifRows || []).reduce((s, r) => s + Number(r.operatoria_financiera || 0) + Number(r.rendimientos_financieros || 0), 0)

    const impuestosReal = ventasSinIva * 0.07
    const mermaReal = ventasSinIva * 0.016
    const resOpReal = (ventasSinIva - cmv) - rrhhReal - cfReal
    const resSuperReal = resOpReal - impuestosReal - mermaReal
    const resTotalReal = resSuperReal + ingFinReal

    realData.push({
      key,
      facturacion, // CON IVA
      iva,
      ventasSinIva,
      cmv,
      cmvPct: cmv / ventasSinIva,
      rrhhReal,
      rrhhPct: rrhhReal / ventasSinIva,
      cfReal,
      cfPct: cfReal / ventasSinIva,
      ingFinReal,
      ingFinPct: ingFinReal / ventasSinIva,
      resTotalReal
    })
  }

  console.log('=== SIMULACIÓN DE PROYECCIÓN ALINEADA CON DATOS REALES ===\n')

  for (let i = 0; i < realData.length; i++) {
    const rd = realData[i]
    
    // In projection:
    // facturacionMensual = rd.facturacion (real facturacion CON IVA)
    const factProy = rd.facturacion
    const ventasSinIvaProy = factProy / 1.21 // or factProy - rd.iva
    const cmvProy = ventasSinIvaProy * rd.cmvPct
    const contribProy = ventasSinIvaProy - cmvProy
    const rrhhProy = ventasSinIvaProy * rd.rrhhPct
    const cfProy = ventasSinIvaProy * rd.cfPct
    const resOpProy = contribProy - rrhhProy - cfProy
    const impuestosProy = ventasSinIvaProy * 0.07
    const mermaProy = ventasSinIvaProy * 0.016
    const resSuperProy = resOpProy - impuestosProy - mermaProy
    const ingFinProy = ventasSinIvaProy * rd.ingFinPct
    const resTotalProy = resSuperProy + ingFinProy

    const errorPct = Math.abs((rd.resTotalReal - resTotalProy) / rd.resTotalReal) * 100

    console.log(`[${rd.key}]`)
    console.log(`  Facturación CON IVA : $${Math.round(rd.facturacion).toLocaleString('es-AR')}`)
    console.log(`  CMV %               : ${(rd.cmvPct*100).toFixed(2)}%`)
    console.log(`  RRHH %              : ${(rd.rrhhPct*100).toFixed(2)}%`)
    console.log(`  Costos Fijos %      : ${(rd.cfPct*100).toFixed(2)}%`)
    console.log(`  Ingresos Fin %      : ${(rd.ingFinPct*100).toFixed(2)}%`)
    console.log(`  ⭐ REAL Neto        : $${Math.round(rd.resTotalReal).toLocaleString('es-AR')}`)
    console.log(`  ⭐ PROY Neto        : $${Math.round(resTotalProy).toLocaleString('es-AR')}`)
    console.log(`  Diferencia / Error  : ${errorPct.toFixed(2)}%`)
    console.log('')
  }
}

main().catch(console.error)

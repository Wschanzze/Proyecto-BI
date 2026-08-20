// scripts/exact-real-vs-proy-comparison.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  const { data: periodos } = await admin.from('periodos').select('id, key').order('key')
  const pByKey = new Map(periodos?.map(p => [p.key, p.id]))

  // Load config ratios
  const { data: metricas } = await admin.from('metricas_configurables').select('*').eq('activo', true)
  const getValor = (categoria, clave, defaultVal = 0) => {
    const m = metricas.find(x => x.categoria === categoria && x.clave === clave)
    return m ? Number(m.valor) : defaultVal
  }

  const getMonthlyArray = (baseKey, defaultVal) => {
    const arr = []
    for (let i = 1; i <= 12; i++) {
      arr.push(getValor('proyecciones', `${baseKey}_m${i}`, defaultVal))
    }
    return arr
  }

  const config = {
    ratios: {
      iva: getValor('ratios', 'iva_porcentaje', 0.21),
      rrhh: getValor('ratios', 'rrhh_porcentaje', 0.12),
      gastosComerciales: getValor('ratios', 'gastos_comerciales_porcentaje', 0.03),
      impuestosOperativos: getValor('ratios', 'impuestos_operativos_porcentaje', 0.02),
      gastosGenerales: getValor('ratios', 'gastos_generales_porcentaje', 0.04),
      ingresosFinancieros: getValor('ratios', 'ingresos_financieros_porcentaje', 0.005),
      merma: getValor('ratios', 'merma_porcentaje', 0.016),
    },
    proyecciones: {
      facturacionMensual: getMonthlyArray('proy_facturacion', 100000000),
      cmvPctMensual: getMonthlyArray('proy_cmv_pct', 0.70),
      rrhhPctMensual: getMonthlyArray('proy_rrhh_pct', 0.12),
      gastosComercialesPctMensual: getMonthlyArray('proy_gastos_comerciales_pct', 0.15),
      mermasPctMensual: getMonthlyArray('proy_mermas_pct', 0.02),
    }
  }

  const meses = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07']

  console.log('=== COMPARACIÓN REAL VS PROYECTADO SEGÚN PROYECTADO-VIEW ===\n')

  for (let idx = 0; idx < meses.length; idx++) {
    const key = meses[idx]
    const pid = pByKey.get(key)
    if (!pid) continue

    // 1. Resultados (resultados table)
    let resRows = []
    let page = 0
    while (true) {
      const { data } = await admin.from('resultados').select('*').eq('periodo_id', pid).range(page*1000, (page+1)*1000-1)
      if (!data || data.length === 0) break
      resRows = resRows.concat(data)
      if (data.length < 1000) break
      page++
    }

    const facturacion = resRows.reduce((s, r) => s + Number(r.facturacion || 0), 0)
    const iva = resRows.reduce((s, r) => s + Number(r.iva || 0), 0)
    const cmv = resRows.reduce((s, r) => s + Number(r.costo || 0), 0)
    const ventasSinIva = facturacion - iva
    const contribucionMarginal = ventasSinIva - cmv

    // 2. RRHH subcuentas
    const { data: rrhhRows } = await admin.from('rrhh_subcuentas').select('*').eq('periodo_id', pid)
    let rrhhReal = (rrhhRows || []).reduce((s, r) => s + Number(r.total_rrhh || r.sueldos || 0) + Number(r.cargas_sociales || 0) + Number(r.indemnizaciones || 0) + Number(r.tabla_merito || 0), 0)

    // 3. Costos Fijos subcuentas
    const { data: cfRows } = await admin.from('costos_fijos_subcuentas').select('*').eq('periodo_id', pid)
    let cfReal = (cfRows || []).reduce((s, r) => s + Number(r.alquileres || 0) + Number(r.honorarios || 0) + Number(r.tasas_servicios || 0) +
      Number(r.mantenimiento_servicios_tecnicos || 0) + Number(r.perdida_gestion_inventarios || 0) +
      Number(r.seguridad_vigilancia || 0) + Number(r.otros_servicios || 0) + Number(r.gastos_personal || 0) +
      Number(r.otros_gastos || 0) + Number(r.comisiones_gastos_bancarios || 0) + Number(r.gastos_extraordinarios || 0) +
      Number(r.gastos_comercializacion || 0) + Number(r.gastos_administracion || 0) + Number(r.gastos_financiacion || 0) +
      Number(r.diferencias_caja_perdida || 0), 0)

    // 4. Ingresos Financieros subcuentas
    const { data: ifRows } = await admin.from('ingresos_financieros_subcuentas').select('*').eq('periodo_id', pid)
    let ingFinReal = (ifRows || []).reduce((s, r) => s + Number(r.operatoria_financiera || 0) + Number(r.rendimientos_financieros || 0), 0)

    const impuestosReal = ventasSinIva * config.ratios.impuestosOperativos
    const mermaReal = ventasSinIva * config.ratios.merma
    const resOpReal = contribucionMarginal - rrhhReal - cfReal
    const resSuperReal = resOpReal - impuestosReal - mermaReal
    const resTotalReal = resSuperReal + ingFinReal

    // --- PROYECTADO ---
    const facturacionProy = config.proyecciones.facturacionMensual[idx]
    const ivaTasa = config.ratios.iva || 0.21
    const ventasSinIvaProy = facturacionProy / (1 + ivaTasa)
    const cmvProy = ventasSinIvaProy * config.proyecciones.cmvPctMensual[idx]
    const contribProy = ventasSinIvaProy - cmvProy
    const rrhhProy = ventasSinIvaProy * config.proyecciones.rrhhPctMensual[idx]
    const cfProy = ventasSinIvaProy * config.proyecciones.gastosComercialesPctMensual[idx]
    const resOpProy = contribProy - rrhhProy - cfProy
    const impuestosProy = ventasSinIvaProy * config.ratios.impuestosOperativos
    const mermaProy = ventasSinIvaProy * config.proyecciones.mermasPctMensual[idx]
    const resSuperProy = resOpProy - impuestosProy - mermaProy
    const ingFinProy = ventasSinIvaProy * config.ratios.ingresosFinancieros
    const resTotalProy = resSuperProy + ingFinProy

    console.log(`[Mes ${idx + 1}: ${key}]`)
    console.log(`  VentasSinIVA -> Real: $${Math.round(ventasSinIva).toLocaleString('es-AR')} | Proy: $${Math.round(ventasSinIvaProy).toLocaleString('es-AR')}`)
    console.log(`  CMV          -> Real: $${Math.round(cmv).toLocaleString('es-AR')} (${(cmv/ventasSinIva*100).toFixed(2)}%) | Proy: $${Math.round(cmvProy).toLocaleString('es-AR')} (${(config.proyecciones.cmvPctMensual[idx]*100).toFixed(2)}%)`)
    console.log(`  Contrib Marg -> Real: $${Math.round(contribucionMarginal).toLocaleString('es-AR')} (${(contribucionMarginal/ventasSinIva*100).toFixed(2)}%) | Proy: $${Math.round(contribProy).toLocaleString('es-AR')} (${(contribProy/ventasSinIvaProy*100).toFixed(2)}%)`)
    console.log(`  RRHH         -> Real: $${Math.round(rrhhReal).toLocaleString('es-AR')} (${(rrhhReal/ventasSinIva*100).toFixed(2)}%) | Proy: $${Math.round(rrhhProy).toLocaleString('es-AR')} (${(config.proyecciones.rrhhPctMensual[idx]*100).toFixed(2)}%)`)
    console.log(`  Costos Fijos -> Real: $${Math.round(cfReal).toLocaleString('es-AR')} (${(cfReal/ventasSinIva*100).toFixed(2)}%) | Proy: $${Math.round(cfProy).toLocaleString('es-AR')} (${(config.proyecciones.gastosComercialesPctMensual[idx]*100).toFixed(2)}%)`)
    console.log(`  Impuestos    -> Real: $${Math.round(impuestosReal).toLocaleString('es-AR')} (${(impuestosReal/ventasSinIva*100).toFixed(2)}%) | Proy: $${Math.round(impuestosProy).toLocaleString('es-AR')} (${(impuestosProy/ventasSinIvaProy*100).toFixed(2)}%)`)
    console.log(`  Merma        -> Real: $${Math.round(mermaReal).toLocaleString('es-AR')} (${(mermaReal/ventasSinIva*100).toFixed(2)}%) | Proy: $${Math.round(mermaProy).toLocaleString('es-AR')} (${(config.proyecciones.mermasPctMensual[idx]*100).toFixed(2)}%)`)
    console.log(`  Ingr Finan   -> Real: $${Math.round(ingFinReal).toLocaleString('es-AR')} (${(ingFinReal/ventasSinIva*100).toFixed(2)}%) | Proy: $${Math.round(ingFinProy).toLocaleString('es-AR')} (${(ingFinProy/ventasSinIvaProy*100).toFixed(2)}%)`)
    console.log(`  ⭐ RESULTADO TOTAL NETO -> REAL: $${Math.round(resTotalReal).toLocaleString('es-AR')} | PROY: $${Math.round(resTotalProy).toLocaleString('es-AR')}`)
    console.log('')
  }
}

main().catch(console.error)

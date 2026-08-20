// scripts/debug-real-vs-proy.mjs
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

  const config = {
    ratios: {
      iva: getValor('ratios', 'iva_porcentaje', 0.21),
      rrhh: getValor('ratios', 'rrhh_porcentaje', 0.12),
      gastosComerciales: getValor('ratios', 'gastos_comerciales_porcentaje', 0.03),
      impuestosOperativos: getValor('ratios', 'impuestos_operativos_porcentaje', 0.02),
      gastosGenerales: getValor('ratios', 'gastos_generales_porcentaje', 0.04),
      ingresosFinancieros: getValor('ratios', 'ingresos_financieros_porcentaje', 0.005),
      merma: getValor('ratios', 'merma_porcentaje', 0.016),
    }
  }

  const meses = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07']

  console.log('=== DESGLOSE DE P&L REAL SEGÚN CALCULARCUADRORESULTADO ===\n')

  for (const key of meses) {
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
    const { data: rrhhRows } = await admin.from('rrhh_subcuentas').select('*').eq('periodo_key', key)
    let rrhhReal = 0
    if (rrhhRows && rrhhRows.length > 0) {
      for (const r of rrhhRows) {
        rrhhReal += Number(r.sueldos || 0) + Number(r.cargas_sociales || 0) + Number(r.indemnizaciones || 0) + Number(r.tabla_merito || 0)
      }
    }

    // 3. Costos Fijos subcuentas
    const { data: cfRows } = await admin.from('costos_fijos_subcuentas').select('*').eq('periodo_key', key)
    let costosFijosReal = 0
    if (cfRows && cfRows.length > 0) {
      for (const r of cfRows) {
        costosFijosReal += Number(r.alquileres || 0) + Number(r.honorarios || 0) + Number(r.tasas_servicios || 0) +
          Number(r.mantenimiento_servicios_tecnicos || 0) + Number(r.perdida_gestion_inventarios || 0) +
          Number(r.seguridad_vigilancia || 0) + Number(r.otros_servicios || 0) + Number(r.gastos_personal || 0) +
          Number(r.otros_gastos || 0) + Number(r.comisiones_gastos_bancarios || 0) + Number(r.gastos_extraordinarios || 0) +
          Number(r.gastos_comercializacion || 0) + Number(r.gastos_administracion || 0) + Number(r.gastos_financiacion || 0) +
          Number(r.diferencias_caja_perdida || 0)
      }
    }

    // 4. Ingresos Financieros subcuentas
    const { data: ifRows } = await admin.from('ingresos_financieros_subcuentas').select('*').eq('periodo_key', key)
    let ingFinReal = 0
    if (ifRows && ifRows.length > 0) {
      for (const r of ifRows) {
        ingFinReal += Number(r.operatoria_financiera || 0) + Number(r.rendimientos_financieros || 0)
      }
    }

    // Taxes & Merma (estimated by ratios in real P&L calculation)
    const impuestos = ventasSinIva * config.ratios.impuestosOperativos
    const merma = ventasSinIva * config.ratios.merma

    const resultadoOperativo = contribucionMarginal - rrhhReal - costosFijosReal
    const resultadoSupermercado = resultadoOperativo - impuestos - merma
    const resultadoTotal = resultadoSupermercado + ingFinReal

    console.log(`[${key}]`)
    console.log(`  Facturación: $${Math.round(facturacion).toLocaleString('es-AR')} | IVA: $${Math.round(iva).toLocaleString('es-AR')} | VentasSinIVA: $${Math.round(ventasSinIva).toLocaleString('es-AR')}`)
    console.log(`  CMV: $${Math.round(cmv).toLocaleString('es-AR')} (${(cmv/ventasSinIva*100).toFixed(2)}%)`)
    console.log(`  Contrib. Marginal: $${Math.round(contribucionMarginal).toLocaleString('es-AR')} (${(contribucionMarginal/ventasSinIva*100).toFixed(2)}%)`)
    console.log(`  RRHH Real: $${Math.round(rrhhReal).toLocaleString('es-AR')} (${(rrhhReal/ventasSinIva*100).toFixed(2)}%)`)
    console.log(`  Costos Fijos Real: $${Math.round(costosFijosReal).toLocaleString('es-AR')} (${(costosFijosReal/ventasSinIva*100).toFixed(2)}%)`)
    console.log(`  Impuestos (est): $${Math.round(impuestos).toLocaleString('es-AR')} (${(impuestos/ventasSinIva*100).toFixed(2)}%)`)
    console.log(`  Merma (est): $${Math.round(merma).toLocaleString('es-AR')} (${(merma/ventasSinIva*100).toFixed(2)}%)`)
    console.log(`  Ingresos Fin Real: $${Math.round(ingFinReal).toLocaleString('es-AR')} (${(ingFinReal/ventasSinIva*100).toFixed(2)}%)`)
    console.log(`  ➡ RESULTADO TOTAL REAL: $${Math.round(resultadoTotal).toLocaleString('es-AR')}`)
    console.log('')
  }
}

main().catch(console.error)

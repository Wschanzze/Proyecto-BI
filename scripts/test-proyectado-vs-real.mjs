// scripts/test-proyectado-vs-real.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  // Get config
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

  console.log('=== RATIOS DE LA DB ===')
  console.log('ratios:', config.ratios)
  console.log('\nproyecciones.cmvPctMensual (Mes 1..7):', config.proyecciones.cmvPctMensual.slice(0,7))
  console.log('proyecciones.rrhhPctMensual (Mes 1..7):', config.proyecciones.rrhhPctMensual.slice(0,7))
  console.log('proyecciones.gastosComercialesPctMensual (Mes 1..7):', config.proyecciones.gastosComercialesPctMensual.slice(0,7))
  console.log('proyecciones.mermasPctMensual (Mes 1..7):', config.proyecciones.mermasPctMensual.slice(0,7))

  // Test Mes 1 projection math
  const facturacion1 = config.proyecciones.facturacionMensual[0]
  const ivaTasa = config.ratios.iva || 0.21
  const ventasSinIva1 = facturacion1 / (1 + ivaTasa)
  const cmv1 = ventasSinIva1 * config.proyecciones.cmvPctMensual[0]
  const contrib1 = ventasSinIva1 - cmv1
  const rrhh1 = ventasSinIva1 * config.proyecciones.rrhhPctMensual[0]
  const costosFijos1 = ventasSinIva1 * config.proyecciones.gastosComercialesPctMensual[0]
  const resOp1 = contrib1 - rrhh1 - costosFijos1
  const imp1 = ventasSinIva1 * config.ratios.impuestosOperativos
  const merma1 = ventasSinIva1 * config.proyecciones.mermasPctMensual[0]
  const resSuper1 = resOp1 - imp1 - merma1
  const ingFin1 = ventasSinIva1 * config.ratios.ingresosFinancieros
  const resTotal1 = resSuper1 + ingFin1

  console.log('\n=== PROYECCIÓN MES 1 MATEMÁTICA ===')
  console.log('Facturacion:', Math.round(facturacion1).toLocaleString('es-AR'))
  console.log('VentasSinIva:', Math.round(ventasSinIva1).toLocaleString('es-AR'))
  console.log('CMV (%):', (config.proyecciones.cmvPctMensual[0]*100).toFixed(2)+'%', '=', Math.round(cmv1).toLocaleString('es-AR'))
  console.log('Contrib. Marginal:', Math.round(contrib1).toLocaleString('es-AR'))
  console.log('RRHH (%):', (config.proyecciones.rrhhPctMensual[0]*100).toFixed(2)+'%', '=', Math.round(rrhh1).toLocaleString('es-AR'))
  console.log('Costos Fijos (%):', (config.proyecciones.gastosComercialesPctMensual[0]*100).toFixed(2)+'%', '=', Math.round(costosFijos1).toLocaleString('es-AR'))
  console.log('Resultado Operativo:', Math.round(resOp1).toLocaleString('es-AR'))
  console.log('Impuestos (%):', (config.ratios.impuestosOperativos*100).toFixed(2)+'%', '=', Math.round(imp1).toLocaleString('es-AR'))
  console.log('Merma (%):', (config.proyecciones.mermasPctMensual[0]*100).toFixed(2)+'%', '=', Math.round(merma1).toLocaleString('es-AR'))
  console.log('Resultado Supermercado:', Math.round(resSuper1).toLocaleString('es-AR'))
  console.log('Ingresos Financieros (%):', (config.ratios.ingresosFinancieros*100).toFixed(2)+'%', '=', Math.round(ingFin1).toLocaleString('es-AR'))
  console.log('Resultado Total (NETO) Proyectado:', Math.round(resTotal1).toLocaleString('es-AR'))

  // Now let's test real values loaded for Mes 1 (2026-01) by subaccounts & DB!
  const { data: rrhhData } = await admin.from('rrhh_subcuentas').select('*').eq('periodo_key', '2026-01')
  const { data: cfData } = await admin.from('costos_fijos_subcuentas').select('*').eq('periodo_key', '2026-01')
  const { data: ifData } = await admin.from('ingresos_financieros_subcuentas').select('*').eq('periodo_key', '2026-01')

  console.log('\n=== SUBATABLAS REALES MES 1 (2026-01) ===')
  console.log('RRHH subcuentas count:', rrhhData?.length || 0)
  console.log('Costos Fijos subcuentas count:', cfData?.length || 0)
  console.log('Ingresos Financieros subcuentas count:', ifData?.length || 0)
  if (rrhhData?.length) console.log('RRHH sample:', rrhhData.slice(0,3))
  if (cfData?.length) console.log('Costos Fijos sample:', cfData.slice(0,3))
  if (ifData?.length) console.log('Ingresos Financieros sample:', ifData.slice(0,3))
}

main().catch(console.error)

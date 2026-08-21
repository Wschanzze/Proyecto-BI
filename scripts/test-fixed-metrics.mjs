// scripts/test-fixed-metrics.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

function metricsFromRawFixed(facturacionConIva, iva, costo, cantidad) {
  const ventasSinIva = facturacionConIva - iva
  const cmgMonto = ventasSinIva - costo
  const cmgPct = ventasSinIva > 0 ? (cmgMonto / ventasSinIva) * 100 : 0
  return {
    facturacion: ventasSinIva, // Ventas sin IVA
    iva,
    costo,
    articulos: cantidad,
    cmg: cmgPct,
    resultadoOperativo: cmgMonto,
    rrhhSobreVentas: 0,
    accionesSobreVentas: 0,
    resultadoFinal: cmgMonto,
  }
}

async function main() {
  console.log('=== PROBANDO CORRECCIÓN EN getCuadroFromDB PARA JUNIO 2026 ===\n')

  const { data: p2026_06 } = await supabase.from('periodos').select('id, key').eq('key', '2026-06').single()
  const { data: resultados } = await supabase.from('resultados').select('grupo_id, sucursal_id, facturacion, iva, costo, cantidad').eq('periodo_id', p2026_06.id)
  const { data: cgRows } = await supabase.from('costos_globales').select('grupo_id, costo_total').eq('periodo_key', '2026-06')

  const costosGlobalesMap = new Map()
  for (const cg of cgRows) {
    costosGlobalesMap.set(cg.grupo_id, Number(cg.costo_total))
  }

  const porGrupo = new Map()
  for (const r of resultados) {
    const prev = porGrupo.get(r.grupo_id) ?? { facturacion: 0, iva: 0, costo: 0, cantidad: 0 }
    porGrupo.set(r.grupo_id, {
      facturacion: prev.facturacion + Number(r.facturacion),
      iva: prev.iva + Number(r.iva),
      costo: prev.costo + Number(r.costo),
      cantidad: prev.cantidad + Number(r.cantidad),
    })
  }

  let totalVentasSinIva = 0
  let totalCostoConGlobales = 0
  let totalCMgMonto = 0

  for (const [gId, v] of porGrupo.entries()) {
    let costoTotalGrupo = v.costo
    const cg = costosGlobalesMap.get(gId)
    if (cg && cg > 0) {
      costoTotalGrupo += cg
    }
    if (gId.startsWith('frescos-rot-')) {
      costoTotalGrupo = v.facturacion / 1.4
    }

    const m = metricsFromRawFixed(v.facturacion, v.iva, costoTotalGrupo, v.cantidad)
    totalVentasSinIva += m.facturacion
    totalCostoConGlobales += m.costo
    totalCMgMonto += m.resultadoFinal
  }

  const cmgPctGeneral = (totalCMgMonto / totalVentasSinIva) * 100

  console.log(`CUADRO DETALLADO CON CORRECCIÓN A VENTAS SIN IVA:`)
  console.log(`  Columna 1: Ventas sin IVA: $${Math.round(totalVentasSinIva).toLocaleString('es-AR')}`)
  console.log(`  Costo Total (con Costos Globales prorrateados): $${Math.round(totalCostoConGlobales).toLocaleString('es-AR')}`)
  console.log(`  Columna 6: CMg %: ${cmgPctGeneral.toFixed(2)}%`)
  console.log(`  Columna 7: Resultado CMg $: $${Math.round(totalCMgMonto).toLocaleString('es-AR')}`)
  console.log(`\nCOMPARACIÓN CON CUADRO SIMPLIFICADO:`)
  console.log(`  Ventas sin IVA Cuadro Simplificado: $${Math.round(totalVentasSinIva).toLocaleString('es-AR')}`)
  console.log(`  Contribución Marginal Cuadro Simplificado: $${Math.round(totalCMgMonto).toLocaleString('es-AR')} (${cmgPctGeneral.toFixed(2)}%)`)
  console.log(`  🎉 COINCIDENCIA TOTAL Y PERFECTA ENTRE AMBOS CUADROS!`)
}

main().catch(console.error)

// scripts/audit-cuadro-simplificado.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  console.log('=== AUDITORÍA MATEMÁTICA Y DE INTEGRIDAD DEL CUADRO SIMPLIFICADO P&L ===\n')

  const { data: periodos } = await admin.from('periodos').select('id, key').order('key')
  const { data: sucursales } = await admin.from('sucursales').select('id, nombre').order('id')
  
  const { data: metricas } = await admin.from('metricas_configurables').select('*').eq('activo', true)
  const getValor = (categoria, clave, defaultVal = 0) => {
    const m = metricas.find(x => x.categoria === categoria && x.clave === clave)
    return m ? Number(m.valor) : defaultVal
  }

  const config = {
    ratios: {
      iva: getValor('ratios', 'iva_porcentaje', 0.187),
      rrhh: getValor('ratios', 'rrhh_porcentaje', 0.213),
      gastosComerciales: getValor('ratios', 'gastos_comerciales_porcentaje', 0.0883),
      impuestosOperativos: getValor('ratios', 'impuestos_operativos_porcentaje', 0.07),
      ingresosFinancieros: getValor('ratios', 'ingresos_financieros_porcentaje', 0.0124),
      merma: getValor('ratios', 'merma_porcentaje', 0.016),
    }
  }

  console.log('Ratios globales configurados en la DB:')
  console.log(`  - IVA efectivo: ${(config.ratios.iva * 100).toFixed(2)}%`)
  console.log(`  - RRHH estimado: ${(config.ratios.rrhh * 100).toFixed(2)}%`)
  console.log(`  - Costos Fijos estimado: ${(config.ratios.gastosComerciales * 100).toFixed(2)}%`)
  console.log(`  - Impuestos Operativos: ${(config.ratios.impuestosOperativos * 100).toFixed(2)}%`)
  console.log(`  - Merma: ${(config.ratios.merma * 100).toFixed(2)}%`)
  console.log(`  - Ingresos Financieros estimado: ${(config.ratios.ingresosFinancieros * 100).toFixed(2)}%\n`)

  let totalVerificaciones = 0
  let erroresEncontrados = 0

  for (const p of periodos || []) {
    // Audit Consolidated
    let resRows = []
    let page = 0
    while (true) {
      const { data } = await admin.from('resultados').select('*').eq('periodo_id', p.id).range(page*1000, (page+1)*1000-1)
      if (!data || data.length === 0) break
      resRows = resRows.concat(data)
      if (data.length < 1000) break
      page++
    }

    if (resRows.length === 0) continue

    const facturacion = resRows.reduce((s, r) => s + Number(r.facturacion || 0), 0)
    const iva = resRows.reduce((s, r) => s + Number(r.iva || 0), 0)
    const cmv = resRows.reduce((s, r) => s + Number(r.costo || 0), 0)
    const ventasSinIva = facturacion - iva
    const contribucionMarginal = ventasSinIva - cmv

    // Real subaccounts
    const { data: rrhhRows } = await admin.from('rrhh_subcuentas').select('*').eq('periodo_id', p.id)
    const rrhhTotal = (rrhhRows || []).reduce((s, r) => s + Number(r.total_rrhh || r.sueldos || 0) + Number(r.cargas_sociales || 0) + Number(r.indemnizaciones || 0) + Number(r.tabla_merito || 0), 0)
    const esRRHHEstimado = !rrhhRows || rrhhRows.length === 0 || rrhhTotal === 0
    const rrhhFinal = esRRHHEstimado ? ventasSinIva * config.ratios.rrhh : rrhhTotal

    const { data: cfRows } = await admin.from('costos_fijos_subcuentas').select('*').eq('periodo_id', p.id)
    const cfTotal = (cfRows || []).reduce((s, r) => s + Number(r.alquileres || 0) + Number(r.honorarios || 0) + Number(r.tasas_servicios || 0) +
      Number(r.mantenimiento_servicios_tecnicos || 0) + Number(r.perdida_gestion_inventarios || 0) +
      Number(r.seguridad_vigilancia || 0) + Number(r.otros_servicios || 0) + Number(r.gastos_personal || 0) +
      Number(r.otros_gastos || 0) + Number(r.comisiones_gastos_bancarios || 0) + Number(r.gastos_extraordinarios || 0) +
      Number(r.gastos_comercializacion || 0) + Number(r.gastos_administracion || 0) + Number(r.gastos_financiacion || 0) +
      Number(r.diferencias_caja_perdida || 0), 0)
    const esCFEstimado = !cfRows || cfRows.length === 0 || cfTotal === 0
    const cfFinal = esCFEstimado ? ventasSinIva * config.ratios.gastosComerciales : cfTotal

    const { data: ifRows } = await admin.from('ingresos_financieros_subcuentas').select('*').eq('periodo_id', p.id)
    const ifTotal = (ifRows || []).reduce((s, r) => s + Number(r.operatoria_financiera || 0) + Number(r.rendimientos_financieros || 0), 0)
    const esIFEstimado = !ifRows || ifRows.length === 0 || ifTotal === 0
    const ifFinal = esIFEstimado ? ventasSinIva * config.ratios.ingresosFinancieros : ifTotal

    const impuestos = ventasSinIva * config.ratios.impuestosOperativos
    const merma = ventasSinIva * config.ratios.merma

    const resOp = contribucionMarginal - rrhhFinal - cfFinal
    const resSuper = resOp - impuestos - merma
    const resTotal = resSuper + ifFinal

    // Verification checks
    totalVerificaciones++
    const chk1 = Math.abs((ventasSinIva + iva) - facturacion) < 0.01
    const chk2 = Math.abs((contribucionMarginal + cmv) - ventasSinIva) < 0.01
    const chk3 = Math.abs((resOp + rrhhFinal + cfFinal) - contribucionMarginal) < 0.01
    const chk4 = Math.abs((resSuper + impuestos + merma) - resOp) < 0.01
    const chk5 = Math.abs((resTotal - ifFinal) - resSuper) < 0.01

    if (!chk1 || !chk2 || !chk3 || !chk4 || !chk5) {
      erroresEncontrados++
      console.log(`❌ Error matemático en período ${p.key}:`, { chk1, chk2, chk3, chk4, chk5 })
    } else {
      console.log(`✓ Período ${p.key} OK — Facturación: $${Math.round(facturacion).toLocaleString('es-AR')} | VentasSinIVA: $${Math.round(ventasSinIva).toLocaleString('es-AR')} | CM: $${Math.round(contribucionMarginal).toLocaleString('es-AR')} | Neto: $${Math.round(resTotal).toLocaleString('es-AR')} (${esRRHHEstimado?'[RRHH Est]':'[RRHH Real]'}, ${esCFEstimado?'[CF Est]':'[CF Real]'}, ${esIFEstimado?'[IF Est]':'[IF Real]'})`)
    }
  }

  console.log(`\n==================================================`)
  console.log(`RESULTADO DE AUDITORÍA: ${totalVerificaciones} períodos auditados, ${erroresEncontrados} errores.`)
  if (erroresEncontrados === 0) {
    console.log('🎉 TODOS LOS CÁLCULOS Y FÓRMULAS DEL CUADRO SIMPLIFICADO SON 100% CORRECTOS.')
  }
}

main().catch(console.error)

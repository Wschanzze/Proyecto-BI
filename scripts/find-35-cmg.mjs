// scripts/find-35-cmg.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  console.log('=== BUSCANDO DÓNDE SE CALCULA $1.934.742.922 / 35.1% ===\n')

  const { data: metricas } = await supabase.from('metricas_configurables').select('*')
  console.log('Métricas que tengan valor alrededor de 0.649 o 0.351:')
  for (const m of metricas || []) {
    if (Math.abs(Number(m.valor) - 0.649) < 0.05 || Math.abs(Number(m.valor) - 0.351) < 0.05) {
      console.log(`  ${m.categoria} -> ${m.clave}: ${m.valor} (${m.nombre}) [sucursal: ${m.sucursal_id}]`)
    }
  }

  // Check all sucursales for June 2026
  const { data: p2026_06 } = await supabase.from('periodos').select('id, key').eq('key', '2026-06').single()
  const { data: resultados } = await supabase.from('resultados').select('sucursal_id, facturacion, iva, costo').eq('periodo_id', p2026_06.id)

  const porSuc = {}
  for (const r of resultados) {
    const sId = r.sucursal_id
    if (!porSuc[sId]) porSuc[sId] = { facturacion: 0, iva: 0, costo: 0 }
    porSuc[sId].facturacion += Number(r.facturacion)
    porSuc[sId].iva += Number(r.iva)
    porSuc[sId].costo += Number(r.costo)
  }

  console.log('\nPor sucursal en Junio 2026:')
  for (const [sId, d] of Object.entries(porSuc)) {
    const vSinIva = d.facturacion - d.iva
    const cm = vSinIva - d.costo
    console.log(`  ${sId}: VentasSinIva = $${Math.round(vSinIva).toLocaleString('es-AR')}, CMg = $${Math.round(cm).toLocaleString('es-AR')} (${((cm/vSinIva)*100).toFixed(2)}%)`)
  }
}

main().catch(console.error)

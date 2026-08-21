import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  const { data } = await admin.from('metricas_configurables').select('*').eq('categoria', 'ratios').eq('clave', 'iva_porcentaje')
  console.log('iva_porcentaje en DB:', data)

  // También calculamos la tasa efectiva real desde los datos cargados (Ene-Jul 2026)
  const { data: periodos } = await admin.from('periodos').select('id, key').gte('key', '2026-01').lte('key', '2026-07')
  
  let totalFacturacion = 0
  let totalIva = 0
  
  for (const p of periodos || []) {
    const { data: rows } = await admin.from('resultados').select('facturacion, iva').eq('periodo_id', p.id)
    for (const r of rows || []) {
      totalFacturacion += Number(r.facturacion)
      totalIva += Number(r.iva)
    }
  }
  
  const tasaEfectivaReal = totalIva / totalFacturacion
  console.log(`\nTasa IVA efectiva REAL calculada desde datos cargados (Ene-Jul 2026):`)
  console.log(`  Total Facturación: $${Math.round(totalFacturacion).toLocaleString('es-AR')}`)
  console.log(`  Total IVA: $${Math.round(totalIva).toLocaleString('es-AR')}`)
  console.log(`  Tasa efectiva = IVA/Facturación = ${(tasaEfectivaReal * 100).toFixed(4)}%`)
  console.log(`  Tasa efectiva como % de VentasSinIVA = ${(tasaEfectivaReal / (1 - tasaEfectivaReal) * 100).toFixed(4)}%`)
}

main().catch(console.error)

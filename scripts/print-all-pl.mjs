// scripts/print-all-pl.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  const { data: periodos } = await supabase.from('periodos').select('id, key').order('key')

  console.log('=== P&L COMPLETO DE TODOS LOS PERÍODOS EN CUADRO SIMPLIFICADO ===\n')

  for (const p of periodos || []) {
    let resRows = []
    let page = 0
    while (true) {
      const { data } = await supabase.from('resultados').select('facturacion, iva, costo').eq('periodo_id', p.id).range(page*1000, (page+1)*1000-1)
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
    const cmg = ventasSinIva - cmv
    const cmgPct = (cmg / ventasSinIva) * 100

    console.log(`${p.key}: Fact: $${Math.round(facturacion).toLocaleString('es-AR')} | VentasSinIVA: $${Math.round(ventasSinIva).toLocaleString('es-AR')} | CMV: $${Math.round(cmv).toLocaleString('es-AR')} | CMg: $${Math.round(cmg).toLocaleString('es-AR')} (${cmgPct.toFixed(1)}% s/VentasSinIVA)`)
  }
}

main().catch(console.error)

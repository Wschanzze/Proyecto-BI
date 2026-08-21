// scripts/find-exact-1934.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  console.log('=== TRACING 1.934.742.922 AND 35.1% ACROSS ALL PERIODS AND SUCURSALES ===\n')

  const { data: periodos } = await supabase.from('periodos').select('id, key').order('key')
  const { data: sucursales } = await supabase.from('sucursales').select('id, nombre').order('id')

  for (const p of periodos || []) {
    const { data: rows } = await supabase.from('resultados').select('sucursal_id, grupo_id, facturacion, iva, costo').eq('periodo_id', p.id)
    if (!rows || rows.length === 0) continue

    // Consolidated
    const fact = rows.reduce((s, r) => s + Number(r.facturacion || 0), 0)
    const iva = rows.reduce((s, r) => s + Number(r.iva || 0), 0)
    const costo = rows.reduce((s, r) => s + Number(r.costo || 0), 0)
    const vSinIva = fact - iva
    const cmg = vSinIva - costo
    const cmgPct = (cmg / vSinIva) * 100

    if (Math.abs(cmg - 1934742922) < 1000000 || Math.abs(cmgPct - 35.1) < 0.5) {
      console.log(`MATCH CONSOLIDADO ${p.key}: VentasSinIva=$${Math.round(vSinIva).toLocaleString('es-AR')}, CMg=$${Math.round(cmg).toLocaleString('es-AR')} (${cmgPct.toFixed(1)}%)`)
    }

    // Per sucursal
    for (const suc of sucursales || []) {
      const sRows = rows.filter(r => r.sucursal_id === suc.id)
      if (sRows.length === 0) continue
      const sFact = sRows.reduce((s, r) => s + Number(r.facturacion || 0), 0)
      const sIva = sRows.reduce((s, r) => s + Number(r.iva || 0), 0)
      const sCosto = sRows.reduce((s, r) => s + Number(r.costo || 0), 0)
      const sVSinIva = sFact - sIva
      const sCmg = sVSinIva - sCosto
      const sCmgPct = (sCmg / sVSinIva) * 100

      if (Math.abs(sCmg - 1934742922) < 1000000 || Math.abs(sCmgPct - 35.1) < 0.5) {
        console.log(`MATCH SUCURSAL ${suc.nombre} (${p.key}): VentasSinIva=$${Math.round(sVSinIva).toLocaleString('es-AR')}, CMg=$${Math.round(sCmg).toLocaleString('es-AR')} (${sCmgPct.toFixed(1)}%)`)
      }
    }
  }

  // Check proyecciones in DB
  const { data: proyCMV } = await supabase.from('metricas_configurables').select('*').eq('categoria', 'proyecciones')
  console.log('\nRevisando proyecciones en DB:')
  for (const m of proyCMV || []) {
    if (m.clave.startsWith('proy_cmv_pct_')) {
      const cmgPct = (1 - Number(m.valor)) * 100
      console.log(`  ${m.clave}: CMV=${(Number(m.valor)*100).toFixed(1)}% -> CMg=${cmgPct.toFixed(1)}%`)
    }
  }
}

main().catch(console.error)

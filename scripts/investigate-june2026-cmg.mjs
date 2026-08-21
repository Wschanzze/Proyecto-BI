// scripts/investigate-june2026-cmg.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  console.log('=== INVESTIGANDO DISCREPANCIA JUNIO 2026 (2026-06) ===\n')

  const { data: periodo } = await admin.from('periodos').select('*').eq('key', '2026-06').single()
  if (!periodo) {
    console.log('No se encontró período 2026-06')
    return
  }

  // 1. Raw DB rows sum
  let resRows = []
  let page = 0
  while (true) {
    const { data } = await admin.from('resultados').select('*').eq('periodo_id', periodo.id).range(page*1000, (page+1)*1000-1)
    if (!data || data.length === 0) break
    resRows = resRows.concat(data)
    if (data.length < 1000) break
    page++
  }

  console.log(`Filas crudas en DB para 2026-06: ${resRows.length}`)
  const facturacionRaw = resRows.reduce((s, r) => s + Number(r.facturacion || 0), 0)
  const ivaRaw = resRows.reduce((s, r) => s + Number(r.iva || 0), 0)
  const costoRaw = resRows.reduce((s, r) => s + Number(r.costo || 0), 0)
  const cmgRawFact = facturacionRaw - costoRaw
  const cmgRawSinIva = (facturacionRaw - ivaRaw) - costoRaw

  console.log(`\nDATOS CRUDOS EN DB (sumando todas las filas de resultados):`)
  console.log(`  Facturación bruta: $${Math.round(facturacionRaw).toLocaleString('es-AR')}`)
  console.log(`  IVA: $${Math.round(ivaRaw).toLocaleString('es-AR')}`)
  console.log(`  Ventas sin IVA: $${Math.round(facturacionRaw - ivaRaw).toLocaleString('es-AR')}`)
  console.log(`  Costo (CMV): $${Math.round(costoRaw).toLocaleString('es-AR')}`)
  console.log(`  CMg s/Facturación Bruta (Fact - Costo): $${Math.round(cmgRawFact).toLocaleString('es-AR')} (${((cmgRawFact/facturacionRaw)*100).toFixed(2)}%)`)
  console.log(`  CMg s/Ventas sin IVA (VentasSinIva - Costo): $${Math.round(cmgRawSinIva).toLocaleString('es-AR')} (${((cmgRawSinIva/(facturacionRaw - ivaRaw))*100).toFixed(2)}%)`)

  // Check by sucursal
  const porSucursal = {}
  for (const r of resRows) {
    const sId = r.sucursal_id
    if (!porSucursal[sId]) porSucursal[sId] = { facturacion: 0, iva: 0, costo: 0 }
    porSucursal[sId].facturacion += Number(r.facturacion)
    porSucursal[sId].iva += Number(r.iva)
    porSucursal[sId].costo += Number(r.costo)
  }

  console.log(`\nDESGLOSE POR SUCURSAL EN 2026-06:`)
  for (const [sId, d] of Object.entries(porSucursal)) {
    const vSinIva = d.facturacion - d.iva
    const cm = vSinIva - d.costo
    console.log(`  ${sId}: Fact: $${Math.round(d.facturacion).toLocaleString('es-AR')} | VentasSinIva: $${Math.round(vSinIva).toLocaleString('es-AR')} | Costo: $${Math.round(d.costo).toLocaleString('es-AR')} | CM: $${Math.round(cm).toLocaleString('es-AR')} (${((cm/vSinIva)*100).toFixed(2)}%)`)
  }
}

main().catch(console.error)

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  // Calculamos la tasa efectiva real desde los datos reales (Ene-Jul 2026)
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
  
  // IVA/Facturación = tasa sobre precio con IVA
  const tasaSobreFacturacion = totalIva / totalFacturacion
  // Para usar en facturacion / (1 + tasa), necesitamos la tasa sobre precio sin IVA
  // Si Facturación = VentasSinIVA * (1 + tasa), entonces tasa = IVA / VentasSinIVA = IVA / (Facturación - IVA)
  const tasaSobreVentasSinIva = totalIva / (totalFacturacion - totalIva)
  
  console.log(`Tasa efectiva real (IVA / Facturación bruta): ${(tasaSobreFacturacion * 100).toFixed(4)}%`)
  console.log(`Tasa efectiva real (IVA / VentasSinIVA) para división: ${(tasaSobreVentasSinIva * 100).toFixed(4)}%`)
  console.log(`Valor a usar en iva_porcentaje (para proyecciones): ${tasaSobreVentasSinIva.toFixed(6)}`)
  
  // Actualizamos el valor en DB
  const { error } = await admin.from('metricas_configurables')
    .update({ 
      valor: parseFloat(tasaSobreVentasSinIva.toFixed(6)),
      descripcion: `Tasa efectiva de IVA sobre Ventas sin IVA, calculada del mix real del negocio (carnes/verduras al 10.5% + salon al 21%). Usada para descontar IVA en proyecciones futuras. Calculado de datos reales Ene-Jul 2026.`,
      actualizado_en: new Date().toISOString()
    })
    .eq('categoria', 'ratios')
    .eq('clave', 'iva_porcentaje')
    
  if (error) {
    console.error('❌ Error actualizando iva_porcentaje:', error)
  } else {
    console.log(`\n✓ iva_porcentaje actualizado en DB: ${(tasaSobreVentasSinIva * 100).toFixed(4)}% (${tasaSobreVentasSinIva.toFixed(6)})`)
    console.log('  Este valor refleja el mix real del negocio:')
    console.log('  - Salón: 21% IVA')
    console.log('  - Carnicería, Verdulería, Frescos: 10.5% IVA')
    console.log('  - Tasa ponderada real según tu facturación cargada')
  }

  // Verificación: con esta tasa, ¿coincide el ventasSinIva con el real?
  const ventasSinIvaConTasaVieja = totalFacturacion / (1 + 0.21)
  const ventasSinIvaConTasaNueva = totalFacturacion / (1 + tasaSobreVentasSinIva)
  const ventasSinIvaReal = totalFacturacion - totalIva
  
  console.log(`\n== VERIFICACIÓN ==`)
  console.log(`VentasSinIVA con tasa 21% (vieja): $${Math.round(ventasSinIvaConTasaVieja).toLocaleString('es-AR')}`)
  console.log(`VentasSinIVA con tasa real (nueva): $${Math.round(ventasSinIvaConTasaNueva).toLocaleString('es-AR')}`)
  console.log(`VentasSinIVA REAL (Facturación - IVA): $${Math.round(ventasSinIvaReal).toLocaleString('es-AR')}`)
  console.log(`Diferencia tasa vieja vs real: $${Math.round(ventasSinIvaConTasaVieja - ventasSinIvaReal).toLocaleString('es-AR')} (${((ventasSinIvaConTasaVieja - ventasSinIvaReal) / ventasSinIvaReal * 100).toFixed(2)}% error)`)
}

main().catch(console.error)

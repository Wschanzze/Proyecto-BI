// scripts/update-iva-effective.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  const { data: ratiosGlobales } = await admin
    .from('metricas_configurables')
    .select('id, clave')
    .eq('categoria', 'ratios')

  const rIva = ratiosGlobales?.find(x => x.clave === 'iva_porcentaje')
  if (rIva) {
    // Effective IVA rate across all supermarket categories is ~18.7%
    await admin.from('metricas_configurables').update({ valor: 0.187, activo: true }).eq('id', rIva.id)
    console.log(`✓ Updated ratios.iva_porcentaje = 18.70% (tasa efectiva ponderada supermercadismo)`)
  }
}

main().catch(console.error)

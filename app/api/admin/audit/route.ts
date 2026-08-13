import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://wlaotnafjrvckoxbdokk.supabase.co'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })

    // 1. Obtener todos los períodos ordenados cronológicamente descendente
    const { data: periodos, error: pErr } = await supabase
      .from('periodos')
      .select('id, key, label, anio, mes')
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })

    if (pErr) throw pErr
    if (!periodos || periodos.length === 0) {
      return NextResponse.json([])
    }

    // 2. Ejecutar consultas de conteo eficientes en paralelo para cada período
    const auditData = await Promise.all(
      periodos.map(async (p) => {
        const [resRes, cfRes, nomRes, ceRes, cgRes] = await Promise.all([
          supabase.from('resultados').select('*', { count: 'exact', head: true }).eq('periodo_id', p.id),
          supabase.from('costos_fijos_subcuentas').select('*', { count: 'exact', head: true }).eq('periodo_id', p.id),
          supabase.from('nomina_mensual').select('*', { count: 'exact', head: true }).eq('periodo_id', p.id),
          supabase.from('costos_estructurales').select('*', { count: 'exact', head: true }).eq('periodo_id', p.id),
          supabase.from('costos_globales').select('*', { count: 'exact', head: true }).eq('periodo_key', p.key)
        ])

        return {
          id: p.id,
          key: p.key,
          label: p.label,
          anio: p.anio,
          mes: p.mes,
          resultadosCount: resRes.count || 0,
          costosFijosCount: cfRes.count || 0,
          nominaCount: nomRes.count || 0,
          costosEstructuralesCount: ceRes.count || 0,
          costosGlobalesCount: cgRes.count || 0
        }
      })
    )

    // Devolver resultados ordenados
    const sortedData = auditData.sort((a, b) => b.key.localeCompare(a.key))
    return NextResponse.json(sortedData)
  } catch (error: any) {
    console.error('[admin/audit] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}

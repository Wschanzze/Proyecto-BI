// app/api/costos/route.ts
// GET  /api/costos              → lista todos los lotes de costos globales
// DELETE /api/costos?lote=uuid  → elimina un lote (CASCADE elimina sus costos_globales)

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://wlaotnafjrvckoxbdokk.supabase.co'

function getClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
}

export async function GET() {
  try {
    const supabase = getClient()

    // Listar lotes con conteo de registros
    const { data: lotes, error } = await supabase
      .from('lotes_costos')
      .select('id, periodo_key, nombre_archivo, total_registros, uploaded_at')
      .order('uploaded_at', { ascending: false })

    if (error) throw error

    // Para cada lote, traer los grupos cargados
    const lotesConDetalle = await Promise.all(
      (lotes || []).map(async (lote) => {
        const { data: costos } = await supabase
          .from('costos_globales')
          .select('grupo_id, costo_total')
          .eq('lote_id', lote.id)

        return {
          ...lote,
          costos: costos || [],
        }
      })
    )

    return NextResponse.json({ ok: true, lotes: lotesConDetalle })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const loteId = searchParams.get('lote')

    if (!loteId) {
      return NextResponse.json({ ok: false, error: 'Se requiere ?lote=<uuid>' }, { status: 400 })
    }

    const supabase = getClient()

    // Eliminar el lote — CASCADE elimina sus costos_globales automáticamente
    const { error } = await supabase
      .from('lotes_costos')
      .delete()
      .eq('id', loteId)

    if (error) throw error

    return NextResponse.json({ ok: true, message: `Lote ${loteId} eliminado correctamente` })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

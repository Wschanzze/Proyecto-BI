// app/api/periodos/route.ts
// Permite listar el historial de períodos cargados y eliminar un período entero con sus datos.

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q"
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wlaotnafjrvckoxbdokk.supabase.co",
    serviceRoleKey
  )
}

export async function GET() {
  try {
    const client = getAdminClient()

    // 1. Obtener todos los períodos ordenados del más reciente al más antiguo
    const { data: periodos, error: pErr } = await client
      .from('periodos')
      .select('*')
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })

    if (pErr) {
      throw new Error(`Error al consultar períodos: ${pErr.message}`)
    }

    if (!periodos || periodos.length === 0) {
      return NextResponse.json({ ok: true, periodos: [] })
    }

    // 2. Contar la cantidad de registros por período
    const periodosConConteo = await Promise.all(
      periodos.map(async (p) => {
        const { count, error: countErr } = await client
          .from('resultados')
          .select('*', { count: 'exact', head: true })
          .eq('periodo_id', p.id)

        return {
          id: p.id,
          key: p.key,
          label: p.label,
          anio: p.anio,
          mes: p.mes,
          fecha_carga: p.fecha_carga,
          archivo_nombre: p.archivo_nombre || 'archivo_excel.xlsx',
          total_registros: countErr ? 0 : (count || 0)
        }
      })
    )

    return NextResponse.json({ ok: true, periodos: periodosConConteo })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json({ error: 'Falta el parámetro key del período a eliminar' }, { status: 400 })
    }

    const client = getAdminClient()

    // 1. Buscar el período
    const { data: pData, error: pErr } = await client
      .from('periodos')
      .select('id, label')
      .eq('key', key)
      .maybeSingle()

    if (pErr || !pData) {
      return NextResponse.json({ error: `Período con clave "${key}" no encontrado.` }, { status: 404 })
    }

    const periodoId = pData.id

    // 2. Eliminar todos los resultados asociados
    const { error: delResErr } = await client
      .from('resultados')
      .delete()
      .eq('periodo_id', periodoId)

    if (delResErr) {
      throw new Error(`Error al eliminar registros de resultados: ${delResErr.message}`)
    }

    // 3. Eliminar la entrada del período
    const { error: delPErr } = await client
      .from('periodos')
      .delete()
      .eq('id', periodoId)

    if (delPErr) {
      throw new Error(`Error al eliminar el período: ${delPErr.message}`)
    }

    return NextResponse.json({
      ok: true,
      mensaje: `El período ${pData.label.toUpperCase()} y todos sus datos fueron eliminados correctamente.`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

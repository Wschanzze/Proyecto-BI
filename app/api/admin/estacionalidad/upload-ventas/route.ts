// app/api/admin/estacionalidad/upload-ventas/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://wlaotnafjrvckoxbdokk.supabase.co'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { registros, sucursalId } = body // Array de { fecha, clientes, productos, facturacion }

    if (!Array.isArray(registros) || registros.length === 0) {
      return NextResponse.json({ error: 'No se recibieron registros válidos de ventas' }, { status: 400 })
    }

    const targetSucursal = sucursalId || '__consolidado__'
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })

    // Preparar lotes de 500 para inserción eficiente en Supabase
    const dbPayload = registros.map(r => {
      const fObj = new Date(r.fecha)
      const y = fObj.getUTCFullYear()
      const m = String(fObj.getUTCMonth() + 1).padStart(2, '0')
      const periodoKey = `${y}-${m}`
      const fechaStr = r.fecha.split('T')[0]

      return {
        fecha: fechaStr,
        periodo_key: periodoKey,
        clientes: r.clientes || 0,
        productos: r.productos || 0,
        facturacion: r.facturacion || 0,
        sucursal_id: targetSucursal
      }
    })

    const BATCH_SIZE = 500
    let totalGuardados = 0
    let dbError: any = null

    for (let i = 0; i < dbPayload.length; i += BATCH_SIZE) {
      const batch = dbPayload.slice(i, i + BATCH_SIZE)
      const { error } = await supabase
        .from('historico_ventas_diario')
        .upsert(batch, { onConflict: 'fecha,sucursal_id' })

      if (error) {
        dbError = error
        break
      }
      totalGuardados += batch.length
    }

    // Actualizar fallback JSON si se ejecuta en servidor local con filesystem writable
    try {
      const jsonPath = path.join(process.cwd(), 'lib', 'datos_estacionalidad_fallback.json')
      let existing: any[] = []
      if (fs.existsSync(jsonPath)) {
        existing = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
      }

      const existingMap = new Map<string, any>()
      existing.forEach(item => {
        const f = item.Fecha || item.fecha
        if (f) existingMap.set(String(f).split('T')[0], item)
      })

      registros.forEach(r => {
        const fStr = String(r.fecha).split('T')[0]
        existingMap.set(fStr, {
          Fecha: fStr,
          Cantidad: r.clientes,
          Productos: r.productos,
          Facturacion: r.facturacion
        })
      })

      const updated = Array.from(existingMap.values())
      fs.writeFileSync(jsonPath, JSON.stringify(updated, null, 2))
    } catch (fsErr) {
      console.warn('Fallback JSON sync skipped (read-only filesystem or serverless)', fsErr)
    }

    if (dbError && dbError.code === '42P01') {
      return NextResponse.json({
        ok: true,
        guardados: registros.length,
        message: 'Ventas cargadas en memoria. Para persisitir en Supabase DB ejecutá la migración 010_estacionalidad_tables.sql.'
      })
    }

    if (dbError) {
      throw dbError
    }

    return NextResponse.json({
      ok: true,
      guardados: totalGuardados,
      message: `Se insertaron/actualizaron ${totalGuardados} registros de ventas diarias exitosamente.`
    })
  } catch (error: any) {
    console.error('[upload-ventas] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al guardar ventas diarias' }, { status: 500 })
  }
}

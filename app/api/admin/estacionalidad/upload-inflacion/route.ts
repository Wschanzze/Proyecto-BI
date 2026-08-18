// app/api/admin/estacionalidad/upload-inflacion/route.ts
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
    const { registros } = body // Array de { anio, mes, inflacionMensual, inflacionAnual }

    if (!Array.isArray(registros) || registros.length === 0) {
      return NextResponse.json({ error: 'No se recibieron registros válidos de inflación' }, { status: 400 })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })

    // Preparar filas para DB
    const dbPayload = registros.map(r => {
      const periodoKey = `${r.anio}-${String(r.mes).padStart(2, '0')}`
      return {
        anio: r.anio,
        mes: r.mes,
        periodo_key: periodoKey,
        inflacion_mensual: r.inflacionMensual,
        inflacion_anual: r.inflacionAnual
      }
    })

    // Intentar upsert en Supabase DB
    const { data, error } = await supabase
      .from('historico_inflacion')
      .upsert(dbPayload, { onConflict: 'anio,mes' })

    // También actualizar fallback JSON si existe entorno fs writable
    try {
      const jsonPath = path.join(process.cwd(), 'lib', 'inflacion_fallback.json')
      let existing: any[] = []
      if (fs.existsSync(jsonPath)) {
        existing = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
      }

      // Merge/upsert local json
      const existingMap = new Map<string, any>()
      existing.forEach(item => {
        const a = item.Año || item.Anio || item.anio
        const m = item.Mes || item.mes
        existingMap.set(`${a}-${m}`, item)
      })

      registros.forEach(r => {
        existingMap.set(`${r.anio}-${r.mes}`, {
          Año: r.anio,
          Mes: r.mes,
          Inflacion_Mensual: r.inflacionMensual,
          Inflacion_Anual: r.inflacionAnual
        })
      })

      const updated = Array.from(existingMap.values())
      fs.writeFileSync(jsonPath, JSON.stringify(updated, null, 2))
    } catch (fsErr) {
      console.warn('Fallback JSON sync skipped (read-only filesystem or serverless)', fsErr)
    }

    if (error && error.code === '42P01') {
      return NextResponse.json({
        ok: true,
        guardados: registros.length,
        message: 'Registros guardados en memoria/fallback. Para sincronizar en Supabase DB, ejecutá la migración 010_estacionalidad_tables.sql.'
      })
    }

    if (error) {
      throw error
    }

    return NextResponse.json({
      ok: true,
      guardados: registros.length,
      message: `Se insertaron/actualizaron ${registros.length} registros de inflación exitosamente.`
    })
  } catch (error: any) {
    console.error('[upload-inflacion] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al guardar inflación' }, { status: 500 })
  }
}

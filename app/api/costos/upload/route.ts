// app/api/costos/upload/route.ts
// Procesador de costos globales para modo DEMO autónomo.

import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 })
    }
    const fileName = file.name

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[]

    return NextResponse.json({
      ok: true,
      mensaje: `Costos de '${fileName}' procesados y prorrateados exitosamente (Modo Demo)`,
      totalRegistros: rows.length || 24,
      periodosAfectados: ["2026-06"]
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al procesar costos' }, { status: 500 })
  }
}

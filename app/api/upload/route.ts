// app/api/upload/route.ts
// Procesador de archivos Excel/CSV para modo DEMO autónomo.

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
    if (rows.length === 0) {
      return NextResponse.json({ error: 'El archivo está vacío' }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      mensaje: `Archivo '${fileName}' validado y procesado exitosamente (Modo Demo)`,
      filasValidas: rows.length,
      periodosAfectados: ["2026-06", "2026-07"],
      resumen: {
        totalFilas: rows.length,
        modo: "Demostración Autónoma"
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al procesar archivo' }, { status: 500 })
  }
}

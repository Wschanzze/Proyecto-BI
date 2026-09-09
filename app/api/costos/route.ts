import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    ok: true,
    lotes: [
      {
        id: "lote-demo-1",
        periodo_key: "2026-06",
        nombre_archivo: "costos_cadena_jun2026.xlsx",
        total_registros: 48,
        uploaded_at: new Date().toISOString(),
        costos: []
      }
    ]
  })
}

export async function DELETE() {
  return NextResponse.json({ ok: true, message: "Lote eliminado (Modo Demo)" })
}

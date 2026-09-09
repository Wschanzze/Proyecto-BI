// app/api/periodos/route.ts
import { NextResponse } from 'next/server'
import { PERIODOS } from '@/lib/data'

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

export async function GET() {
  const periodos = PERIODOS.map((p, index) => ({
    id: index + 1,
    key: p.key,
    label: `${MESES[p.mes - 1]}-${String(p.anio).slice(-2)}`,
    anio: p.anio,
    mes: p.mes,
    fecha_carga: new Date().toISOString(),
    archivo_nombre: 'carga_ventas.xlsx',
    total_registros: 420,
  })).sort((a, b) => b.key.localeCompare(a.key))

  return NextResponse.json({ ok: true, periodos })
}

export async function DELETE() {
  return NextResponse.json({ ok: true, message: 'Período reiniciado (Modo Demo)' })
}

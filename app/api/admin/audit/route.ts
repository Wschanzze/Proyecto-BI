import { NextResponse } from 'next/server'
import { PERIODOS } from '@/lib/data'

export const dynamic = 'force-dynamic'

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

export async function GET() {
  try {
    const auditData = PERIODOS.map((p, index) => ({
      id: index + 1,
      key: p.key,
      label: `${MESES[p.mes - 1]}-${String(p.anio).slice(-2)}`,
      anio: p.anio,
      mes: p.mes,
      resultadosCount: 420,
      costosFijosCount: 5,
      nominaCount: 22,
      costosEstructuralesCount: 15,
      costosGlobalesCount: 10,
    })).sort((a, b) => b.key.localeCompare(a.key))

    return NextResponse.json(auditData)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error en auditoría' }, { status: 500 })
  }
}

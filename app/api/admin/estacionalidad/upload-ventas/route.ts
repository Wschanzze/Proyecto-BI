import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { registros, sucursalId } = body

    if (!Array.isArray(registros) || registros.length === 0) {
      return NextResponse.json({ error: 'No se recibieron registros válidos de ventas' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      count: registros.length,
      mensaje: `Se procesaron ${registros.length} transacciones diarias para ${sucursalId || 'Consolidado'} exitosamente (Modo Demo)`
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al guardar ventas diarias' }, { status: 500 })
  }
}

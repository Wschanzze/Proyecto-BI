import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { registros } = body

    if (!Array.isArray(registros) || registros.length === 0) {
      return NextResponse.json({ error: 'No se recibieron registros válidos de inflación' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      count: registros.length,
      mensaje: `Se actualizaron ${registros.length} índices de inflación exitosamente (Modo Demo)`
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al guardar inflación' }, { status: 500 })
  }
}

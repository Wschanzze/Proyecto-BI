// app/api/reportes/participacion/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getParticipacionSucursalesDemo } from "@/lib/reportes-data"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { desde, hasta, excluidas = [] } = body || {}

    const result = getParticipacionSucursalesDemo(desde, hasta, excluidas)

    return NextResponse.json(result)
  } catch (err: any) {
    console.error("[api/reportes/participacion] Error:", err)
    return NextResponse.json(
      { ok: false, error: err.message || "Error al calcular participación" },
      { status: 500 }
    )
  }
}

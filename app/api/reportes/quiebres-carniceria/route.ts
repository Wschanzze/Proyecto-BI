// app/api/reportes/quiebres-carniceria/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getQuiebresCarniceriaDemo } from "@/lib/reportes-data"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { desde, hasta, sucursal } = body || {}

    const result = getQuiebresCarniceriaDemo(desde, hasta, sucursal)

    return NextResponse.json(result)
  } catch (err: any) {
    console.error("[api/reportes/quiebres-carniceria] Error:", err)
    return NextResponse.json(
      { ok: false, error: err.message || "Error al consultar quiebres de carnicería" },
      { status: 500 }
    )
  }
}

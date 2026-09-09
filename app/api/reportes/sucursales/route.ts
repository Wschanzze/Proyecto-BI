// app/api/reportes/sucursales/route.ts
import { NextResponse } from "next/server"
import { SUCURSALES_NOMBRES } from "@/lib/reportes-data"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      sucursales: SUCURSALES_NOMBRES,
    })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Error al obtener sucursales" },
      { status: 500 }
    )
  }
}

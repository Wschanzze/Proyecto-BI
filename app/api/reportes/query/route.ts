// app/api/reportes/query/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getConsultaEstandarDemo } from "@/lib/reportes-data"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tipo, desde, hasta, sucursal } = body || {}

    if (!tipo) {
      return NextResponse.json(
        { ok: false, error: "El parámetro 'tipo' es requerido" },
        { status: 400 }
      )
    }

    // Datos determinísticos de alta calidad
    const result = getConsultaEstandarDemo(tipo, { desde, hasta, sucursal })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error("[api/reportes/query] Error:", err)
    return NextResponse.json(
      { ok: false, error: err.message || "Error al procesar consulta" },
      { status: 500 }
    )
  }
}

// app/api/auth/setup/route.ts
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ ok: true, message: 'Usuario admin habilitado en Modo Demo' })
}

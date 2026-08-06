// app/api/auth/setup/route.ts
// Asegura que el usuario por defecto admin@admin.com / monarcamonarca esté registrado en Supabase Auth

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q"
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wlaotnafjrvckoxbdokk.supabase.co"
    
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // Crear usuario admin si aún no existe
    const { error } = await adminClient.auth.admin.createUser({
      email: 'admin@admin.com',
      password: 'monarcamonarca',
      email_confirm: true,
    })

    if (error && !error.message.toLowerCase().includes("already") && !error.message.toLowerCase().includes("registrado")) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, message: 'Usuario admin habilitado en Supabase Auth' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

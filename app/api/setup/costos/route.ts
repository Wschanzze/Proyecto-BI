// app/api/setup/costos/route.ts
// Ejecuta la migración de tablas de costos globales.
// Llamar una sola vez desde el panel de admin o con curl.

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://wlaotnafjrvckoxbdokk.supabase.co'

export async function GET() {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Crear tabla lotes_costos
    const { error: e1 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS lotes_costos (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          periodo_key text NOT NULL,
          nombre_archivo text,
          total_registros integer DEFAULT 0,
          uploaded_at timestamptz DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_lotes_costos_periodo ON lotes_costos(periodo_key);
      `
    })

    // Crear tabla costos_globales
    const { error: e2 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS costos_globales (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          lote_id uuid NOT NULL REFERENCES lotes_costos(id) ON DELETE CASCADE,
          periodo_key text NOT NULL,
          grupo_id text NOT NULL REFERENCES grupos(id),
          costo_total numeric(18,2) NOT NULL DEFAULT 0,
          descripcion text,
          created_at timestamptz DEFAULT now(),
          UNIQUE (periodo_key, grupo_id)
        );
        CREATE INDEX IF NOT EXISTS idx_costos_globales_periodo ON costos_globales(periodo_key);
        CREATE INDEX IF NOT EXISTS idx_costos_globales_grupo ON costos_globales(grupo_id);
        CREATE INDEX IF NOT EXISTS idx_costos_globales_lote ON costos_globales(lote_id);
      `
    })

    // Habilitar RLS
    const { error: e3 } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE lotes_costos ENABLE ROW LEVEL SECURITY;
        ALTER TABLE costos_globales ENABLE ROW LEVEL SECURITY;
        
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'lotes_costos' AND policyname = 'lotes_costos_public_read'
          ) THEN
            CREATE POLICY "lotes_costos_public_read" ON lotes_costos FOR SELECT USING (true);
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'costos_globales' AND policyname = 'costos_globales_public_read'
          ) THEN
            CREATE POLICY "costos_globales_public_read" ON costos_globales FOR SELECT USING (true);
          END IF;
        END $$;
      `
    })

    const errors = [e1, e2, e3].filter(Boolean)
    if (errors.length > 0) {
      // RPC exec_sql might not exist — try direct table creation via insert test
      // Check if tables already exist by querying them
      const { error: checkError } = await supabase.from('lotes_costos').select('id').limit(1)
      
      if (checkError && checkError.code === '42P01') {
        return NextResponse.json({ 
          ok: false, 
          message: 'Las tablas no existen y no se pudieron crear via RPC. Ejecutá el SQL de supabase/migrations/20260811_costos_globales.sql manualmente en el SQL Editor de Supabase.',
          sql_file: 'supabase/migrations/20260811_costos_globales.sql'
        }, { status: 500 })
      }

      return NextResponse.json({ 
        ok: true, 
        message: 'Las tablas ya existen o fueron creadas correctamente.',
        warnings: errors.map((e: any) => e?.message)
      })
    }

    return NextResponse.json({ ok: true, message: 'Tablas lotes_costos y costos_globales creadas exitosamente.' })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

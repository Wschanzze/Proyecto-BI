// app/api/setup/route.ts
// API Route para ejecutar la migración SQL inicial en Supabase.
// Sólo se invoca una vez, desde el browser, con la contraseña del proyecto.
// NOTA: Este endpoint NO debe quedar expuesto en producción.

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  if (body.password !== 'CDGMonarc@2026') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q"
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wlaotnafjrvckoxbdokk.supabase.co",
    serviceRoleKey
  )

  // En lugar de ejecutar DDL (que requiere service_role),
  // devolvemos el SQL para que el usuario lo pegue en el dashboard
  const sql = `-- Ejecutá este SQL en el SQL Editor de Supabase Dashboard
-- https://supabase.com/dashboard/project/wlaotnafjrvckoxbdokk/sql/new

CREATE TABLE IF NOT EXISTS secciones (
  id      text PRIMARY KEY,
  nombre  text NOT NULL,
  orden   smallint NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categorias (
  id          text PRIMARY KEY,
  seccion_id  text NOT NULL REFERENCES secciones(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  orden       smallint NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS grupos (
  id           text PRIMARY KEY,
  categoria_id text NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  nombre       text NOT NULL,
  orden        smallint NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS periodos (
  id             serial PRIMARY KEY,
  key            text UNIQUE NOT NULL,
  anio           smallint NOT NULL,
  mes            smallint NOT NULL,
  fecha_carga    timestamptz DEFAULT now(),
  archivo_nombre text
);

CREATE TABLE IF NOT EXISTS resultados_grupo (
  id                  bigserial PRIMARY KEY,
  periodo_id          int NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  grupo_id            text NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  facturacion         numeric(18,2) NOT NULL DEFAULT 0,
  articulos           int NOT NULL DEFAULT 0,
  cmg_pct             numeric(8,4) NOT NULL DEFAULT 0,
  resultado_operativo numeric(18,2) NOT NULL DEFAULT 0,
  rrhh_pct            numeric(8,4) NOT NULL DEFAULT 0,
  acciones_pct        numeric(8,4) NOT NULL DEFAULT 0,
  resultado_final     numeric(18,2) NOT NULL DEFAULT 0,
  UNIQUE(periodo_id, grupo_id)
);

CREATE INDEX IF NOT EXISTS idx_resultados_periodo ON resultados_grupo(periodo_id);
CREATE INDEX IF NOT EXISTS idx_resultados_grupo   ON resultados_grupo(grupo_id);

ALTER TABLE secciones        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias       ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultados_grupo ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='secciones' AND policyname='public read secciones') THEN
    EXECUTE 'CREATE POLICY "public read secciones" ON secciones FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='categorias' AND policyname='public read categorias') THEN
    EXECUTE 'CREATE POLICY "public read categorias" ON categorias FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='grupos' AND policyname='public read grupos') THEN
    EXECUTE 'CREATE POLICY "public read grupos" ON grupos FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='periodos' AND policyname='public read periodos') THEN
    EXECUTE 'CREATE POLICY "public read periodos" ON periodos FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='resultados_grupo' AND policyname='public read resultados_grupo') THEN
    EXECUTE 'CREATE POLICY "public read resultados_grupo" ON resultados_grupo FOR SELECT USING (true)';
  END IF;
END $$;`

  // Verificar si ya existe alguna tabla
  const { error: checkError } = await client.from('secciones').select('id').limit(1)
  const tablesExist = !checkError

  return NextResponse.json({
    ok: true,
    tablesExist,
    message: tablesExist
      ? 'Las tablas ya existen en Supabase'
      : 'Tablas no creadas aún. Ejecutá el SQL en el Dashboard de Supabase.',
    sqlToCopy: tablesExist ? null : sql,
  })
}

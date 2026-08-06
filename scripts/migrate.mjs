// Aplica el schema SQL en Supabase via Management API (pg REST endpoint)
// Ejecutar con: node scripts/migrate.mjs

const SUPABASE_URL = "https://wlaotnafjrvckoxbdokk.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjE5ODcsImV4cCI6MjEwMTUzNzk4N30.QarhnOSA9yGi2Mf8UNnSUNSYIkyCQgEAdpBJ0GwtxL0"
const DB_PASSWORD = "CDGMonarc@2026"
const PROJECT_REF = "wlaotnafjrvckoxbdokk"

const SCHEMA_SQL = `
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
  archivo_nombre text,
  UNIQUE(anio, mes)
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
    CREATE POLICY "public read secciones" ON secciones FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='categorias' AND policyname='public read categorias') THEN
    CREATE POLICY "public read categorias" ON categorias FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='grupos' AND policyname='public read grupos') THEN
    CREATE POLICY "public read grupos" ON grupos FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='periodos' AND policyname='public read periodos') THEN
    CREATE POLICY "public read periodos" ON periodos FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='resultados_grupo' AND policyname='public read resultados_grupo') THEN
    CREATE POLICY "public read resultados_grupo" ON resultados_grupo FOR SELECT USING (true);
  END IF;
END $$;
`

async function executeSQL(sql) {
  // Supabase REST /pg endpoint for direct SQL (requires service_role or pg connection)
  // We'll use the pg REST endpoint via the Management API if available
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ sql }),
  })
  return { status: res.status, body: await res.text() }
}

async function main() {
  console.log("Applying schema via SQL endpoint...")
  const result = await executeSQL(SCHEMA_SQL)
  console.log("Status:", result.status)
  console.log("Response:", result.body.slice(0, 500))
}

main().catch(console.error)

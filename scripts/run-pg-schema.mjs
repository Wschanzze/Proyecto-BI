// Aplica schema SQL via pg directo a Supabase
// node scripts/run-pg-schema.mjs
import pg from 'pg'
const { Client } = pg

// Supabase connection string (Transaction pooler port 6543, Session port 5432)
const client = new Client({
  connectionString: "postgresql://postgres:CDGMonarc%402026@db.wlaotnafjrvckoxbdokk.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false },
})

const SCHEMA = `
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
END $$;
`

try {
  await client.connect()
  console.log('Connected to Supabase PostgreSQL')
  await client.query(SCHEMA)
  console.log('Schema applied successfully!')
  await client.end()
} catch (err) {
  console.error('Error:', err.message)
  process.exit(1)
}

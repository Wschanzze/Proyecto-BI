import pg from 'pg'
const { Client } = pg

// Connection via Supabase IPv4 Pooler
const connectionString = "postgresql://postgres.wlaotnafjrvckoxbdokk:CDGMonarc%402026@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

const SCHEMA = `
CREATE TABLE IF NOT EXISTS public.historico_inflacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anio INTEGER NOT NULL,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    periodo_key VARCHAR(7) NOT NULL,
    inflacion_mensual NUMERIC(8, 4) NOT NULL DEFAULT 0,
    inflacion_anual NUMERIC(8, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_inflacion_periodo UNIQUE (anio, mes)
);

CREATE TABLE IF NOT EXISTS public.historico_ventas_diario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    periodo_key VARCHAR(7) NOT NULL,
    clientes INTEGER NOT NULL DEFAULT 0,
    productos INTEGER NOT NULL DEFAULT 0,
    facturacion NUMERIC(15, 2) NOT NULL DEFAULT 0,
    sucursal_id VARCHAR(50) NOT NULL DEFAULT '__consolidado__',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_ventas_diario_fecha_sucursal UNIQUE (fecha, sucursal_id)
);

CREATE INDEX IF NOT EXISTS idx_inflacion_periodo ON public.historico_inflacion(periodo_key);
CREATE INDEX IF NOT EXISTS idx_inflacion_anio_mes ON public.historico_inflacion(anio, mes);

CREATE INDEX IF NOT EXISTS idx_ventas_diarias_fecha ON public.historico_ventas_diario(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_diarias_periodo ON public.historico_ventas_diario(periodo_key);
CREATE INDEX IF NOT EXISTS idx_ventas_diarias_sucursal ON public.historico_ventas_diario(sucursal_id);

ALTER TABLE public.historico_inflacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_ventas_diario ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='historico_inflacion' AND policyname='public read historico_inflacion') THEN
    EXECUTE 'CREATE POLICY "public read historico_inflacion" ON public.historico_inflacion FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='historico_ventas_diario' AND policyname='public read historico_ventas_diario') THEN
    EXECUTE 'CREATE POLICY "public read historico_ventas_diario" ON public.historico_ventas_diario FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='historico_inflacion' AND policyname='public write historico_inflacion') THEN
    EXECUTE 'CREATE POLICY "public write historico_inflacion" ON public.historico_inflacion FOR ALL USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='historico_ventas_diario' AND policyname='public write historico_ventas_diario') THEN
    EXECUTE 'CREATE POLICY "public write historico_ventas_diario" ON public.historico_ventas_diario FOR ALL USING (true) WITH CHECK (true)';
  END IF;
END $$;
`

async function run() {
  try {
    await client.connect()
    console.log('Connected to Supabase PostgreSQL via Pooler!')
    await client.query(SCHEMA)
    console.log('✅ Estacionalidad schema applied successfully!')
    await client.end()
  } catch (err) {
    console.error('Error applying schema:', err.message)
    process.exit(1)
  }
}

run()

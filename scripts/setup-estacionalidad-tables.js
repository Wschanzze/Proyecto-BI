const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) {
      process.env[key.trim()] = vals.join('=').trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('⚡ Ejecutando creación de tablas de estacionalidad vía RPC exec_sql...');

  const sql1 = `
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
  `;

  const sql2 = `
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
  `;

  const sql3 = `
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
  `;

  const { error: e1 } = await supabase.rpc('exec_sql', { sql: sql1 });
  const { error: e2 } = await supabase.rpc('exec_sql', { sql: sql2 });
  const { error: e3 } = await supabase.rpc('exec_sql', { sql: sql3 });

  if (e1 || e2 || e3) {
    console.error('RPC Error:', e1?.message || e2?.message || e3?.message);
  } else {
    console.log('✅ Tablas public.historico_inflacion y public.historico_ventas_diario creadas exitosamente!');
  }
}

main();

-- Migración: Módulo de Costos Globales con Prorrateo por Sucursal
-- Fecha: 2026-08-11

-- Tabla de lotes/batches de cargas de costos globales (para historial y eliminación)
CREATE TABLE IF NOT EXISTS lotes_costos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_key text NOT NULL,
  nombre_archivo text,
  total_registros integer DEFAULT 0,
  uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lotes_costos_periodo ON lotes_costos(periodo_key);

-- Tabla de costos globales (costos de cadena que se prorratean por sucursal)
-- Cuando un subgrupo tiene costo total (no segmentado), se carga aquí.
-- El sistema lo distribuye automáticamente por participación en facturación.
CREATE TABLE IF NOT EXISTS costos_globales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id uuid NOT NULL REFERENCES lotes_costos(id) ON DELETE CASCADE,
  periodo_key text NOT NULL,
  grupo_id text NOT NULL REFERENCES grupos(id),
  costo_total numeric(18,2) NOT NULL DEFAULT 0,
  descripcion text,
  created_at timestamptz DEFAULT now(),
  -- Un solo registro de costo global por grupo × período
  UNIQUE (periodo_key, grupo_id)
);

CREATE INDEX IF NOT EXISTS idx_costos_globales_periodo ON costos_globales(periodo_key);
CREATE INDEX IF NOT EXISTS idx_costos_globales_grupo ON costos_globales(grupo_id);
CREATE INDEX IF NOT EXISTS idx_costos_globales_lote ON costos_globales(lote_id);

-- Políticas RLS (acceso público de lectura, service role para escritura)
ALTER TABLE lotes_costos ENABLE ROW LEVEL SECURITY;
ALTER TABLE costos_globales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lotes_costos_public_read" ON lotes_costos
  FOR SELECT USING (true);

CREATE POLICY "costos_globales_public_read" ON costos_globales
  FOR SELECT USING (true);

-- Service role puede hacer todo (bypasa RLS automáticamente)

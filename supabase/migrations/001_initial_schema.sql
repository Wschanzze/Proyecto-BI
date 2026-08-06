-- ============================================================
-- Monarca BI — Schema v2 (estructura real de datos)
-- Jerarquía real: Categoría → Sector → Grupo
-- Granularidad de resultados: Sucursal × Grupo × Período
-- ============================================================

-- 1. SUCURSALES

CREATE TABLE IF NOT EXISTS sucursales (
  id     text PRIMARY KEY,   -- slug sin tilde: 'colon', 'san-martin', etc.
  nombre text NOT NULL,       -- con tilde: 'Colón', 'San Martín', etc.
  orden  smallint NOT NULL DEFAULT 0
);

-- 2. CATÁLOGO (jerarquía de 3 niveles)

-- Nivel 1: Categoría (ej: Salon, Frescos) — col "Categoria" del archivo
CREATE TABLE IF NOT EXISTS categorias (
  id     text PRIMARY KEY,
  nombre text NOT NULL,
  orden  smallint NOT NULL DEFAULT 0
);

-- Nivel 2: Sector (ej: ALMACEN, BEBES Y NIÑOS) — col "SECTOR" del archivo
CREATE TABLE IF NOT EXISTS sectores (
  id           text PRIMARY KEY,
  categoria_id text NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  nombre       text NOT NULL,
  orden        smallint NOT NULL DEFAULT 0
);

-- Nivel 3: Grupo (ej: ACEITES, ADEREZOS) — col "GRUPO" del archivo
CREATE TABLE IF NOT EXISTS grupos (
  id        text PRIMARY KEY,
  sector_id text NOT NULL REFERENCES sectores(id) ON DELETE CASCADE,
  nombre    text NOT NULL,
  orden     smallint NOT NULL DEFAULT 0
);

-- 3. PERÍODOS

CREATE TABLE IF NOT EXISTS periodos (
  id          serial PRIMARY KEY,
  key         text UNIQUE NOT NULL,       -- '2026-06' (YYYY-MM)
  anio        smallint NOT NULL,
  mes         smallint NOT NULL,
  label       text NOT NULL,              -- 'jun-26' (tal como viene del archivo)
  fecha_carga timestamptz DEFAULT now(),
  archivo_nombre text,
  UNIQUE(anio, mes)
);

-- 4. RESULTADOS (granularidad: Sucursal × Grupo × Período)
-- Métricas crudas del archivo — las derivadas (CMg%, etc.) se calculan en la app

CREATE TABLE IF NOT EXISTS resultados (
  id           bigserial PRIMARY KEY,
  periodo_id   int          NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  sucursal_id  text         NOT NULL REFERENCES sucursales(id),
  grupo_id     text         NOT NULL REFERENCES grupos(id),
  cantidad     int          NOT NULL DEFAULT 0,
  facturacion  numeric(18,2) NOT NULL DEFAULT 0,   -- s/IVA
  iva          numeric(18,2) NOT NULL DEFAULT 0,
  costo        numeric(18,2) NOT NULL DEFAULT 0,   -- costo de mercadería vendida
  UNIQUE(periodo_id, sucursal_id, grupo_id)
);

CREATE INDEX IF NOT EXISTS idx_resultados_periodo  ON resultados(periodo_id);
CREATE INDEX IF NOT EXISTS idx_resultados_sucursal ON resultados(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_resultados_grupo    ON resultados(grupo_id);

-- 5. ROW LEVEL SECURITY

ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectores   ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultados ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sucursales' AND policyname='public read sucursales') THEN
    EXECUTE 'CREATE POLICY "public read sucursales" ON sucursales FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='categorias' AND policyname='public read categorias') THEN
    EXECUTE 'CREATE POLICY "public read categorias" ON categorias FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sectores' AND policyname='public read sectores') THEN
    EXECUTE 'CREATE POLICY "public read sectores" ON sectores FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='grupos' AND policyname='public read grupos') THEN
    EXECUTE 'CREATE POLICY "public read grupos" ON grupos FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='periodos' AND policyname='public read periodos') THEN
    EXECUTE 'CREATE POLICY "public read periodos" ON periodos FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='resultados' AND policyname='public read resultados') THEN
    EXECUTE 'CREATE POLICY "public read resultados" ON resultados FOR SELECT USING (true)';
  END IF;
END $$;

-- 6. SEED INICIAL — Sucursales
INSERT INTO sucursales (id, nombre, orden) VALUES
  ('colon',      'Colón',      1),
  ('san-martin', 'San Martín', 2),
  ('falucho',    'Falucho',    3),
  ('peron',      'Perón',      4),
  ('virtual',    'Virtual',    5)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, orden = EXCLUDED.orden;

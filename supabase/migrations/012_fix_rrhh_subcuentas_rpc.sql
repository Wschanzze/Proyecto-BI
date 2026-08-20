-- ============================================================
-- Monarca BI — Fix RLS + Column Widening + RPC para rrhh_subcuentas
-- ============================================================

-- PASO 1: Eliminar columna generada que depende de las subcuentas
ALTER TABLE rrhh_subcuentas DROP COLUMN IF EXISTS total_rrhh;

-- PASO 2: Ampliar columnas numeric(12,2) -> numeric(18,2) para valores grandes en ARS
ALTER TABLE rrhh_subcuentas
  ALTER COLUMN sueldos TYPE numeric(18,2),
  ALTER COLUMN cargas_sociales TYPE numeric(18,2),
  ALTER COLUMN indemnizaciones TYPE numeric(18,2),
  ALTER COLUMN tabla_merito TYPE numeric(18,2);

-- PASO 3: Recrear columna generada total_rrhh
ALTER TABLE rrhh_subcuentas ADD COLUMN IF NOT EXISTS total_rrhh numeric(18,2) GENERATED ALWAYS AS (
  COALESCE(sueldos,0) + COALESCE(cargas_sociales,0) + COALESCE(indemnizaciones,0) + COALESCE(tabla_merito,0)
) STORED;

-- PASO 4: Fix RLS rrhh_subcuentas
ALTER TABLE rrhh_subcuentas DISABLE ROW LEVEL SECURITY;
ALTER TABLE rrhh_subcuentas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read rrhh_subcuentas" ON rrhh_subcuentas;
DROP POLICY IF EXISTS "admin write rrhh_subcuentas" ON rrhh_subcuentas;
DROP POLICY IF EXISTS "allow_select_rrhh" ON rrhh_subcuentas;
DROP POLICY IF EXISTS "allow_insert_rrhh" ON rrhh_subcuentas;
DROP POLICY IF EXISTS "allow_update_rrhh" ON rrhh_subcuentas;
DROP POLICY IF EXISTS "allow_delete_rrhh" ON rrhh_subcuentas;

CREATE POLICY "allow_select_rrhh" ON rrhh_subcuentas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_insert_rrhh" ON rrhh_subcuentas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_update_rrhh" ON rrhh_subcuentas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete_rrhh" ON rrhh_subcuentas FOR DELETE TO anon, authenticated USING (true);

-- PASO 5: RPC guardar_rrhh_subcuentas (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION guardar_rrhh_subcuentas(
  p_periodo_id int,
  p_sucursal_id text,
  p_sueldos numeric(18,2) DEFAULT 0,
  p_cargas_sociales numeric(18,2) DEFAULT 0,
  p_indemnizaciones numeric(18,2) DEFAULT 0,
  p_tabla_merito numeric(18,2) DEFAULT 0
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  DELETE FROM rrhh_subcuentas WHERE periodo_id = p_periodo_id AND sucursal_id = p_sucursal_id;
  INSERT INTO rrhh_subcuentas (periodo_id, sucursal_id, sueldos, cargas_sociales, indemnizaciones, tabla_merito, archivo_origen, actualizado_en)
  VALUES (p_periodo_id, p_sucursal_id, p_sueldos, p_cargas_sociales, p_indemnizaciones, p_tabla_merito, 'Carga desde interfaz web', now());
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$func$;

GRANT EXECUTE ON FUNCTION guardar_rrhh_subcuentas TO anon, authenticated;

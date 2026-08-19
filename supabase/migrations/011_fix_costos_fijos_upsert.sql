-- ============================================================
-- Monarca BI — Fix completo RLS + RPC + Column sizes
-- Ejecutar completo en Supabase SQL Editor
-- ============================================================

-- PASO 1: Ampliar columnas numeric(12,2) -> numeric(18,2) para soportar valores grandes en ARS
-- Primero hay que eliminar la columna GENERATED que depende de las otras
ALTER TABLE costos_fijos_subcuentas DROP COLUMN IF EXISTS total_costos_fijos;

-- Ahora sí se pueden cambiar los tipos
ALTER TABLE costos_fijos_subcuentas
  ALTER COLUMN alquileres TYPE numeric(18,2),
  ALTER COLUMN honorarios TYPE numeric(18,2),
  ALTER COLUMN tasas_servicios TYPE numeric(18,2),
  ALTER COLUMN mantenimiento_servicios_tecnicos TYPE numeric(18,2),
  ALTER COLUMN perdida_gestion_inventarios TYPE numeric(18,2),
  ALTER COLUMN seguridad_vigilancia TYPE numeric(18,2),
  ALTER COLUMN otros_servicios TYPE numeric(18,2),
  ALTER COLUMN gastos_personal TYPE numeric(18,2),
  ALTER COLUMN otros_gastos TYPE numeric(18,2),
  ALTER COLUMN comisiones_gastos_bancarios TYPE numeric(18,2),
  ALTER COLUMN gastos_extraordinarios TYPE numeric(18,2),
  ALTER COLUMN gastos_comercializacion TYPE numeric(18,2),
  ALTER COLUMN gastos_administracion TYPE numeric(18,2),
  ALTER COLUMN gastos_financiacion TYPE numeric(18,2),
  ALTER COLUMN diferencias_caja_perdida TYPE numeric(18,2);

-- Recrear columna generada con el nuevo tipo numeric(18,2)
ALTER TABLE costos_fijos_subcuentas
  ADD COLUMN IF NOT EXISTS total_costos_fijos numeric(18,2) GENERATED ALWAYS AS (
    COALESCE(alquileres,0) + COALESCE(honorarios,0) + COALESCE(tasas_servicios,0) +
    COALESCE(mantenimiento_servicios_tecnicos,0) + COALESCE(perdida_gestion_inventarios,0) +
    COALESCE(seguridad_vigilancia,0) + COALESCE(otros_servicios,0) +
    COALESCE(gastos_personal,0) + COALESCE(otros_gastos,0) +
    COALESCE(comisiones_gastos_bancarios,0) + COALESCE(gastos_extraordinarios,0) +
    COALESCE(gastos_comercializacion,0) + COALESCE(gastos_administracion,0) +
    COALESCE(gastos_financiacion,0) + COALESCE(diferencias_caja_perdida,0)
  ) STORED;

-- PASO 2: Fix RLS costos_fijos_subcuentas
ALTER TABLE costos_fijos_subcuentas DISABLE ROW LEVEL SECURITY;
ALTER TABLE costos_fijos_subcuentas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read costos_fijos_subcuentas" ON costos_fijos_subcuentas;
DROP POLICY IF EXISTS "admin write costos_fijos_subcuentas" ON costos_fijos_subcuentas;
DROP POLICY IF EXISTS "allow_select_costos_fijos" ON costos_fijos_subcuentas;
DROP POLICY IF EXISTS "allow_insert_costos_fijos" ON costos_fijos_subcuentas;
DROP POLICY IF EXISTS "allow_update_costos_fijos" ON costos_fijos_subcuentas;
DROP POLICY IF EXISTS "allow_delete_costos_fijos" ON costos_fijos_subcuentas;
CREATE POLICY "allow_select_costos_fijos" ON costos_fijos_subcuentas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_insert_costos_fijos" ON costos_fijos_subcuentas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_update_costos_fijos" ON costos_fijos_subcuentas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete_costos_fijos" ON costos_fijos_subcuentas FOR DELETE TO anon, authenticated USING (true);

-- PASO 3: Fix RLS ingresos_financieros_subcuentas
ALTER TABLE ingresos_financieros_subcuentas DISABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos_financieros_subcuentas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read ingresos_financieros_subcuentas" ON ingresos_financieros_subcuentas;
DROP POLICY IF EXISTS "admin write ingresos_financieros_subcuentas" ON ingresos_financieros_subcuentas;
DROP POLICY IF EXISTS "allow_select_ingresos" ON ingresos_financieros_subcuentas;
DROP POLICY IF EXISTS "allow_insert_ingresos" ON ingresos_financieros_subcuentas;
DROP POLICY IF EXISTS "allow_update_ingresos" ON ingresos_financieros_subcuentas;
DROP POLICY IF EXISTS "allow_delete_ingresos" ON ingresos_financieros_subcuentas;
CREATE POLICY "allow_select_ingresos" ON ingresos_financieros_subcuentas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_insert_ingresos" ON ingresos_financieros_subcuentas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_update_ingresos" ON ingresos_financieros_subcuentas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete_ingresos" ON ingresos_financieros_subcuentas FOR DELETE TO anon, authenticated USING (true);

-- PASO 4: Recrear RPC guardar_costos_fijos_subcuentas con numeric(18,2)
CREATE OR REPLACE FUNCTION guardar_costos_fijos_subcuentas(p_periodo_id int, p_sucursal_id text, p_alquileres numeric(18,2) DEFAULT 0, p_honorarios numeric(18,2) DEFAULT 0, p_tasas_servicios numeric(18,2) DEFAULT 0, p_mantenimiento numeric(18,2) DEFAULT 0, p_perdida_inventarios numeric(18,2) DEFAULT 0, p_seguridad numeric(18,2) DEFAULT 0, p_otros_servicios numeric(18,2) DEFAULT 0, p_gastos_personal numeric(18,2) DEFAULT 0, p_otros_gastos numeric(18,2) DEFAULT 0, p_comisiones numeric(18,2) DEFAULT 0, p_gastos_extraordinarios numeric(18,2) DEFAULT 0, p_gastos_comercializacion numeric(18,2) DEFAULT 0, p_gastos_administracion numeric(18,2) DEFAULT 0, p_gastos_financiacion numeric(18,2) DEFAULT 0, p_diferencias_caja numeric(18,2) DEFAULT 0)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  DELETE FROM costos_fijos_subcuentas WHERE periodo_id = p_periodo_id AND sucursal_id = p_sucursal_id;
  INSERT INTO costos_fijos_subcuentas (periodo_id, sucursal_id, alquileres, honorarios, tasas_servicios, mantenimiento_servicios_tecnicos, perdida_gestion_inventarios, seguridad_vigilancia, otros_servicios, gastos_personal, otros_gastos, comisiones_gastos_bancarios, gastos_extraordinarios, gastos_comercializacion, gastos_administracion, gastos_financiacion, diferencias_caja_perdida, archivo_origen, actualizado_en)
  VALUES (p_periodo_id, p_sucursal_id, p_alquileres, p_honorarios, p_tasas_servicios, p_mantenimiento, p_perdida_inventarios, p_seguridad, p_otros_servicios, p_gastos_personal, p_otros_gastos, p_comisiones, p_gastos_extraordinarios, p_gastos_comercializacion, p_gastos_administracion, p_gastos_financiacion, p_diferencias_caja, 'Carga desde interfaz web', now());
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$func$;
GRANT EXECUTE ON FUNCTION guardar_costos_fijos_subcuentas TO anon, authenticated;

-- PASO 5: RPC guardar_ingresos_financieros_subcuentas
CREATE OR REPLACE FUNCTION guardar_ingresos_financieros_subcuentas(p_periodo_id int, p_sucursal_id text, p_operatoria_financiera numeric(18,2) DEFAULT 0, p_rendimientos_financieros numeric(18,2) DEFAULT 0)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  DELETE FROM ingresos_financieros_subcuentas WHERE periodo_id = p_periodo_id AND sucursal_id = p_sucursal_id;
  INSERT INTO ingresos_financieros_subcuentas (periodo_id, sucursal_id, operatoria_financiera, rendimientos_financieros, archivo_origen, actualizado_en)
  VALUES (p_periodo_id, p_sucursal_id, p_operatoria_financiera, p_rendimientos_financieros, 'Carga desde interfaz web', now());
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$func$;
GRANT EXECUTE ON FUNCTION guardar_ingresos_financieros_subcuentas TO anon, authenticated;

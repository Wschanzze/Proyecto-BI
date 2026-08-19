-- ============================================================
-- Monarca BI — Fix completo para escritura en subcuentas de costos
-- ============================================================

-- 1. FIX RLS: agregar WITH CHECK (true) explícito para INSERT/UPDATE
-- La política FOR ALL sin WITH CHECK no permite INSERT desde el cliente anon

ALTER TABLE costos_fijos_subcuentas DISABLE ROW LEVEL SECURITY;
ALTER TABLE costos_fijos_subcuentas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read costos_fijos_subcuentas" ON costos_fijos_subcuentas;
DROP POLICY IF EXISTS "admin write costos_fijos_subcuentas" ON costos_fijos_subcuentas;
DROP POLICY IF EXISTS "allow_select_costos_fijos" ON costos_fijos_subcuentas;
DROP POLICY IF EXISTS "allow_insert_costos_fijos" ON costos_fijos_subcuentas;
DROP POLICY IF EXISTS "allow_update_costos_fijos" ON costos_fijos_subcuentas;
DROP POLICY IF EXISTS "allow_delete_costos_fijos" ON costos_fijos_subcuentas;

CREATE POLICY "allow_select_costos_fijos"
  ON costos_fijos_subcuentas FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "allow_insert_costos_fijos"
  ON costos_fijos_subcuentas FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "allow_update_costos_fijos"
  ON costos_fijos_subcuentas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "allow_delete_costos_fijos"
  ON costos_fijos_subcuentas FOR DELETE TO anon, authenticated USING (true);

-- 2. FIX RLS para ingresos_financieros_subcuentas
ALTER TABLE ingresos_financieros_subcuentas DISABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos_financieros_subcuentas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read ingresos_financieros_subcuentas" ON ingresos_financieros_subcuentas;
DROP POLICY IF EXISTS "admin write ingresos_financieros_subcuentas" ON ingresos_financieros_subcuentas;
DROP POLICY IF EXISTS "allow_select_ingresos" ON ingresos_financieros_subcuentas;
DROP POLICY IF EXISTS "allow_insert_ingresos" ON ingresos_financieros_subcuentas;
DROP POLICY IF EXISTS "allow_update_ingresos" ON ingresos_financieros_subcuentas;
DROP POLICY IF EXISTS "allow_delete_ingresos" ON ingresos_financieros_subcuentas;

CREATE POLICY "allow_select_ingresos"
  ON ingresos_financieros_subcuentas FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "allow_insert_ingresos"
  ON ingresos_financieros_subcuentas FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "allow_update_ingresos"
  ON ingresos_financieros_subcuentas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "allow_delete_ingresos"
  ON ingresos_financieros_subcuentas FOR DELETE TO anon, authenticated USING (true);

-- 3. Crear función RPC para guardar costos fijos sin restricciones de RLS
-- Esta función corre con SECURITY DEFINER (como superuser), saltándose RLS
CREATE OR REPLACE FUNCTION guardar_costos_fijos_subcuentas(
  p_periodo_id int,
  p_sucursal_id text,
  p_alquileres numeric DEFAULT 0,
  p_honorarios numeric DEFAULT 0,
  p_tasas_servicios numeric DEFAULT 0,
  p_mantenimiento numeric DEFAULT 0,
  p_perdida_inventarios numeric DEFAULT 0,
  p_seguridad numeric DEFAULT 0,
  p_otros_servicios numeric DEFAULT 0,
  p_gastos_personal numeric DEFAULT 0,
  p_otros_gastos numeric DEFAULT 0,
  p_comisiones numeric DEFAULT 0,
  p_gastos_extraordinarios numeric DEFAULT 0,
  p_gastos_comercializacion numeric DEFAULT 0,
  p_gastos_administracion numeric DEFAULT 0,
  p_gastos_financiacion numeric DEFAULT 0,
  p_diferencias_caja numeric DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Eliminar registro existente
  DELETE FROM costos_fijos_subcuentas
  WHERE periodo_id = p_periodo_id AND sucursal_id = p_sucursal_id;

  -- Insertar nuevo registro
  INSERT INTO costos_fijos_subcuentas (
    periodo_id, sucursal_id,
    alquileres, honorarios, tasas_servicios,
    mantenimiento_servicios_tecnicos, perdida_gestion_inventarios,
    seguridad_vigilancia, otros_servicios, gastos_personal,
    otros_gastos, comisiones_gastos_bancarios, gastos_extraordinarios,
    gastos_comercializacion, gastos_administracion, gastos_financiacion,
    diferencias_caja_perdida, archivo_origen, actualizado_en
  ) VALUES (
    p_periodo_id, p_sucursal_id,
    p_alquileres, p_honorarios, p_tasas_servicios,
    p_mantenimiento, p_perdida_inventarios,
    p_seguridad, p_otros_servicios, p_gastos_personal,
    p_otros_gastos, p_comisiones, p_gastos_extraordinarios,
    p_gastos_comercializacion, p_gastos_administracion, p_gastos_financiacion,
    p_diferencias_caja, 'Carga desde interfaz web', now()
  );

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 4. Crear función RPC para guardar ingresos financieros
CREATE OR REPLACE FUNCTION guardar_ingresos_financieros_subcuentas(
  p_periodo_id int,
  p_sucursal_id text,
  p_operatoria_financiera numeric DEFAULT 0,
  p_rendimientos_financieros numeric DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM ingresos_financieros_subcuentas
  WHERE periodo_id = p_periodo_id AND sucursal_id = p_sucursal_id;

  INSERT INTO ingresos_financieros_subcuentas (
    periodo_id, sucursal_id,
    operatoria_financiera, rendimientos_financieros,
    archivo_origen, actualizado_en
  ) VALUES (
    p_periodo_id, p_sucursal_id,
    p_operatoria_financiera, p_rendimientos_financieros,
    'Carga desde interfaz web', now()
  );

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Permisos para ejecutar las funciones
GRANT EXECUTE ON FUNCTION guardar_costos_fijos_subcuentas TO anon, authenticated;
GRANT EXECUTE ON FUNCTION guardar_ingresos_financieros_subcuentas TO anon, authenticated;

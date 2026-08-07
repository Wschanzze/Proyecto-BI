-- ============================================================
-- Monarca BI — RRHH Subcuentas Detalladas
-- Desagregación de costos de RRHH en subcuentas para P&L
-- ============================================================

-- 1. TABLA DE SUBCUENTAS RRHH
-- Esta tabla almacena el detalle mensual de costos de RRHH por tipo
CREATE TABLE IF NOT EXISTS rrhh_subcuentas (
  id serial PRIMARY KEY,
  periodo_id int NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  sucursal_id text NOT NULL REFERENCES sucursales(id),
  
  -- Subcuentas de RRHH
  sueldos numeric(12,2) NOT NULL DEFAULT 0, -- Sueldos brutos totales
  cargas_sociales numeric(12,2) NOT NULL DEFAULT 0, -- Aportes patronales + ART + obra social empleador
  indemnizaciones numeric(12,2) DEFAULT 0, -- Indemnizaciones por despido
  tabla_merito numeric(12,2) DEFAULT 0, -- Bonos por desempeño/mérito
  
  -- Total calculado
  total_rrhh numeric(12,2) GENERATED ALWAYS AS (sueldos + cargas_sociales + COALESCE(indemnizaciones, 0) + COALESCE(tabla_merito, 0)) STORED,
  
  -- Metadatos
  archivo_origen text,
  observaciones text,
  creado_en timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now(),
  
  UNIQUE(periodo_id, sucursal_id)
);

-- 2. FUNCIÓN PARA CALCULAR AUTOMÁTICAMENTE DESDE NÓMINA
-- Esta función calcula las subcuentas RRHH desde los datos de nomina_mensual
CREATE OR REPLACE FUNCTION calcular_rrhh_subcuentas(p_periodo_id int, p_sucursal_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_sueldos numeric(12,2);
  v_cargas_sociales numeric(12,2);
BEGIN
  -- Calcular sueldos: suma de total_remunerativo de todos los empleados
  SELECT COALESCE(SUM(total_remunerativo), 0)
  INTO v_sueldos
  FROM nomina_mensual
  WHERE periodo_id = p_periodo_id
    AND sucursal_id = p_sucursal_id;
  
  -- Calcular cargas sociales: suma de aportes_patronales + ART
  SELECT COALESCE(SUM(aportes_patronales + art), 0)
  INTO v_cargas_sociales
  FROM nomina_mensual
  WHERE periodo_id = p_periodo_id
    AND sucursal_id = p_sucursal_id;
  
  -- Insertar o actualizar en rrhh_subcuentas
  INSERT INTO rrhh_subcuentas (periodo_id, sucursal_id, sueldos, cargas_sociales, observaciones)
  VALUES (p_periodo_id, p_sucursal_id, v_sueldos, v_cargas_sociales, 'Calculado automáticamente desde nómina')
  ON CONFLICT (periodo_id, sucursal_id)
  DO UPDATE SET
    sueldos = EXCLUDED.sueldos,
    cargas_sociales = EXCLUDED.cargas_sociales,
    actualizado_en = now();
END;
$$;

-- 3. TRIGGER PARA ACTUALIZAR AUTOMÁTICAMENTE
-- Cuando se inserta/actualiza nómina, recalcular subcuentas RRHH
CREATE OR REPLACE FUNCTION trigger_actualizar_rrhh_subcuentas()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Recalcular las subcuentas para el período y sucursal afectados
  PERFORM calcular_rrhh_subcuentas(NEW.periodo_id, NEW.sucursal_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_nomina_actualiza_rrhh ON nomina_mensual;
CREATE TRIGGER trigger_nomina_actualiza_rrhh
AFTER INSERT OR UPDATE ON nomina_mensual
FOR EACH ROW
EXECUTE FUNCTION trigger_actualizar_rrhh_subcuentas();

-- 4. INDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_rrhh_subcuentas_periodo ON rrhh_subcuentas(periodo_id);
CREATE INDEX IF NOT EXISTS idx_rrhh_subcuentas_sucursal ON rrhh_subcuentas(sucursal_id);

-- 5. ROW LEVEL SECURITY
ALTER TABLE rrhh_subcuentas ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "public read rrhh_subcuentas" ON rrhh_subcuentas;
DROP POLICY IF EXISTS "admin write rrhh_subcuentas" ON rrhh_subcuentas;

-- Políticas de lectura pública
CREATE POLICY "public read rrhh_subcuentas" ON rrhh_subcuentas FOR SELECT USING (true);

-- Políticas de escritura para administradores
CREATE POLICY "admin write rrhh_subcuentas" ON rrhh_subcuentas FOR ALL USING (true);

-- 6. CALCULAR SUBCUENTAS DESDE DATOS EXISTENTES
-- Si ya hay datos de nómina, calcular las subcuentas
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT DISTINCT periodo_id, sucursal_id 
    FROM nomina_mensual
  LOOP
    PERFORM calcular_rrhh_subcuentas(r.periodo_id, r.sucursal_id);
  END LOOP;
END;
$$;

-- 7. VISTA CONSOLIDADA DE RRHH
-- Facilita la consulta de RRHH con datos consolidados
DROP VIEW IF EXISTS vista_rrhh_consolidado;
CREATE OR REPLACE VIEW vista_rrhh_consolidado AS
SELECT 
  p.anio,
  p.mes,
  p.key as periodo_key,
  s.id as sucursal_id,
  s.nombre as sucursal_nombre,
  rs.sueldos,
  rs.cargas_sociales,
  rs.indemnizaciones,
  rs.tabla_merito,
  rs.total_rrhh,
  (SELECT COUNT(*) FROM nomina_mensual nm WHERE nm.periodo_id = p.id AND nm.sucursal_id = s.id) as cantidad_empleados,
  rs.creado_en,
  rs.actualizado_en
FROM periodos p
CROSS JOIN sucursales s
LEFT JOIN rrhh_subcuentas rs ON rs.periodo_id = p.id AND rs.sucursal_id = s.id
ORDER BY p.anio DESC, p.mes DESC, s.orden;

COMMENT ON TABLE rrhh_subcuentas IS 'Subcuentas detalladas de RRHH por período y sucursal';
COMMENT ON VIEW vista_rrhh_consolidado IS 'Vista consolidada de RRHH con información de períodos y sucursales';

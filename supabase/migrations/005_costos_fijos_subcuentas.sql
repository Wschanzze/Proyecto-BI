-- ============================================================
-- Monarca BI — Costos Fijos Subcuentas Detalladas
-- Desagregación de costos fijos operativos en 15 subcuentas para P&L
-- ============================================================

-- 1. TABLA DE SUBCUENTAS COSTOS FIJOS
-- Esta tabla almacena el detalle mensual de costos fijos por tipo
CREATE TABLE IF NOT EXISTS costos_fijos_subcuentas (
  id serial PRIMARY KEY,
  periodo_id int NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  sucursal_id text NOT NULL REFERENCES sucursales(id),
  
  -- Subcuentas de Costos Fijos (15 cuentas)
  alquileres numeric(12,2) DEFAULT 0,
  honorarios numeric(12,2) DEFAULT 0,
  tasas_servicios numeric(12,2) DEFAULT 0,
  mantenimiento_servicios_tecnicos numeric(12,2) DEFAULT 0,
  perdida_gestion_inventarios numeric(12,2) DEFAULT 0,
  seguridad_vigilancia numeric(12,2) DEFAULT 0,
  otros_servicios numeric(12,2) DEFAULT 0,
  gastos_personal numeric(12,2) DEFAULT 0,
  otros_gastos numeric(12,2) DEFAULT 0,
  comisiones_gastos_bancarios numeric(12,2) DEFAULT 0,
  gastos_extraordinarios numeric(12,2) DEFAULT 0,
  gastos_comercializacion numeric(12,2) DEFAULT 0,
  gastos_administracion numeric(12,2) DEFAULT 0,
  gastos_financiacion numeric(12,2) DEFAULT 0,
  diferencias_caja_perdida numeric(12,2) DEFAULT 0,
  
  -- Total calculado (suma de todas las subcuentas)
  total_costos_fijos numeric(12,2) GENERATED ALWAYS AS (
    COALESCE(alquileres, 0) + 
    COALESCE(honorarios, 0) + 
    COALESCE(tasas_servicios, 0) + 
    COALESCE(mantenimiento_servicios_tecnicos, 0) + 
    COALESCE(perdida_gestion_inventarios, 0) + 
    COALESCE(seguridad_vigilancia, 0) + 
    COALESCE(otros_servicios, 0) + 
    COALESCE(gastos_personal, 0) + 
    COALESCE(otros_gastos, 0) + 
    COALESCE(comisiones_gastos_bancarios, 0) + 
    COALESCE(gastos_extraordinarios, 0) + 
    COALESCE(gastos_comercializacion, 0) + 
    COALESCE(gastos_administracion, 0) + 
    COALESCE(gastos_financiacion, 0) + 
    COALESCE(diferencias_caja_perdida, 0)
  ) STORED,
  
  -- Metadatos
  archivo_origen text,
  observaciones text,
  creado_en timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now(),
  
  UNIQUE(periodo_id, sucursal_id)
);

-- 2. FUNCIÓN PARA CALCULAR AUTOMÁTICAMENTE DESDE COSTOS ESTRUCTURALES
-- Esta función agrupa los costos estructurales en las subcuentas correspondientes
CREATE OR REPLACE FUNCTION calcular_costos_fijos_subcuentas(p_periodo_id int, p_sucursal_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_alquileres numeric(12,2);
  v_honorarios numeric(12,2);
  v_tasas_servicios numeric(12,2);
  v_mantenimiento numeric(12,2);
  v_perdida_inventarios numeric(12,2);
  v_seguridad numeric(12,2);
  v_otros_servicios numeric(12,2);
  v_gastos_personal numeric(12,2);
  v_otros_gastos numeric(12,2);
  v_comisiones_bancarias numeric(12,2);
  v_gastos_extraordinarios numeric(12,2);
  v_gastos_comercializacion numeric(12,2);
  v_gastos_administracion numeric(12,2);
  v_gastos_financiacion numeric(12,2);
  v_diferencias_caja numeric(12,2);
BEGIN
  -- Alquileres
  SELECT COALESCE(SUM(importe), 0) INTO v_alquileres
  FROM costos_estructurales
  WHERE periodo_id = p_periodo_id AND sucursal_id = p_sucursal_id
    AND categoria_costo = 'alquileres';
  
  -- Honorarios (de servicios profesionales)
  SELECT COALESCE(SUM(importe), 0) INTO v_honorarios
  FROM costos_estructurales
  WHERE periodo_id = p_periodo_id AND sucursal_id = p_sucursal_id
    AND (subcategoria ILIKE '%honorario%' OR subcategoria ILIKE '%profesional%');
  
  -- Tasas y Servicios (impuestos + servicios básicos)
  SELECT COALESCE(SUM(importe), 0) INTO v_tasas_servicios
  FROM costos_estructurales
  WHERE periodo_id = p_periodo_id AND sucursal_id = p_sucursal_id
    AND (categoria_costo IN ('servicios', 'impuestos') OR subcategoria ILIKE '%tasa%');
  
  -- Mantenimiento y Servicios Técnicos
  SELECT COALESCE(SUM(importe), 0) INTO v_mantenimiento
  FROM costos_estructurales
  WHERE periodo_id = p_periodo_id AND sucursal_id = p_sucursal_id
    AND (categoria_costo = 'mantenimiento' OR subcategoria ILIKE '%tecnico%' OR subcategoria ILIKE '%reparacion%');
  
  -- Pérdida en Gestión de Inventarios (mermas, roturas, vencimientos)
  SELECT COALESCE(SUM(importe), 0) INTO v_perdida_inventarios
  FROM costos_estructurales
  WHERE periodo_id = p_periodo_id AND sucursal_id = p_sucursal_id
    AND (subcategoria ILIKE '%merma%' OR subcategoria ILIKE '%rotura%' OR subcategoria ILIKE '%vencimiento%');
  
  -- Seguridad y Vigilancia
  SELECT COALESCE(SUM(importe), 0) INTO v_seguridad
  FROM costos_estructurales
  WHERE periodo_id = p_periodo_id AND sucursal_id = p_sucursal_id
    AND (categoria_costo = 'seguros' OR subcategoria ILIKE '%seguridad%' OR subcategoria ILIKE '%vigilancia%');
  
  -- Otros Servicios
  SELECT COALESCE(SUM(importe), 0) INTO v_otros_servicios
  FROM costos_estructurales
  WHERE periodo_id = p_periodo_id AND sucursal_id = p_sucursal_id
    AND categoria_costo = 'otros';
  
  -- Gastos en Personal (que no sean de RRHH)
  SELECT COALESCE(SUM(importe), 0) INTO v_gastos_personal
  FROM costos_estructurales
  WHERE periodo_id = p_periodo_id AND sucursal_id = p_sucursal_id
    AND (subcategoria ILIKE '%capacitacion%' OR subcategoria ILIKE '%uniforme%' OR subcategoria ILIKE '%viatico%');
  
  -- Otros Gastos
  SELECT COALESCE(SUM(importe), 0) INTO v_otros_gastos
  FROM costos_estructurales
  WHERE periodo_id = p_periodo_id AND sucursal_id = p_sucursal_id
    AND tipo_gasto = 'operativo' AND categoria_costo NOT IN ('alquileres', 'servicios', 'impuestos', 'mantenimiento', 'seguros', 'marketing');
  
  -- Comisiones y Gastos Bancarios
  SELECT COALESCE(SUM(importe), 0) INTO v_comisiones_bancarias
  FROM costos_estructurales
  WHERE periodo_id = p_periodo_id AND sucursal_id = p_sucursal_id
    AND (tipo_gasto = 'financiero' OR subcategoria ILIKE '%bancari%' OR subcategoria ILIKE '%comision%');
  
  -- Gastos Extraordinarios
  SELECT COALESCE(SUM(importe), 0) INTO v_gastos_extraordinarios
  FROM costos_estructurales
  WHERE periodo_id = p_periodo_id AND sucursal_id = p_sucursal_id
    AND (subcategoria ILIKE '%extraordinario%' OR subcategoria ILIKE '%eventual%');
  
  -- Gastos de Comercialización
  SELECT COALESCE(SUM(importe), 0) INTO v_gastos_comercializacion
  FROM costos_estructurales
  WHERE periodo_id = p_periodo_id AND sucursal_id = p_sucursal_id
    AND (categoria_costo = 'marketing' OR tipo_gasto = 'comercial');
  
  -- Gastos de Administración
  SELECT COALESCE(SUM(importe), 0) INTO v_gastos_administracion
  FROM costos_estructurales
  WHERE periodo_id = p_periodo_id AND sucursal_id = p_sucursal_id
    AND tipo_gasto = 'administrativo';
  
  -- Gastos de Financiación
  SELECT COALESCE(SUM(importe), 0) INTO v_gastos_financiacion
  FROM costos_estructurales
  WHERE periodo_id = p_periodo_id AND sucursal_id = p_sucursal_id
    AND (subcategoria ILIKE '%interes%' OR subcategoria ILIKE '%financ%');
  
  -- Diferencias de Caja - Pérdida
  SELECT COALESCE(SUM(importe), 0) INTO v_diferencias_caja
  FROM costos_estructurales
  WHERE periodo_id = p_periodo_id AND sucursal_id = p_sucursal_id
    AND (subcategoria ILIKE '%diferencia%' OR subcategoria ILIKE '%faltante%');
  
  -- Insertar o actualizar en costos_fijos_subcuentas
  INSERT INTO costos_fijos_subcuentas (
    periodo_id, sucursal_id,
    alquileres, honorarios, tasas_servicios, mantenimiento_servicios_tecnicos,
    perdida_gestion_inventarios, seguridad_vigilancia, otros_servicios,
    gastos_personal, otros_gastos, comisiones_gastos_bancarios,
    gastos_extraordinarios, gastos_comercializacion, gastos_administracion,
    gastos_financiacion, diferencias_caja_perdida,
    observaciones
  )
  VALUES (
    p_periodo_id, p_sucursal_id,
    v_alquileres, v_honorarios, v_tasas_servicios, v_mantenimiento,
    v_perdida_inventarios, v_seguridad, v_otros_servicios,
    v_gastos_personal, v_otros_gastos, v_comisiones_bancarias,
    v_gastos_extraordinarios, v_gastos_comercializacion, v_gastos_administracion,
    v_gastos_financiacion, v_diferencias_caja,
    'Calculado automáticamente desde costos estructurales'
  )
  ON CONFLICT (periodo_id, sucursal_id)
  DO UPDATE SET
    alquileres = EXCLUDED.alquileres,
    honorarios = EXCLUDED.honorarios,
    tasas_servicios = EXCLUDED.tasas_servicios,
    mantenimiento_servicios_tecnicos = EXCLUDED.mantenimiento_servicios_tecnicos,
    perdida_gestion_inventarios = EXCLUDED.perdida_gestion_inventarios,
    seguridad_vigilancia = EXCLUDED.seguridad_vigilancia,
    otros_servicios = EXCLUDED.otros_servicios,
    gastos_personal = EXCLUDED.gastos_personal,
    otros_gastos = EXCLUDED.otros_gastos,
    comisiones_gastos_bancarios = EXCLUDED.comisiones_gastos_bancarios,
    gastos_extraordinarios = EXCLUDED.gastos_extraordinarios,
    gastos_comercializacion = EXCLUDED.gastos_comercializacion,
    gastos_administracion = EXCLUDED.gastos_administracion,
    gastos_financiacion = EXCLUDED.gastos_financiacion,
    diferencias_caja_perdida = EXCLUDED.diferencias_caja_perdida,
    actualizado_en = now();
END;
$$;

-- 3. TRIGGER PARA ACTUALIZAR AUTOMÁTICAMENTE
-- Cuando se inserta/actualiza costos estructurales, recalcular costos fijos
CREATE OR REPLACE FUNCTION trigger_actualizar_costos_fijos_subcuentas()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM calcular_costos_fijos_subcuentas(NEW.periodo_id, NEW.sucursal_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_costos_actualiza_fijos ON costos_estructurales;
CREATE TRIGGER trigger_costos_actualiza_fijos
AFTER INSERT OR UPDATE ON costos_estructurales
FOR EACH ROW
EXECUTE FUNCTION trigger_actualizar_costos_fijos_subcuentas();

-- 4. INDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_costos_fijos_subcuentas_periodo ON costos_fijos_subcuentas(periodo_id);
CREATE INDEX IF NOT EXISTS idx_costos_fijos_subcuentas_sucursal ON costos_fijos_subcuentas(sucursal_id);

-- 5. ROW LEVEL SECURITY
ALTER TABLE costos_fijos_subcuentas ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "public read costos_fijos_subcuentas" ON costos_fijos_subcuentas;
DROP POLICY IF EXISTS "admin write costos_fijos_subcuentas" ON costos_fijos_subcuentas;

-- Crear políticas
CREATE POLICY "public read costos_fijos_subcuentas" ON costos_fijos_subcuentas FOR SELECT USING (true);
CREATE POLICY "admin write costos_fijos_subcuentas" ON costos_fijos_subcuentas FOR ALL USING (true);

-- 6. CALCULAR SUBCUENTAS DESDE DATOS EXISTENTES
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT DISTINCT periodo_id, sucursal_id 
    FROM costos_estructurales
  LOOP
    PERFORM calcular_costos_fijos_subcuentas(r.periodo_id, r.sucursal_id);
  END LOOP;
END;
$$;

-- 7. VISTA CONSOLIDADA DE COSTOS FIJOS
DROP VIEW IF EXISTS vista_costos_fijos_consolidado;
CREATE OR REPLACE VIEW vista_costos_fijos_consolidado AS
SELECT 
  p.anio,
  p.mes,
  p.key as periodo_key,
  s.id as sucursal_id,
  s.nombre as sucursal_nombre,
  cf.alquileres,
  cf.honorarios,
  cf.tasas_servicios,
  cf.mantenimiento_servicios_tecnicos,
  cf.perdida_gestion_inventarios,
  cf.seguridad_vigilancia,
  cf.otros_servicios,
  cf.gastos_personal,
  cf.otros_gastos,
  cf.comisiones_gastos_bancarios,
  cf.gastos_extraordinarios,
  cf.gastos_comercializacion,
  cf.gastos_administracion,
  cf.gastos_financiacion,
  cf.diferencias_caja_perdida,
  cf.total_costos_fijos,
  cf.creado_en,
  cf.actualizado_en
FROM periodos p
CROSS JOIN sucursales s
LEFT JOIN costos_fijos_subcuentas cf ON cf.periodo_id = p.id AND cf.sucursal_id = s.id
ORDER BY p.anio DESC, p.mes DESC, s.orden;

COMMENT ON TABLE costos_fijos_subcuentas IS 'Subcuentas detalladas de Costos Fijos operativos por período y sucursal';
COMMENT ON VIEW vista_costos_fijos_consolidado IS 'Vista consolidada de Costos Fijos con información de períodos y sucursales';

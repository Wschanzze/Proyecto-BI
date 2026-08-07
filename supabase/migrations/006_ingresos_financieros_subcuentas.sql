-- ============================================================
-- Monarca BI — Ingresos Financieros Subcuentas
-- Desagregación de ingresos financieros en subcuentas para P&L
-- ============================================================

-- 1. TABLA DE SUBCUENTAS INGRESOS FINANCIEROS
CREATE TABLE IF NOT EXISTS ingresos_financieros_subcuentas (
  id serial PRIMARY KEY,
  periodo_id int NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  sucursal_id text NOT NULL REFERENCES sucursales(id),
  
  -- Subcuentas de Ingresos Financieros
  operatoria_financiera numeric(12,2) DEFAULT 0, -- Ingresos por operaciones financieras (tarjetas, plazos, etc.)
  rendimientos_financieros numeric(12,2) DEFAULT 0, -- Rendimientos por inversiones, plazos fijos, etc.
  
  -- Total calculado
  total_ingresos_financieros numeric(12,2) GENERATED ALWAYS AS (
    COALESCE(operatoria_financiera, 0) + COALESCE(rendimientos_financieros, 0)
  ) STORED,
  
  -- Metadatos
  archivo_origen text,
  observaciones text,
  creado_en timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now(),
  
  UNIQUE(periodo_id, sucursal_id)
);

-- 2. INDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_ingresos_financieros_periodo ON ingresos_financieros_subcuentas(periodo_id);
CREATE INDEX IF NOT EXISTS idx_ingresos_financieros_sucursal ON ingresos_financieros_subcuentas(sucursal_id);

-- 3. ROW LEVEL SECURITY
ALTER TABLE ingresos_financieros_subcuentas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read ingresos_financieros_subcuentas" ON ingresos_financieros_subcuentas FOR SELECT USING (true);
CREATE POLICY "admin write ingresos_financieros_subcuentas" ON ingresos_financieros_subcuentas FOR ALL USING (true);

-- 4. VISTA CONSOLIDADA DE INGRESOS FINANCIEROS
CREATE OR REPLACE VIEW vista_ingresos_financieros_consolidado AS
SELECT 
  p.anio,
  p.mes,
  p.key as periodo_key,
  s.id as sucursal_id,
  s.nombre as sucursal_nombre,
  ifs.operatoria_financiera,
  ifs.rendimientos_financieros,
  ifs.total_ingresos_financieros,
  ifs.creado_en,
  ifs.actualizado_en
FROM periodos p
CROSS JOIN sucursales s
LEFT JOIN ingresos_financieros_subcuentas ifs ON ifs.periodo_id = p.id AND ifs.sucursal_id = s.id
ORDER BY p.anio DESC, p.mes DESC, s.orden;

COMMENT ON TABLE ingresos_financieros_subcuentas IS 'Subcuentas de Ingresos Financieros por período y sucursal';
COMMENT ON VIEW vista_ingresos_financieros_consolidado IS 'Vista consolidada de Ingresos Financieros con información de períodos y sucursales';

-- ============================================================
-- Monarca BI — Métricas Configurables para P&L (Admin)
-- ============================================================

-- Tabla para configurar ratios y métricas del P&L
CREATE TABLE IF NOT EXISTS metricas_configurables (
  id serial PRIMARY KEY,
  categoria text NOT NULL,          -- 'ratios', 'impuestos', 'estimaciones', etc.
  clave text NOT NULL,              -- 'rrhh_porcentaje', 'merma_porcentaje', etc.
  nombre text NOT NULL,             -- 'RRHH sobre Ventas', 'Merma Estimada', etc.
  descripcion text,                 -- Explicación de qué representa
  valor numeric(10,4) NOT NULL,     -- Valor del ratio (ej: 0.12 para 12%)
  tipo text NOT NULL DEFAULT 'porcentaje', -- 'porcentaje', 'monto', 'cantidad'
  unidad text DEFAULT '%',          -- '%', 'ARS', 'unidades', etc.
  activo boolean DEFAULT true,      -- Si está activo o no
  sucursal_id text,                 -- NULL = aplica a todas, o específico
  fecha_desde date DEFAULT CURRENT_DATE,
  fecha_hasta date,                 -- NULL = indefinido
  creado_en timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now(),
  creado_por text,                  -- Email del usuario admin
  
  UNIQUE(categoria, clave, sucursal_id, fecha_desde)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_metricas_configurables_categoria ON metricas_configurables(categoria);
CREATE INDEX IF NOT EXISTS idx_metricas_configurables_activo ON metricas_configurables(activo);
CREATE INDEX IF NOT EXISTS idx_metricas_configurables_sucursal ON metricas_configurables(sucursal_id);

-- Row Level Security
ALTER TABLE metricas_configurables ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública (para consulta desde el P&L)
CREATE POLICY "public read metricas_configurables" ON metricas_configurables 
  FOR SELECT USING (true);

-- Política de escritura solo para admins (por ahora permisiva, después podemos restringir)
CREATE POLICY "admin write metricas_configurables" ON metricas_configurables 
  FOR ALL USING (true);

-- Seed inicial con los ratios actuales del P&L
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES
  -- Ratios principales
  ('ratios', 'iva_porcentaje', 'IVA General', 'Impuesto al Valor Agregado aplicado a ventas', 0.21, 'porcentaje', '%'),
  ('ratios', 'rrhh_porcentaje', 'RRHH sobre Ventas', 'Recursos Humanos como porcentaje de ventas sin IVA', 0.12, 'porcentaje', '%'),
  ('ratios', 'gastos_comerciales_porcentaje', 'Gastos Comerciales', 'Marketing y gastos de comercialización sobre ventas', 0.03, 'porcentaje', '%'),
  ('ratios', 'impuestos_operativos_porcentaje', 'Impuestos Operativos', 'Impuestos y cargas operativas sobre ventas', 0.02, 'porcentaje', '%'),
  ('ratios', 'gastos_generales_porcentaje', 'Gastos Generales', 'Gastos operativos generales sobre ventas', 0.04, 'porcentaje', '%'),
  ('ratios', 'ingresos_financieros_porcentaje', 'Ingresos Financieros', 'Ingresos financieros externos sobre ventas', 0.005, 'porcentaje', '%'),
  ('ratios', 'merma_porcentaje', 'Merma Estándar', 'Merma calculada sobre ventas sin IVA (estándar retail)', 0.016, 'porcentaje', '%'),
  
  -- Impuestos específicos
  ('impuestos', 'iva_resultado_porcentaje', 'IVA en Resultado', 'Porcentaje de IVA que impacta en resultado impositivo', 0.19, 'porcentaje', '%'),
  ('impuestos', 'iibb_porcentaje', 'Ingresos Brutos', 'Impuesto sobre Ingresos Brutos', 0.03, 'porcentaje', '%'),
  ('impuestos', 'tuae_porcentaje', 'TUAE', 'Tasa de Análisis de Expedientes', 0.02, 'porcentaje', '%'),
  
  -- Estimaciones de CMV por categoría (si no hay dato real)
  ('estimaciones', 'cmv_salon_porcentaje', 'CMV Salón Estimado', 'Costo de Mercadería Vendida estimado para productos de salón', 0.75, 'porcentaje', '%'),
  ('estimaciones', 'cmv_frescos_porcentaje', 'CMV Frescos Estimado', 'Costo de Mercadería Vendida estimado para productos frescos', 0.68, 'porcentaje', '%'),
  
  -- KPIs estimados
  ('kpis', 'ticket_promedio', 'Ticket Promedio', 'Valor promedio de compra por cliente', 2500, 'monto', 'ARS'),
  ('kpis', 'clientes_por_venta', 'Clientes por Monto', 'Estimación de clientes activos basada en ventas', 25000, 'monto', 'ARS'),
  ('kpis', 'metros_totales', 'Metros Cuadrados Total', 'Superficie total de todas las sucursales', 3200, 'cantidad', 'm²'),
  ('kpis', 'metros_salon', 'Metros Cuadrados Salón', 'Superficie de salón de ventas', 2800, 'cantidad', 'm²'),
  ('kpis', 'sku_total', 'SKUs Totales', 'Cantidad total de productos en catálogo', 12500, 'cantidad', 'unidades'),
  ('kpis', 'rotacion_promedio', 'Rotación Promedio', 'Porcentaje de rotación promedio de inventario', 85, 'porcentaje', '%'),
  ('kpis', 'stockout_promedio', 'Stockout Promedio', 'Porcentaje promedio de productos sin stock', 2.3, 'porcentaje', '%')

ON CONFLICT (categoria, clave, sucursal_id, fecha_desde) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  valor = EXCLUDED.valor,
  actualizado_en = now();
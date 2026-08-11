-- Ampliar precisión de la columna 'valor' para soportar montos grandes (ej: facturación base)
ALTER TABLE metricas_configurables ALTER COLUMN valor TYPE numeric(18,4);

-- Insertar supuestos base para proyecciones
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES
('proyecciones', 'proy_facturacion_base', 'Facturación Base Inicial', 'Monto base de facturación para el mes 1 (en ARS)', 100000000, 'monto', 'ARS'),
('proyecciones', 'proy_crecimiento_mensual', 'Crecimiento Mensual', 'Porcentaje de crecimiento esperado mes a mes', 0.03, 'porcentaje', '%'),
('proyecciones', 'proy_cmv_pct', 'CMV Objetivo', 'Porcentaje de Costo de Mercadería sobre Ventas Sin IVA', 0.70, 'porcentaje', '%'),
('proyecciones', 'proy_rrhh_pct', 'RRHH Objetivo', 'Porcentaje de gasto de personal sobre Ventas Sin IVA', 0.12, 'porcentaje', '%'),
('proyecciones', 'proy_gastos_comerciales_pct', 'Gastos Comerciales Objetivo', 'Porcentaje de gastos fijos/comerciales sobre Ventas Sin IVA', 0.15, 'porcentaje', '%'),
('proyecciones', 'proy_mermas_pct', 'Mermas Objetivo', 'Porcentaje de mermas sobre Ventas Sin IVA', 0.02, 'porcentaje', '%')
ON CONFLICT (categoria, clave, sucursal_id, fecha_desde) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  valor = EXCLUDED.valor,
  actualizado_en = now();

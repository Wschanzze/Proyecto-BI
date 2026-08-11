-- Migración 009: Proyecciones mes a mes (reemplaza valores anuales)
-- Eliminar configuración vieja de proyecciones anuales
DELETE FROM metricas_configurables WHERE categoria = 'proyecciones';

-- ============================================================
-- FACTURACIÓN ESPERADA POR MES (valor en ARS)
-- ============================================================
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_facturacion_m1',  'Facturación Mes 1',  'Monto de facturación proyectado para el mes 1',  100000000, 'monto', 'ARS');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_facturacion_m2',  'Facturación Mes 2',  'Monto de facturación proyectado para el mes 2',  100000000, 'monto', 'ARS');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_facturacion_m3',  'Facturación Mes 3',  'Monto de facturación proyectado para el mes 3',  100000000, 'monto', 'ARS');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_facturacion_m4',  'Facturación Mes 4',  'Monto de facturación proyectado para el mes 4',  100000000, 'monto', 'ARS');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_facturacion_m5',  'Facturación Mes 5',  'Monto de facturación proyectado para el mes 5',  100000000, 'monto', 'ARS');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_facturacion_m6',  'Facturación Mes 6',  'Monto de facturación proyectado para el mes 6',  100000000, 'monto', 'ARS');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_facturacion_m7',  'Facturación Mes 7',  'Monto de facturación proyectado para el mes 7',  100000000, 'monto', 'ARS');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_facturacion_m8',  'Facturación Mes 8',  'Monto de facturación proyectado para el mes 8',  100000000, 'monto', 'ARS');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_facturacion_m9',  'Facturación Mes 9',  'Monto de facturación proyectado para el mes 9',  100000000, 'monto', 'ARS');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_facturacion_m10', 'Facturación Mes 10', 'Monto de facturación proyectado para el mes 10', 100000000, 'monto', 'ARS');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_facturacion_m11', 'Facturación Mes 11', 'Monto de facturación proyectado para el mes 11', 100000000, 'monto', 'ARS');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_facturacion_m12', 'Facturación Mes 12', 'Monto de facturación proyectado para el mes 12', 100000000, 'monto', 'ARS');

-- ============================================================
-- CMV OBJETIVO POR MES (valor decimal: 0.70 = 70%)
-- ============================================================
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_cmv_pct_m1',  'CMV Objetivo Mes 1',  'Porcentaje de Costo de Mercadería sobre Ventas', 0.70, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_cmv_pct_m2',  'CMV Objetivo Mes 2',  'Porcentaje de Costo de Mercadería sobre Ventas', 0.70, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_cmv_pct_m3',  'CMV Objetivo Mes 3',  'Porcentaje de Costo de Mercadería sobre Ventas', 0.70, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_cmv_pct_m4',  'CMV Objetivo Mes 4',  'Porcentaje de Costo de Mercadería sobre Ventas', 0.70, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_cmv_pct_m5',  'CMV Objetivo Mes 5',  'Porcentaje de Costo de Mercadería sobre Ventas', 0.70, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_cmv_pct_m6',  'CMV Objetivo Mes 6',  'Porcentaje de Costo de Mercadería sobre Ventas', 0.70, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_cmv_pct_m7',  'CMV Objetivo Mes 7',  'Porcentaje de Costo de Mercadería sobre Ventas', 0.70, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_cmv_pct_m8',  'CMV Objetivo Mes 8',  'Porcentaje de Costo de Mercadería sobre Ventas', 0.70, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_cmv_pct_m9',  'CMV Objetivo Mes 9',  'Porcentaje de Costo de Mercadería sobre Ventas', 0.70, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_cmv_pct_m10', 'CMV Objetivo Mes 10', 'Porcentaje de Costo de Mercadería sobre Ventas', 0.70, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_cmv_pct_m11', 'CMV Objetivo Mes 11', 'Porcentaje de Costo de Mercadería sobre Ventas', 0.70, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_cmv_pct_m12', 'CMV Objetivo Mes 12', 'Porcentaje de Costo de Mercadería sobre Ventas', 0.70, 'porcentaje', '%');

-- ============================================================
-- RRHH OBJETIVO POR MES (valor decimal: 0.12 = 12%)
-- ============================================================
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_rrhh_pct_m1',  'RRHH Objetivo Mes 1',  'Porcentaje de gasto de personal sobre Ventas', 0.12, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_rrhh_pct_m2',  'RRHH Objetivo Mes 2',  'Porcentaje de gasto de personal sobre Ventas', 0.12, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_rrhh_pct_m3',  'RRHH Objetivo Mes 3',  'Porcentaje de gasto de personal sobre Ventas', 0.12, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_rrhh_pct_m4',  'RRHH Objetivo Mes 4',  'Porcentaje de gasto de personal sobre Ventas', 0.12, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_rrhh_pct_m5',  'RRHH Objetivo Mes 5',  'Porcentaje de gasto de personal sobre Ventas', 0.12, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_rrhh_pct_m6',  'RRHH Objetivo Mes 6',  'Porcentaje de gasto de personal sobre Ventas', 0.12, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_rrhh_pct_m7',  'RRHH Objetivo Mes 7',  'Porcentaje de gasto de personal sobre Ventas', 0.12, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_rrhh_pct_m8',  'RRHH Objetivo Mes 8',  'Porcentaje de gasto de personal sobre Ventas', 0.12, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_rrhh_pct_m9',  'RRHH Objetivo Mes 9',  'Porcentaje de gasto de personal sobre Ventas', 0.12, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_rrhh_pct_m10', 'RRHH Objetivo Mes 10', 'Porcentaje de gasto de personal sobre Ventas', 0.12, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_rrhh_pct_m11', 'RRHH Objetivo Mes 11', 'Porcentaje de gasto de personal sobre Ventas', 0.12, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_rrhh_pct_m12', 'RRHH Objetivo Mes 12', 'Porcentaje de gasto de personal sobre Ventas', 0.12, 'porcentaje', '%');

-- ============================================================
-- GASTOS COMERCIALES POR MES (valor decimal: 0.15 = 15%)
-- ============================================================
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_gastos_comerciales_pct_m1',  'Gastos Comerciales Mes 1',  'Porcentaje de gastos fijos/comerciales sobre Ventas', 0.15, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_gastos_comerciales_pct_m2',  'Gastos Comerciales Mes 2',  'Porcentaje de gastos fijos/comerciales sobre Ventas', 0.15, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_gastos_comerciales_pct_m3',  'Gastos Comerciales Mes 3',  'Porcentaje de gastos fijos/comerciales sobre Ventas', 0.15, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_gastos_comerciales_pct_m4',  'Gastos Comerciales Mes 4',  'Porcentaje de gastos fijos/comerciales sobre Ventas', 0.15, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_gastos_comerciales_pct_m5',  'Gastos Comerciales Mes 5',  'Porcentaje de gastos fijos/comerciales sobre Ventas', 0.15, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_gastos_comerciales_pct_m6',  'Gastos Comerciales Mes 6',  'Porcentaje de gastos fijos/comerciales sobre Ventas', 0.15, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_gastos_comerciales_pct_m7',  'Gastos Comerciales Mes 7',  'Porcentaje de gastos fijos/comerciales sobre Ventas', 0.15, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_gastos_comerciales_pct_m8',  'Gastos Comerciales Mes 8',  'Porcentaje de gastos fijos/comerciales sobre Ventas', 0.15, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_gastos_comerciales_pct_m9',  'Gastos Comerciales Mes 9',  'Porcentaje de gastos fijos/comerciales sobre Ventas', 0.15, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_gastos_comerciales_pct_m10', 'Gastos Comerciales Mes 10', 'Porcentaje de gastos fijos/comerciales sobre Ventas', 0.15, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_gastos_comerciales_pct_m11', 'Gastos Comerciales Mes 11', 'Porcentaje de gastos fijos/comerciales sobre Ventas', 0.15, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_gastos_comerciales_pct_m12', 'Gastos Comerciales Mes 12', 'Porcentaje de gastos fijos/comerciales sobre Ventas', 0.15, 'porcentaje', '%');

-- ============================================================
-- MERMAS POR MES (valor decimal: 0.02 = 2%)
-- ============================================================
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_mermas_pct_m1',  'Mermas Objetivo Mes 1',  'Porcentaje de mermas sobre Ventas', 0.02, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_mermas_pct_m2',  'Mermas Objetivo Mes 2',  'Porcentaje de mermas sobre Ventas', 0.02, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_mermas_pct_m3',  'Mermas Objetivo Mes 3',  'Porcentaje de mermas sobre Ventas', 0.02, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_mermas_pct_m4',  'Mermas Objetivo Mes 4',  'Porcentaje de mermas sobre Ventas', 0.02, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_mermas_pct_m5',  'Mermas Objetivo Mes 5',  'Porcentaje de mermas sobre Ventas', 0.02, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_mermas_pct_m6',  'Mermas Objetivo Mes 6',  'Porcentaje de mermas sobre Ventas', 0.02, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_mermas_pct_m7',  'Mermas Objetivo Mes 7',  'Porcentaje de mermas sobre Ventas', 0.02, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_mermas_pct_m8',  'Mermas Objetivo Mes 8',  'Porcentaje de mermas sobre Ventas', 0.02, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_mermas_pct_m9',  'Mermas Objetivo Mes 9',  'Porcentaje de mermas sobre Ventas', 0.02, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_mermas_pct_m10', 'Mermas Objetivo Mes 10', 'Porcentaje de mermas sobre Ventas', 0.02, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_mermas_pct_m11', 'Mermas Objetivo Mes 11', 'Porcentaje de mermas sobre Ventas', 0.02, 'porcentaje', '%');
INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad) VALUES ('proyecciones', 'proy_mermas_pct_m12', 'Mermas Objetivo Mes 12', 'Porcentaje de mermas sobre Ventas', 0.02, 'porcentaje', '%');

-- Migración para soportar proyecciones mes a mes
-- 1. Eliminar la configuración vieja de proyecciones anuales (008)
DELETE FROM metricas_configurables WHERE categoria = 'proyecciones';

-- 2. Insertar valores base por cada uno de los 12 meses
-- Proyectamos un crecimiento simulado como placeholder

DO $$
DECLARE
    i INT;
    facturacion_base NUMERIC(18,4) := 100000000;
BEGIN
    FOR i IN 1..12 LOOP
        -- Facturación (Aumenta un 3% cada mes simulado)
        INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad)
        VALUES (
            'proyecciones', 
            'proy_facturacion_m' || i, 
            'Facturación Mes ' || i, 
            'Monto de facturación proyectado para el mes ' || i, 
            facturacion_base * POWER(1.03, i - 1), 
            'monto', 'ARS'
        );
        
        -- CMV Objetivo (Fijo 70%)
        INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad)
        VALUES ('proyecciones', 'proy_cmv_pct_m' || i, 'CMV Objetivo Mes ' || i, 'Porcentaje de Costo de Mercadería sobre Ventas', 0.70, 'porcentaje', '%');
        
        -- RRHH Objetivo (Fijo 12%)
        INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad)
        VALUES ('proyecciones', 'proy_rrhh_pct_m' || i, 'RRHH Objetivo Mes ' || i, 'Porcentaje de gasto de personal sobre Ventas', 0.12, 'porcentaje', '%');
        
        -- Gastos Comerciales (Fijo 15%)
        INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad)
        VALUES ('proyecciones', 'proy_gastos_comerciales_pct_m' || i, 'Gastos Comerciales Mes ' || i, 'Porcentaje de gastos fijos/comerciales sobre Ventas', 0.15, 'porcentaje', '%');
        
        -- Mermas (Fijo 2%)
        INSERT INTO metricas_configurables (categoria, clave, nombre, descripcion, valor, tipo, unidad)
        VALUES ('proyecciones', 'proy_mermas_pct_m' || i, 'Mermas Objetivo Mes ' || i, 'Porcentaje de mermas sobre Ventas', 0.02, 'porcentaje', '%');
        
    END LOOP;
END $$;

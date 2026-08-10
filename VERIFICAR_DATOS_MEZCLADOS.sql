-- ============================================================
-- Verificar Datos Mezclados por Mapeo Incorrecto
-- Ejecuta estas queries para identificar si hay datos cargados
-- incorrectamente antes del fix de mapeo contextual
-- ============================================================

-- 1. Ver todos los grupos llamados "Encurtidos"
SELECT 
  g.id,
  g.nombre,
  s.nombre as sector,
  s.categoria_id as categoria
FROM grupos g
JOIN sectores s ON g.sector_id = s.id
WHERE g.nombre = 'Encurtidos'
ORDER BY g.id;
-- Esperado: 2 filas
-- salon-almacen-encurtidos | Encurtidos | Almacén | salon
-- frescos-fia-encurtidos | Encurtidos | Fiambrería | frescos

-- 2. Ver registros de "Encurtidos" en FRESCOS
SELECT 
  p.label as periodo,
  r.sucursal_id,
  g.id as grupo_id,
  g.nombre as grupo_nombre,
  s.nombre as sector,
  s.categoria_id as categoria,
  r.facturacion,
  r.cantidad
FROM resultados r
JOIN grupos g ON r.grupo_id = g.id
JOIN sectores s ON g.sector_id = s.id
JOIN periodos p ON r.periodo_id = p.id
WHERE g.nombre = 'Encurtidos' 
  AND s.categoria_id = 'frescos'
ORDER BY p.key DESC, r.sucursal_id;
-- Si no hay datos de FRESCOS año anterior pero SÍ ves registros aquí,
-- significa que están mal mapeados

-- 3. Ver registros de "Encurtidos" en SALON
SELECT 
  p.label as periodo,
  r.sucursal_id,
  g.id as grupo_id,
  g.nombre as grupo_nombre,
  s.nombre as sector,
  s.categoria_id as categoria,
  r.facturacion,
  r.cantidad
FROM resultados r
JOIN grupos g ON r.grupo_id = g.id
JOIN sectores s ON g.sector_id = s.id
JOIN periodos p ON r.periodo_id = p.id
WHERE g.nombre = 'Encurtidos' 
  AND s.categoria_id = 'salon'
ORDER BY p.key DESC, r.sucursal_id;
-- Estos deberían ser los registros correctos de SALON

-- 4. Comparar: ¿Hay más registros en salon-almacen-encurtidos que los esperados?
SELECT 
  p.label,
  COUNT(*) as registros,
  SUM(r.facturacion) as fact_total
FROM resultados r
JOIN periodos p ON r.periodo_id = p.id
WHERE r.grupo_id = 'salon-almacen-encurtidos'
GROUP BY p.id, p.label
ORDER BY p.key DESC;
-- Si ves períodos donde no cargaste datos de Salon, 
-- pero SÍ hay registros, están mezclados

-- 5. Comparar: ¿Hay registros en frescos-fia-encurtidos de períodos no esperados?
SELECT 
  p.label,
  COUNT(*) as registros,
  SUM(r.facturacion) as fact_total
FROM resultados r
JOIN periodos p ON r.periodo_id = p.id
WHERE r.grupo_id = 'frescos-fia-encurtidos'
GROUP BY p.id, p.label
ORDER BY p.key DESC;
-- Si ves períodos del año anterior que no cargaste, están mezclados

-- 6. Encontrar TODOS los grupos con nombres duplicados entre categorías
SELECT 
  g1.nombre as nombre_duplicado,
  g1.id as id_salon,
  s1.nombre as sector_salon,
  g2.id as id_frescos,
  s2.nombre as sector_frescos
FROM grupos g1
JOIN sectores s1 ON g1.sector_id = s1.id
JOIN grupos g2 ON g1.nombre = g2.nombre AND g1.id != g2.id
JOIN sectores s2 ON g2.sector_id = s2.id
WHERE s1.categoria_id = 'salon' 
  AND s2.categoria_id = 'frescos'
ORDER BY g1.nombre;
-- Esta query te muestra TODOS los nombres que se repiten entre categorías
-- Estos son los grupos que pueden estar mezclados

-- 7. Para cada nombre duplicado, ver si hay datos mezclados
-- Ejecutá esta query cambiando 'NOMBRE_DUPLICADO' por cada resultado del paso 6:

-- SELECT 
--   p.label,
--   g.id as grupo_id,
--   s.categoria_id,
--   COUNT(*) as registros,
--   SUM(r.facturacion) as facturacion_total
-- FROM resultados r
-- JOIN grupos g ON r.grupo_id = g.id
-- JOIN sectores s ON g.sector_id = s.id
-- JOIN periodos p ON r.periodo_id = p.id
-- WHERE g.nombre = 'NOMBRE_DUPLICADO'  -- ⬅️ Cambiar aquí
-- GROUP BY p.id, p.label, g.id, s.categoria_id
-- ORDER BY p.key DESC, s.categoria_id, g.id;

-- ============================================================
-- SOLUCIÓN SI HAY DATOS MEZCLADOS
-- ============================================================

-- Si las queries anteriores muestran datos mezclados:
-- 1. Identificá los períodos afectados
-- 2. Eliminá esos períodos desde /admin → "Historial y Eliminación"
-- 3. Re-cargá los archivos CSV (el fix ya está aplicado)

-- Alternativamente, si preferís limpiar directamente desde SQL:
-- CUIDADO: Esto borra TODOS los resultados del período especificado

-- DELETE FROM resultados 
-- WHERE periodo_id IN (
--   SELECT id FROM periodos WHERE key = '2026-06'  -- ⬅️ Cambiar por el período afectado
-- );

-- ============================================================
-- VERIFICACIÓN POST-FIX
-- ============================================================

-- Después de re-cargar los datos, ejecutá esta query para verificar:
SELECT 
  p.label as periodo,
  g.nombre as grupo,
  s.nombre as sector,
  s.categoria_id as categoria,
  COUNT(DISTINCT r.sucursal_id) as sucursales_con_datos,
  SUM(r.facturacion) as facturacion_total
FROM resultados r
JOIN grupos g ON r.grupo_id = g.id
JOIN sectores s ON g.sector_id = s.id
JOIN periodos p ON r.periodo_id = p.id
WHERE g.nombre IN ('Encurtidos', 'Pescado', 'Pollo', 'Postre')  -- Grupos con nombres duplicados
GROUP BY p.id, p.label, g.id, g.nombre, s.nombre, s.categoria_id
ORDER BY g.nombre, s.categoria_id, p.key DESC;
-- Verificá que cada grupo esté en su categoría correcta
-- y que no haya datos en períodos que no cargaste

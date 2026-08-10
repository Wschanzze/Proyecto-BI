-- ============================================================
-- Script de Verificación: Estructura FRESCOS
-- Ejecuta estas consultas después de aplicar la migración 007
-- ============================================================

-- 1. Verificar que la categoría FRESCOS existe
SELECT * FROM categorias WHERE id = 'frescos';
-- Esperado: 1 fila (id: frescos, nombre: Frescos, orden: 2)

-- 2. Verificar sectores de FRESCOS (debería haber 5)
SELECT 
  id,
  nombre,
  orden
FROM sectores 
WHERE categoria_id = 'frescos'
ORDER BY orden;
-- Esperado: 5 filas
-- frescos-carniceria | Carnicería | 1
-- frescos-fiambreria | Fiambrería | 2
-- frescos-frutas-y-verduras | Frutas y Verduras | 3
-- frescos-panaderia | Panadería | 4
-- frescos-rotiseria | Rotisería | 5

-- 3. Verificar grupos de CARNICERÍA (debería haber 6)
SELECT 
  id,
  nombre,
  orden
FROM grupos 
WHERE sector_id = 'frescos-carniceria'
ORDER BY orden;
-- Esperado: 6 grupos (Achuras, Carne Porcina, Carne Vacuna, Pescado, Pollo, Producción)

-- 4. Verificar grupos de FIAMBRERÍA (debería haber 5)
SELECT 
  id,
  nombre,
  orden
FROM grupos 
WHERE sector_id = 'frescos-fiambreria'
ORDER BY orden;
-- Esperado: 5 grupos (Dulces, Encurtidos, Fiambres, Frutas, Quesos)

-- 5. Verificar grupos de FRUTAS Y VERDURAS (debería haber 4)
SELECT 
  id,
  nombre,
  orden
FROM grupos 
WHERE sector_id = 'frescos-frutas-y-verduras'
ORDER BY orden;
-- Esperado: 4 grupos (Frutas Frescas, Huevos, Leña y Carbón, Verduras Frescas)

-- 6. Verificar grupos de ROTISERÍA (debería haber 15)
SELECT 
  id,
  nombre,
  orden
FROM grupos 
WHERE sector_id = 'frescos-rotiseria'
ORDER BY orden;
-- Esperado: 15 grupos (Arrollado, Arroz, Carnes, Cerdo, Empanadas, Ensaladas, 
--                      Entrada, Milanesas, Papas, Pastas, Pescado, Pollo, 
--                      Postre, Tartas y Tortillas, Verduras)

-- 6b. Verificar grupos de PANADERÍA (debería haber 10)
SELECT 
  id,
  nombre,
  orden
FROM grupos 
WHERE sector_id = 'frescos-panaderia'
ORDER BY orden;
-- Esperado: 10 grupos (Budines, Facturas, Fiestas, Masa Salada, Masas Dulces,
--                      Miga, Pan, Pizza, Postre, Tapas)

-- 7. Contar TOTAL de grupos de FRESCOS (debería ser 40)
SELECT COUNT(*) as total_grupos_frescos
FROM grupos g
JOIN sectores s ON g.sector_id = s.id
WHERE s.categoria_id = 'frescos';
-- Esperado: 40

-- 8. Ver estructura completa de FRESCOS en formato jerárquico
SELECT 
  c.nombre as categoria,
  s.nombre as sector,
  s.orden as sector_orden,
  g.nombre as grupo,
  g.orden as grupo_orden,
  g.id as grupo_id
FROM categorias c
JOIN sectores s ON s.categoria_id = c.id
JOIN grupos g ON g.sector_id = s.id
WHERE c.id = 'frescos'
ORDER BY s.orden, g.orden;
-- Esperado: 40 filas con la estructura completa

-- 9. Verificar que NO existen sectores antiguos de FRESCOS
SELECT * FROM sectores 
WHERE id IN ('frescos-verduleria', 'frescos-lacteos');
-- Esperado: 0 filas (estos sectores deben haber sido eliminados)
-- NOTA: 'frescos-panaderia' fue recreado con la nueva estructura

-- 10. Verificar que NO existen grupos huérfanos de FRESCOS antiguos
SELECT * FROM grupos 
WHERE id IN (
  'frescos-car-vacuno', 
  'frescos-car-otras-carnes',
  'frescos-ver-frutas',
  'frescos-ver-verduras',
  'frescos-lac-refrigerados',
  'frescos-pan-elaboracion',
  'frescos-rot-comidas'
);
-- Esperado: 0 filas (estos grupos deben haber sido eliminados)

-- 11. Verificar resultados existentes de FRESCOS (si hay datos cargados)
SELECT 
  p.label as periodo,
  s.nombre as sector,
  g.nombre as grupo,
  r.sucursal_id,
  r.facturacion,
  r.cantidad
FROM resultados r
JOIN grupos g ON r.grupo_id = g.id
JOIN sectores s ON g.sector_id = s.id
JOIN periodos p ON r.periodo_id = p.id
WHERE s.categoria_id = 'frescos'
ORDER BY p.key DESC, s.orden, g.orden
LIMIT 20;
-- Esperado: Depende de si ya cargaste datos de FRESCOS
-- Si no hay datos aún, retornará 0 filas

-- 12. Resumen por sector de FRESCOS (si hay datos)
SELECT 
  s.nombre as sector,
  COUNT(DISTINCT g.id) as cantidad_grupos,
  COUNT(DISTINCT r.id) as cantidad_registros,
  SUM(r.facturacion) as facturacion_total
FROM sectores s
LEFT JOIN grupos g ON g.sector_id = s.id
LEFT JOIN resultados r ON r.grupo_id = g.id
WHERE s.categoria_id = 'frescos'
GROUP BY s.id, s.nombre
ORDER BY s.orden;
-- Esperado: 5 filas con el resumen por sector

-- ============================================================
-- TESTS DE INTEGRIDAD
-- ============================================================

-- TEST 1: Verificar que todos los grupos tienen un sector válido
SELECT 
  g.id as grupo_huerfano,
  g.nombre
FROM grupos g
WHERE g.sector_id NOT IN (SELECT id FROM sectores);
-- Esperado: 0 filas (no debe haber grupos huérfanos)

-- TEST 2: Verificar que todos los sectores de FRESCOS tienen grupos
SELECT 
  s.id,
  s.nombre,
  COUNT(g.id) as cantidad_grupos
FROM sectores s
LEFT JOIN grupos g ON g.sector_id = s.id
WHERE s.categoria_id = 'frescos'
GROUP BY s.id, s.nombre
HAVING COUNT(g.id) = 0;
-- Esperado: 0 filas (todos los sectores deben tener al menos 1 grupo)

-- TEST 3: Verificar que no hay IDs duplicados en grupos
SELECT 
  id,
  COUNT(*) as duplicados
FROM grupos
GROUP BY id
HAVING COUNT(*) > 1;
-- Esperado: 0 filas (no debe haber IDs duplicados)

-- ============================================================
-- CLEANUP (solo si necesitas limpiar datos de prueba)
-- ============================================================

-- CUIDADO: Esto eliminará TODOS los resultados de FRESCOS
-- Descomenta solo si necesitas limpiar datos de prueba
-- DELETE FROM resultados 
-- WHERE grupo_id IN (
--   SELECT g.id FROM grupos g
--   JOIN sectores s ON g.sector_id = s.id
--   WHERE s.categoria_id = 'frescos'
-- );

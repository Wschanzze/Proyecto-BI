-- ============================================================
-- Migración 007: Estructura Completa de FRESCOS
-- Actualiza los sectores y grupos de la categoría FRESCOS
-- con la jerarquía completa: Carnicería, Fiambrería, 
-- Frutas y Verduras, y Rotisería con todos sus subgrupos
-- ============================================================

-- 1. ELIMINAR SECTORES Y GRUPOS ANTIGUOS DE FRESCOS
-- (CASCADE eliminará también los grupos asociados)

DELETE FROM sectores WHERE categoria_id = 'frescos';

-- 2. INSERTAR SECTORES ACTUALIZADOS DE FRESCOS

INSERT INTO sectores (id, categoria_id, nombre, orden) VALUES
  ('frescos-carniceria',        'frescos', 'Carnicería',        1),
  ('frescos-fiambreria',        'frescos', 'Fiambrería',        2),
  ('frescos-frutas-y-verduras', 'frescos', 'Frutas y Verduras', 3),
  ('frescos-rotiseria',         'frescos', 'Rotisería',         4)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  orden = EXCLUDED.orden;

-- 3. INSERTAR GRUPOS DE CARNICERÍA

INSERT INTO grupos (id, sector_id, nombre, orden) VALUES
  ('frescos-car-achuras',        'frescos-carniceria', 'Achuras',        1),
  ('frescos-car-carne-porcina',  'frescos-carniceria', 'Carne Porcina',  2),
  ('frescos-car-carne-vacuna',   'frescos-carniceria', 'Carne Vacuna',   3),
  ('frescos-car-pescado',        'frescos-carniceria', 'Pescado',        4),
  ('frescos-car-pollo',          'frescos-carniceria', 'Pollo',          5),
  ('frescos-car-produccion',     'frescos-carniceria', 'Producción',     6)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  orden = EXCLUDED.orden;

-- 4. INSERTAR GRUPOS DE FIAMBRERÍA

INSERT INTO grupos (id, sector_id, nombre, orden) VALUES
  ('frescos-fia-dulces',      'frescos-fiambreria', 'Dulces',      1),
  ('frescos-fia-encurtidos',  'frescos-fiambreria', 'Encurtidos',  2),
  ('frescos-fia-fiambres',    'frescos-fiambreria', 'Fiambres',    3),
  ('frescos-fia-frutas',      'frescos-fiambreria', 'Frutas',      4),
  ('frescos-fia-quesos',      'frescos-fiambreria', 'Quesos',      5)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  orden = EXCLUDED.orden;

-- 5. INSERTAR GRUPOS DE FRUTAS Y VERDURAS

INSERT INTO grupos (id, sector_id, nombre, orden) VALUES
  ('frescos-fyv-frutas-frescas',   'frescos-frutas-y-verduras', 'Frutas Frescas',   1),
  ('frescos-fyv-huevos',           'frescos-frutas-y-verduras', 'Huevos',           2),
  ('frescos-fyv-lena-y-carbon',    'frescos-frutas-y-verduras', 'Leña y Carbón',    3),
  ('frescos-fyv-verduras-frescas', 'frescos-frutas-y-verduras', 'Verduras Frescas', 4)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  orden = EXCLUDED.orden;

-- 6. INSERTAR GRUPOS DE ROTISERÍA

INSERT INTO grupos (id, sector_id, nombre, orden) VALUES
  ('frescos-rot-arrollado',           'frescos-rotiseria', 'Arrollado',           1),
  ('frescos-rot-arroz',               'frescos-rotiseria', 'Arroz',               2),
  ('frescos-rot-carnes',              'frescos-rotiseria', 'Carnes',              3),
  ('frescos-rot-cerdo',               'frescos-rotiseria', 'Cerdo',               4),
  ('frescos-rot-empanadas',           'frescos-rotiseria', 'Empanadas',           5),
  ('frescos-rot-ensaladas',           'frescos-rotiseria', 'Ensaladas',           6),
  ('frescos-rot-entrada',             'frescos-rotiseria', 'Entrada',             7),
  ('frescos-rot-milanesas',           'frescos-rotiseria', 'Milanesas',           8),
  ('frescos-rot-papas',               'frescos-rotiseria', 'Papas',               9),
  ('frescos-rot-pastas',              'frescos-rotiseria', 'Pastas',             10),
  ('frescos-rot-pescado',             'frescos-rotiseria', 'Pescado',            11),
  ('frescos-rot-pollo',               'frescos-rotiseria', 'Pollo',              12),
  ('frescos-rot-postre',              'frescos-rotiseria', 'Postre',             13),
  ('frescos-rot-tartas-y-tortillas',  'frescos-rotiseria', 'Tartas y Tortillas', 14),
  ('frescos-rot-verduras',            'frescos-rotiseria', 'Verduras',           15)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  orden = EXCLUDED.orden;

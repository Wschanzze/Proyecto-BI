-- ============================================================
-- Monarca BI — RRHH y Costos Estructurales (Fase 2)
-- Gestión de nómina, cargas sociales y costos fijos por sucursal
-- ============================================================

-- 1. TABLA DE EMPLEADOS
CREATE TABLE IF NOT EXISTS empleados (
  id serial PRIMARY KEY,
  legajo text UNIQUE NOT NULL,
  apellido text NOT NULL,
  nombre text NOT NULL,
  dni text UNIQUE NOT NULL,
  cuil text UNIQUE NOT NULL,
  sucursal_id text NOT NULL REFERENCES sucursales(id),
  puesto text NOT NULL,
  categoria text NOT NULL, -- 'gerencial', 'administrativo', 'operativo', 'temporal'
  fecha_ingreso date NOT NULL,
  fecha_egreso date NULL,
  sueldo_basico numeric(12,2) NOT NULL DEFAULT 0,
  activo boolean DEFAULT true,
  creado_en timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now()
);

-- 2. TABLA DE NÓMINA MENSUAL (RRHH)
CREATE TABLE IF NOT EXISTS nomina_mensual (
  id serial PRIMARY KEY,
  periodo_id int NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  sucursal_id text NOT NULL REFERENCES sucursales(id),
  empleado_id int NOT NULL REFERENCES empleados(id),
  
  -- Conceptos de liquidación
  sueldo_basico numeric(12,2) NOT NULL DEFAULT 0,
  horas_extras numeric(12,2) DEFAULT 0,
  premios numeric(12,2) DEFAULT 0,
  bonificaciones numeric(12,2) DEFAULT 0,
  total_remunerativo numeric(12,2) NOT NULL DEFAULT 0,
  
  -- Adicionales no remunerativos
  viaticos numeric(12,2) DEFAULT 0,
  total_no_remunerativo numeric(12,2) DEFAULT 0,
  
  -- Descuentos
  jubilacion numeric(12,2) DEFAULT 0,
  obra_social numeric(12,2) DEFAULT 0,
  sindicato numeric(12,2) DEFAULT 0,
  seguro_vida numeric(12,2) DEFAULT 0,
  otros_descuentos numeric(12,2) DEFAULT 0,
  total_descuentos numeric(12,2) DEFAULT 0,
  
  -- Cargas sociales (empleador)
  aportes_patronales numeric(12,2) DEFAULT 0,
  art numeric(12,2) DEFAULT 0,
  
  -- Resultado final
  neto_a_cobrar numeric(12,2) NOT NULL DEFAULT 0,
  costo_total_empresa numeric(12,2) NOT NULL DEFAULT 0,
  
  -- Metadatos
  dias_trabajados int DEFAULT 30,
  ausentismos int DEFAULT 0,
  observaciones text,
  archivo_origen text, -- Nombre del archivo de carga
  creado_en timestamptz DEFAULT now(),
  
  UNIQUE(periodo_id, empleado_id)
);

-- 3. TABLA DE COSTOS ESTRUCTURALES
CREATE TABLE IF NOT EXISTS costos_estructurales (
  id serial PRIMARY KEY,
  periodo_id int NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  sucursal_id text NOT NULL REFERENCES sucursales(id),
  categoria_costo text NOT NULL, -- 'servicios', 'alquileres', 'seguros', 'impuestos', 'mantenimiento', 'marketing', 'otros'
  subcategoria text NOT NULL, -- 'luz', 'gas', 'telefono', 'internet', 'alquiler_local', etc.
  descripcion text NOT NULL,
  
  -- Importes
  importe numeric(12,2) NOT NULL DEFAULT 0,
  importe_variable numeric(12,2) DEFAULT 0, -- Parte variable del costo
  importe_fijo numeric(12,2) DEFAULT 0, -- Parte fija del costo
  
  -- Clasificación contable
  tipo_gasto text NOT NULL DEFAULT 'operativo', -- 'operativo', 'administrativo', 'comercial', 'financiero'
  centro_costo text, -- Para asignación de costos
  cuenta_contable text, -- Código de cuenta contable
  
  -- Metadatos
  proveedor text,
  numero_factura text,
  fecha_vencimiento date,
  observaciones text,
  archivo_origen text,
  creado_en timestamptz DEFAULT now(),
  
  UNIQUE(periodo_id, sucursal_id, categoria_costo, subcategoria, descripcion)
);

-- 4. TABLA DE PLANTILLA EMPLEADOS (para templates de carga)
CREATE TABLE IF NOT EXISTS plantilla_empleados (
  id serial PRIMARY KEY,
  sucursal_id text NOT NULL REFERENCES sucursales(id),
  legajo text NOT NULL,
  apellido text NOT NULL,
  nombre text NOT NULL,
  puesto text NOT NULL,
  categoria text NOT NULL,
  sueldo_basico_default numeric(12,2) DEFAULT 0,
  activo boolean DEFAULT true,
  
  -- Para template de carga masiva
  orden_carga int DEFAULT 0,
  
  UNIQUE(sucursal_id, legajo)
);

-- 5. INDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_empleados_sucursal ON empleados(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_empleados_activo ON empleados(activo);
CREATE INDEX IF NOT EXISTS idx_nomina_periodo ON nomina_mensual(periodo_id);
CREATE INDEX IF NOT EXISTS idx_nomina_sucursal ON nomina_mensual(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_costos_periodo ON costos_estructurales(periodo_id);
CREATE INDEX IF NOT EXISTS idx_costos_sucursal ON costos_estructurales(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_costos_categoria ON costos_estructurales(categoria_costo);

-- 6. ROW LEVEL SECURITY
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomina_mensual ENABLE ROW LEVEL SECURITY;
ALTER TABLE costos_estructurales ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantilla_empleados ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública
CREATE POLICY "public read empleados" ON empleados FOR SELECT USING (true);
CREATE POLICY "public read nomina_mensual" ON nomina_mensual FOR SELECT USING (true);
CREATE POLICY "public read costos_estructurales" ON costos_estructurales FOR SELECT USING (true);
CREATE POLICY "public read plantilla_empleados" ON plantilla_empleados FOR SELECT USING (true);

-- Políticas de escritura para administradores
CREATE POLICY "admin write empleados" ON empleados FOR ALL USING (true);
CREATE POLICY "admin write nomina_mensual" ON nomina_mensual FOR ALL USING (true);
CREATE POLICY "admin write costos_estructurales" ON costos_estructurales FOR ALL USING (true);
CREATE POLICY "admin write plantilla_empleados" ON plantilla_empleados FOR ALL USING (true);

-- 7. SEED INICIAL - Plantilla de empleados ejemplo
INSERT INTO plantilla_empleados (sucursal_id, legajo, apellido, nombre, puesto, categoria, sueldo_basico_default, orden_carga) VALUES
  -- Sucursal Colón
  ('colon', '1001', 'Gonzalez', 'Juan Carlos', 'Gerente', 'gerencial', 450000.00, 1),
  ('colon', '1002', 'Martinez', 'Ana Maria', 'Cajera Senior', 'operativo', 180000.00, 2),
  ('colon', '1003', 'Rodriguez', 'Carlos', 'Repositor', 'operativo', 160000.00, 3),
  ('colon', '1004', 'Lopez', 'Sofia', 'Administrativa', 'administrativo', 200000.00, 4),
  ('colon', '1005', 'Fernandez', 'Miguel', 'Seguridad', 'operativo', 170000.00, 5),
  
  -- Sucursal San Martín
  ('san-martin', '2001', 'Perez', 'Laura', 'Gerente', 'gerencial', 450000.00, 1),
  ('san-martin', '2002', 'Garcia', 'Roberto', 'Cajero', 'operativo', 175000.00, 2),
  ('san-martin', '2003', 'Sanchez', 'Maria', 'Cajera', 'operativo', 175000.00, 3),
  ('san-martin', '2004', 'Torres', 'Diego', 'Repositor', 'operativo', 160000.00, 4),
  ('san-martin', '2005', 'Morales', 'Carmen', 'Limpieza', 'operativo', 150000.00, 5),
  
  -- Sucursal Falucho
  ('falucho', '3001', 'Vargas', 'Alberto', 'Gerente', 'gerencial', 420000.00, 1),
  ('falucho', '3002', 'Diaz', 'Valeria', 'Cajera', 'operativo', 170000.00, 2),
  ('falucho', '3003', 'Ruiz', 'Fernando', 'Repositor', 'operativo', 155000.00, 3),
  ('falucho', '3004', 'Castro', 'Lucia', 'Administrativa', 'administrativo', 190000.00, 4),
  
  -- Sucursal Perón
  ('peron', '4001', 'Herrera', 'Marcelo', 'Gerente', 'gerencial', 440000.00, 1),
  ('peron', '4002', 'Ramos', 'Silvia', 'Cajera Senior', 'operativo', 180000.00, 2),
  ('peron', '4003', 'Flores', 'Javier', 'Repositor', 'operativo', 160000.00, 3),
  ('peron', '4004', 'Mendoza', 'Patricia', 'Seguridad', 'operativo', 170000.00, 4),
  
  -- Virtual (Administración Central)
  ('virtual', '5001', 'Alvarez', 'Ricardo', 'Director General', 'gerencial', 600000.00, 1),
  ('virtual', '5002', 'Jimenez', 'Monica', 'Contadora', 'administrativo', 350000.00, 2),
  ('virtual', '5003', 'Romero', 'Daniel', 'Jefe RRHH', 'administrativo', 320000.00, 3),
  ('virtual', '5004', 'Silva', 'Claudia', 'Administrativa', 'administrativo', 220000.00, 4)

ON CONFLICT (sucursal_id, legajo) DO UPDATE SET
  apellido = EXCLUDED.apellido,
  nombre = EXCLUDED.nombre,
  puesto = EXCLUDED.puesto,
  categoria = EXCLUDED.categoria,
  sueldo_basico_default = EXCLUDED.sueldo_basico_default;
# 🚀 Instrucciones para Aplicar Migraciones SQL

## ⚠️ IMPORTANTE: ESTE PASO ES CRÍTICO

Las migraciones SQL **deben** aplicarse en Supabase para que el sistema de Costos Fijos e Ingresos Financieros funcione correctamente.

---

## 📋 Orden de Ejecución

Las migraciones deben ejecutarse en este orden específico:

1. **`004_rrhh_subcuentas.sql`** - Subcuentas de RRHH
2. **`005_costos_fijos_subcuentas.sql`** - Subcuentas de Costos Fijos
3. **`006_ingresos_financieros_subcuentas.sql`** - Subcuentas de Ingresos Financieros

---

## 🔧 Método 1: Supabase Dashboard (Recomendado)

### Paso a Paso

1. **Acceder a Supabase**
   - Ir a [https://app.supabase.com](https://app.supabase.com)
   - Seleccionar tu proyecto "Monarca BI"

2. **Abrir el Editor SQL**
   - En el menú lateral, click en "SQL Editor"
   - O ir directamente a: `https://app.supabase.com/project/YOUR_PROJECT_ID/sql`

3. **Ejecutar Primera Migración: RRHH**
   ```sql
   -- Copiar y pegar el contenido completo de:
   -- supabase/migrations/004_rrhh_subcuentas.sql
   ```
   - Abrir el archivo `004_rrhh_subcuentas.sql`
   - Copiar TODO el contenido
   - Pegar en el editor SQL de Supabase
   - Click en "Run" (▶️ botón verde)
   - Verificar que no haya errores (mensaje "Success")

4. **Ejecutar Segunda Migración: Costos Fijos**
   ```sql
   -- Copiar y pegar el contenido completo de:
   -- supabase/migrations/005_costos_fijos_subcuentas.sql
   ```
   - Abrir el archivo `005_costos_fijos_subcuentas.sql`
   - Copiar TODO el contenido
   - Pegar en el editor SQL de Supabase
   - Click en "Run"
   - Verificar éxito

5. **Ejecutar Tercera Migración: Ingresos Financieros**
   ```sql
   -- Copiar y pegar el contenido completo de:
   -- supabase/migrations/006_ingresos_financieros_subcuentas.sql
   ```
   - Abrir el archivo `006_ingresos_financieros_subcuentas.sql`
   - Copiar TODO el contenido
   - Pegar en el editor SQL de Supabase
   - Click en "Run"
   - Verificar éxito

---

## 🔧 Método 2: Supabase CLI (Avanzado)

Si tienes Supabase CLI instalado:

```bash
# 1. Asegurarse de estar en el directorio del proyecto
cd "c:\Users\JoshuaGonzalez\Documents\Monarca BI"

# 2. Verificar que Supabase CLI esté instalado
supabase --version

# 3. Aplicar todas las migraciones pendientes
supabase db push

# O aplicar migraciones específicas:
supabase db push --file supabase/migrations/004_rrhh_subcuentas.sql
supabase db push --file supabase/migrations/005_costos_fijos_subcuentas.sql
supabase db push --file supabase/migrations/006_ingresos_financieros_subcuentas.sql
```

---

## ✅ Verificación de Éxito

### 1. Verificar Tablas Creadas

En el SQL Editor de Supabase, ejecutar:

```sql
-- Verificar que las tablas existan
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'rrhh_subcuentas',
    'costos_fijos_subcuentas',
    'ingresos_financieros_subcuentas'
  );
```

**Resultado esperado:** 3 filas (una por cada tabla)

### 2. Verificar Estructura de Tablas

```sql
-- Ver columnas de rrhh_subcuentas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rrhh_subcuentas';

-- Ver columnas de costos_fijos_subcuentas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'costos_fijos_subcuentas';

-- Ver columnas de ingresos_financieros_subcuentas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ingresos_financieros_subcuentas';
```

### 3. Verificar Funciones SQL

```sql
-- Verificar que las funciones existan
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'calcular_rrhh_subcuentas',
    'calcular_costos_fijos_subcuentas',
    'trigger_actualizar_rrhh_subcuentas',
    'trigger_actualizar_costos_fijos_subcuentas'
  );
```

### 4. Verificar Triggers

```sql
-- Ver triggers creados
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trigger_nomina_actualiza_rrhh',
    'trigger_costos_actualiza_fijos'
  );
```

### 5. Verificar Políticas RLS

```sql
-- Ver políticas de Row Level Security
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN (
  'rrhh_subcuentas',
  'costos_fijos_subcuentas',
  'ingresos_financieros_subcuentas'
);
```

---

## 🐛 Solución de Problemas

### Error: "relation already exists"

**Causa:** La migración ya fue aplicada anteriormente.

**Solución:** Verificar si las tablas existen:
```sql
SELECT * FROM rrhh_subcuentas LIMIT 1;
```
Si existe, la migración ya está aplicada.

### Error: "permission denied"

**Causa:** Usuario no tiene permisos de administrador.

**Solución:** 
1. Verificar que estás logueado en Supabase con cuenta de admin
2. O usar el SQL Editor desde el Dashboard (tiene permisos completos)

### Error: "column does not exist"

**Causa:** Probablemente las migraciones previas no se aplicaron correctamente.

**Solución:**
1. Verificar que la migración `001_initial_schema.sql` esté aplicada
2. Verificar que existan las tablas `periodos` y `sucursales`
3. Aplicar las migraciones en orden

### Error en trigger

**Causa:** La tabla referenciada (como `nomina_mensual` o `costos_estructurales`) no existe.

**Solución:**
1. Verificar que la migración `003_rrhh_costos_estructurales.sql` esté aplicada
2. Si no, aplicarla primero

---

## 📊 Datos de Prueba (Opcional)

Después de aplicar las migraciones, puedes insertar datos de prueba:

```sql
-- Insertar subcuentas RRHH de prueba
INSERT INTO rrhh_subcuentas (
  periodo_id, sucursal_id, 
  sueldos, cargas_sociales, indemnizaciones, tabla_merito
)
SELECT 
  p.id,
  s.id,
  1000000,  -- Sueldos
  300000,   -- Cargas sociales
  0,        -- Indemnizaciones
  50000     -- Tabla mérito
FROM periodos p
CROSS JOIN sucursales s
WHERE p.key = '2026-07'  -- Cambiar por tu período actual
LIMIT 1;

-- Verificar inserción
SELECT * FROM rrhh_subcuentas;
```

---

## 🎯 Siguiente Paso

Una vez que las migraciones estén aplicadas exitosamente:

1. ✅ Las tablas estarán creadas
2. ✅ Los triggers estarán activos
3. ✅ Las funciones SQL estarán disponibles
4. ✅ Las políticas RLS estarán configuradas

**Ahora puedes:**
- Ir a `/admin` → "Costos Fijos & Ingresos"
- Cargar datos de Costos Fijos
- Distribuir automáticamente por sucursal
- Ver los resultados en el P&L Ejecutivo

---

## 📞 Ayuda Adicional

**Si tienes problemas:**
1. Verificar logs de error en Supabase Dashboard
2. Revisar que el proyecto tenga las tablas base (periodos, sucursales, registros)
3. Consultar documentación de Supabase: https://supabase.com/docs

**Archivos relacionados:**
- `RESUMEN_IMPLEMENTACION_COSTOS_FIJOS.md` - Documentación técnica
- `CHECKLIST_IMPLEMENTACION.md` - Lista de verificación
- `RESUMEN_FINAL_SESION.md` - Resumen de la implementación

---

**Última actualización:** 2026-08-07  
**Versión de migraciones:** 004, 005, 006

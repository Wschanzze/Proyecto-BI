# Cambios Implementados: Estructura Completa de FRESCOS

## Resumen

Se ha actualizado la estructura de la categoría **FRESCOS** en el sistema Monarca BI para incluir todos los grupos y subgrupos según tu especificación.

## Cambios Realizados

### 1. **Migración de Base de Datos** (`007_frescos_estructura_completa.sql`)

✅ **Archivo creado**: `supabase/migrations/007_frescos_estructura_completa.sql`

**Contenido**:
- Elimina los sectores antiguos de FRESCOS (Verdulería, Lácteos Frescos, Panadería)
- Crea 4 sectores principales:
  - **Carnicería** (6 subgrupos)
  - **Fiambrería** (5 subgrupos)
  - **Frutas y Verduras** (4 subgrupos)
  - **Rotisería** (15 subgrupos)
- Inserta **30 grupos/subgrupos** en total para FRESCOS

### 2. **Actualización del Seed** (`app/api/seed/route.ts`)

✅ **Modificado**: Constantes `SECTORES` y `GRUPOS`

**Cambios**:
- Actualizados los sectores de FRESCOS
- Reemplazados los 8 grupos antiguos por los 30 nuevos grupos completos
- Los datos de seed ahora generarán métricas para todos los nuevos subgrupos

### 3. **Documentación de Mapeo** (`MAPEO_FRESCOS.md`)

✅ **Archivo creado**: Documentación completa del mapeo CSV → Base de Datos

**Incluye**:
- Tabla completa de todos los subgrupos con sus IDs
- Formato esperado del archivo CSV
- Ejemplos de filas CSV correctas
- Explicación de la lógica de mapeo automático
- Guía de verificación post-carga

## Estructura Completa de FRESCOS

### 📦 Carnicería (6 subgrupos)
1. Achuras
2. Carne Porcina
3. Carne Vacuna
4. Pescado
5. Pollo
6. Producción

### 🧀 Fiambrería (5 subgrupos)
1. Dulces
2. Encurtidos
3. Fiambres
4. Frutas
5. Quesos

### 🍎 Frutas y Verduras (4 subgrupos)
1. Frutas Frescas
2. Huevos
3. Leña y Carbón
4. Verduras Frescas

### 🍗 Rotisería (15 subgrupos)
1. Arrollado
2. Arroz
3. Carnes
4. Cerdo
5. Empanadas
6. Ensaladas
7. Entrada
8. Milanesas
9. Papas
10. Pastas
11. Pescado
12. Pollo
13. Postre
14. Tartas y Tortillas
15. Verduras

## Cómo Funciona el Mapeo Automático

El sistema de carga CSV (`/api/upload`) **ya está preparado** para mapear correctamente estos grupos:

1. **Normalización automática**: 
   - Convierte a minúsculas
   - Elimina tildes
   - Convierte espacios a guiones
   - Ejemplo: `"Carne Vacuna"` → `"carne-vacuna"`

2. **Búsqueda inteligente**:
   - Busca por nombre exacto del subgrupo
   - Si no encuentra, busca por nombre del grupo/sector
   - Soporta variaciones de mayúsculas/minúsculas

3. **Sin código adicional necesario**: La lógica existente en `upload/route.ts` ya maneja correctamente esta estructura.

## Pasos para Aplicar los Cambios

### Opción 1: Aplicar Migración Manual (Recomendado)

```bash
# Si usas Supabase CLI local
supabase migration up

# O ejecuta el SQL directamente en el panel de Supabase
```

### Opción 2: Re-ejecutar el Seed Completo

```bash
# Desde tu aplicación Next.js
POST /api/seed
Body: { "password": "CDGMonarc@2026" }
```

**⚠️ IMPORTANTE**: El seed eliminará los datos existentes de FRESCOS y regenerará con la nueva estructura.

## Verificación

Después de aplicar los cambios:

1. **Verificar en Base de Datos**:
   ```sql
   -- Verificar sectores de FRESCOS
   SELECT * FROM sectores WHERE categoria_id = 'frescos';
   
   -- Verificar grupos de FRESCOS (debería retornar 30)
   SELECT COUNT(*) FROM grupos WHERE sector_id LIKE 'frescos-%';
   ```

2. **Verificar en la App**:
   - Ve a `/admin` y carga un archivo CSV con datos de FRESCOS
   - Verifica que no aparezcan grupos "ignorados" en el resultado
   - Ve al **Cuadro de Resultados — Detallado**
   - Expande la categoría **FRESCOS**
   - Deberías ver los 4 sectores (Carnicería, Fiambrería, Frutas y Verduras, Rotisería)
   - Al expandir cada sector, deberías ver sus subgrupos correspondientes

3. **Prueba con Datos CSV**:
   ```csv
   Categoria,Grupo,Subgrupo,Mes,Sucursal,Facturación s/IVA,IVA,Costo,Cantidad
   Frescos,Carniceria,Carne Vacuna,jun-26,Colón,1500000,315000,900000,450
   Frescos,Fiambreria,Quesos,jun-26,San Martín,850000,178500,510000,280
   Frescos,Rotiseria,Empanadas,jun-26,Falucho,280000,58800,140000,320
   ```

## Comportamiento en el Cuadro Detallado

En el **Cuadro de Resultados — Detallado**:

- ✅ La categoría **FRESCOS** aparecerá como sección
- ✅ Al hacer clic en el chevron, se expandirán los 4 sectores
- ✅ Cada sector mostrará sus métricas agregadas
- ✅ Al expandir un sector (ej: Rotisería), se mostrarán sus 15 subgrupos
- ✅ Cada subgrupo mostrará sus métricas individuales
- ✅ Los colores y estilos son consistentes con SALON

## Archivos Modificados/Creados

```
✅ supabase/migrations/007_frescos_estructura_completa.sql (NUEVO)
✅ app/api/seed/route.ts (MODIFICADO)
✅ MAPEO_FRESCOS.md (NUEVO - Documentación)
✅ CAMBIOS_FRESCOS_IMPLEMENTADOS.md (NUEVO - Este archivo)
```

## Próximos Pasos Recomendados

1. **Aplicar la migración** en tu base de datos Supabase
2. **Re-ejecutar el seed** si quieres datos de prueba
3. **Cargar un archivo CSV real** con datos de FRESCOS para verificar el mapeo
4. **Revisar el Cuadro Detallado** para confirmar la visualización correcta

## Preguntas Frecuentes

**P: ¿Qué pasa con los datos existentes de FRESCOS?**  
R: La migración elimina los sectores antiguos (con CASCADE), lo que eliminará también los grupos y resultados asociados. Necesitarás re-cargar los datos con la nueva estructura.

**P: ¿El archivo CSV debe tener exactamente estos nombres?**  
R: No, el sistema normaliza automáticamente. "CARNE VACUNA", "Carne Vacuna", "carne vacuna" todos funcionarán.

**P: ¿Puedo agregar más subgrupos después?**  
R: Sí, solo necesitas:
1. Crear una nueva migración SQL insertando el nuevo grupo
2. Actualizar el array `GRUPOS` en `seed/route.ts`
3. El upload automáticamente lo reconocerá

**P: ¿Cómo verifico que un CSV se va a mapear correctamente antes de cargarlo?**  
R: Consulta el archivo `MAPEO_FRESCOS.md` para ver la tabla completa de mapeos esperados.

---

**Fecha de implementación**: 2026-08-10  
**Versión**: 1.0  
**Estado**: ✅ Completo y listo para aplicar

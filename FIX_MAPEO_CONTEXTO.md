# 🔧 Fix: Mapeo con Contexto de Categoría y Sector

## 🐛 Problema Identificado

El sistema **YA leía** las columnas `Categoria`, `Grupo` y `Subgrupo` del CSV, pero **NO las usaba** para el mapeo. Solo buscaba por nombre del subgrupo, ignorando el contexto.

Cuando el CSV tenía subgrupos con **nombres idénticos** en diferentes sectores/categorías, el sistema los mapeaba incorrectamente, causando que:

- Las **variaciones** mostraran comparaciones entre categorías diferentes
- Los **datos se mezclaran** entre SALON y FRESCOS

### Ejemplo del Bug

**Tu archivo CSV (correcto):**
```csv
Categoria,Grupo,Subgrupo,Mes,Sucursal,Facturación s/IVA,IVA,Costo,Cantidad
Salon,Desayuno,Postre,jun-26,Colón,150000,31500,90000,125
Frescos,Rotiseria,Postre,jun-26,Colón,210000,44100,126000,190
```

**Comportamiento Anterior (❌ Incorrecto):**
1. Sistema **lee** Categoria y Grupo ✅
2. Pero **NO los usa** para mapear ❌
3. Solo busca por nombre: "Postre"
4. Encuentra el primer "Postre" → puede ser `salon-des-postre`
5. Guarda ambas filas en el mismo grupo
6. Las variaciones comparan datos mezclados

**Resultado:**
- ❌ Datos de FRESCOS guardados en grupo de SALON
- ❌ Variaciones absurdas (comparando categorías diferentes)
- ❌ Métricas distorsionadas

---

## ✅ Solución Implementada

### Cambio Principal

**Antes:** Sistema leía pero ignoraba `Categoria` y `Grupo`  
**Ahora:** Sistema **usa** `Categoria` y `Grupo` para mapeo preciso

### ⚠️ NO Necesitás Cambiar Tus Archivos CSV

Tus archivos **ya tienen** las columnas correctas:
- ✅ `Categoria`
- ✅ `Grupo` 
- ✅ `Subgrupo`

El fix utiliza estas columnas que ya existían pero no se usaban.

---

## 🔄 Qué Hace el Fix

### Nuevo Algoritmo de Mapeo con Contexto

El sistema ahora usa un **algoritmo de búsqueda jerárquica** que considera:

1. **Categoría** (`Salon`, `Frescos`)
2. **Grupo/Sector** (`Desayuno`, `Rotisería`)
3. **Subgrupo** (`Postre`)

### Orden de Búsqueda (Cascada)

```
1. Búsqueda con contexto completo ⭐ NUEVO
   ├─ Verifica: Categoría → Sector → Subgrupo
   └─ Ejemplo: "Frescos" → "Rotiseria" → "Postre" = frescos-rot-postre ✅

2. Búsqueda por nombre del subgrupo (backward compatibility)
   └─ Solo si no hay columnas Categoria/Grupo en el CSV

3. Alias especiales
   └─ Para casos excepcionales predefinidos

4. Búsqueda por sector
   └─ Fallback si el nombre coincide con un sector

5. Búsqueda flexible
   └─ Ignora guiones para mayor tolerancia
```

---

## 📋 Formato CSV Mejorado

### Antes (Ambiguo)

```csv
Subgrupo,Mes,Sucursal,Facturación s/IVA,IVA,Costo,Cantidad
Postre,jun-26,Colón,210000,44100,126000,190
```

**Problema:** No se sabe si es Postre de Salon o Frescos ❌

---

### Ahora (Explícito) ✅

```csv
Categoria,Grupo,Subgrupo,Mes,Sucursal,Facturación s/IVA,IVA,Costo,Cantidad
Frescos,Rotiseria,Postre,jun-26,Colón,210000,44100,126000,190
Salon,Desayuno,Postre,jun-26,Colón,150000,31500,90000,125
```

**Ventajas:**
- ✅ Mapeo exacto sin ambigüedad
- ✅ Backward compatible (sigue funcionando sin Categoria/Grupo)
- ✅ Mensajes de error más descriptivos

---

## 🔍 Casos de Uso Resueltos

### Caso 1: Nombres Duplicados Entre Categorías

**CSV:**
```csv
Categoria,Grupo,Subgrupo,Mes,Sucursal,Facturación s/IVA,IVA,Costo,Cantidad
Salon,Desayuno,Postre,jun-26,Colón,150000,31500,90000,125
Frescos,Rotiseria,Postre,jun-26,Colón,210000,44100,126000,190
```

**Resultado:**
- ✅ `Salon → Desayuno → Postre` → `salon-des-postre`
- ✅ `Frescos → Rotiseria → Postre` → `frescos-rot-postre`
- ✅ Variaciones correctas para cada uno

---

### Caso 2: Nombres Duplicados Dentro de la Misma Categoría

**Ejemplo Real:**
- `Frescos → Carnicería → Pescado`
- `Frescos → Rotisería → Pescado`

**CSV:**
```csv
Categoria,Grupo,Subgrupo,Mes,Sucursal,Facturación s/IVA,IVA,Costo,Cantidad
Frescos,Carniceria,Pescado,jun-26,Colón,420000,88200,252000,180
Frescos,Rotiseria,Pescado,jun-26,Colón,290000,60900,174000,145
```

**Resultado:**
- ✅ `Frescos → Carnicería → Pescado` → `frescos-car-pescado`
- ✅ `Frescos → Rotisería → Pescado` → `frescos-rot-pescado`
- ✅ Cada uno con sus propias métricas

---

### Caso 3: CSV Sin Columna "Categoria" (Backward Compatibility)

**CSV Antiguo:**
```csv
Subgrupo,Mes,Sucursal,Facturación s/IVA,IVA,Costo,Cantidad
Aceites,jun-26,Colón,500000,105000,300000,250
```

**Resultado:**
- ✅ Sigue funcionando
- ✅ Busca por nombre "Aceites"
- ✅ Si hay ambigüedad, toma el primer match
- ⚠️ Recomendado: agregar columnas Categoria/Grupo

---

## 🧪 Verificación del Fix

### Test 1: Cargar Datos con Nombres Duplicados

```csv
Categoria,Grupo,Subgrupo,Mes,Sucursal,Facturación s/IVA,IVA,Costo,Cantidad
Salon,Desayuno,Postre,jun-26,Colón,150000,31500,90000,125
Frescos,Rotiseria,Postre,jun-26,Colón,210000,44100,126000,190
Frescos,Carniceria,Pescado,jun-26,Colón,420000,88200,252000,180
Frescos,Rotiseria,Pescado,jun-26,Colón,290000,60900,174000,145
```

**Verificar en el Cuadro Detallado:**
1. Expandir SALON → Desayuno → debe mostrar Postre con $150.000
2. Expandir FRESCOS → Rotisería → debe mostrar Postre con $210.000
3. Expandir FRESCOS → Carnicería → debe mostrar Pescado con $420.000
4. Expandir FRESCOS → Rotisería → debe mostrar Pescado con $290.000

**Verificar Variaciones:**
- Cargar datos de mayo-26 y junio-26 con los mismos grupos
- Las variaciones deben comparar el mismo grupo en diferentes meses
- NO debe comparar Salon-Postre de mayo con Frescos-Postre de junio

---

## 📊 Mejoras en Mensajes de Error

**Antes:**
```
"Postre" (Fila 15)
```

**Ahora:**
```
"Postre" [Frescos → Rotiseria] (Fila 15)
```

Esto ayuda a identificar rápidamente qué contexto no se pudo mapear.

---

## 🔧 Código Modificado

### Archivo: `app/api/upload/route.ts`

**Cambios principales:**

1. **Lectura de nuevas columnas:**
```typescript
const rawCategoria = getRowVal(row, ['Categoria', 'Categoría', 'categoria', 'CATEGORIA'])
const rawGrupo = getRowVal(row, ['Grupo', 'grupo', 'GRUPO', 'Sector', 'sector', 'SECTOR'])
```

2. **Búsqueda con contexto:**
```typescript
if (categoriaSlug && grupoSlug) {
  matchedGrp = dbGrupos.find(g => {
    // Verificar nombre del grupo
    if (slugify(g.nombre) !== leafSlug) return false
    
    // Verificar sector correcto
    const sector = dbSectores.find(s => s.id === g.sector_id)
    if (!sector || slugify(sector.nombre) !== grupoSlug) return false
    
    // Verificar categoría correcta
    return slugify(sector.categoria_id) === categoriaSlug
  })
}
```

---

## ⚠️ Acción Requerida

### Para Datos Ya Cargados (Afectados por el Bug)

Si ya tenés datos cargados que fueron mapeados incorrectamente:

1. **Identificar períodos afectados:**
   - Revisá el Cuadro Detallado
   - Buscá variaciones extrañas o métricas que no tengan sentido
   - Si ves "Postre" de FRESCOS con datos mezclados, está afectado

2. **Eliminar períodos afectados:**
   - Andá a `/admin` → pestaña "Historial y Eliminación de Cargas"
   - Eliminá los períodos con mapeo incorrecto

3. **Re-cargar los mismos archivos:**
   - **NO necesitás modificar tus archivos CSV** ✅
   - Usá los mismos archivos que tenías
   - El fix ahora mapeará correctamente

4. **Verificar el resultado:**
   - Revisá el Cuadro Detallado
   - Las variaciones ahora deben tener sentido
   - Cada subgrupo debe estar en su categoría/sector correcto

### Para Datos Nuevos

✅ **Seguí usando el mismo formato de CSV que siempre**

Tus archivos ya tienen la estructura correcta:
```csv
Categoria,Grupo,Subgrupo,Mes,Sucursal,Facturación s/IVA,IVA,Costo,Cantidad
Salon,Almacen,Aceites,jun-26,Colón,500000,105000,300000,250
Frescos,Carniceria,Pescado,jun-26,Colón,420000,88200,252000,180
```

El sistema ahora usará estas columnas correctamente.

---

## 📝 Recomendaciones

### ✅ No Necesitás Cambiar Nada

Tus archivos CSV ya están correctos. Solo necesitás:

1. **Re-cargar los datos afectados** (eliminá y volvé a cargar)
2. **Seguir usando el mismo formato** para nuevas cargas

### Estructura CSV Recomendada (Ya lo Estás Usando)

```csv
Categoria,Grupo,Subgrupo,Mes,Sucursal,Facturación s/IVA,IVA,Costo,Cantidad
Salon,Almacen,Aceites,jun-26,Colón,500000,105000,300000,250
Salon,Desayuno,Postre,jun-26,Colón,150000,31500,90000,125
Frescos,Carniceria,Pescado,jun-26,Colón,420000,88200,252000,180
Frescos,Rotiseria,Postre,jun-26,Colón,210000,44100,126000,190
Frescos,Rotiseria,Pescado,jun-26,Colón,290000,60900,174000,145
```

Este formato ahora funciona correctamente. ✅

---

## 🧩 Nombres Que Se Repiten (Lista Conocida)

Estos son subgrupos que existen en múltiples sectores:

| Nombre | Ubicaciones |
|--------|-------------|
| **Postre** | `Salon → Desayuno`, `Frescos → Rotisería`, `Frescos → Panadería` |
| **Pescado** | `Frescos → Carnicería`, `Frescos → Rotisería` |
| **Pollo** | `Frescos → Carnicería`, `Frescos → Rotisería` |
| **Frutas** | `Frescos → Fiambrería` (podría haber en Salon también) |

Si tenés más nombres duplicados, agregá la columna `Grupo` para disambiguar.

---

## 🎯 Resultado Final

Con este fix:

- ✅ **Mapeo exacto** usando contexto de Categoría → Sector → Subgrupo
- ✅ **Variaciones correctas** comparando el mismo grupo en diferentes períodos
- ✅ **Backward compatible** con archivos sin Categoria/Grupo
- ✅ **Mensajes de error mejorados** con contexto
- ✅ **Métricas precisas** sin mezcla de datos

---

**Fecha de fix:** 10 de Agosto, 2026  
**Versión:** 2.1  
**Estado:** ✅ Implementado y Listo para Probar

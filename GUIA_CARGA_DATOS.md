# 📤 Guía de Carga de Datos - Monarca BI

## 🎯 Problema Resuelto

Anteriormente, al cargar un archivo con solo **FRESCOS**, el sistema borraba todos los datos del período (incluyendo **SALON**). Este comportamiento se ha corregido y ahora tenés dos opciones de carga.

---

## 📋 Dos Formas de Cargar Datos

### Opción 1: ✅ Archivo Unificado (Recomendado)

Cargá **un solo archivo CSV** que contenga tanto SALON como FRESCOS para cada período.

**Ventajas:**
- ✅ Más simple y directo
- ✅ Una sola carga por mes
- ✅ Menor riesgo de errores
- ✅ Datos consistentes

**Ejemplo de archivo unificado (`jun-26-completo.csv`):**

```csv
Categoria,Grupo,Subgrupo,Mes,Sucursal,Facturación s/IVA,IVA,Costo,Cantidad
Salon,Almacen,Aceites,jun-26,Colón,500000,105000,300000,250
Salon,Almacen,Aderezos,jun-26,Colón,320000,67200,192000,180
Salon,Desayuno,Café,jun-26,Colón,450000,94500,270000,290
Salon,Desayuno,Yerba,jun-26,Colón,680000,142800,408000,520
Frescos,Carniceria,Carne Vacuna,jun-26,Colón,1500000,315000,900000,450
Frescos,Carniceria,Pollo,jun-26,Colón,980000,205800,588000,650
Frescos,Panaderia,Pan,jun-26,Colón,680000,142800,408000,920
Frescos,Panaderia,Facturas,jun-26,Colón,380000,79800,228000,420
Frescos,Rotiseria,Empanadas,jun-26,Colón,280000,58800,168000,320
```

**¿Cómo cargar?**
1. Prepará un archivo con ambas categorías (SALON + FRESCOS)
2. Andá a `/admin` → pestaña **"Cargar Nuevo Archivo"**
3. **NO** marques "Modo Incremental"
4. Arrastrá o seleccioná el archivo
5. ✅ Listo - todos los datos del mes se cargan de una vez

---

### Opción 2: 🔄 Archivos Separados con Modo Incremental

Cargá archivos separados para cada categoría usando el **Modo Incremental**.

**Cuándo usar:**
- Tenés archivos separados por categoría
- Querés actualizar solo una categoría sin tocar las demás
- Cargás datos en diferentes momentos

**Ejemplo:**

**Archivo 1: `jun-26-salon.csv`**
```csv
Categoria,Grupo,Subgrupo,Mes,Sucursal,Facturación s/IVA,IVA,Costo,Cantidad
Salon,Almacen,Aceites,jun-26,Colón,500000,105000,300000,250
Salon,Desayuno,Café,jun-26,Colón,450000,94500,270000,290
```

**Archivo 2: `jun-26-frescos.csv`**
```csv
Categoria,Grupo,Subgrupo,Mes,Sucursal,Facturación s/IVA,IVA,Costo,Cantidad
Frescos,Carniceria,Carne Vacuna,jun-26,Colón,1500000,315000,900000,450
Frescos,Panaderia,Pan,jun-26,Colón,680000,142800,408000,920
```

**¿Cómo cargar?**
1. Andá a `/admin` → pestaña **"Cargar Nuevo Archivo"**
2. ✅ **Activá** el checkbox **"Modo Incremental"**
3. Cargá el primer archivo (ej: SALON)
4. Volvé a activar "Modo Incremental"
5. Cargá el segundo archivo (ej: FRESCOS)
6. ✅ Ambas categorías coexisten en el mismo período

---

## 🔍 Diferencias entre Modos

| Aspecto | Modo Reemplazo (default) | Modo Incremental |
|---------|--------------------------|------------------|
| **Checkbox** | ❌ Desmarcado | ✅ Marcado |
| **Comportamiento** | Elimina datos de los grupos del archivo antes de insertar | Inserta/actualiza sin eliminar |
| **Uso típico** | Archivo unificado con todo | Archivos separados por categoría |
| **Riesgo** | Puede borrar datos si el archivo está incompleto | Puede duplicar si no se controla |

---

## ⚙️ Cómo Funciona Técnicamente

### Modo Reemplazo (Sin checkbox marcado)

```
1. Detecta qué grupos están en el archivo (ej: todos los de FRESCOS)
2. Detecta qué períodos están en el archivo (ej: jun-26)
3. BORRA los resultados de esos grupos en esos períodos
4. INSERTA los nuevos datos del archivo
```

**Ejemplo:**
- Archivo tiene: FRESCOS de jun-26
- Sistema borra: **Solo FRESCOS** de jun-26
- Sistema inserta: FRESCOS de jun-26
- Resultado: ✅ SALON jun-26 queda intacto

### Modo Incremental (Checkbox marcado)

```
1. Detecta qué grupos están en el archivo
2. NO borra nada
3. INSERTA/ACTUALIZA con upsert (si existe, reemplaza; si no, crea)
```

**Ejemplo:**
- Ya existe: SALON jun-26
- Archivo tiene: FRESCOS de jun-26
- Sistema NO borra nada
- Sistema inserta: FRESCOS de jun-26
- Resultado: ✅ Ambos coexisten

---

## 📝 Recomendaciones

### ✅ Mejor Práctica: Archivo Unificado

Para minimizar errores, te recomendamos:

1. **Consolidá tus datos** en un solo archivo por mes
2. **Incluí todas las categorías** (SALON + FRESCOS)
3. **Cargá sin Modo Incremental** (comportamiento por defecto)
4. **Un archivo = Un mes completo**

### ⚠️ Cuándo Usar Modo Incremental

Usá Modo Incremental solo si:

- Recibís archivos separados por departamento/categoría
- Necesitás corregir datos de una categoría sin tocar las demás
- Estás agregando una nueva categoría a un período ya cargado

---

## 🚨 Errores Comunes y Soluciones

### Error 1: "Cargué FRESCOS y desaparecieron los datos de SALON"

**Causa:** Cargaste FRESCOS sin Modo Incremental.

**Solución:**
1. ✅ Activá **Modo Incremental**
2. Volvé a cargar el archivo de SALON
3. Los datos de FRESCOS se mantendrán

**O mejor:**
1. Unificá SALON y FRESCOS en un solo archivo
2. Cargá sin Modo Incremental

---

### Error 2: "Tengo datos duplicados"

**Causa:** Cargaste el mismo archivo dos veces con Modo Incremental activo.

**Solución:**
1. Andá a la pestaña **"Historial y Eliminación de Cargas"**
2. Eliminá el período completo
3. Volvé a cargarlo (una sola vez)

---

### Error 3: "Quiero reemplazar solo FRESCOS sin tocar SALON"

**Causa:** Necesitás actualizar solo una categoría.

**Solución:**
1. ❌ **NO** uses Modo Incremental
2. Cargá el archivo con solo FRESCOS
3. El sistema borrará solo FRESCOS del período y lo reemplazará
4. SALON quedará intacto

---

## 📊 Flujos de Trabajo Recomendados

### Flujo A: Carga Mensual Normal

```
1. Preparás un Excel con SALON + FRESCOS de jun-26
2. Vas a /admin → "Cargar Nuevo Archivo"
3. NO marcás "Modo Incremental"
4. Subís el archivo
5. ✅ Todo jun-26 queda cargado correctamente
```

### Flujo B: Corrección de Solo una Categoría

```
1. Ya tenés cargado jun-26 completo (SALON + FRESCOS)
2. Encontrás un error solo en los datos de FRESCOS
3. Preparás un archivo solo con FRESCOS corregidos
4. Vas a /admin → "Cargar Nuevo Archivo"
5. NO marcás "Modo Incremental" (importante!)
6. Subís el archivo
7. ✅ FRESCOS se reemplaza, SALON queda igual
```

### Flujo C: Archivos Separados por Departamento

```
1. Recibís "jun-26-salon.xlsx" del Departamento A
2. Vas a /admin → marcás "Modo Incremental" ✅
3. Subís jun-26-salon.xlsx
4. Recibís "jun-26-frescos.xlsx" del Departamento B
5. Vas a /admin → marcás "Modo Incremental" ✅
6. Subís jun-26-frescos.xlsx
7. ✅ Ambos departamentos conviven
```

---

## 🔧 Resumen Visual

```
┌─────────────────────────────────────────────┐
│  ¿Tenés un archivo con SALON + FRESCOS?     │
└────────────┬────────────────────────────────┘
             │
      ┌──────┴──────┐
      │     SÍ      │
      └──────┬──────┘
             │
             v
┌─────────────────────────────────────────────┐
│  Modo Reemplazo (checkbox desmarcado)       │
│  ✅ Archivo unificado mensual               │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  ¿Tenés archivos separados por categoría?   │
└────────────┬────────────────────────────────┘
             │
      ┌──────┴──────┐
      │     SÍ      │
      └──────┬──────┘
             │
             v
┌─────────────────────────────────────────────┐
│  Modo Incremental (checkbox marcado)        │
│  ✅ Activar para cada archivo               │
└─────────────────────────────────────────────┘
```

---

## 📞 Preguntas Frecuentes

**P: ¿Puedo mezclar ambos modos?**  
R: Sí, pero no es recomendable. Elegí un flujo y mantenelo.

**P: ¿El Modo Incremental es más lento?**  
R: No, el rendimiento es el mismo.

**P: ¿Qué pasa si me olvido de marcar "Modo Incremental"?**  
R: Si cargás solo FRESCOS sin marcarlo, se borrará solo FRESCOS existente (no SALON). Si querías agregar sin reemplazar, tendrás que volver a cargar.

**P: ¿Cómo sé qué datos tengo cargados?**  
R: Andá a la pestaña "Historial y Eliminación de Cargas" para ver todos los períodos.

**P: ¿Puedo deshacer una carga?**  
R: Sí, desde "Historial y Eliminación" podés eliminar un período completo y volver a cargarlo.

---

**Última actualización:** 10 de Agosto, 2026  
**Versión:** 2.0 con Modo Incremental

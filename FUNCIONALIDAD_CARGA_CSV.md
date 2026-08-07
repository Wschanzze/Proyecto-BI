# 📄 Funcionalidad de Carga desde CSV - Costos Fijos e Ingresos Financieros

**Fecha:** 2026-08-07  
**Estado:** ✅ IMPLEMENTADO

---

## 🎯 Descripción

Se agregó la funcionalidad de **carga masiva desde archivo CSV** para Costos Fijos e Ingresos Financieros, permitiendo importar todos los valores de un período en un solo paso.

---

## 🆕 Nuevas Características

### 1. **Sistema de Tabs**
La interfaz de carga ahora tiene 2 pestañas:
- **Carga Manual:** Formularios tradicionales para ingresar valores uno por uno
- **Carga desde Archivo CSV:** Importación masiva desde archivo

### 2. **Descarga de Plantilla CSV**
- Botón para descargar plantilla pre-formateada
- Incluye todas las 17 líneas (15 Costos Fijos + 2 Ingresos Financieros)
- Nombre de archivo: `plantilla_costos_fijos_YYYY-MM.csv`

### 3. **Importación de CSV**
- Selector de archivo con aceptación de `.csv`
- Procesamiento automático del archivo
- Mapeo inteligente de denominaciones a campos
- Validación y limpieza de datos

### 4. **Vista Previa de Datos Cargados**
- Card con resumen de totales cargados
- Botones de distribución accesibles desde cualquier pestaña
- Feedback visual de datos listos para procesar

---

## 📋 Formato del Archivo CSV

### Estructura
```csv
Denominación,Total,Mes
Alquileres,22022608.27,jun-26
Honorarios,589438.00,jun-26
Tasas y Servicios,39495944.51,jun-26
...
```

### Especificaciones
- **3 columnas obligatorias:**
  1. `Denominación` - Nombre de la cuenta
  2. `Total` - Monto numérico (puede incluir decimales con `.`)
  3. `Mes` - Período (formato: `mes-año`, ej: `jun-26`)

- **17 filas esperadas:**
  - 15 subcuentas de Costos Fijos
  - 2 subcuentas de Ingresos Financieros

- **Formato de números:**
  - Decimales con punto (`.`)
  - Sin símbolos de moneda
  - Sin separadores de miles

### Denominaciones Reconocidas

#### Costos Fijos (15)
1. **Alquileres**
2. **Honorarios**
3. **Tasas y Servicios**
4. **Mantenimiento y Servicios Técnicos**
5. **Pérdida en Gestión de Inventarios**
6. **Seguridad y Vigilancia**
7. **Otros Servicios**
8. **Gastos en Personal**
9. **Otros Gastos**
10. **Comisiones y Gastos Bancarios**
11. **Gastos Extraordinarios**
12. **Gastos de Comercialización**
13. **Gastos de Administración**
14. **Gastos de Financiación**
15. **Diferencias de Caja - Pérdida**

#### Ingresos Financieros (2)
1. **Operatoria Financiera**
2. **Rendimientos Financieros**

---

## 🔄 Flujo de Trabajo

### Opción A: Carga Manual
1. Usuario selecciona período
2. Usuario hace click en tab "Carga Manual"
3. Usuario ingresa valores en formularios
4. Usuario hace click en botones de distribución
5. Sistema distribuye por sucursal

### Opción B: Carga desde CSV
1. Usuario selecciona período
2. Usuario hace click en tab "Carga desde Archivo CSV"
3. Usuario descarga plantilla (opcional)
4. Usuario completa plantilla en Excel/LibreOffice
5. Usuario guarda como CSV
6. Usuario selecciona archivo y lo carga
7. Sistema procesa y llena formularios automáticamente
8. Usuario revisa valores en vista previa
9. Usuario hace click en botones de distribución
10. Sistema distribuye por sucursal

---

## 💡 Mapeo Inteligente

El sistema reconoce las denominaciones usando **coincidencia parcial**:

```typescript
// Ejemplos de mapeo:
"Alquileres" → alquileres
"alquiler" → alquileres
"ALQUILERES" → alquileres

"Tasas y Servicios" → tasas_servicios
"tasas servicios" → tasas_servicios
"Tasas/Servicios" → tasas_servicios

"Honorarios profesionales" → honorarios
"honorario" → honorarios
```

**Ventajas:**
- Flexibilidad en el formato de entrada
- Tolerante a mayúsculas/minúsculas
- Funciona con variaciones del nombre

---

## 🎨 Componentes UI

### Nuevo Componente: Tab de Archivo CSV
```tsx
<TabsContent value="archivo">
  <Card>
    {/* Información del formato */}
    {/* Botón descargar plantilla */}
    {/* Botón seleccionar archivo */}
    {/* Input file oculto */}
  </Card>
</TabsContent>
```

### Vista Previa de Datos
```tsx
{(totalCostos > 0 || totalIngresos > 0) && (
  <Card className="border-success/30 bg-success/5">
    {/* Totales */}
    {/* Botones de distribución */}
  </Card>
)}
```

---

## 🔧 Funciones Implementadas

### 1. `handleFileUpload()`
Procesa el archivo CSV cargado:
- Lee el archivo con FileReader
- Parsea líneas CSV
- Mapea denominaciones a campos
- Actualiza estados de formularios
- Muestra feedback de éxito/error

### 2. `handleDownloadTemplate()`
Genera y descarga plantilla CSV:
- Crea blob con formato correcto
- Incluye todas las 17 líneas
- Usa período seleccionado en nombres
- Descarga automáticamente

---

## 📊 Ejemplo de Plantilla Generada

```csv
Denominación,Total,Mes
Alquileres,0,2026-07
Honorarios,0,2026-07
Tasas y Servicios,0,2026-07
Mantenimiento y Servicios Técnicos,0,2026-07
Pérdida en Gestión de Inventarios,0,2026-07
Seguridad y Vigilancia,0,2026-07
Otros Servicios,0,2026-07
Gastos en Personal,0,2026-07
Otros Gastos,0,2026-07
Comisiones y Gastos Bancarios,0,2026-07
Gastos Extraordinarios,0,2026-07
Gastos de Comercialización,0,2026-07
Gastos de Administración,0,2026-07
Gastos de Financiación,0,2026-07
Diferencias de Caja - Pérdida,0,2026-07
Operatoria Financiera,0,2026-07
Rendimientos Financieros,0,2026-07
```

---

## 🎯 Ventajas del Sistema

### Carga Manual
✅ Control total sobre cada valor  
✅ Ideal para ajustes rápidos  
✅ Visualización inmediata de totales  

### Carga desde CSV
✅ **Velocidad:** Carga de 17 valores en segundos  
✅ **Consistencia:** Reduce errores de tipeo  
✅ **Trazabilidad:** Archivo CSV como respaldo  
✅ **Integración:** Compatible con exports de Excel/ERP  
✅ **Plantilla:** Formato estandarizado descargable  

---

## 🛠️ Uso Recomendado

### Para carga mensual recurrente:
1. Descargar plantilla una sola vez
2. Completar con datos del mes desde Excel
3. Guardar copia del archivo completado (backup)
4. Importar a Monarca BI
5. Verificar en vista previa
6. Distribuir

### Para ajustes puntuales:
1. Usar tab "Carga Manual"
2. Modificar solo el/los valores necesarios
3. Distribuir

---

## 📝 Validaciones

El sistema valida:
- ✅ Archivo no vacío
- ✅ Formato CSV correcto
- ✅ Al menos 2 líneas (header + 1 dato)
- ✅ Valores numéricos válidos
- ✅ Denominaciones reconocibles

**Mensajes de error:**
- "El archivo CSV está vacío o no tiene el formato correcto"
- "Error al procesar el archivo: [detalle del error]"

**Mensaje de éxito:**
- "Archivo cargado exitosamente. Se importaron X costos fijos y Y ingresos financieros."

---

## 🔒 Seguridad

- ✅ Solo acepta archivos `.csv`
- ✅ Validación de formato antes de procesar
- ✅ Limpieza de valores (elimina caracteres no numéricos)
- ✅ No ejecuta código del archivo
- ✅ Procesamiento client-side (no sube archivo al servidor)

---

## 🚀 Próximas Mejoras Sugeridas

### Corto Plazo
- [ ] Validación de montos (alertar si valores muy altos/bajos)
- [ ] Soporte para formato Excel (.xlsx) además de CSV
- [ ] Historial de archivos importados

### Mediano Plazo
- [ ] Importación de múltiples períodos a la vez
- [ ] Comparación automática con período anterior
- [ ] Notificaciones por email al completar distribución

### Largo Plazo
- [ ] Integración con APIs de ERPs externos
- [ ] Importación automática programada
- [ ] Dashboard de análisis de costos importados

---

## 📞 Soporte

### Problemas Comunes

**"No se importaron todos los valores"**
- Verificar que las denominaciones coincidan con las esperadas
- Revisar que el CSV esté separado por comas
- Asegurarse de que no haya líneas vacías

**"Error al procesar el archivo"**
- Verificar encoding del archivo (debe ser UTF-8)
- Guardar desde Excel como "CSV UTF-8"
- Eliminar caracteres especiales en denominaciones

**"Los valores no aparecen"**
- Cambiar a tab "Carga Manual" para ver formularios
- Verificar en vista previa de datos cargados
- Recargar página si es necesario

---

## ✅ Estado Final

| Componente | Estado | Notas |
|------------|--------|-------|
| Tab System | ✅ Implementado | 2 tabs funcionales |
| Descarga Plantilla | ✅ Implementado | CSV con 17 líneas |
| Carga CSV | ✅ Implementado | Mapeo inteligente |
| Vista Previa | ✅ Implementado | Con totales y acciones |
| Validaciones | ✅ Implementado | Formato y contenido |
| Build | ✅ Exitoso | Sin errores |

---

**Implementado por:** Kiro AI  
**Última actualización:** 2026-08-07  
**Versión:** 1.0.0

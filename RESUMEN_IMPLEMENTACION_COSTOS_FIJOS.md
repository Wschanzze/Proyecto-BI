# Resumen de Implementación - Sistema de Costos Fijos e Ingresos Financieros

**Fecha:** 2026-08-07  
**Estado:** ✅ COMPLETADO

---

## 📋 Resumen Ejecutivo

Se ha implementado exitosamente un sistema completo para la gestión y distribución automática de **Costos Fijos** (15 subcuentas) e **Ingresos Financieros** (2 subcuentas) en el sistema Monarca BI. El sistema permite:

1. Carga consolidada de costos fijos e ingresos financieros
2. Distribución automática por sucursal según participación en ventas
3. Visualización detallada en el P&L Ejecutivo con acordeones expandibles
4. Integración completa con la base de datos Supabase

---

## 🎯 Características Implementadas

### 1. **Renombrado: Gastos Comerciales → Costos Fijos**
- ✅ Campo `gastosComerciales` renombrado a `costosFijos` en toda la aplicación
- ✅ Actualizado en cálculos, interfaces y componentes
- ✅ Nomenclatura consistente en toda la base de código

### 2. **15 Subcuentas de Costos Fijos**
Implementadas con acordeón expandible en el P&L:
1. Alquileres
2. Honorarios
3. Tasas y Servicios
4. Mantenimiento y Servicios Técnicos
5. Pérdida en Gestión de Inventarios
6. Seguridad y Vigilancia
7. Otros Servicios
8. Gastos en Personal
9. Otros Gastos
10. Comisiones y Gastos Bancarios
11. Gastos Extraordinarios
12. Gastos de Comercialización
13. Gastos de Administración
14. Gastos de Financiación
15. Diferencias de Caja - Pérdida

### 3. **2 Subcuentas de Ingresos Financieros**
Implementadas con acordeón expandible en el P&L:
1. Operatoria Financiera
2. Rendimientos Financieros

### 4. **Sistema de Distribución Automática**
- ✅ Carga consolidada (totales por período)
- ✅ Distribución proporcional según participación en ventas de cada sucursal
- ✅ Validación de datos de ventas antes de distribuir
- ✅ Reporte detallado de distribución con porcentajes por sucursal

### 5. **Interfaz de Carga en Admin**
- ✅ Nueva pestaña "Costos Fijos & Ingresos" en `/admin`
- ✅ Formulario para las 15 subcuentas de Costos Fijos
- ✅ Formulario para las 2 subcuentas de Ingresos Financieros
- ✅ Cálculo de totales en tiempo real
- ✅ Botones separados para distribuir cada tipo
- ✅ Panel informativo explicando la distribución automática
- ✅ Visualización de resultados con detalles por sucursal
- ✅ Datos de períodos y sucursales obtenidos desde la DB (no mock)

### 6. **Mejoras Visuales en P&L**
- ✅ Porcentaje sobre Ventas sin IVA en "Contribución Marginal"
- ✅ Porcentaje sobre Ventas sin IVA en "Resultado Operativo"
- ✅ Primera columna (nombres de cuentas) con **sticky positioning**
- ✅ Shadow visual para mejor UX al scrollear horizontalmente
- ✅ Z-index apropiados para mantener jerarquía visual

### 7. **Simplificación del P&L**
- ✅ Eliminada fila "Gastos Generales"
- ✅ Eliminada fila "Resultado Final"
- ✅ Eliminada fila/apartado "Impacto Tributario / Ajustes Tributarios"
- ✅ Eliminado campo `resultadoImpositivo`
- ✅ Nueva fórmula: `Resultado Total = Resultado Supermercado + Ingresos Financieros`

---

## 📁 Archivos Creados/Modificados

### **Nuevos Archivos**
1. `lib/distribucion-costos.ts` - Lógica de distribución automática
2. `lib/costos-fijos-subcuentas.ts` - Gestión de subcuentas de Costos Fijos
3. `lib/ingresos-financieros-subcuentas.ts` - Gestión de subcuentas de Ingresos Financieros
4. `components/monarca/views/carga-costos-fijos.tsx` - Componente de carga
5. `supabase/migrations/004_rrhh_subcuentas.sql` - Migración RRHH
6. `supabase/migrations/005_costos_fijos_subcuentas.sql` - Migración Costos Fijos
7. `supabase/migrations/006_ingresos_financieros_subcuentas.sql` - Migración Ingresos Financieros

### **Archivos Modificados**
1. `components/monarca/views/cuadro-simplificado.tsx` - P&L con acordeones y sticky column
2. `lib/data.ts` - Actualización de interfaces y cálculos
3. `app/admin/page.tsx` - Integración del componente de carga con datos reales de DB
4. `lib/data-db.ts` - (ya existía, se utiliza para obtener períodos/sucursales)

---

## 🗄️ Estructura de Base de Datos

### **Tabla: `rrhh_subcuentas`**
```sql
- periodo_id (FK → periodos.id)
- sucursal_id (FK → sucursales.id)
- sueldos
- cargas_sociales
- indemnizaciones
- tabla_merito
- total_rrhh (calculado)
```

### **Tabla: `costos_fijos_subcuentas`**
```sql
- periodo_id (FK → periodos.id)
- sucursal_id (FK → sucursales.id)
- alquileres
- honorarios
- tasas_servicios
- mantenimiento_servicios_tecnicos
- perdida_gestion_inventarios
- seguridad_vigilancia
- otros_servicios
- gastos_personal
- otros_gastos
- comisiones_gastos_bancarios
- gastos_extraordinarios
- gastos_comercializacion
- gastos_administracion
- gastos_financiacion
- diferencias_caja_perdida
- total_costos_fijos (calculado)
```

### **Tabla: `ingresos_financieros_subcuentas`**
```sql
- periodo_id (FK → periodos.id)
- sucursal_id (FK → sucursales.id)
- operatoria_financiera
- rendimientos_financieros
- total_ingresos_financieros (calculado)
```

---

## 🔄 Flujo de Trabajo

### **1. Carga de Datos de Facturación**
Usuario carga datos de facturación por sucursal (requisito previo)

### **2. Carga de Costos Fijos**
1. Usuario accede a `/admin` → pestaña "Costos Fijos & Ingresos"
2. Selecciona el período
3. Ingresa los 15 valores consolidados de Costos Fijos
4. Presiona "Distribuir Costos Fijos por Sucursal"
5. Sistema calcula participación de cada sucursal en ventas
6. Distribuye proporcionalmente y guarda en `costos_fijos_subcuentas`

### **3. Carga de Ingresos Financieros**
1. Usuario ingresa los 2 valores consolidados de Ingresos Financieros
2. Presiona "Distribuir Ingresos Financieros por Sucursal"
3. Sistema distribuye proporcionalmente y guarda en `ingresos_financieros_subcuentas`

### **4. Visualización en P&L**
1. Usuario navega a P&L Ejecutivo
2. Ve las líneas de "RRHH", "Costos Fijos" e "Ingresos Financieros" con totales
3. Puede expandir acordeones para ver subcuentas detalladas
4. Columna de cuentas permanece visible al scrollear horizontalmente

---

## 🧪 Funciones Clave

### **Distribución Automática**
```typescript
// lib/distribucion-costos.ts

calcularParticipacionVentas(periodoKey: string)
  → Calcula % de participación de cada sucursal en ventas totales

distribuirCostosFijos(periodoKey: string, costosTotal: CostosFijosSubcuentasCarga)
  → Distribuye costos fijos totales entre sucursales

distribuirIngresosFinancieros(periodoKey: string, ingresosTotal: IngresosFinancierosSubcuentasCarga)
  → Distribuye ingresos financieros totales entre sucursales
```

### **Gestión de Subcuentas**
```typescript
// lib/costos-fijos-subcuentas.ts
getCostosFijosSubcuentas(periodoKey: string, sucursalId?: string)
upsertCostosFijosSubcuentas(periodoKey: string, sucursalId: string, datos: CostosFijosSubcuentasCarga)

// lib/ingresos-financieros-subcuentas.ts
getIngresosFinancierosSubcuentas(periodoKey: string, sucursalId?: string)
upsertIngresosFinancierosSubcuentas(periodoKey: string, sucursalId: string, datos: IngresosFinancierosSubcuentasCarga)
```

---

## ⚠️ Pendientes y Próximos Pasos

### **Paso 1: Aplicar Migraciones SQL**
```bash
# Las migraciones deben aplicarse en Supabase en este orden:
1. 004_rrhh_subcuentas.sql
2. 005_costos_fijos_subcuentas.sql
3. 006_ingresos_financieros_subcuentas.sql
```

### **Paso 2: Probar con Datos Reales**
- Cargar datos de facturación para un período
- Distribuir costos fijos
- Distribuir ingresos financieros
- Verificar visualización en P&L

### **Opcional: Futuras Mejoras**
- [ ] Carga desde archivo Excel para Costos Fijos
- [ ] Carga desde archivo Excel para Ingresos Financieros
- [ ] Validaciones adicionales de formulario
- [ ] Exportación de reportes de distribución
- [ ] Historial de cargas con auditoría
- [ ] Gráficos de evolución de costos fijos

---

## 📊 Estructura del P&L Final

```
INGRESOS
├─ Facturación (con IVA)
├─ IVA
└─ Ventas sin IVA

COSTOS
└─ CMV (Costo Mercadería Vendida)

RESULTADO BRUTO
└─ Contribución Marginal (+ % s/Ventas sin IVA)

GASTOS OPERATIVOS
├─ RRHH (Personal y Cargas Sociales) [ACORDEÓN]
│  ├─ Sueldos
│  ├─ Cargas Sociales
│  ├─ Indemnizaciones
│  └─ Tabla Mérito
├─ Costos Fijos [ACORDEÓN]
│  ├─ Alquileres
│  ├─ Honorarios
│  ├─ Tasas y Servicios
│  ├─ Mantenimiento y Servicios Técnicos
│  ├─ Pérdida en Gestión de Inventarios
│  ├─ Seguridad y Vigilancia
│  ├─ Otros Servicios
│  ├─ Gastos en Personal
│  ├─ Otros Gastos
│  ├─ Comisiones y Gastos Bancarios
│  ├─ Gastos Extraordinarios
│  ├─ Gastos de Comercialización
│  ├─ Gastos de Administración
│  ├─ Gastos de Financiación
│  └─ Diferencias de Caja - Pérdida
├─ Impuestos Operativos
└─ Merma

RESULTADO OPERATIVO (+ % s/Ventas sin IVA)

RESULTADO SUPERMERCADO

OTROS INGRESOS
└─ Ingresos Financieros [ACORDEÓN]
   ├─ Operatoria Financiera
   └─ Rendimientos Financieros

RESULTADO TOTAL (NETO)
```

---

## ✅ Validación de Corrección de Campo `periodo_key`

**Problema anterior:** Error SQL indicando que `p.periodo_key` no existía  
**Solución:** La columna correcta es `p.key` (no `periodo_key`)  
**Estado:** ✅ Corregido en todas las queries

---

## 🎓 Conceptos Clave

### **Distribución por Participación en Ventas**
Los costos fijos e ingresos financieros se registran como totales consolidados y se distribuyen automáticamente entre sucursales según su participación porcentual en las ventas del período.

**Ejemplo:**
- Período: Junio 2026
- Ventas Totales: $1,000,000
- Sucursal A: $600,000 (60%)
- Sucursal B: $400,000 (40%)
- Alquileres Totales: $100,000
- Alquileres Sucursal A: $60,000
- Alquileres Sucursal B: $40,000

### **Acordeones Expandibles**
Las cuentas principales (RRHH, Costos Fijos, Ingresos Financieros) muestran el total y pueden expandirse para ver el detalle de subcuentas con un click.

### **Sticky Column**
La primera columna con los nombres de las cuentas permanece fija al scrollear horizontalmente, facilitando la identificación de cada fila.

---

## 📝 Notas Técnicas

- **Framework:** Next.js 14+ (App Router)
- **Base de Datos:** Supabase (PostgreSQL)
- **UI Components:** shadcn/ui + Tailwind CSS
- **Tipos:** TypeScript con tipos estrictos
- **Estado:** React hooks (useState, useEffect)
- **Data Fetching:** Async/await con Supabase client

---

## 🔗 Referencias

- [Documento de Colores Unificados](COLORES_UNIFICADOS_PL.md)
- [Datos Reales P&L](DATOS_REALES_PL_CORREGIDO.md)
- [Instrucciones de Migración RRHH](INSTRUCCIONES_MIGRACION_RRHH.md)
- [Resumen Corrección P&L](RESUMEN_CORRECCION_PL.md)

---

**Implementado por:** Kiro AI  
**Última actualización:** 2026-08-07

# 📋 INSTRUCCIONES DE MIGRACIÓN RRHH - Monarca BI

## ✅ Status: Sistema RRHH implementado completamente, falta aplicar migración en Supabase

### 🎯 PASO 1: Aplicar Migración en Supabase Dashboard

1. **Ir a Supabase Dashboard:**
   - URL: https://supabase.com/dashboard/project/wlaotnafjrvckoxbdokk
   - Ir a **SQL Editor**

2. **Ejecutar migración completa:**
   - Copiar todo el contenido del archivo: `supabase/migrations/003_rrhh_costos_estructurales.sql`
   - Pegarlo en el SQL Editor
   - Hacer clic en **"Run"**

### 🔍 PASO 2: Verificar Creación de Tablas

Después de ejecutar la migración, verificar que se crearon las **4 nuevas tablas**:

```sql
-- Verificar todas las tablas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('empleados', 'nomina_mensual', 'costos_estructurales', 'plantilla_empleados');
```

### 📊 PASO 3: Verificar Datos Seed

Verificar que se insertó la plantilla de empleados:

```sql
-- Verificar plantilla de empleados por sucursal
SELECT sucursal_id, COUNT(*) as cantidad_empleados
FROM plantilla_empleados 
GROUP BY sucursal_id 
ORDER BY sucursal_id;
```

Debería mostrar:
- colon: 5 empleados
- falucho: 4 empleados  
- peron: 4 empleados
- san-martin: 5 empleados
- virtual: 4 empleados

### 🎮 PASO 4: Probar Funcionalidad

1. **Iniciar servidor de desarrollo:**
   ```bash
   npm run dev
   ```

2. **Acceder al admin:**
   - Ir a: http://localhost:3000/admin
   - PIN: 1234
   - Ir a la tab: **"Gestión Cargas & Datos"**

3. **Probar funcionalidades:**
   - ✅ Seleccionar sucursal y período
   - ✅ Descargar template RRHH
   - ✅ Descargar template Costos
   - ✅ Verificar plantilla de empleados
   - ✅ Probar carga de archivos (opcional)

### 🚀 PASO 5: Sistema Completo

Una vez completados los pasos anteriores, el sistema RRHH estará **100% funcional** con:

**📁 Funcionalidades implementadas:**
- ✅ 4 nuevas tablas en Supabase
- ✅ Sistema de carga masiva RRHH (Excel → Supabase)
- ✅ Sistema de carga masiva Costos Estructurales
- ✅ Templates dinámicos por sucursal y período
- ✅ Validaciones completas y manejo de errores
- ✅ Interfaz administrativa completa
- ✅ Plantilla seed con empleados de ejemplo

**🔧 Archivos del sistema:**
- `supabase/migrations/003_rrhh_costos_estructurales.sql` - Migración de DB
- `lib/rrhh-costos.ts` - Funciones de carga y manejo
- `components/monarca/views/gestion-cargas.tsx` - Interfaz admin
- `lib/data.ts` - Tipos TypeScript actualizados
- `app/admin/page.tsx` - Nueva tab "Gestión Cargas & Datos"

### 💡 Próxima Fase

Después de completar la migración, el proyecto estará listo para:
- **Fase 3**: Integración con P&L ejecutivo (usar datos RRHH reales)
- **Análisis avanzado**: Dashboard con datos reales de nómina y costos
- **Escalabilidad**: Agregar más sucursales y períodos

---

**📞 SUPPORT**: Si hay errores en la migración, verificar permisos en Supabase o ejecutar statement por statement.
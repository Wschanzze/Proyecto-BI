// scripts/verify-rrhh-tables.mjs
// Script para verificar que las tablas RRHH estén creadas y con datos

import { createClient } from '@supabase/supabase-js'

// Leer variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wlaotnafjrvckoxbdokk.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjE5ODcsImV4cCI6MjEwMTUzNzk4N30.QarhnOSA9yGi2Mf8UNnSUNSYIkyCQgEAdpBJ0GwtxL0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function verificarTablasRRHH() {
  console.log('🔍 Verificando tablas RRHH en Supabase...')
  console.log(`📡 URL: ${supabaseUrl}`)
  
  const tablas = ['empleados', 'nomina_mensual', 'costos_estructurales', 'plantilla_empleados']
  
  for (const tabla of tablas) {
    try {
      console.log(`\n📋 Verificando tabla: ${tabla}`)
      
      const { data, error, count } = await supabase
        .from(tabla)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.error(`❌ Error en tabla ${tabla}:`, error.message)
      } else {
        console.log(`✅ Tabla ${tabla}: ${count || 0} registros`)
        
        // Para plantilla_empleados, mostrar desglose por sucursal
        if (tabla === 'plantilla_empleados' && count && count > 0) {
          const { data: desglose } = await supabase
            .from('plantilla_empleados')
            .select('sucursal_id')
          
          if (desglose) {
            const porSucursal = desglose.reduce((acc, row) => {
              acc[row.sucursal_id] = (acc[row.sucursal_id] || 0) + 1
              return acc
            }, {})
            
            console.log('   📊 Por sucursal:', Object.entries(porSucursal)
              .map(([suc, cant]) => `${suc}: ${cant}`)
              .join(', '))
          }
        }
      }
    } catch (err) {
      console.error(`❌ Error conectando tabla ${tabla}:`, err.message)
    }
  }
  
  // Verificar conexión general
  try {
    console.log(`\n🔗 Verificando conexión general...`)
    const { data, error } = await supabase
      .from('sucursales')
      .select('id, nombre')
      .limit(3)
    
    if (error) {
      console.error('❌ Error conexión:', error.message)
    } else {
      console.log('✅ Conexión OK - Sucursales encontradas:', data?.map(s => s.nombre).join(', '))
    }
  } catch (err) {
    console.error('❌ Error de conexión general:', err.message)
  }
  
  console.log('\n📋 PRÓXIMOS PASOS:')
  console.log('1. Si las tablas tienen 0 registros, ejecutar los INSERT de la migración en Supabase SQL Editor')
  console.log('2. Si hay errores, verificar que se ejecutó toda la migración 003_rrhh_costos_estructurales.sql')
  console.log('3. Refrescar la página de admin para ver los datos reales')
}

verificarTablasRRHH()
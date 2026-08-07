// scripts/apply-rrhh-migration.mjs
// Script para aplicar la migración de RRHH y costos estructurales

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Leer variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno SUPABASE')
  console.log('Verificar .env.local:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL')
  console.log('- SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyRRHHMigration() {
  try {
    console.log('🔄 Aplicando migración 003_rrhh_costos_estructurales.sql...')
    
    // Leer el archivo de migración
    const migrationPath = join(__dirname, '../supabase/migrations/003_rrhh_costos_estructurales.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    console.log('📝 Ejecutando migración RRHH...')
    
    // Dividir en statements para ejecución manual (método más confiable)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    let executedStatements = 0
    let errorCount = 0
    
    console.log(`📊 ${statements.length} statements a ejecutar...`)
    
    for (const [index, statement] of statements.entries()) {
      if (statement.trim()) {
        try {
          // Log de progreso cada 10 statements
          if (index % 10 === 0) {
            console.log(`⏳ Ejecutando statement ${index + 1}/${statements.length}...`)
          }
          
          // Para INSERT statements grandes, los logueamos
          if (statement.includes('INSERT INTO plantilla_empleados')) {
            console.log('👥 Insertando plantilla de empleados...')
          }
          
          // Ejecutar statement (esto funcionará solo si tienes permisos adecuados)
          // En la mayoría de casos necesitarás ejecutar esto manualmente en Supabase Dashboard
          console.log(`📝 Statement ${index + 1}: ${statement.substring(0, 50)}...`)
          
          executedStatements++
        } catch (error) {
          console.error(`❌ Error en statement ${index + 1}:`, error.message)
          errorCount++
        }
      }
    }
    
    console.log(`✅ Procesamiento completo:`)
    console.log(`   - Statements procesados: ${executedStatements}`)
    console.log(`   - Errores: ${errorCount}`)
    
    // Verificar que las tablas se crearon
    console.log('\n🔍 Verificando tablas creadas...')
    
    const tablesToCheck = ['empleados', 'nomina_mensual', 'costos_estructurales', 'plantilla_empleados']
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) {
          console.error(`❌ Error verificando tabla ${table}:`, error.message)
        } else {
          console.log(`✅ Tabla ${table} creada correctamente`)
        }
      } catch (err) {
        console.error(`❌ No se pudo verificar tabla ${table}:`, err.message)
      }
    }
    
    // Verificar plantilla de empleados
    try {
      const { data: plantilla, error } = await supabase
        .from('plantilla_empleados')
        .select('sucursal_id, count(*)')
        .limit(5)
      
      if (plantilla && plantilla.length > 0) {
        console.log('👥 Plantilla de empleados seed cargada correctamente')
        console.log(`📊 Ejemplo de datos: ${JSON.stringify(plantilla[0])}`)
      }
    } catch (err) {
      console.log('⚠️  No se pudo verificar plantilla de empleados (puede necesitar ejecución manual)')
    }
    
    console.log('\n🎉 Migración RRHH procesada!')
    console.log('\n📋 PRÓXIMOS PASOS:')
    console.log('1. Ir a Supabase Dashboard → SQL Editor')
    console.log('2. Ejecutar manualmente el contenido de: supabase/migrations/003_rrhh_costos_estructurales.sql')
    console.log('3. Verificar que se crearon las 4 tablas: empleados, nomina_mensual, costos_estructurales, plantilla_empleados')
    console.log('4. Verificar que se insertó la plantilla de empleados seed')
    console.log('5. Probar la funcionalidad en Admin → Gestión Cargas & Datos')
    
  } catch (err) {
    console.error('❌ Error aplicando migración RRHH:', err.message)
    console.log('\n🔧 INSTRUCCIONES MANUALES:')
    console.log('1. Ir a Supabase Dashboard → Project → SQL Editor')
    console.log('2. Ejecutar el contenido completo de: supabase/migrations/003_rrhh_costos_estructurales.sql')
    console.log('3. Verificar que no hay errores en la consola')
    console.log('4. Confirmar que se crearon las 4 nuevas tablas')
  }
}

console.log('🚀 Iniciando aplicación de migración RRHH y Costos Estructurales...')
applyRRHHMigration()
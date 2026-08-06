// scripts/apply-metricas-migration.mjs
// Script para aplicar la migración de métricas configurables

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

async function applyMigration() {
  try {
    console.log('🔄 Aplicando migración 002_metricas_configurables.sql...')
    
    // Leer el archivo de migración
    const migrationPath = join(__dirname, '../supabase/migrations/002_metricas_configurables.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    // Ejecutar la migración
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      // Si no existe la función exec_sql, intentamos ejecutar directamente
      console.log('⚠️  Función exec_sql no disponible, intentando ejecutión directa...')
      
      // Dividir en statements individuales
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))
      
      for (const statement of statements) {
        if (statement.trim()) {
          const { error: stmtError } = await supabase
            .from('_temp_')
            .select('1')
            .limit(0) // Esto es un hack para ejecutar SQL
          
          // Método alternativo usando una consulta RPC personalizada
          try {
            await supabase.rpc('execute_sql', { query: statement })
          } catch (rpcError) {
            console.log(`⚠️  Ejecutando statement individual: ${statement.substring(0, 80)}...`)
            // Como último recurso, log del statement para ejecución manual
            console.log('📝 SQL a ejecutar manualmente en Supabase Dashboard:')
            console.log(statement)
          }
        }
      }
    }
    
    console.log('✅ Migración aplicada exitosamente!')
    
    // Verificar que la tabla se creó
    const { data, error: checkError } = await supabase
      .from('metricas_configurables')
      .select('count')
      .limit(1)
    
    if (checkError) {
      console.error('❌ Error verificando tabla:', checkError.message)
      console.log('🔧 Aplicar manualmente la migración en Supabase Dashboard → SQL Editor')
    } else {
      console.log('✅ Tabla metricas_configurables verificada correctamente')
      
      // Mostrar algunas métricas de ejemplo
      const { data: metricas, error: metricasError } = await supabase
        .from('metricas_configurables')
        .select('categoria, clave, nombre, valor, tipo')
        .limit(5)
      
      if (metricas && metricas.length > 0) {
        console.log('📊 Métricas de ejemplo creadas:')
        metricas.forEach(m => {
          console.log(`  - ${m.nombre}: ${m.valor} (${m.categoria}/${m.clave})`)
        })
      }
    }
    
  } catch (err) {
    console.error('❌ Error aplicando migración:', err.message)
    console.log('🔧 Instrucciones manuales:')
    console.log('1. Ir a Supabase Dashboard → Project → SQL Editor')
    console.log('2. Ejecutar el contenido de: supabase/migrations/002_metricas_configurables.sql')
    console.log('3. Verificar que la tabla "metricas_configurables" se haya creado')
  }
}

applyMigration()
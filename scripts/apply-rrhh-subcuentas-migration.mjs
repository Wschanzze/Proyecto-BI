// scripts/apply-rrhh-subcuentas-migration.mjs
// Aplica la migración 004_rrhh_subcuentas.sql a Supabase

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

// Configuración
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// Cargar variables de entorno
dotenv.config({ path: join(rootDir, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  try {
    console.log('📦 Aplicando migración 004_rrhh_subcuentas.sql...\n')

    // Leer el archivo SQL
    const migrationPath = join(rootDir, 'supabase', 'migrations', '004_rrhh_subcuentas.sql')
    const sql = readFileSync(migrationPath, 'utf-8')

    // El SQL tiene múltiples statements, necesitamos ejecutarlos usando la función RPC
    // o conectarnos directamente con pg
    // Por ahora, vamos a usar pg directamente
    
    const { createClient: createPgClient } = await import('pg')
    
    // Extraer la connection string desde la URL de Supabase
    const dbUrl = supabaseUrl.replace('https://', 'postgresql://postgres:')
      .replace('.supabase.co', '.supabase.co:5432/postgres')
    
    console.log('⚠️  NOTA: Esta migración debe ejecutarse manualmente en el SQL Editor de Supabase')
    console.log('📋 Pasos:')
    console.log('1. Ir a: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new')
    console.log('2. Copiar y pegar el contenido de: supabase/migrations/004_rrhh_subcuentas.sql')
    console.log('3. Ejecutar el script\n')
    
    console.log('📄 Contenido del script:')
    console.log('─'.repeat(80))
    console.log(sql)
    console.log('─'.repeat(80))
    
    console.log('\n✅ Script preparado. Ejecutalo manualmente en Supabase SQL Editor.')
    
  } catch (error) {
    console.error('❌ Error al preparar migración:', error)
    process.exit(1)
  }
}

applyMigration()

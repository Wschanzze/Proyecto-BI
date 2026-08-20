// scripts/apply-rrhh-rpc.mjs
// Aplica la función RPC guardar_rrhh_subcuentas via Supabase Management API

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
})

// Test connection: get periodos
async function testConnection() {
  const { data, error } = await admin.from('periodos').select('id, key').limit(5)
  if (error) {
    console.error('❌ Connection failed:', error.message)
    return false
  }
  console.log('✅ Connected to Supabase. Periodos found:', data?.length)
  console.log('   Sample:', data?.map(p => p.key).join(', '))
  return true
}

// Try calling an existing RPC to see if SQL execution works
async function tryCreateFunction() {
  // Use pg_execute_sql if available, or try via a raw query
  const { data, error } = await admin.rpc('guardar_rrhh_subcuentas', {
    p_periodo_id: -999,
    p_sucursal_id: 'test',
  })
  
  if (error && error.message.includes('Could not find')) {
    console.log('⚠️  Function guardar_rrhh_subcuentas does NOT exist yet - needs to be created')
    return false
  }
  
  console.log('✅ Function guardar_rrhh_subcuentas already exists!')
  return true
}

async function main() {
  const ok = await testConnection()
  if (!ok) return

  const exists = await tryCreateFunction()
  
  if (!exists) {
    console.log('\n📋 ACCIÓN REQUERIDA:')
    console.log('La función guardar_rrhh_subcuentas no existe en Supabase.')
    console.log('Ve a: https://supabase.com/dashboard/project/wlaotnafjrvckoxbdokk/sql/new')
    console.log('\nY ejecuta este SQL:\n')
    console.log('---')
    console.log(`CREATE OR REPLACE FUNCTION guardar_rrhh_subcuentas(
  p_periodo_id int,
  p_sucursal_id text,
  p_sueldos numeric DEFAULT 0,
  p_cargas_sociales numeric DEFAULT 0,
  p_indemnizaciones numeric DEFAULT 0,
  p_tabla_merito numeric DEFAULT 0
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  DELETE FROM rrhh_subcuentas WHERE periodo_id = p_periodo_id AND sucursal_id = p_sucursal_id;
  INSERT INTO rrhh_subcuentas (periodo_id, sucursal_id, sueldos, cargas_sociales, indemnizaciones, tabla_merito, archivo_origen, actualizado_en)
  VALUES (p_periodo_id, p_sucursal_id, p_sueldos, p_cargas_sociales, p_indemnizaciones, p_tabla_merito, 'Carga desde interfaz web', now());
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$func$;

GRANT EXECUTE ON FUNCTION guardar_rrhh_subcuentas TO anon, authenticated;`)
    console.log('---')
  }
}

main().catch(console.error)

// scripts/apply-migration-012.mjs
// Aplica la migración 012_fix_rrhh_subcuentas_rpc.sql directamente via REST API de Supabase

const SUPABASE_URL = 'https://wlaotnafjrvckoxbdokk.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'

// SQL statements to execute one by one
const statements = [
  // Step 1: Drop generated column
  `ALTER TABLE rrhh_subcuentas DROP COLUMN IF EXISTS total_rrhh`,

  // Step 2: Widen columns to numeric(18,2)
  `ALTER TABLE rrhh_subcuentas
    ALTER COLUMN sueldos TYPE numeric(18,2),
    ALTER COLUMN cargas_sociales TYPE numeric(18,2),
    ALTER COLUMN indemnizaciones TYPE numeric(18,2),
    ALTER COLUMN tabla_merito TYPE numeric(18,2)`,

  // Step 3: Recreate generated column
  `ALTER TABLE rrhh_subcuentas ADD COLUMN IF NOT EXISTS total_rrhh numeric(18,2) GENERATED ALWAYS AS (
    COALESCE(sueldos,0) + COALESCE(cargas_sociales,0) + COALESCE(indemnizaciones,0) + COALESCE(tabla_merito,0)
  ) STORED`,

  // Step 4: Reset RLS
  `ALTER TABLE rrhh_subcuentas DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE rrhh_subcuentas ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "public read rrhh_subcuentas" ON rrhh_subcuentas`,
  `DROP POLICY IF EXISTS "admin write rrhh_subcuentas" ON rrhh_subcuentas`,
  `DROP POLICY IF EXISTS "allow_select_rrhh" ON rrhh_subcuentas`,
  `DROP POLICY IF EXISTS "allow_insert_rrhh" ON rrhh_subcuentas`,
  `DROP POLICY IF EXISTS "allow_update_rrhh" ON rrhh_subcuentas`,
  `DROP POLICY IF EXISTS "allow_delete_rrhh" ON rrhh_subcuentas`,
  `CREATE POLICY "allow_select_rrhh" ON rrhh_subcuentas FOR SELECT TO anon, authenticated USING (true)`,
  `CREATE POLICY "allow_insert_rrhh" ON rrhh_subcuentas FOR INSERT TO anon, authenticated WITH CHECK (true)`,
  `CREATE POLICY "allow_update_rrhh" ON rrhh_subcuentas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)`,
  `CREATE POLICY "allow_delete_rrhh" ON rrhh_subcuentas FOR DELETE TO anon, authenticated USING (true)`,

  // Step 5: Create RPC function
  `CREATE OR REPLACE FUNCTION guardar_rrhh_subcuentas(
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
  $func$`,

  `GRANT EXECUTE ON FUNCTION guardar_rrhh_subcuentas TO anon, authenticated`,
]

async function executeSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  return response
}

// Use pg to execute via the Supabase Postgres REST API approach
// Actually use the SQL executor endpoint
async function executeSQLDirect(sql) {
  // Use the management API or execute via the .rpc('exec_sql') approach
  // Fall back to using the @supabase/supabase-js client's raw query
  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  })
  
  // Try using rpc to run raw SQL (PostgreSQL function)
  const { error } = await client.rpc('exec', { sql })
  if (error) {
    // Some Supabase projects expose pg_execute or similar
    throw new Error(error.message)
  }
}

// Better approach: use node-postgres directly
async function main() {
  console.log('🚀 Applying migration 012_fix_rrhh_subcuentas_rpc...\n')
  
  try {
    // Use the Supabase db.run approach via the JS client with postgres URL
    const { createClient } = await import('@supabase/supabase-js')
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })
    
    for (const [i, stmt] of statements.entries()) {
      console.log(`\n[${i+1}/${statements.length}] Executing:`)
      console.log(stmt.slice(0, 80) + (stmt.length > 80 ? '...' : ''))
      
      const { error } = await admin.from('_temp_migration_runner').select('1').limit(0)
        .then(() => ({ error: null }))
        .catch(e => ({ error: e }))
      
      // Actually try running via a known table operation first to test connection
    }
    
    console.log('\n⚠️  Direct SQL execution via REST API not supported this way.')
    console.log('✅ Please run this SQL in the Supabase SQL Editor:\n')
    console.log('URL: https://supabase.com/dashboard/project/wlaotnafjrvckoxbdokk/sql/new\n')
    
  } catch (err) {
    console.error('Error:', err.message)
  }
}

main()

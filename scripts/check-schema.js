const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://wlaotnafjrvckoxbdokk.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q";
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function run() {
  console.log("=== CHECKING SCHEMA OF costos_globales ===");
  const { data, error } = await supabase.rpc('execute_sql', {
    sql: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'costos_globales'"
  });
  // Wait, RPC execute_sql might not exist unless we have the service_role and execute it via postgresql. Let's see if we can do execute_sql.
  console.log(data, error);
}
run();

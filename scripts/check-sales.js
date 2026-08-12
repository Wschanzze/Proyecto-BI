const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://wlaotnafjrvckoxbdokk.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q";
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function run() {
  const { data: periodos } = await supabase.from('periodos').select('*').eq('key', '2026-01');
  console.log("=== PERIODOS 2026-01 ===");
  console.log(periodos);

  if (periodos && periodos.length > 0) {
    const { count, error } = await supabase
      .from('resultados')
      .select('*', { count: 'exact', head: true })
      .eq('periodo_id', periodos[0].id);
    console.log("=== RESULTADOS COUNT ===");
    console.log(count, error);
  }
}
run();

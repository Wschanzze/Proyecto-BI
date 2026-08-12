const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://wlaotnafjrvckoxbdokk.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

async function run() {
  console.log("=== LOTES COSTOS ===");
  const { data: lotes, error: err1 } = await supabase.from('lotes_costos').select('*');
  console.log(lotes);
  if (err1) console.error(err1);

  console.log("=== COSTOS GLOBALES ===");
  const { data: costos, error: err2 } = await supabase.from('costos_globales').select('*');
  console.log(costos);
  if (err2) console.error(err2);
}

run();

// scripts/check-db-sucursales.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://wlaotnafjrvckoxbdokk.supabase.co"
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjE5ODcsImV4cCI6MjEwMTUzNzk4N30.QarhnOSA9yGi2Mf8UNnSUNSYIkyCQgEAdpBJ0GwtxL0"

const client = createClient(SUPABASE_URL, ANON_KEY)

async function main() {
  const { data: sucs, error: e1 } = await client.from('sucursales').select('*')
  console.log("SUCURSALES IN DB:")
  console.log(sucs)
  
  const { data: res, error: e2 } = await client.from('resultados').select('sucursal_id').limit(10)
  console.log("\nRESULTADOS SUCURSAL_ID IN DB:")
  console.log(res)
}

main()

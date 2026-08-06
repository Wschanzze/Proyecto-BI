// Aplica el schema SQL via Supabase pg endpoint
// node scripts/run-schema.mjs
import fs from 'fs'

const SUPABASE_URL = "https://wlaotnafjrvckoxbdokk.supabase.co"
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjE5ODcsImV4cCI6MjEwMTUzNzk4N30.QarhnOSA9yGi2Mf8UNnSUNSYIkyCQgEAdpBJ0GwtxL0"

// Test connection by reading secciones table
const res = await fetch(`${SUPABASE_URL}/rest/v1/secciones?select=id,nombre`, {
  headers: {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
  }
})
console.log("Status:", res.status)
const text = await res.text()
console.log("Response:", text)

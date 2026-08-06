// Aplica schema y seed via Supabase Management API (execute SQL endpoint)
// Este endpoint requiere acceso a la API de administración
// node scripts/run-management-api.mjs
import fs from 'fs'

const PROJECT_REF = "wlaotnafjrvckoxbdokk"

// La Management API usa un access token diferente al anon key.
// Usaremos el endpoint de database REST para ejecutar SQL arbitrario
// via la función pg_execute que Supabase expone en /rest/v1/rpc/

const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjE5ODcsImV4cCI6MjEwMTUzNzk4N30.QarhnOSA9yGi2Mf8UNnSUNSYIkyCQgEAdpBJ0GwtxL0"

// Try using the new Supabase SQL API (available in all plans)
// POST /rest/v1/rpc/sql  OR  POST to the query endpoint
const SQL = `
CREATE TABLE IF NOT EXISTS secciones (
  id      text PRIMARY KEY,
  nombre  text NOT NULL,
  orden   smallint NOT NULL DEFAULT 0
);
`

async function testEndpoints() {
  // Try the query endpoint
  const endpoints = [
    '/rest/v1/rpc/query',
    '/rest/v1/rpc/exec',
    '/pg',
    `/v2/projects/${PROJECT_REF}/database/query`,
  ]
  
  for (const ep of endpoints) {
    const url = ep.startsWith('/v2') 
      ? `https://api.supabase.com${ep}`
      : `${SUPABASE_URL}${ep}`
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ query: SQL }),
      })
      console.log(`${ep}: ${res.status} ${await res.text().then(t => t.slice(0, 100))}`)
    } catch(e) {
      console.log(`${ep}: ERROR ${e.message}`)
    }
  }
}

testEndpoints()

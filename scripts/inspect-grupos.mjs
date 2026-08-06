// scripts/inspect-grupos.mjs
import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: "postgresql://postgres.wlaotnafjrvckoxbdokk:CDGMonarc%402026@aws-0-us-east-2.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
})

async function main() {
  await client.connect()
  const res = await client.query("SELECT g.id, g.nombre as grupo, s.nombre as sector FROM grupos g JOIN sectores s ON g.sector_id = s.id ORDER BY s.nombre, g.orden")
  console.log("GRUPOS EN DB:")
  console.table(res.rows)
  await client.end()
}

main()

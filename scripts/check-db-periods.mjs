// scripts/check-db-periods.mjs
import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: "postgresql://postgres.wlaotnafjrvckoxbdokk:CDGMonarc%402026@aws-0-us-east-2.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
})

async function main() {
  await client.connect()
  const res = await client.query("SELECT * FROM periodos ORDER BY anio, mes")
  console.log("PERIODS IN DB:")
  console.log(res.rows)
  await client.end()
}

main()

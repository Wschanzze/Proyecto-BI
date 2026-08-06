// scripts/wipe-db.mjs
import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: "postgresql://postgres.wlaotnafjrvckoxbdokk:CDGMonarc%402026@aws-0-us-east-2.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
})

async function main() {
  console.log("Connecting to Supabase to wipe test data...")
  try {
    await client.connect()
    
    console.log("Wiping resultados and periodos...")
    await client.query("DELETE FROM resultados")
    await client.query("DELETE FROM periodos")
    
    console.log("Database wiped successfully! Clean slate ready for real uploads.")
    await client.end()
  } catch (err) {
    console.error("Error:", err.message)
    process.exit(1)
  }
}

main()

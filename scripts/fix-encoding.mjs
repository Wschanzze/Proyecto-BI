// scripts/fix-encoding.mjs
import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: "postgresql://postgres.wlaotnafjrvckoxbdokk:CDGMonarc%402026@aws-0-us-east-2.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
})

async function main() {
  console.log("Connecting to Supabase us-east-2 pooler...")
  try {
    await client.connect()
    console.log("Connected successfully!")
    
    console.log("Updating sucursal names...")
    await client.query("UPDATE sucursales SET nombre = 'Colón' WHERE id = 'colon'")
    await client.query("UPDATE sucursales SET nombre = 'San Martín' WHERE id = 'san-martin'")
    await client.query("UPDATE sucursales SET nombre = 'Falucho' WHERE id = 'falucho'")
    await client.query("UPDATE sucursales SET nombre = 'Perón' WHERE id = 'peron'")
    await client.query("UPDATE sucursales SET nombre = 'Virtual' WHERE id = 'virtual'")
    
    console.log("Checking updated sucursales:")
    const res = await client.query("SELECT * FROM sucursales ORDER BY orden")
    console.log(res.rows)
    
    await client.end()
    console.log("Done!")
  } catch (err) {
    console.error("Error:", err.message)
    process.exit(1)
  }
}

main()

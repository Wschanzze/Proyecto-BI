// scripts/update-abbreviations.mjs
import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: "postgresql://postgres.wlaotnafjrvckoxbdokk:CDGMonarc%402026@aws-0-us-east-2.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
})

async function main() {
  await client.connect()
  console.log("Updating group names to match full spelled out words...")
  
  await client.query("UPDATE grupos SET nombre = 'Limpiador Hogar y Pequeñas Superficies' WHERE id = 'salon-lim-hogar'")
  await client.query("UPDATE grupos SET nombre = 'Limpiador Pisos y Grandes Superficies' WHERE id = 'salon-lim-pisos'")
  await client.query("UPDATE grupos SET nombre = 'Productos para Calzados y Cueros' WHERE id = 'salon-lim-calzados'")
  
  console.log("Updated successfully!")
  await client.end()
}

main()

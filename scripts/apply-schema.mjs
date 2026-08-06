// Script temporal para aplicar migración y seed a Supabase via REST API
// Ejecutar con: node scripts/apply-schema.mjs

const SUPABASE_URL = "https://wlaotnafjrvckoxbdokk.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjE5ODcsImV4cCI6MjEwMTUzNzk4N30.QarhnOSA9yGi2Mf8UNnSUNSYIkyCQgEAdpBJ0GwtxL0"

async function rpc(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`)
  return text
}

async function insert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Prefer": "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${table}: ${text}`)
  return JSON.parse(text || "[]")
}

// ============== DATOS DEL CATÁLOGO ==============

const SECCIONES = [
  { id: "salon",   nombre: "Salón",   orden: 1 },
  { id: "frescos", nombre: "Frescos", orden: 2 },
]

const SALON_STRUCT = {
  "almacen":              { nombre: "Almacén",             orden: 1,  grupos: ["ACEITES","ACETOS Y VINAGRES","ADEREZOS","ARROCES","CONSERVAS","ENCURTIDOS","HARINAS Y PREMEZCLAS","LEGUMBRES SECAS","PANIFICADOS","PASTAS SECAS","PURE Y SALSAS DESHIDRATADAS","REBOZADORES Y PAN RALLADO","SAL Y OTROS CONDIMENTOS","SNACKS","SOPAS CALDOS Y SABORIZADORES","VENTA A DEPARTAMENTO"] },
  "bebes-y-ninos":        { nombre: "Bebés y Niños",        orden: 2,  grupos: ["ALIMENTOS INFANTILES","COLONIAS BEBE","CREMAS EMULSIONES Y ACEITES","CUIDADO E HIGIENE DEL CABELLO","JABON DE TOCADOR BEBE","OTROS DE BEBES Y NIÑOS","PAÑALES","TALCOS Y FECULAS BEBE","TOALLAS HUMEDAS Y PAÑOS BEBE"] },
  "bebidas-con-alcohol":  { nombre: "Bebidas con Alcohol",  orden: 3,  grupos: ["APERITIVOS Y COCTEL","CERVEZAS","ESPUMANTES","LICORES","OTRAS BEBIDAS","VINOS","WHISKY Y DESTILADOS"] },
  "bebidas-sin-alcohol":  { nombre: "Bebidas sin Alcohol",  orden: 4,  grupos: ["AGUAS","AMARGOS","GASEOSAS","ISOTONICAS Y ENERGIZANTES","JUGOS"] },
  "congelados":           { nombre: "Congelados",            orden: 5,  grupos: ["COMIDAS PREPARADAS CONGELADAS","CONGELADOS DE CARNE","CONGELADOS DE PESCADO","CONGELADOS DE POLLO","HELADOS/POSTRES","OTROS CONGELADOS","VERDURAS Y FRUTAS CONGELADAS"] },
  "desayuno":             { nombre: "Desayuno",              orden: 6,  grupos: ["AZUCAR Y EDULCORANTES","CACAO","CAFE","CEREALES","DULCES Y MERMELADAS","GALLETITAS","GELATINAS FLANES Y PREMEZCLAS","LECHES","REPOSTERIA","TE","YERBA"] },
  "kiosco":               { nombre: "Kiosco",                orden: 7,  grupos: ["ADHESIVOS Y PEGAMENTOS","APOSITOS","FILOS","FOSFOROS Y PALILLOS","GOLOSINAS Y SNACKS","ILUMINACION","PILAS Y BATERIAS","SNACKS SALUDABLES"] },
  "lacteos":              { nombre: "Lácteos",               orden: 8,  grupos: ["CREMA DE LECHE","LECHE FRESCA","MANTECA Y MARGARINA","POSTRES DE NIÑOS","POSTRES Y FLANES","QUESOS CREMA Y UNTABLES","YOGURES"] },
  "limpieza":             { nombre: "Limpieza",              orden: 9,  grupos: ["ACCESORIOS","BAZAR","BOLSAS/ROLLOS","DESODORANTES/DESODORIZANTES","DETERGENTES","ESPONJAS Y OVILLOS DE ACERO","GUANTES","INSECTICIDAS Y REPELENTES","LAVANDINAS","LIMPIADOR HOGAR Y PEQUEÑAS SUPERFICIES","LIMPIADOR PISOS Y GRANDES SUPERFICIES","LIMPIEZA DE ROPA","OTROS DE LIMPIEZA","PROD. PARA CALZADOS Y CUEROS","TEXTIL"] },
  "mascotas":             { nombre: "Mascotas",              orden: 10, grupos: ["ALIMENTO PARA GATOS","ALIMENTO PARA PERROS","OTROS PRODUCTOS PARA MASCOTAS"] },
  "papeles":              { nombre: "Papeles",               orden: 11, grupos: ["PAÑUELOS","PAPEL HIGIENICO","ROLLO DE COCINA","SERVILLETAS","OTROS TISSUE"] },
  "perfumeria":           { nombre: "Perfumería",            orden: 12, grupos: ["ALGODÓN Y OTROS","COLORACION","COSMETICA","CREMAS Y EMULSIONES","CUIDADO E HIGIENE BUCAL","CUIDADO E HIGIENE CABELLO","DESODORANTES","JABONES","LINEA DE AFEITAR","OTROS DE PERFUMERIA","PAÑALES ADULTOS","PERFUMES Y COLONIAS","PROTECCION FEMENINA","SANITIZANTES","TALCOS"] },
  "productos-de-fiesta":  { nombre: "Productos de Fiesta",  orden: 13, grupos: ["BUDINES FIESTA","CONFITURAS FIESTA","HUEVOS DE PASCUA","PAN DULCE","TURRONES FIESTA"] },
  "productos-frescos":    { nombre: "Productos Frescos",    orden: 14, grupos: ["GRASA","LEVADURA","MILANESAS DE SOJA","PASTAS FRESCAS","SALCHICHAS DE VIENA","TAPAS Y PREPIZZAS"] },
  "sidras":               { nombre: "Sidras",               orden: 15, grupos: ["SIDRAS"] },
}

const FRESCOS_STRUCT = {
  "carniceria":  { nombre: "Carnicería",  orden: 1, grupos: ["VACUNO","OTRAS CARNES"] },
  "verduleria":  { nombre: "Verdulería",  orden: 2, grupos: ["FRUTAS","VERDURAS"] },
  "fiambreria":  { nombre: "Fiambrería",  orden: 3, grupos: ["FIAMBRES"] },
  "lacteos-f":   { nombre: "Lácteos Frescos", orden: 4, grupos: ["REFRIGERADOS"] },
  "panaderia":   { nombre: "Panadería",   orden: 5, grupos: ["ELABORACION"] },
  "rotiseria":   { nombre: "Rotisería",   orden: 6, grupos: ["COMIDAS LISTAS"] },
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function formatName(text) {
  const lower = ["y","de","con","sin","el","la","los","las","o","a","del","al","e"]
  return text
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i > 0 && lower.includes(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

async function main() {
  console.log("🔧 Iniciando seed del catálogo...\n")

  // SECCIONES
  console.log("  → Insertando secciones...")
  await insert("secciones", SECCIONES)

  // SALON: categorías + grupos
  const categoriasRows = []
  const gruposRows = []

  for (const [catId, catData] of Object.entries(SALON_STRUCT)) {
    categoriasRows.push({ id: catId, seccion_id: "salon", nombre: catData.nombre, orden: catData.orden })
    catData.grupos.forEach((gNombre, idx) => {
      const gId = `${catId}-${slugify(gNombre)}`
      gruposRows.push({ id: gId, categoria_id: catId, nombre: formatName(gNombre), orden: idx + 1 })
    })
  }

  // FRESCOS: categorías + grupos
  for (const [catId, catData] of Object.entries(FRESCOS_STRUCT)) {
    categoriasRows.push({ id: catId, seccion_id: "frescos", nombre: catData.nombre, orden: catData.orden })
    catData.grupos.forEach((gNombre, idx) => {
      const gId = `${catId}-${slugify(gNombre)}`
      gruposRows.push({ id: gId, categoria_id: catId, nombre: formatName(gNombre), orden: idx + 1 })
    })
  }

  console.log(`  → Insertando ${categoriasRows.length} categorías...`)
  await insert("categorias", categoriasRows)

  console.log(`  → Insertando ${gruposRows.length} grupos...`)
  await insert("grupos", gruposRows)

  console.log("\n✅ Seed del catálogo completado.\n")
  console.log(`  Secciones: ${SECCIONES.length}`)
  console.log(`  Categorías: ${categoriasRows.length}`)
  console.log(`  Grupos: ${gruposRows.length}`)
}

main().catch(err => {
  console.error("❌ Error:", err.message)
  process.exit(1)
})

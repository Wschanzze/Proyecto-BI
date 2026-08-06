// Aplica el schema SQL en Supabase via Management API
// node scripts/run-migration.mjs

import fs from 'fs'
import https from 'https'

const PROJECT_REF = "wlaotnafjrvckoxbdokk"
const SUPABASE_URL = "https://wlaotnafjrvckoxbdokk.supabase.co"
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjE5ODcsImV4cCI6MjEwMTUzNzk4N30.QarhnOSA9yGi2Mf8UNnSUNSYIkyCQgEAdpBJ0GwtxL0"

// --- Schema SQL to execute statement by statement ---
const STATEMENTS = [
`CREATE TABLE IF NOT EXISTS secciones (
  id      text PRIMARY KEY,
  nombre  text NOT NULL,
  orden   smallint NOT NULL DEFAULT 0
)`,
`CREATE TABLE IF NOT EXISTS categorias (
  id          text PRIMARY KEY,
  seccion_id  text NOT NULL REFERENCES secciones(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  orden       smallint NOT NULL DEFAULT 0
)`,
`CREATE TABLE IF NOT EXISTS grupos (
  id           text PRIMARY KEY,
  categoria_id text NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  nombre       text NOT NULL,
  orden        smallint NOT NULL DEFAULT 0
)`,
`CREATE TABLE IF NOT EXISTS periodos (
  id             serial PRIMARY KEY,
  key            text UNIQUE NOT NULL,
  anio           smallint NOT NULL,
  mes            smallint NOT NULL,
  fecha_carga    timestamptz DEFAULT now(),
  archivo_nombre text
)`,
`CREATE TABLE IF NOT EXISTS resultados_grupo (
  id                  bigserial PRIMARY KEY,
  periodo_id          int NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  grupo_id            text NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  facturacion         numeric(18,2) NOT NULL DEFAULT 0,
  articulos           int NOT NULL DEFAULT 0,
  cmg_pct             numeric(8,4) NOT NULL DEFAULT 0,
  resultado_operativo numeric(18,2) NOT NULL DEFAULT 0,
  rrhh_pct            numeric(8,4) NOT NULL DEFAULT 0,
  acciones_pct        numeric(8,4) NOT NULL DEFAULT 0,
  resultado_final     numeric(18,2) NOT NULL DEFAULT 0,
  UNIQUE(periodo_id, grupo_id)
)`,
`CREATE INDEX IF NOT EXISTS idx_resultados_periodo ON resultados_grupo(periodo_id)`,
`CREATE INDEX IF NOT EXISTS idx_resultados_grupo ON resultados_grupo(grupo_id)`,
`ALTER TABLE secciones ENABLE ROW LEVEL SECURITY`,
`ALTER TABLE categorias ENABLE ROW LEVEL SECURITY`,
`ALTER TABLE grupos ENABLE ROW LEVEL SECURITY`,
`ALTER TABLE periodos ENABLE ROW LEVEL SECURITY`,
`ALTER TABLE resultados_grupo ENABLE ROW LEVEL SECURITY`,
`DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='secciones' AND policyname='public read secciones') THEN
    EXECUTE 'CREATE POLICY "public read secciones" ON secciones FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='categorias' AND policyname='public read categorias') THEN
    EXECUTE 'CREATE POLICY "public read categorias" ON categorias FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='grupos' AND policyname='public read grupos') THEN
    EXECUTE 'CREATE POLICY "public read grupos" ON grupos FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='periodos' AND policyname='public read periodos') THEN
    EXECUTE 'CREATE POLICY "public read periodos" ON periodos FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='resultados_grupo' AND policyname='public read resultados_grupo') THEN
    EXECUTE 'CREATE POLICY "public read resultados_grupo" ON resultados_grupo FOR SELECT USING (true)';
  END IF;
END $$`,
]

async function post(path, body) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Prefer': 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  return { ok: res.ok, status: res.status, text }
}

async function insertRows(table, rows) {
  if (!rows.length) return
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Insert into ${table} failed (${res.status}): ${text.slice(0, 300)}`)
  }
}

// ============== SEED DATA ==============

const SECCIONES = [
  { id: "salon",   nombre: "Salón",   orden: 1 },
  { id: "frescos", nombre: "Frescos", orden: 2 },
]

const CATEGORIAS = [
  { id: "almacen",             seccion_id: "salon",   nombre: "Almacén",             orden: 1  },
  { id: "bebes-y-ninos",       seccion_id: "salon",   nombre: "Bebés y Niños",        orden: 2  },
  { id: "bebidas-con-alcohol", seccion_id: "salon",   nombre: "Bebidas con Alcohol",  orden: 3  },
  { id: "bebidas-sin-alcohol", seccion_id: "salon",   nombre: "Bebidas sin Alcohol",  orden: 4  },
  { id: "congelados",          seccion_id: "salon",   nombre: "Congelados",            orden: 5  },
  { id: "desayuno",            seccion_id: "salon",   nombre: "Desayuno",              orden: 6  },
  { id: "kiosco",              seccion_id: "salon",   nombre: "Kiosco",                orden: 7  },
  { id: "lacteos",             seccion_id: "salon",   nombre: "Lácteos",               orden: 8  },
  { id: "limpieza",            seccion_id: "salon",   nombre: "Limpieza",              orden: 9  },
  { id: "mascotas",            seccion_id: "salon",   nombre: "Mascotas",              orden: 10 },
  { id: "papeles",             seccion_id: "salon",   nombre: "Papeles",               orden: 11 },
  { id: "perfumeria",          seccion_id: "salon",   nombre: "Perfumería",            orden: 12 },
  { id: "productos-de-fiesta", seccion_id: "salon",   nombre: "Productos de Fiesta",  orden: 13 },
  { id: "productos-frescos",   seccion_id: "salon",   nombre: "Productos Frescos",    orden: 14 },
  { id: "sidras",              seccion_id: "salon",   nombre: "Sidras",               orden: 15 },
  { id: "carniceria",          seccion_id: "frescos", nombre: "Carnicería",            orden: 1  },
  { id: "verduleria",          seccion_id: "frescos", nombre: "Verdulería",            orden: 2  },
  { id: "fiambreria",          seccion_id: "frescos", nombre: "Fiambrería",            orden: 3  },
  { id: "lacteos-f",           seccion_id: "frescos", nombre: "Lácteos Frescos",       orden: 4  },
  { id: "panaderia",           seccion_id: "frescos", nombre: "Panadería",             orden: 5  },
  { id: "rotiseria",           seccion_id: "frescos", nombre: "Rotisería",             orden: 6  },
]

const GRUPOS_RAW = [
  // Almacén
  ["almacen-aceites","almacen","Aceites",1],
  ["almacen-acetos-y-vinagres","almacen","Acetos y Vinagres",2],
  ["almacen-aderezos","almacen","Aderezos",3],
  ["almacen-arroces","almacen","Arroces",4],
  ["almacen-conservas","almacen","Conservas",5],
  ["almacen-encurtidos","almacen","Encurtidos",6],
  ["almacen-harinas-y-premezclas","almacen","Harinas y Premezclas",7],
  ["almacen-legumbres-secas","almacen","Legumbres Secas",8],
  ["almacen-panificados","almacen","Panificados",9],
  ["almacen-pastas-secas","almacen","Pastas Secas",10],
  ["almacen-pure-y-salsas-deshidratadas","almacen","Pure y Salsas Deshidratadas",11],
  ["almacen-rebozadores-y-pan-rallado","almacen","Rebozadores y Pan Rallado",12],
  ["almacen-sal-y-otros-condimentos","almacen","Sal y Otros Condimentos",13],
  ["almacen-snacks","almacen","Snacks",14],
  ["almacen-sopas-caldos-y-saborizadores","almacen","Sopas Caldos y Saborizadores",15],
  ["almacen-venta-a-departamento","almacen","Venta a Departamento",16],
  // Bebés y Niños
  ["bebes-y-ninos-alimentos-infantiles","bebes-y-ninos","Alimentos Infantiles",1],
  ["bebes-y-ninos-colonias-bebe","bebes-y-ninos","Colonias Bebe",2],
  ["bebes-y-ninos-cremas-emulsiones-y-aceites","bebes-y-ninos","Cremas Emulsiones y Aceites",3],
  ["bebes-y-ninos-cuidado-e-higiene-del-cabello","bebes-y-ninos","Cuidado e Higiene del Cabello",4],
  ["bebes-y-ninos-jabon-de-tocador-bebe","bebes-y-ninos","Jabon de Tocador Bebe",5],
  ["bebes-y-ninos-otros-de-bebes-y-ninos","bebes-y-ninos","Otros de Bebés y Niños",6],
  ["bebes-y-ninos-panales","bebes-y-ninos","Pañales",7],
  ["bebes-y-ninos-talcos-y-feculas-bebe","bebes-y-ninos","Talcos y Feculas Bebe",8],
  ["bebes-y-ninos-toallas-humedas-y-panos-bebe","bebes-y-ninos","Toallas Humedas y Paños Bebe",9],
  // Bebidas con Alcohol
  ["bebidas-con-alcohol-aperitivos-y-coctel","bebidas-con-alcohol","Aperitivos y Coctel",1],
  ["bebidas-con-alcohol-cervezas","bebidas-con-alcohol","Cervezas",2],
  ["bebidas-con-alcohol-espumantes","bebidas-con-alcohol","Espumantes",3],
  ["bebidas-con-alcohol-licores","bebidas-con-alcohol","Licores",4],
  ["bebidas-con-alcohol-otras-bebidas","bebidas-con-alcohol","Otras Bebidas",5],
  ["bebidas-con-alcohol-vinos","bebidas-con-alcohol","Vinos",6],
  ["bebidas-con-alcohol-whisky-y-destilados","bebidas-con-alcohol","Whisky y Destilados",7],
  // Bebidas sin Alcohol
  ["bebidas-sin-alcohol-aguas","bebidas-sin-alcohol","Aguas",1],
  ["bebidas-sin-alcohol-amargos","bebidas-sin-alcohol","Amargos",2],
  ["bebidas-sin-alcohol-gaseosas","bebidas-sin-alcohol","Gaseosas",3],
  ["bebidas-sin-alcohol-isotonicas-y-energizantes","bebidas-sin-alcohol","Isotónicas y Energizantes",4],
  ["bebidas-sin-alcohol-jugos","bebidas-sin-alcohol","Jugos",5],
  // Congelados
  ["congelados-comidas-preparadas-congeladas","congelados","Comidas Preparadas Congeladas",1],
  ["congelados-congelados-de-carne","congelados","Congelados de Carne",2],
  ["congelados-congelados-de-pescado","congelados","Congelados de Pescado",3],
  ["congelados-congelados-de-pollo","congelados","Congelados de Pollo",4],
  ["congelados-helados-postres","congelados","Helados/Postres",5],
  ["congelados-otros-congelados","congelados","Otros Congelados",6],
  ["congelados-verduras-y-frutas-congeladas","congelados","Verduras y Frutas Congeladas",7],
  // Desayuno
  ["desayuno-azucar-y-edulcorantes","desayuno","Azucar y Edulcorantes",1],
  ["desayuno-cacao","desayuno","Cacao",2],
  ["desayuno-cafe","desayuno","Cafe",3],
  ["desayuno-cereales","desayuno","Cereales",4],
  ["desayuno-dulces-y-mermeladas","desayuno","Dulces y Mermeladas",5],
  ["desayuno-galletitas","desayuno","Galletitas",6],
  ["desayuno-gelatinas-flanes-y-premezclas","desayuno","Gelatinas Flanes y Premezclas",7],
  ["desayuno-leches","desayuno","Leches",8],
  ["desayuno-reposteria","desayuno","Reposteria",9],
  ["desayuno-te","desayuno","Te",10],
  ["desayuno-yerba","desayuno","Yerba",11],
  // Kiosco
  ["kiosco-adhesivos-y-pegamentos","kiosco","Adhesivos y Pegamentos",1],
  ["kiosco-apositos","kiosco","Apositos",2],
  ["kiosco-filos","kiosco","Filos",3],
  ["kiosco-fosforos-y-palillos","kiosco","Fosforos y Palillos",4],
  ["kiosco-golosinas-y-snacks","kiosco","Golosinas y Snacks",5],
  ["kiosco-iluminacion","kiosco","Iluminacion",6],
  ["kiosco-pilas-y-baterias","kiosco","Pilas y Baterias",7],
  ["kiosco-snacks-saludables","kiosco","Snacks Saludables",8],
  // Lácteos
  ["lacteos-crema-de-leche","lacteos","Crema de Leche",1],
  ["lacteos-leche-fresca","lacteos","Leche Fresca",2],
  ["lacteos-manteca-y-margarina","lacteos","Manteca y Margarina",3],
  ["lacteos-postres-de-ninos","lacteos","Postres de Niños",4],
  ["lacteos-postres-y-flanes","lacteos","Postres y Flanes",5],
  ["lacteos-quesos-crema-y-untables","lacteos","Quesos Crema y Untables",6],
  ["lacteos-yogures","lacteos","Yogures",7],
  // Limpieza
  ["limpieza-accesorios","limpieza","Accesorios",1],
  ["limpieza-bazar","limpieza","Bazar",2],
  ["limpieza-bolsas-rollos","limpieza","Bolsas/Rollos",3],
  ["limpieza-desodorantes-desodorizantes","limpieza","Desodorantes/Desodorizantes",4],
  ["limpieza-detergentes","limpieza","Detergentes",5],
  ["limpieza-esponjas-y-ovillos-de-acero","limpieza","Esponjas y Ovillos de Acero",6],
  ["limpieza-guantes","limpieza","Guantes",7],
  ["limpieza-insecticidas-y-repelentes","limpieza","Insecticidas y Repelentes",8],
  ["limpieza-lavandinas","limpieza","Lavandinas",9],
  ["limpieza-limpiador-hogar-y-pequenas-superficies","limpieza","Limpiador Hogar y Pequeñas Superficies",10],
  ["limpieza-limpiador-pisos-y-grandes-superficies","limpieza","Limpiador Pisos y Grandes Superficies",11],
  ["limpieza-limpieza-de-ropa","limpieza","Limpieza de Ropa",12],
  ["limpieza-otros-de-limpieza","limpieza","Otros de Limpieza",13],
  ["limpieza-prod-para-calzados-y-cueros","limpieza","Prod. para Calzados y Cueros",14],
  ["limpieza-textil","limpieza","Textil",15],
  // Mascotas
  ["mascotas-alimento-para-gatos","mascotas","Alimento Para Gatos",1],
  ["mascotas-alimento-para-perros","mascotas","Alimento Para Perros",2],
  ["mascotas-otros-productos-para-mascotas","mascotas","Otros Productos Para Mascotas",3],
  // Papeles
  ["papeles-panuelos","papeles","Pañuelos",1],
  ["papeles-papel-higienico","papeles","Papel Higienico",2],
  ["papeles-rollo-de-cocina","papeles","Rollo de Cocina",3],
  ["papeles-servilletas","papeles","Servilletas",4],
  ["papeles-otros-tissue","papeles","Otros Tissue",5],
  // Perfumería
  ["perfumeria-algodon-y-otros","perfumeria","Algodón y Otros",1],
  ["perfumeria-coloracion","perfumeria","Coloracion",2],
  ["perfumeria-cosmetica","perfumeria","Cosmetica",3],
  ["perfumeria-cremas-y-emulsiones","perfumeria","Cremas y Emulsiones",4],
  ["perfumeria-cuidado-e-higiene-bucal","perfumeria","Cuidado e Higiene Bucal",5],
  ["perfumeria-cuidado-e-higiene-cabello","perfumeria","Cuidado e Higiene Cabello",6],
  ["perfumeria-desodorantes","perfumeria","Desodorantes",7],
  ["perfumeria-jabones","perfumeria","Jabones",8],
  ["perfumeria-linea-de-afeitar","perfumeria","Linea de Afeitar",9],
  ["perfumeria-otros-de-perfumeria","perfumeria","Otros de Perfumeria",10],
  ["perfumeria-panales-adultos","perfumeria","Pañales Adultos",11],
  ["perfumeria-perfumes-y-colonias","perfumeria","Perfumes y Colonias",12],
  ["perfumeria-proteccion-femenina","perfumeria","Proteccion Femenina",13],
  ["perfumeria-sanitizantes","perfumeria","Sanitizantes",14],
  ["perfumeria-talcos","perfumeria","Talcos",15],
  // Productos de Fiesta
  ["productos-de-fiesta-budines-fiesta","productos-de-fiesta","Budines Fiesta",1],
  ["productos-de-fiesta-confituras-fiesta","productos-de-fiesta","Confituras Fiesta",2],
  ["productos-de-fiesta-huevos-de-pascua","productos-de-fiesta","Huevos de Pascua",3],
  ["productos-de-fiesta-pan-dulce","productos-de-fiesta","Pan Dulce",4],
  ["productos-de-fiesta-turrones-fiesta","productos-de-fiesta","Turrones Fiesta",5],
  // Productos Frescos
  ["productos-frescos-grasa","productos-frescos","Grasa",1],
  ["productos-frescos-levadura","productos-frescos","Levadura",2],
  ["productos-frescos-milanesas-de-soja","productos-frescos","Milanesas de Soja",3],
  ["productos-frescos-pastas-frescas","productos-frescos","Pastas Frescas",4],
  ["productos-frescos-salchichas-de-viena","productos-frescos","Salchichas de Viena",5],
  ["productos-frescos-tapas-y-prepizzas","productos-frescos","Tapas y Prepizzas",6],
  // Sidras
  ["sidras-sidras","sidras","Sidras",1],
  // Frescos
  ["carniceria-vacuno","carniceria","Vacuno",1],
  ["carniceria-otras","carniceria","Otras Carnes",2],
  ["verduleria-frutas","verduleria","Frutas",1],
  ["verduleria-verduras","verduleria","Verduras",2],
  ["fiambreria-fiambres","fiambreria","Fiambres",1],
  ["lacteos-f-refrigerados","lacteos-f","Refrigerados",1],
  ["panaderia-elaboracion","panaderia","Elaboración",1],
  ["rotiseria-comidas","rotiseria","Comidas",1],
]

const GRUPOS = GRUPOS_RAW.map(([id, categoria_id, nombre, orden]) => ({ id, categoria_id, nombre, orden }))

async function main() {
  console.log("Starting Supabase seed...\n")

  console.log("Inserting secciones...")
  await insertRows("secciones", SECCIONES)
  console.log(`  OK: ${SECCIONES.length} secciones`)

  console.log("Inserting categorias...")
  await insertRows("categorias", CATEGORIAS)
  console.log(`  OK: ${CATEGORIAS.length} categorias`)

  console.log("Inserting grupos...")
  await insertRows("grupos", GRUPOS)
  console.log(`  OK: ${GRUPOS.length} grupos`)

  console.log("\n✅ Seed completado!")
}

main().catch(err => {
  console.error("Error:", err.message)
  process.exit(1)
})

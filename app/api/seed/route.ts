// app/api/seed/route.ts
// API Route para insertar el catálogo (secciones, categorías, grupos) en Supabase.
// Se invoca una vez, después de aplicar el schema SQL.

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

const GRUPOS = [
  // Almacén
  { id: "almacen-aceites", categoria_id: "almacen", nombre: "Aceites", orden: 1 },
  { id: "almacen-acetos-y-vinagres", categoria_id: "almacen", nombre: "Acetos y Vinagres", orden: 2 },
  { id: "almacen-aderezos", categoria_id: "almacen", nombre: "Aderezos", orden: 3 },
  { id: "almacen-arroces", categoria_id: "almacen", nombre: "Arroces", orden: 4 },
  { id: "almacen-conservas", categoria_id: "almacen", nombre: "Conservas", orden: 5 },
  { id: "almacen-encurtidos", categoria_id: "almacen", nombre: "Encurtidos", orden: 6 },
  { id: "almacen-harinas-y-premezclas", categoria_id: "almacen", nombre: "Harinas y Premezclas", orden: 7 },
  { id: "almacen-legumbres-secas", categoria_id: "almacen", nombre: "Legumbres Secas", orden: 8 },
  { id: "almacen-panificados", categoria_id: "almacen", nombre: "Panificados", orden: 9 },
  { id: "almacen-pastas-secas", categoria_id: "almacen", nombre: "Pastas Secas", orden: 10 },
  { id: "almacen-pure-y-salsas-deshidratadas", categoria_id: "almacen", nombre: "Pure y Salsas Deshidratadas", orden: 11 },
  { id: "almacen-rebozadores-y-pan-rallado", categoria_id: "almacen", nombre: "Rebozadores y Pan Rallado", orden: 12 },
  { id: "almacen-sal-y-otros-condimentos", categoria_id: "almacen", nombre: "Sal y Otros Condimentos", orden: 13 },
  { id: "almacen-snacks", categoria_id: "almacen", nombre: "Snacks", orden: 14 },
  { id: "almacen-sopas-caldos-y-saborizadores", categoria_id: "almacen", nombre: "Sopas Caldos y Saborizadores", orden: 15 },
  { id: "almacen-venta-a-departamento", categoria_id: "almacen", nombre: "Venta a Departamento", orden: 16 },
  // Bebés y Niños
  { id: "bebes-y-ninos-alimentos-infantiles", categoria_id: "bebes-y-ninos", nombre: "Alimentos Infantiles", orden: 1 },
  { id: "bebes-y-ninos-colonias-bebe", categoria_id: "bebes-y-ninos", nombre: "Colonias Bebe", orden: 2 },
  { id: "bebes-y-ninos-cremas-emulsiones-y-aceites", categoria_id: "bebes-y-ninos", nombre: "Cremas Emulsiones y Aceites", orden: 3 },
  { id: "bebes-y-ninos-cuidado-e-higiene-del-cabello", categoria_id: "bebes-y-ninos", nombre: "Cuidado e Higiene del Cabello", orden: 4 },
  { id: "bebes-y-ninos-jabon-de-tocador-bebe", categoria_id: "bebes-y-ninos", nombre: "Jabon de Tocador Bebe", orden: 5 },
  { id: "bebes-y-ninos-otros-de-bebes-y-ninos", categoria_id: "bebes-y-ninos", nombre: "Otros de Bebés y Niños", orden: 6 },
  { id: "bebes-y-ninos-panales", categoria_id: "bebes-y-ninos", nombre: "Pañales", orden: 7 },
  { id: "bebes-y-ninos-talcos-y-feculas-bebe", categoria_id: "bebes-y-ninos", nombre: "Talcos y Feculas Bebe", orden: 8 },
  { id: "bebes-y-ninos-toallas-humedas-y-panos-bebe", categoria_id: "bebes-y-ninos", nombre: "Toallas Humedas y Paños Bebe", orden: 9 },
  // Bebidas con Alcohol
  { id: "bebidas-con-alcohol-aperitivos-y-coctel", categoria_id: "bebidas-con-alcohol", nombre: "Aperitivos y Coctel", orden: 1 },
  { id: "bebidas-con-alcohol-cervezas", categoria_id: "bebidas-con-alcohol", nombre: "Cervezas", orden: 2 },
  { id: "bebidas-con-alcohol-espumantes", categoria_id: "bebidas-con-alcohol", nombre: "Espumantes", orden: 3 },
  { id: "bebidas-con-alcohol-licores", categoria_id: "bebidas-con-alcohol", nombre: "Licores", orden: 4 },
  { id: "bebidas-con-alcohol-otras-bebidas", categoria_id: "bebidas-con-alcohol", nombre: "Otras Bebidas", orden: 5 },
  { id: "bebidas-con-alcohol-vinos", categoria_id: "bebidas-con-alcohol", nombre: "Vinos", orden: 6 },
  { id: "bebidas-con-alcohol-whisky-y-destilados", categoria_id: "bebidas-con-alcohol", nombre: "Whisky y Destilados", orden: 7 },
  // Bebidas sin Alcohol
  { id: "bebidas-sin-alcohol-aguas", categoria_id: "bebidas-sin-alcohol", nombre: "Aguas", orden: 1 },
  { id: "bebidas-sin-alcohol-amargos", categoria_id: "bebidas-sin-alcohol", nombre: "Amargos", orden: 2 },
  { id: "bebidas-sin-alcohol-gaseosas", categoria_id: "bebidas-sin-alcohol", nombre: "Gaseosas", orden: 3 },
  { id: "bebidas-sin-alcohol-isotonicas-y-energizantes", categoria_id: "bebidas-sin-alcohol", nombre: "Isotónicas y Energizantes", orden: 4 },
  { id: "bebidas-sin-alcohol-jugos", categoria_id: "bebidas-sin-alcohol", nombre: "Jugos", orden: 5 },
  // Congelados
  { id: "congelados-comidas-preparadas-congeladas", categoria_id: "congelados", nombre: "Comidas Preparadas Congeladas", orden: 1 },
  { id: "congelados-congelados-de-carne", categoria_id: "congelados", nombre: "Congelados de Carne", orden: 2 },
  { id: "congelados-congelados-de-pescado", categoria_id: "congelados", nombre: "Congelados de Pescado", orden: 3 },
  { id: "congelados-congelados-de-pollo", categoria_id: "congelados", nombre: "Congelados de Pollo", orden: 4 },
  { id: "congelados-helados-postres", categoria_id: "congelados", nombre: "Helados/Postres", orden: 5 },
  { id: "congelados-otros-congelados", categoria_id: "congelados", nombre: "Otros Congelados", orden: 6 },
  { id: "congelados-verduras-y-frutas-congeladas", categoria_id: "congelados", nombre: "Verduras y Frutas Congeladas", orden: 7 },
  // Desayuno
  { id: "desayuno-azucar-y-edulcorantes", categoria_id: "desayuno", nombre: "Azucar y Edulcorantes", orden: 1 },
  { id: "desayuno-cacao", categoria_id: "desayuno", nombre: "Cacao", orden: 2 },
  { id: "desayuno-cafe", categoria_id: "desayuno", nombre: "Cafe", orden: 3 },
  { id: "desayuno-cereales", categoria_id: "desayuno", nombre: "Cereales", orden: 4 },
  { id: "desayuno-dulces-y-mermeladas", categoria_id: "desayuno", nombre: "Dulces y Mermeladas", orden: 5 },
  { id: "desayuno-galletitas", categoria_id: "desayuno", nombre: "Galletitas", orden: 6 },
  { id: "desayuno-gelatinas-flanes-y-premezclas", categoria_id: "desayuno", nombre: "Gelatinas Flanes y Premezclas", orden: 7 },
  { id: "desayuno-leches", categoria_id: "desayuno", nombre: "Leches", orden: 8 },
  { id: "desayuno-reposteria", categoria_id: "desayuno", nombre: "Reposteria", orden: 9 },
  { id: "desayuno-te", categoria_id: "desayuno", nombre: "Te", orden: 10 },
  { id: "desayuno-yerba", categoria_id: "desayuno", nombre: "Yerba", orden: 11 },
  // Kiosco
  { id: "kiosco-adhesivos-y-pegamentos", categoria_id: "kiosco", nombre: "Adhesivos y Pegamentos", orden: 1 },
  { id: "kiosco-apositos", categoria_id: "kiosco", nombre: "Apositos", orden: 2 },
  { id: "kiosco-filos", categoria_id: "kiosco", nombre: "Filos", orden: 3 },
  { id: "kiosco-fosforos-y-palillos", categoria_id: "kiosco", nombre: "Fosforos y Palillos", orden: 4 },
  { id: "kiosco-golosinas-y-snacks", categoria_id: "kiosco", nombre: "Golosinas y Snacks", orden: 5 },
  { id: "kiosco-iluminacion", categoria_id: "kiosco", nombre: "Iluminacion", orden: 6 },
  { id: "kiosco-pilas-y-baterias", categoria_id: "kiosco", nombre: "Pilas y Baterias", orden: 7 },
  { id: "kiosco-snacks-saludables", categoria_id: "kiosco", nombre: "Snacks Saludables", orden: 8 },
  // Lácteos
  { id: "lacteos-crema-de-leche", categoria_id: "lacteos", nombre: "Crema de Leche", orden: 1 },
  { id: "lacteos-leche-fresca", categoria_id: "lacteos", nombre: "Leche Fresca", orden: 2 },
  { id: "lacteos-manteca-y-margarina", categoria_id: "lacteos", nombre: "Manteca y Margarina", orden: 3 },
  { id: "lacteos-postres-de-ninos", categoria_id: "lacteos", nombre: "Postres de Niños", orden: 4 },
  { id: "lacteos-postres-y-flanes", categoria_id: "lacteos", nombre: "Postres y Flanes", orden: 5 },
  { id: "lacteos-quesos-crema-y-untables", categoria_id: "lacteos", nombre: "Quesos Crema y Untables", orden: 6 },
  { id: "lacteos-yogures", categoria_id: "lacteos", nombre: "Yogures", orden: 7 },
  // Limpieza
  { id: "limpieza-accesorios", categoria_id: "limpieza", nombre: "Accesorios", orden: 1 },
  { id: "limpieza-bazar", categoria_id: "limpieza", nombre: "Bazar", orden: 2 },
  { id: "limpieza-bolsas-rollos", categoria_id: "limpieza", nombre: "Bolsas/Rollos", orden: 3 },
  { id: "limpieza-desodorantes-desodorizantes", categoria_id: "limpieza", nombre: "Desodorantes/Desodorizantes", orden: 4 },
  { id: "limpieza-detergentes", categoria_id: "limpieza", nombre: "Detergentes", orden: 5 },
  { id: "limpieza-esponjas-y-ovillos-de-acero", categoria_id: "limpieza", nombre: "Esponjas y Ovillos de Acero", orden: 6 },
  { id: "limpieza-guantes", categoria_id: "limpieza", nombre: "Guantes", orden: 7 },
  { id: "limpieza-insecticidas-y-repelentes", categoria_id: "limpieza", nombre: "Insecticidas y Repelentes", orden: 8 },
  { id: "limpieza-lavandinas", categoria_id: "limpieza", nombre: "Lavandinas", orden: 9 },
  { id: "limpieza-limpiador-hogar-y-pequenas-superficies", categoria_id: "limpieza", nombre: "Limpiador Hogar y Pequeñas Superficies", orden: 10 },
  { id: "limpieza-limpiador-pisos-y-grandes-superficies", categoria_id: "limpieza", nombre: "Limpiador Pisos y Grandes Superficies", orden: 11 },
  { id: "limpieza-limpieza-de-ropa", categoria_id: "limpieza", nombre: "Limpieza de Ropa", orden: 12 },
  { id: "limpieza-otros-de-limpieza", categoria_id: "limpieza", nombre: "Otros de Limpieza", orden: 13 },
  { id: "limpieza-prod-para-calzados-y-cueros", categoria_id: "limpieza", nombre: "Prod. para Calzados y Cueros", orden: 14 },
  { id: "limpieza-textil", categoria_id: "limpieza", nombre: "Textil", orden: 15 },
  // Mascotas
  { id: "mascotas-alimento-para-gatos", categoria_id: "mascotas", nombre: "Alimento Para Gatos", orden: 1 },
  { id: "mascotas-alimento-para-perros", categoria_id: "mascotas", nombre: "Alimento Para Perros", orden: 2 },
  { id: "mascotas-otros-productos-para-mascotas", categoria_id: "mascotas", nombre: "Otros Productos Para Mascotas", orden: 3 },
  // Papeles
  { id: "papeles-panuelos", categoria_id: "papeles", nombre: "Pañuelos", orden: 1 },
  { id: "papeles-papel-higienico", categoria_id: "papeles", nombre: "Papel Higienico", orden: 2 },
  { id: "papeles-rollo-de-cocina", categoria_id: "papeles", nombre: "Rollo de Cocina", orden: 3 },
  { id: "papeles-servilletas", categoria_id: "papeles", nombre: "Servilletas", orden: 4 },
  { id: "papeles-otros-tissue", categoria_id: "papeles", nombre: "Otros Tissue", orden: 5 },
  // Perfumería
  { id: "perfumeria-algodon-y-otros", categoria_id: "perfumeria", nombre: "Algodón y Otros", orden: 1 },
  { id: "perfumeria-coloracion", categoria_id: "perfumeria", nombre: "Coloracion", orden: 2 },
  { id: "perfumeria-cosmetica", categoria_id: "perfumeria", nombre: "Cosmetica", orden: 3 },
  { id: "perfumeria-cremas-y-emulsiones", categoria_id: "perfumeria", nombre: "Cremas y Emulsiones", orden: 4 },
  { id: "perfumeria-cuidado-e-higiene-bucal", categoria_id: "perfumeria", nombre: "Cuidado e Higiene Bucal", orden: 5 },
  { id: "perfumeria-cuidado-e-higiene-cabello", categoria_id: "perfumeria", nombre: "Cuidado e Higiene Cabello", orden: 6 },
  { id: "perfumeria-desodorantes", categoria_id: "perfumeria", nombre: "Desodorantes", orden: 7 },
  { id: "perfumeria-jabones", categoria_id: "perfumeria", nombre: "Jabones", orden: 8 },
  { id: "perfumeria-linea-de-afeitar", categoria_id: "perfumeria", nombre: "Linea de Afeitar", orden: 9 },
  { id: "perfumeria-otros-de-perfumeria", categoria_id: "perfumeria", nombre: "Otros de Perfumeria", orden: 10 },
  { id: "perfumeria-panales-adultos", categoria_id: "perfumeria", nombre: "Pañales Adultos", orden: 11 },
  { id: "perfumeria-perfumes-y-colonias", categoria_id: "perfumeria", nombre: "Perfumes y Colonias", orden: 12 },
  { id: "perfumeria-proteccion-femenina", categoria_id: "perfumeria", nombre: "Proteccion Femenina", orden: 13 },
  { id: "perfumeria-sanitizantes", categoria_id: "perfumeria", nombre: "Sanitizantes", orden: 14 },
  { id: "perfumeria-talcos", categoria_id: "perfumeria", nombre: "Talcos", orden: 15 },
  // Productos de Fiesta
  { id: "productos-de-fiesta-budines-fiesta", categoria_id: "productos-de-fiesta", nombre: "Budines Fiesta", orden: 1 },
  { id: "productos-de-fiesta-confituras-fiesta", categoria_id: "productos-de-fiesta", nombre: "Confituras Fiesta", orden: 2 },
  { id: "productos-de-fiesta-huevos-de-pascua", categoria_id: "productos-de-fiesta", nombre: "Huevos de Pascua", orden: 3 },
  { id: "productos-de-fiesta-pan-dulce", categoria_id: "productos-de-fiesta", nombre: "Pan Dulce", orden: 4 },
  { id: "productos-de-fiesta-turrones-fiesta", categoria_id: "productos-de-fiesta", nombre: "Turrones Fiesta", orden: 5 },
  // Productos Frescos
  { id: "productos-frescos-grasa", categoria_id: "productos-frescos", nombre: "Grasa", orden: 1 },
  { id: "productos-frescos-levadura", categoria_id: "productos-frescos", nombre: "Levadura", orden: 2 },
  { id: "productos-frescos-milanesas-de-soja", categoria_id: "productos-frescos", nombre: "Milanesas de Soja", orden: 3 },
  { id: "productos-frescos-pastas-frescas", categoria_id: "productos-frescos", nombre: "Pastas Frescas", orden: 4 },
  { id: "productos-frescos-salchichas-de-viena", categoria_id: "productos-frescos", nombre: "Salchichas de Viena", orden: 5 },
  { id: "productos-frescos-tapas-y-prepizzas", categoria_id: "productos-frescos", nombre: "Tapas y Prepizzas", orden: 6 },
  // Sidras
  { id: "sidras-sidras", categoria_id: "sidras", nombre: "Sidras", orden: 1 },
  // Frescos
  { id: "carniceria-vacuno", categoria_id: "carniceria", nombre: "Vacuno", orden: 1 },
  { id: "carniceria-otras", categoria_id: "carniceria", nombre: "Otras Carnes", orden: 2 },
  { id: "verduleria-frutas", categoria_id: "verduleria", nombre: "Frutas", orden: 1 },
  { id: "verduleria-verduras", categoria_id: "verduleria", nombre: "Verduras", orden: 2 },
  { id: "fiambreria-fiambres", categoria_id: "fiambreria", nombre: "Fiambres", orden: 1 },
  { id: "lacteos-f-refrigerados", categoria_id: "lacteos-f", nombre: "Refrigerados", orden: 1 },
  { id: "panaderia-elaboracion", categoria_id: "panaderia", nombre: "Elaboración", orden: 1 },
  { id: "rotiseria-comidas", categoria_id: "rotiseria", nombre: "Comidas", orden: 1 },
]

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  if (body.password !== 'CDGMonarc@2026') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const client = createClient(supabaseUrl, anonKey)

  try {
    // Upsert secciones
    const { error: e1 } = await client
      .from('secciones')
      .upsert(SECCIONES, { onConflict: 'id' })
    if (e1) throw new Error(`secciones: ${e1.message}`)

    // Upsert categorias
    const { error: e2 } = await client
      .from('categorias')
      .upsert(CATEGORIAS, { onConflict: 'id' })
    if (e2) throw new Error(`categorias: ${e2.message}`)

    // Upsert grupos (en lotes de 50 para evitar timeout)
    for (let i = 0; i < GRUPOS.length; i += 50) {
      const batch = GRUPOS.slice(i, i + 50)
      const { error: e3 } = await client
        .from('grupos')
        .upsert(batch, { onConflict: 'id' })
      if (e3) throw new Error(`grupos batch ${i}: ${e3.message}`)
    }

    return NextResponse.json({
      ok: true,
      inserted: {
        secciones: SECCIONES.length,
        categorias: CATEGORIAS.length,
        grupos: GRUPOS.length,
      }
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

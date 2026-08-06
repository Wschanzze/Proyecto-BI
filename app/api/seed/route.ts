// app/api/seed/route.ts
// Puebla el catálogo (categorias, sectores, grupos) en Supabase.
// Las sucursales ya están en el SQL del schema inicial.
// POST /api/seed  body: { password: "CDGMonarc@2026" }

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// ──────────────────────────────────────────────────────────────────────────────
// Catálogo real: Categoría (Salon/Frescos) → Sector → Grupo
// Nombres de display con tildes correctas
// IDs: slugs sin tilde, minúsculas, guiones
// ──────────────────────────────────────────────────────────────────────────────

const CATEGORIAS = [
  { id: 'salon',   nombre: 'Salon',   orden: 1 },
  { id: 'frescos', nombre: 'Frescos', orden: 2 },
]

// Sectores del archivo: col "SECTOR"
const SECTORES = [
  // Salon
  { id: 'salon-almacen',             categoria_id: 'salon',   nombre: 'Almacén',             orden: 1  },
  { id: 'salon-bebes-y-ninos',       categoria_id: 'salon',   nombre: 'Bebés y Niños',        orden: 2  },
  { id: 'salon-bebidas-con-alcohol', categoria_id: 'salon',   nombre: 'Bebidas con Alcohol',  orden: 3  },
  { id: 'salon-bebidas-sin-alcohol', categoria_id: 'salon',   nombre: 'Bebidas sin Alcohol',  orden: 4  },
  { id: 'salon-congelados',          categoria_id: 'salon',   nombre: 'Congelados',            orden: 5  },
  { id: 'salon-desayuno',            categoria_id: 'salon',   nombre: 'Desayuno',              orden: 6  },
  { id: 'salon-kiosco',              categoria_id: 'salon',   nombre: 'Kiosco',                orden: 7  },
  { id: 'salon-lacteos',             categoria_id: 'salon',   nombre: 'Lácteos',               orden: 8  },
  { id: 'salon-limpieza',            categoria_id: 'salon',   nombre: 'Limpieza',              orden: 9  },
  { id: 'salon-mascotas',            categoria_id: 'salon',   nombre: 'Mascotas',              orden: 10 },
  { id: 'salon-papeles',             categoria_id: 'salon',   nombre: 'Papeles',               orden: 11 },
  { id: 'salon-perfumeria',          categoria_id: 'salon',   nombre: 'Perfumería',            orden: 12 },
  { id: 'salon-productos-de-fiesta', categoria_id: 'salon',   nombre: 'Productos de Fiesta',  orden: 13 },
  { id: 'salon-productos-frescos',   categoria_id: 'salon',   nombre: 'Productos Frescos',    orden: 14 },
  { id: 'salon-sidras',              categoria_id: 'salon',   nombre: 'Sidras',               orden: 15 },
  // Frescos
  { id: 'frescos-carniceria', categoria_id: 'frescos', nombre: 'Carnicería',       orden: 1 },
  { id: 'frescos-verduleria', categoria_id: 'frescos', nombre: 'Verdulería',       orden: 2 },
  { id: 'frescos-fiambreria', categoria_id: 'frescos', nombre: 'Fiambrería',       orden: 3 },
  { id: 'frescos-lacteos',    categoria_id: 'frescos', nombre: 'Lácteos Frescos',  orden: 4 },
  { id: 'frescos-panaderia',  categoria_id: 'frescos', nombre: 'Panadería',        orden: 5 },
  { id: 'frescos-rotiseria',  categoria_id: 'frescos', nombre: 'Rotisería',        orden: 6 },
]

const GRUPOS = [
  // ALMACÉN
  { id: 'salon-almacen-aceites',                      sector_id: 'salon-almacen',             nombre: 'Aceites',                       orden: 1  },
  { id: 'salon-almacen-acetos-y-vinagres',            sector_id: 'salon-almacen',             nombre: 'Acetos y Vinagres',             orden: 2  },
  { id: 'salon-almacen-aderezos',                     sector_id: 'salon-almacen',             nombre: 'Aderezos',                      orden: 3  },
  { id: 'salon-almacen-arroces',                      sector_id: 'salon-almacen',             nombre: 'Arroces',                       orden: 4  },
  { id: 'salon-almacen-conservas',                    sector_id: 'salon-almacen',             nombre: 'Conservas',                     orden: 5  },
  { id: 'salon-almacen-encurtidos',                   sector_id: 'salon-almacen',             nombre: 'Encurtidos',                    orden: 6  },
  { id: 'salon-almacen-harinas-y-premezclas',         sector_id: 'salon-almacen',             nombre: 'Harinas y Premezclas',          orden: 7  },
  { id: 'salon-almacen-legumbres-secas',              sector_id: 'salon-almacen',             nombre: 'Legumbres Secas',               orden: 8  },
  { id: 'salon-almacen-panificados',                  sector_id: 'salon-almacen',             nombre: 'Panificados',                   orden: 9  },
  { id: 'salon-almacen-pastas-secas',                 sector_id: 'salon-almacen',             nombre: 'Pastas Secas',                  orden: 10 },
  { id: 'salon-almacen-pure-y-salsas-deshidratadas',  sector_id: 'salon-almacen',             nombre: 'Pure y Salsas Deshidratadas',   orden: 11 },
  { id: 'salon-almacen-rebozadores-y-pan-rallado',    sector_id: 'salon-almacen',             nombre: 'Rebozadores y Pan Rallado',     orden: 12 },
  { id: 'salon-almacen-sal-y-otros-condimentos',      sector_id: 'salon-almacen',             nombre: 'Sal y Otros Condimentos',       orden: 13 },
  { id: 'salon-almacen-snacks',                       sector_id: 'salon-almacen',             nombre: 'Snacks',                        orden: 14 },
  { id: 'salon-almacen-sopas-caldos-y-saborizadores', sector_id: 'salon-almacen',             nombre: 'Sopas Caldos y Saborizadores',  orden: 15 },
  { id: 'salon-almacen-venta-a-departamento',         sector_id: 'salon-almacen',             nombre: 'Venta a Departamento',          orden: 16 },
  // BEBÉS Y NIÑOS
  { id: 'salon-bebes-alimentos-infantiles',           sector_id: 'salon-bebes-y-ninos',       nombre: 'Alimentos Infantiles',          orden: 1  },
  { id: 'salon-bebes-colonias-bebe',                  sector_id: 'salon-bebes-y-ninos',       nombre: 'Colonias Bebé',                 orden: 2  },
  { id: 'salon-bebes-cremas-emulsiones-y-aceites',    sector_id: 'salon-bebes-y-ninos',       nombre: 'Cremas Emulsiones y Aceites',   orden: 3  },
  { id: 'salon-bebes-cuidado-e-higiene-cabello',      sector_id: 'salon-bebes-y-ninos',       nombre: 'Cuidado e Higiene del Cabello', orden: 4  },
  { id: 'salon-bebes-jabon-tocador',                  sector_id: 'salon-bebes-y-ninos',       nombre: 'Jabón de Tocador Bebé',         orden: 5  },
  { id: 'salon-bebes-otros',                          sector_id: 'salon-bebes-y-ninos',       nombre: 'Otros de Bebés y Niños',        orden: 6  },
  { id: 'salon-bebes-panales',                        sector_id: 'salon-bebes-y-ninos',       nombre: 'Pañales',                       orden: 7  },
  { id: 'salon-bebes-talcos-y-feculas',               sector_id: 'salon-bebes-y-ninos',       nombre: 'Talcos y Féculas Bebé',         orden: 8  },
  { id: 'salon-bebes-toallas-humedas',                sector_id: 'salon-bebes-y-ninos',       nombre: 'Toallas Húmedas y Paños Bebé',  orden: 9  },
  // BEBIDAS CON ALCOHOL
  { id: 'salon-bca-aperitivos',                       sector_id: 'salon-bebidas-con-alcohol', nombre: 'Aperitivos y Cóctel',           orden: 1  },
  { id: 'salon-bca-cervezas',                         sector_id: 'salon-bebidas-con-alcohol', nombre: 'Cervezas',                      orden: 2  },
  { id: 'salon-bca-espumantes',                       sector_id: 'salon-bebidas-con-alcohol', nombre: 'Espumantes',                    orden: 3  },
  { id: 'salon-bca-licores',                          sector_id: 'salon-bebidas-con-alcohol', nombre: 'Licores',                       orden: 4  },
  { id: 'salon-bca-otras',                            sector_id: 'salon-bebidas-con-alcohol', nombre: 'Otras Bebidas',                 orden: 5  },
  { id: 'salon-bca-vinos',                            sector_id: 'salon-bebidas-con-alcohol', nombre: 'Vinos',                         orden: 6  },
  { id: 'salon-bca-whisky',                           sector_id: 'salon-bebidas-con-alcohol', nombre: 'Whisky y Destilados',           orden: 7  },
  // BEBIDAS SIN ALCOHOL
  { id: 'salon-bsa-aguas',                            sector_id: 'salon-bebidas-sin-alcohol', nombre: 'Aguas',                         orden: 1  },
  { id: 'salon-bsa-amargos',                          sector_id: 'salon-bebidas-sin-alcohol', nombre: 'Amargos',                       orden: 2  },
  { id: 'salon-bsa-gaseosas',                         sector_id: 'salon-bebidas-sin-alcohol', nombre: 'Gaseosas',                      orden: 3  },
  { id: 'salon-bsa-isotonicas',                       sector_id: 'salon-bebidas-sin-alcohol', nombre: 'Isotónicas y Energizantes',     orden: 4  },
  { id: 'salon-bsa-jugos',                            sector_id: 'salon-bebidas-sin-alcohol', nombre: 'Jugos',                         orden: 5  },
  // CONGELADOS
  { id: 'salon-cong-comidas-prep',                    sector_id: 'salon-congelados',          nombre: 'Comidas Preparadas Congeladas', orden: 1  },
  { id: 'salon-cong-carne',                           sector_id: 'salon-congelados',          nombre: 'Congelados de Carne',           orden: 2  },
  { id: 'salon-cong-pescado',                         sector_id: 'salon-congelados',          nombre: 'Congelados de Pescado',         orden: 3  },
  { id: 'salon-cong-pollo',                           sector_id: 'salon-congelados',          nombre: 'Congelados de Pollo',           orden: 4  },
  { id: 'salon-cong-helados',                         sector_id: 'salon-congelados',          nombre: 'Helados/Postres',               orden: 5  },
  { id: 'salon-cong-otros',                           sector_id: 'salon-congelados',          nombre: 'Otros Congelados',              orden: 6  },
  { id: 'salon-cong-verduras',                        sector_id: 'salon-congelados',          nombre: 'Verduras y Frutas Congeladas',  orden: 7  },
  // DESAYUNO
  { id: 'salon-des-azucar',                           sector_id: 'salon-desayuno',            nombre: 'Azúcar y Edulcorantes',         orden: 1  },
  { id: 'salon-des-cacao',                            sector_id: 'salon-desayuno',            nombre: 'Cacao',                         orden: 2  },
  { id: 'salon-des-cafe',                             sector_id: 'salon-desayuno',            nombre: 'Café',                          orden: 3  },
  { id: 'salon-des-cereales',                         sector_id: 'salon-desayuno',            nombre: 'Cereales',                      orden: 4  },
  { id: 'salon-des-dulces',                           sector_id: 'salon-desayuno',            nombre: 'Dulces y Mermeladas',           orden: 5  },
  { id: 'salon-des-galletitas',                       sector_id: 'salon-desayuno',            nombre: 'Galletitas',                    orden: 6  },
  { id: 'salon-des-gelatinas',                        sector_id: 'salon-desayuno',            nombre: 'Gelatinas Flanes y Premezclas', orden: 7  },
  { id: 'salon-des-leches',                           sector_id: 'salon-desayuno',            nombre: 'Leches',                        orden: 8  },
  { id: 'salon-des-reposteria',                       sector_id: 'salon-desayuno',            nombre: 'Repostería',                    orden: 9  },
  { id: 'salon-des-te',                               sector_id: 'salon-desayuno',            nombre: 'Té',                            orden: 10 },
  { id: 'salon-des-yerba',                            sector_id: 'salon-desayuno',            nombre: 'Yerba',                         orden: 11 },
  // KIOSCO
  { id: 'salon-kio-adhesivos',                        sector_id: 'salon-kiosco',              nombre: 'Adhesivos y Pegamentos',        orden: 1  },
  { id: 'salon-kio-apositos',                         sector_id: 'salon-kiosco',              nombre: 'Apósitos',                      orden: 2  },
  { id: 'salon-kio-filos',                            sector_id: 'salon-kiosco',              nombre: 'Filos',                         orden: 3  },
  { id: 'salon-kio-fosforos',                         sector_id: 'salon-kiosco',              nombre: 'Fósforos y Palillos',           orden: 4  },
  { id: 'salon-kio-golosinas',                        sector_id: 'salon-kiosco',              nombre: 'Golosinas y Snacks',            orden: 5  },
  { id: 'salon-kio-iluminacion',                      sector_id: 'salon-kiosco',              nombre: 'Iluminación',                   orden: 6  },
  { id: 'salon-kio-pilas',                            sector_id: 'salon-kiosco',              nombre: 'Pilas y Baterías',              orden: 7  },
  { id: 'salon-kio-snacks-saludables',                sector_id: 'salon-kiosco',              nombre: 'Snacks Saludables',             orden: 8  },
  // LÁCTEOS
  { id: 'salon-lac-crema',                            sector_id: 'salon-lacteos',             nombre: 'Crema de Leche',                orden: 1  },
  { id: 'salon-lac-leche-fresca',                     sector_id: 'salon-lacteos',             nombre: 'Leche Fresca',                  orden: 2  },
  { id: 'salon-lac-manteca',                          sector_id: 'salon-lacteos',             nombre: 'Manteca y Margarina',           orden: 3  },
  { id: 'salon-lac-postres-ninos',                    sector_id: 'salon-lacteos',             nombre: 'Postres de Niños',              orden: 4  },
  { id: 'salon-lac-postres-flanes',                   sector_id: 'salon-lacteos',             nombre: 'Postres y Flanes',              orden: 5  },
  { id: 'salon-lac-quesos-untables',                  sector_id: 'salon-lacteos',             nombre: 'Quesos Crema y Untables',       orden: 6  },
  { id: 'salon-lac-yogures',                          sector_id: 'salon-lacteos',             nombre: 'Yogures',                       orden: 7  },
  // LIMPIEZA
  { id: 'salon-lim-accesorios',                       sector_id: 'salon-limpieza',            nombre: 'Accesorios',                    orden: 1  },
  { id: 'salon-lim-bazar',                            sector_id: 'salon-limpieza',            nombre: 'Bazar',                         orden: 2  },
  { id: 'salon-lim-bolsas',                           sector_id: 'salon-limpieza',            nombre: 'Bolsas/Rollos',                 orden: 3  },
  { id: 'salon-lim-desodorantes',                     sector_id: 'salon-limpieza',            nombre: 'Desodorantes/Desodorizantes',   orden: 4  },
  { id: 'salon-lim-detergentes',                      sector_id: 'salon-limpieza',            nombre: 'Detergentes',                   orden: 5  },
  { id: 'salon-lim-esponjas',                         sector_id: 'salon-limpieza',            nombre: 'Esponjas y Ovillos de Acero',   orden: 6  },
  { id: 'salon-lim-guantes',                          sector_id: 'salon-limpieza',            nombre: 'Guantes',                       orden: 7  },
  { id: 'salon-lim-insecticidas',                     sector_id: 'salon-limpieza',            nombre: 'Insecticidas y Repelentes',     orden: 8  },
  { id: 'salon-lim-lavandinas',                       sector_id: 'salon-limpieza',            nombre: 'Lavandinas',                    orden: 9  },
  { id: 'salon-lim-hogar',                            sector_id: 'salon-limpieza',            nombre: 'Limpiador Hogar y Pequeñas Sup.', orden: 10 },
  { id: 'salon-lim-pisos',                            sector_id: 'salon-limpieza',            nombre: 'Limpiador Pisos y Grandes Sup.', orden: 11 },
  { id: 'salon-lim-ropa',                             sector_id: 'salon-limpieza',            nombre: 'Limpieza de Ropa',              orden: 12 },
  { id: 'salon-lim-otros',                            sector_id: 'salon-limpieza',            nombre: 'Otros de Limpieza',             orden: 13 },
  { id: 'salon-lim-calzados',                         sector_id: 'salon-limpieza',            nombre: 'Prod. para Calzados y Cueros',  orden: 14 },
  { id: 'salon-lim-textil',                           sector_id: 'salon-limpieza',            nombre: 'Textil',                        orden: 15 },
  // MASCOTAS
  { id: 'salon-mas-gatos',                            sector_id: 'salon-mascotas',            nombre: 'Alimento para Gatos',           orden: 1  },
  { id: 'salon-mas-perros',                           sector_id: 'salon-mascotas',            nombre: 'Alimento para Perros',          orden: 2  },
  { id: 'salon-mas-otros',                            sector_id: 'salon-mascotas',            nombre: 'Otros Productos para Mascotas', orden: 3  },
  // PAPELES
  { id: 'salon-pap-panuelos',                         sector_id: 'salon-papeles',             nombre: 'Pañuelos',                      orden: 1  },
  { id: 'salon-pap-papel-higienico',                  sector_id: 'salon-papeles',             nombre: 'Papel Higiénico',               orden: 2  },
  { id: 'salon-pap-rollo-cocina',                     sector_id: 'salon-papeles',             nombre: 'Rollo de Cocina',               orden: 3  },
  { id: 'salon-pap-servilletas',                      sector_id: 'salon-papeles',             nombre: 'Servilletas',                   orden: 4  },
  { id: 'salon-pap-otros-tissue',                     sector_id: 'salon-papeles',             nombre: 'Otros Tissue',                  orden: 5  },
  // PERFUMERÍA
  { id: 'salon-per-algodon',                          sector_id: 'salon-perfumeria',          nombre: 'Algodón y Otros',               orden: 1  },
  { id: 'salon-per-coloracion',                       sector_id: 'salon-perfumeria',          nombre: 'Coloración',                    orden: 2  },
  { id: 'salon-per-cosmetica',                        sector_id: 'salon-perfumeria',          nombre: 'Cosmética',                     orden: 3  },
  { id: 'salon-per-cremas',                           sector_id: 'salon-perfumeria',          nombre: 'Cremas y Emulsiones',           orden: 4  },
  { id: 'salon-per-higiene-bucal',                    sector_id: 'salon-perfumeria',          nombre: 'Cuidado e Higiene Bucal',       orden: 5  },
  { id: 'salon-per-higiene-cabello',                  sector_id: 'salon-perfumeria',          nombre: 'Cuidado e Higiene Cabello',     orden: 6  },
  { id: 'salon-per-desodorantes',                     sector_id: 'salon-perfumeria',          nombre: 'Desodorantes',                  orden: 7  },
  { id: 'salon-per-jabones',                          sector_id: 'salon-perfumeria',          nombre: 'Jabones',                       orden: 8  },
  { id: 'salon-per-afeitar',                          sector_id: 'salon-perfumeria',          nombre: 'Línea de Afeitar',              orden: 9  },
  { id: 'salon-per-otros',                            sector_id: 'salon-perfumeria',          nombre: 'Otros de Perfumería',           orden: 10 },
  { id: 'salon-per-panales-adultos',                  sector_id: 'salon-perfumeria',          nombre: 'Pañales Adultos',               orden: 11 },
  { id: 'salon-per-perfumes',                         sector_id: 'salon-perfumeria',          nombre: 'Perfumes y Colonias',           orden: 12 },
  { id: 'salon-per-proteccion-fem',                   sector_id: 'salon-perfumeria',          nombre: 'Protección Femenina',           orden: 13 },
  { id: 'salon-per-sanitizantes',                     sector_id: 'salon-perfumeria',          nombre: 'Sanitizantes',                  orden: 14 },
  { id: 'salon-per-talcos',                           sector_id: 'salon-perfumeria',          nombre: 'Talcos',                        orden: 15 },
  // PRODUCTOS DE FIESTA
  { id: 'salon-fies-budines',                         sector_id: 'salon-productos-de-fiesta', nombre: 'Budines Fiesta',                orden: 1  },
  { id: 'salon-fies-confituras',                      sector_id: 'salon-productos-de-fiesta', nombre: 'Confituras Fiesta',             orden: 2  },
  { id: 'salon-fies-huevos-pascua',                   sector_id: 'salon-productos-de-fiesta', nombre: 'Huevos de Pascua',              orden: 3  },
  { id: 'salon-fies-pan-dulce',                       sector_id: 'salon-productos-de-fiesta', nombre: 'Pan Dulce',                     orden: 4  },
  { id: 'salon-fies-turrones',                        sector_id: 'salon-productos-de-fiesta', nombre: 'Turrones Fiesta',               orden: 5  },
  // PRODUCTOS FRESCOS
  { id: 'salon-pfr-grasa',                            sector_id: 'salon-productos-frescos',   nombre: 'Grasa',                         orden: 1  },
  { id: 'salon-pfr-levadura',                         sector_id: 'salon-productos-frescos',   nombre: 'Levadura',                      orden: 2  },
  { id: 'salon-pfr-milanesas-soja',                   sector_id: 'salon-productos-frescos',   nombre: 'Milanesas de Soja',             orden: 3  },
  { id: 'salon-pfr-pastas-frescas',                   sector_id: 'salon-productos-frescos',   nombre: 'Pastas Frescas',                orden: 4  },
  { id: 'salon-pfr-salchichas',                       sector_id: 'salon-productos-frescos',   nombre: 'Salchichas de Viena',           orden: 5  },
  { id: 'salon-pfr-tapas-prepizzas',                  sector_id: 'salon-productos-frescos',   nombre: 'Tapas y Prepizzas',             orden: 6  },
  // SIDRAS
  { id: 'salon-sid-sidras',                           sector_id: 'salon-sidras',              nombre: 'Sidras',                        orden: 1  },
  // FRESCOS
  { id: 'frescos-car-vacuno',                         sector_id: 'frescos-carniceria',        nombre: 'Vacuno',                        orden: 1  },
  { id: 'frescos-car-otras-carnes',                   sector_id: 'frescos-carniceria',        nombre: 'Otras Carnes',                  orden: 2  },
  { id: 'frescos-ver-frutas',                         sector_id: 'frescos-verduleria',        nombre: 'Frutas',                        orden: 1  },
  { id: 'frescos-ver-verduras',                       sector_id: 'frescos-verduleria',        nombre: 'Verduras',                      orden: 2  },
  { id: 'frescos-fia-fiambres',                       sector_id: 'frescos-fiambreria',        nombre: 'Fiambres',                      orden: 1  },
  { id: 'frescos-lac-refrigerados',                   sector_id: 'frescos-lacteos',           nombre: 'Refrigerados',                  orden: 1  },
  { id: 'frescos-pan-elaboracion',                    sector_id: 'frescos-panaderia',         nombre: 'Elaboración',                   orden: 1  },
  { id: 'frescos-rot-comidas',                        sector_id: 'frescos-rotiseria',         nombre: 'Comidas',                       orden: 1  },
]

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  if (body.password !== 'CDGMonarc@2026') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    const { error: e1 } = await client
      .from('categorias')
      .upsert(CATEGORIAS, { onConflict: 'id' })
    if (e1) throw new Error(`categorias: ${e1.message}`)

    const { error: e2 } = await client
      .from('sectores')
      .upsert(SECTORES, { onConflict: 'id' })
    if (e2) throw new Error(`sectores: ${e2.message}`)

    // Grupos en lotes de 50
    for (let i = 0; i < GRUPOS.length; i += 50) {
      const { error: e3 } = await client
        .from('grupos')
        .upsert(GRUPOS.slice(i, i + 50), { onConflict: 'id' })
      if (e3) throw new Error(`grupos lote ${i}: ${e3.message}`)
    }

    return NextResponse.json({
      ok: true,
      inserted: { categorias: CATEGORIAS.length, sectores: SECTORES.length, grupos: GRUPOS.length },
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

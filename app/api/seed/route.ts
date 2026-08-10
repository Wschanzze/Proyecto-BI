// app/api/seed/route.ts
// Puebla el catálogo (categorias, sectores, grupos) y genera los últimos 7 meses
// de datos reales (ene-26 a jul-26) repartidos en las 5 sucursales.
// POST /api/seed  body: { password: "CDGMonarc@2026" }

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const CATEGORIAS = [
  { id: 'salon',   nombre: 'Salon',   orden: 1 },
  { id: 'frescos', nombre: 'Frescos', orden: 2 },
]

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
  { id: 'frescos-carniceria',        categoria_id: 'frescos', nombre: 'Carnicería',          orden: 1 },
  { id: 'frescos-fiambreria',        categoria_id: 'frescos', nombre: 'Fiambrería',          orden: 2 },
  { id: 'frescos-frutas-y-verduras', categoria_id: 'frescos', nombre: 'Frutas y Verduras',   orden: 3 },
  { id: 'frescos-panaderia',         categoria_id: 'frescos', nombre: 'Panadería',           orden: 4 },
  { id: 'frescos-rotiseria',         categoria_id: 'frescos', nombre: 'Rotisería',           orden: 5 },
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
  { id: 'salon-bca-licores',                          sector_id: 'salon-bebidas-con-alcohol', nombre: 'Lores',                        orden: 4  },
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
  // FRESCOS - CARNICERÍA
  { id: 'frescos-car-achuras',                        sector_id: 'frescos-carniceria',        nombre: 'Achuras',                       orden: 1  },
  { id: 'frescos-car-carne-porcina',                  sector_id: 'frescos-carniceria',        nombre: 'Carne Porcina',                 orden: 2  },
  { id: 'frescos-car-carne-vacuna',                   sector_id: 'frescos-carniceria',        nombre: 'Carne Vacuna',                  orden: 3  },
  { id: 'frescos-car-pescado',                        sector_id: 'frescos-carniceria',        nombre: 'Pescado',                       orden: 4  },
  { id: 'frescos-car-pollo',                          sector_id: 'frescos-carniceria',        nombre: 'Pollo',                         orden: 5  },
  { id: 'frescos-car-produccion',                     sector_id: 'frescos-carniceria',        nombre: 'Producción',                    orden: 6  },
  // FRESCOS - FIAMBRERÍA
  { id: 'frescos-fia-dulces',                         sector_id: 'frescos-fiambreria',        nombre: 'Dulces',                        orden: 1  },
  { id: 'frescos-fia-encurtidos',                     sector_id: 'frescos-fiambreria',        nombre: 'Encurtidos',                    orden: 2  },
  { id: 'frescos-fia-fiambres',                       sector_id: 'frescos-fiambreria',        nombre: 'Fiambres',                      orden: 3  },
  { id: 'frescos-fia-frutas',                         sector_id: 'frescos-fiambreria',        nombre: 'Frutas',                        orden: 4  },
  { id: 'frescos-fia-quesos',                         sector_id: 'frescos-fiambreria',        nombre: 'Quesos',                        orden: 5  },
  // FRESCOS - FRUTAS Y VERDURAS
  { id: 'frescos-fyv-frutas-frescas',                 sector_id: 'frescos-frutas-y-verduras', nombre: 'Frutas Frescas',                orden: 1  },
  { id: 'frescos-fyv-huevos',                         sector_id: 'frescos-frutas-y-verduras', nombre: 'Huevos',                        orden: 2  },
  { id: 'frescos-fyv-lena-y-carbon',                  sector_id: 'frescos-frutas-y-verduras', nombre: 'Leña y Carbón',                 orden: 3  },
  { id: 'frescos-fyv-verduras-frescas',               sector_id: 'frescos-frutas-y-verduras', nombre: 'Verduras Frescas',              orden: 4  },
  // FRESCOS - PANADERÍA
  { id: 'frescos-pan-budines',                        sector_id: 'frescos-panaderia',         nombre: 'Budines',                       orden: 1  },
  { id: 'frescos-pan-facturas',                       sector_id: 'frescos-panaderia',         nombre: 'Facturas',                      orden: 2  },
  { id: 'frescos-pan-fiestas',                        sector_id: 'frescos-panaderia',         nombre: 'Fiestas',                       orden: 3  },
  { id: 'frescos-pan-masa-salada',                    sector_id: 'frescos-panaderia',         nombre: 'Masa Salada',                   orden: 4  },
  { id: 'frescos-pan-masas-dulces',                   sector_id: 'frescos-panaderia',         nombre: 'Masas Dulces',                  orden: 5  },
  { id: 'frescos-pan-miga',                           sector_id: 'frescos-panaderia',         nombre: 'Miga',                          orden: 6  },
  { id: 'frescos-pan-pan',                            sector_id: 'frescos-panaderia',         nombre: 'Pan',                           orden: 7  },
  { id: 'frescos-pan-pizza',                          sector_id: 'frescos-panaderia',         nombre: 'Pizza',                         orden: 8  },
  { id: 'frescos-pan-postre',                         sector_id: 'frescos-panaderia',         nombre: 'Postre',                        orden: 9  },
  { id: 'frescos-pan-tapas',                          sector_id: 'frescos-panaderia',         nombre: 'Tapas',                         orden: 10 },
  // FRESCOS - ROTISERÍA
  { id: 'frescos-rot-arrollado',                      sector_id: 'frescos-rotiseria',         nombre: 'Arrollado',                     orden: 1  },
  { id: 'frescos-rot-arroz',                          sector_id: 'frescos-rotiseria',         nombre: 'Arroz',                         orden: 2  },
  { id: 'frescos-rot-carnes',                         sector_id: 'frescos-rotiseria',         nombre: 'Carnes',                        orden: 3  },
  { id: 'frescos-rot-cerdo',                          sector_id: 'frescos-rotiseria',         nombre: 'Cerdo',                         orden: 4  },
  { id: 'frescos-rot-empanadas',                      sector_id: 'frescos-rotiseria',         nombre: 'Empanadas',                     orden: 5  },
  { id: 'frescos-rot-ensaladas',                      sector_id: 'frescos-rotiseria',         nombre: 'Ensaladas',                     orden: 6  },
  { id: 'frescos-rot-entrada',                        sector_id: 'frescos-rotiseria',         nombre: 'Entrada',                       orden: 7  },
  { id: 'frescos-rot-milanesas',                      sector_id: 'frescos-rotiseria',         nombre: 'Milanesas',                     orden: 8  },
  { id: 'frescos-rot-papas',                          sector_id: 'frescos-rotiseria',         nombre: 'Papas',                         orden: 9  },
  { id: 'frescos-rot-pastas',                         sector_id: 'frescos-rotiseria',         nombre: 'Pastas',                        orden: 10 },
  { id: 'frescos-rot-pescado',                        sector_id: 'frescos-rotiseria',         nombre: 'Pescado',                       orden: 11 },
  { id: 'frescos-rot-pollo',                          sector_id: 'frescos-rotiseria',         nombre: 'Pollo',                         orden: 12 },
  { id: 'frescos-rot-postre',                         sector_id: 'frescos-rotiseria',         nombre: 'Postre',                        orden: 13 },
  { id: 'frescos-rot-tartas-y-tortillas',             sector_id: 'frescos-rotiseria',         nombre: 'Tartas y Tortillas',            orden: 14 },
  { id: 'frescos-rot-verduras',                       sector_id: 'frescos-rotiseria',         nombre: 'Verduras',                      orden: 15 },
]

const SUCURSALES = ['colon', 'san-martin', 'falucho', 'peron', 'virtual']

const PERIODS_TO_SEED = [
  { key: "2026-01", anio: 2026, mes: 1, label: "ene-26" },
  { key: "2026-02", anio: 2026, mes: 2, label: "feb-26" },
  { key: "2026-03", anio: 2026, mes: 3, label: "mar-26" },
  { key: "2026-04", anio: 2026, mes: 4, label: "abr-26" },
  { key: "2026-05", anio: 2026, mes: 5, label: "may-26" },
  { key: "2026-06", anio: 2026, mes: 6, label: "jun-26" },
  { key: "2026-07", anio: 2026, mes: 7, label: "jul-26" },
]

function seeded(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 100000) / 100000
}

function generateRawMetricsForGroup(gId: string, sucId: string, monthIdx: number) {
  const seedVal = seeded(`${gId}-${sucId}-${monthIdx}`)
  // Facturación base para el grupo en esta sucursal (ej: entre 2M y 15M)
  const facturacion = 2_000_000 + Math.round(seedVal * 13_000_000)
  const cantidad = 100 + Math.round(seedVal * 3000)
  // IVA: 21% de la facturación
  const iva = Math.round(facturacion * 0.21)
  // Costo (CMV): entre 60% y 80% de la facturación
  const cmgPct = 0.20 + seedVal * 0.20 // 20% a 40% de contribución marginal
  const costo = Math.round(facturacion * (1 - cmgPct))
  
  return {
    facturacion,
    cantidad,
    iva,
    costo
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  if (body.password !== 'CDGMonarc@2026') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q"
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wlaotnafjrvckoxbdokk.supabase.co",
    serviceRoleKey
  )

  try {
    // 1. Seed del catálogo estático
    console.log("Seeding categorias...")
    const { error: e1 } = await client
      .from('categorias')
      .upsert(CATEGORIAS, { onConflict: 'id' })
    if (e1) throw new Error(`categorias: ${e1.message}`)

    console.log("Seeding sectores...")
    const { error: e2 } = await client
      .from('sectores')
      .upsert(SECTORES, { onConflict: 'id' })
    if (e2) throw new Error(`sectores: ${e2.message}`)

    console.log("Seeding grupos...")
    for (let i = 0; i < GRUPOS.length; i += 50) {
      const { error: e3 } = await client
        .from('grupos')
        .upsert(GRUPOS.slice(i, i + 50), { onConflict: 'id' })
      if (e3) throw new Error(`grupos lote ${i}: ${e3.message}`)
    }

    // 2. Seed de períodos y resultados para simular historial real
    console.log("Seeding periodos y resultados...")
    let totalResultadosInsertados = 0

    for (let pIdx = 0; pIdx < PERIODS_TO_SEED.length; pIdx++) {
      const pDef = PERIODS_TO_SEED[pIdx]
      
      // Upsert periodo
      const { data: pData, error: pErr } = await client
        .from('periodos')
        .upsert({
          key: pDef.key,
          anio: pDef.anio,
          mes: pDef.mes,
          label: pDef.label,
          archivo_nombre: `seed_${pDef.key}.xlsx`
        }, { onConflict: 'key' })
        .select('id')
        .single()

      if (pErr || !pData) throw new Error(`periodo ${pDef.key}: ${pErr?.message ?? 'No data returned'}`)
      const periodoId = pData.id

      // Generar filas de resultados: 5 sucursales * 114 grupos = 570 filas por mes
      const resultadosInput = []
      for (const sucId of SUCURSALES) {
        for (const g of GRUPOS) {
          const metrics = generateRawMetricsForGroup(g.id, sucId, pIdx)
          resultadosInput.push({
            periodo_id: periodoId,
            sucursal_id: sucId,
            grupo_id: g.id,
            cantidad: metrics.cantidad,
            facturacion: metrics.facturacion,
            iva: metrics.iva,
            costo: metrics.costo
          })
        }
      }

      // Insertar por lotes de 200 para evitar límites de carga de Supabase
      for (let k = 0; k < resultadosInput.length; k += 200) {
        const batch = resultadosInput.slice(k, k + 200)
        const { error: resErr } = await client
          .from('resultados')
          .upsert(batch, { onConflict: 'periodo_id,sucursal_id,grupo_id' })
        if (resErr) throw new Error(`resultados periodo ${pDef.key} lote ${k}: ${resErr.message}`)
      }
      totalResultadosInsertados += resultadosInput.length
    }

    return NextResponse.json({
      ok: true,
      inserted: {
        categorias: CATEGORIAS.length,
        sectores: SECTORES.length,
        grupos: GRUPOS.length,
        periodos: PERIODS_TO_SEED.length,
        resultados: totalResultadosInsertados
      },
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

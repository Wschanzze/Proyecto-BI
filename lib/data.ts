// ---------------------------------------------------------------------------
// Modelo de datos del Cuadro de Resultados — Supermercados Monarca
// Jerarquía: Sección → Categoría → Grupo → Subgrupo
//
// INTEGRACIÓN SUPABASE:
//   - getCuadro(key)       → datos simulados (sync, para SSR / fallback)
//   - getCuadroAsync(key)  → intenta Supabase, cae a simulado si no hay datos
//   - Los datos reales se leen desde lib/data-db.ts
// ---------------------------------------------------------------------------

export interface Metrics {
  facturacion: number // Facturación s/IVA
  iva: number // IVA (monto del impuesto)
  costo: number // Costo de mercadería vendida (CMV)
  articulos: number // Cantidad de artículos
  cmg: number // Contribución Marginal (%)
  resultadoOperativo: number // Resultado Operativo (monto)
  rrhhSobreVentas: number // RRHH / Ventas (%)
  accionesSobreVentas: number // Acciones s/Ventas sin IVA (%)
  resultadoFinal: number // Resultado Final (monto)
}

// Nueva estructura extendida para el P&L completo
export interface CuadroResultadoLinea {
  facturacion: number // Facturación (CON IVA incluido - dato base del sistema)
  iva: number // IVA (monto del impuesto a restar)
  ventasSinIva: number // Ventas sin IVA = Facturación - IVA
  cmv: number // Costo de Mercadería Vendida
  contribucionMarginal: number // = Ventas sin IVA - CMV
  rrhh: number // Gastos de personal
  gastosComerciales: number // Gastos comerciales
  resultadoOperativo: number // = Contribución marginal - RRHH - Gastos comerciales
  impuestos: number // Impuestos y cargas operativas
  gastos: number // Gastos operativos generales
  merma: number // = 1.6% × Ventas sin IVA
  resultadoSupermercado: number // = Resultado operativo - Impuestos - Gastos - Merma
  ingresosFinancieros: number // Ingresos financieros
  resultadoFinal: number // = Resultado supermercado + Ingresos financieros
  resultadoImpositivo: number // = 19% IVA + IIBB + TUAE
  resultadoTotal: number // = Resultado final + Resultado impositivo
}

// KPIs complementarios por período
export interface KPIsComplementarios {
  sucursales: {
    activas: number
    inactivas: number
    nuevas: number
  }
  clientes: {
    activos: number
    nuevos: number
    recurrentes: number
    ticketPromedio: number
  }
  articulos: {
    sku: number
    rotacion: number
    stockout: number
  }
  metros: {
    totalSalon: number
    metrosCuadrados: number
    facturacionPorMetro: number
  }
}

// Métricas configurables del admin
export interface MetricaConfigurable {
  id: number
  categoria: string
  clave: string
  nombre: string
  descripcion: string | null
  valor: number
  tipo: 'porcentaje' | 'monto' | 'cantidad'
  unidad: string
  activo: boolean
  sucursal_id: string | null
  fecha_desde: string
  fecha_hasta: string | null
  creado_en: string
  actualizado_en: string
  creado_por: string | null
}

// RRHH y Empleados
export interface Empleado {
  id: number
  legajo: string
  apellido: string
  nombre: string
  dni: string
  cuil: string
  sucursal_id: string
  puesto: string
  categoria: 'gerencial' | 'administrativo' | 'operativo' | 'temporal'
  fecha_ingreso: string
  fecha_egreso: string | null
  sueldo_basico: number
  activo: boolean
  creado_en: string
  actualizado_en: string
}

export interface NominaMensual {
  id: number
  periodo_id: number
  sucursal_id: string
  empleado_id: number
  
  // Conceptos de liquidación
  sueldo_basico: number
  horas_extras: number
  premios: number
  bonificaciones: number
  total_remunerativo: number
  
  // Adicionales no remunerativos
  viaticos: number
  total_no_remunerativo: number
  
  // Descuentos
  jubilacion: number
  obra_social: number
  sindicato: number
  seguro_vida: number
  otros_descuentos: number
  total_descuentos: number
  
  // Cargas sociales
  aportes_patronales: number
  art: number
  
  // Resultado
  neto_a_cobrar: number
  costo_total_empresa: number
  
  // Metadata
  dias_trabajados: number
  ausentismos: number
  observaciones: string | null
  archivo_origen: string | null
  creado_en: string
}

export interface CostoEstructural {
  id: number
  periodo_id: number
  sucursal_id: string
  categoria_costo: 'servicios' | 'alquileres' | 'seguros' | 'impuestos' | 'mantenimiento' | 'marketing' | 'otros'
  subcategoria: string
  descripcion: string
  
  importe: number
  importe_variable: number
  importe_fijo: number
  
  tipo_gasto: 'operativo' | 'administrativo' | 'comercial' | 'financiero'
  centro_costo: string | null
  cuenta_contable: string | null
  
  proveedor: string | null
  numero_factura: string | null
  fecha_vencimiento: string | null
  observaciones: string | null
  archivo_origen: string | null
  creado_en: string
}

export interface PlantillaEmpleado {
  id: number
  sucursal_id: string
  legajo: string
  apellido: string
  nombre: string
  puesto: string
  categoria: string
  sueldo_basico_default: number
  activo: boolean
  orden_carga: number
}

// Template para carga de RRHH
export interface TemplateRRHH {
  legajo: string
  apellido: string
  nombre: string
  sueldo_basico: number
  horas_extras?: number
  premios?: number
  bonificaciones?: number
  viaticos?: number
  dias_trabajados?: number
  ausentismos?: number
  observaciones?: string
}

// Template para carga de costos
export interface TemplateCosto {
  categoria_costo: string
  subcategoria: string
  descripcion: string
  importe: number
  importe_variable?: number
  importe_fijo?: number
  tipo_gasto?: string
  proveedor?: string
  numero_factura?: string
  fecha_vencimiento?: string
  observaciones?: string
}

// Configuración consolidada para P&L
export interface ConfiguracionPL {
  ratios: {
    iva: number
    rrhh: number
    gastosComerciales: number
    impuestosOperativos: number
    gastosGenerales: number
    ingresosFinancieros: number
    merma: number
  }
  impuestos: {
    ivaResultado: number
    iibb: number
    tuae: number
  }
  estimaciones: {
    cmvSalon: number
    cmvFrescos: number
  }
  kpis: {
    ticketPromedio: number
    clientesPorVenta: number
    metrosTotales: number
    metrosSalon: number
    skuTotal: number
    rotacionPromedio: number
    stockoutPromedio: number
  }
}

export interface MetricsConDerivados extends Metrics {
  participacionFacturacion: number // % sobre facturación total
  participacionResultadoOperativo: number // % sobre resultado operativo total
  rdoOperativoSobreVentas: number // %
  rdoFinalSobreVentas: number // %
  variacionMesAnterior: number | null // % facturación vs mes anterior
  variacionAnioAnterior: number | null // % facturación vs mismo mes año anterior
}

// --- Catálogo (estructura + parámetros base por subgrupo) ---

interface SubgrupoDef {
  id: string
  nombre: string
  base: number // facturación base mensual (ARS)
  articulos: number
  cmg: number // %
  rrhh: number // %
  rdoOp: number // % operativo/ventas
  acciones: number // % acciones/ventas
  desde?: number // índice de periodo desde el cual está activo (para casos con datos faltantes)
}

interface GrupoDef {
  id: string
  nombre: string
  subgrupos: SubgrupoDef[]
}

interface CategoriaDef {
  id: string
  nombre: string
  grupos: GrupoDef[]
}

interface SeccionDef {
  id: string
  nombre: string
  categorias: CategoriaDef[]
}

function sg(
  id: string,
  nombre: string,
  base: number,
  articulos: number,
  cmg: number,
  rrhh: number,
  rdoOp: number,
  acciones: number,
  desde?: number,
): SubgrupoDef {
  return { id, nombre, base, articulos, cmg, rrhh, rdoOp, acciones, desde }
}

function seeded(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 100000) / 100000
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatName(text: string): string {
  const lowercaseWords = ["y", "de", "con", "sin", "el", "la", "los", "las", "o", "a", "del", "al", "e"];
  const formatWord = (w: string): string => {
    if (w.includes("/")) {
      return w.split("/").map(formatWord).join("/");
    }
    if (w.includes("-") && !w.startsWith("-") && !w.endsWith("-")) {
      return w.split("-").map(formatWord).join("-");
    }
    return w.charAt(0).toUpperCase() + w.slice(1);
  };

  return text
    .toLowerCase()
    .split(" ")
    .map((word, idx) => {
      if (idx > 0 && lowercaseWords.includes(word)) {
        return word;
      }
      return formatWord(word);
    })
    .join(" ");
}

const CATEGORY_NAMES_FORMATTED: Record<string, string> = {
  "ALMACEN": "Almacén",
  "BEBES Y NIÑOS": "Bebés y Niños",
  "BEBIDAS CON ALCOHOL": "Bebidas con Alcohol",
  "BEBIDAS SIN ALCOHOL": "Bebidas sin Alcohol",
  "CONGELADOS": "Congelados",
  "DESAYUNO": "Desayuno",
  "KIOSCO": "Kiosco",
  "LACTEOS": "Lácteos",
  "LIMPIEZA": "Limpieza",
  "MASCOTAS": "Mascotas",
  "PAPELES": "Papeles",
  "PERFUMERIA": "Perfumería",
  "PRODUCTOS DE FIESTA": "Productos de Fiesta",
  "PRODUCTOS FRESCOS": "Productos Frescos",
  "SIDRAS": "Sidras"
};

const REAL_SALON_STRUCT: Record<string, string[]> = {
  "ALMACEN": [
    "ACEITES",
    "ACETOS Y VINAGRES",
    "ADEREZOS",
    "ARROCES",
    "CONSERVAS",
    "ENCURTIDOS",
    "HARINAS Y PREMEZCLAS",
    "LEGUMBRES SECAS",
    "PANIFICADOS",
    "PASTAS SECAS",
    "PURE Y SALSAS DESHIDRATADAS",
    "REBOZADORES Y PAN RALLADO",
    "SAL Y OTROS CONDIMENTOS",
    "SNACKS",
    "SOPAS CALDOS Y SABORIZADORES",
    "VENTA A DEPARTAMENTO"
  ],
  "BEBES Y NIÑOS": [
    "ALIMENTOS INFANTILES",
    "COLONIAS BEBE",
    "CREMAS EMULSIONES Y ACEITES",
    "CUIDADO E HIGIENE DEL CABELLO",
    "JABON DE TOCADOR BEBE",
    "OTROS DE BEBES Y NIÑOS",
    "PAÑALES",
    "TALCOS Y FECULAS BEBE",
    "TOALLAS HUMEDAS Y PAÑOS BEBE"
  ],
  "BEBIDAS CON ALCOHOL": [
    "APERITIVOS Y COCTEL",
    "CERVEZAS",
    "ESPUMANTES",
    "LICORES",
    "OTRAS BEBIDAS",
    "VINOS",
    "WHISKY Y DESTILADOS"
  ],
  "BEBIDAS SIN ALCOHOL": [
    "AGUAS",
    "AMARGOS",
    "GASEOSAS",
    "ISOTONICAS Y ENERGIZANTES",
    "JUGOS"
  ],
  "CONGELADOS": [
    "COMIDAS PREPARADAS CONGELADAS",
    "CONGELADOS DE CARNE",
    "CONGELADOS DE PESCADO",
    "CONGELADOS DE POLLO",
    "HELADOS/POSTRES",
    "OTROS CONGELADOS",
    "VERDURAS Y FRUTAS CONGELADAS"
  ],
  "DESAYUNO": [
    "AZUCAR Y EDULCORANTES",
    "CACAO",
    "CAFE",
    "CEREALES",
    "DULCES Y MERMELADAS",
    "GALLETITAS",
    "GELATINAS FLANES Y PREMEZCLAS",
    "LECHES",
    "REPOSTERIA",
    "TE",
    "YERBA"
  ],
  "KIOSCO": [
    "ADHESIVOS Y PEGAMENTOS",
    "APOSITOS",
    "FILOS",
    "FOSFOROS Y PALILLOS",
    "GOLOSINAS Y SNACKS",
    "ILUMINACION",
    "PILAS Y BATERIAS",
    "SNACKS SALUDABLES"
  ],
  "LACTEOS": [
    "CREMA DE LECHE",
    "LECHE FRESCA",
    "MANTECA Y MARGARINA",
    "POSTRES DE NIÑOS",
    "POSTRES Y FLANES",
    "QUESOS CREMA Y UNTABLES",
    "YOGURES"
  ],
  "LIMPIEZA": [
    "ACCESORIOS",
    "BAZAR",
    "BOLSAS/ROLLOS",
    "DESODORANTES/DESODORIZANTES",
    "DETERGENTES",
    "ESPONJAS Y OVILLOS DE ACERO",
    "GUANTES",
    "INSECTICIDAS Y REPELENTES",
    "LAVANDINAS",
    "LIMPIADOR HOGAR Y PEQUEÑAS SUPERFICIES",
    "LIMPIADOR PISOS Y GRANDES SUPERFICIES",
    "LIMPIEZA DE ROPA",
    "OTROS DE LIMPIEZA",
    "PROD. PARA CALZADOS Y CUEROS",
    "TEXTIL"
  ],
  "MASCOTAS": [
    "ALIMENTO PARA GATOS",
    "ALIMENTO PARA PERROS",
    "OTROS PRODUCTOS PARA MASCOTAS"
  ],
  "PAPELES": [
    "PAÑUELOS",
    "PAPEL HIGIENICO",
    "ROLLO DE COCINA",
    "SERVILLETAS",
    "OTROS TISSUE"
  ],
  "PERFUMERIA": [
    "ALGODÓN Y OTROS",
    "COLORACION",
    "COSMETICA",
    "CREMAS Y EMULSIONES",
    "CUIDADO E HIGIENE BUCAL",
    "CUIDADO E HIGIENE CABELLO",
    "DESODORANTES",
    "JABONES",
    "LINEA DE AFEITAR",
    "OTROS DE PERFUMERIA",
    "PAÑALES ADULTOS",
    "PERFUMES Y COLONIAS",
    "PROTECCION FEMENINA",
    "SANITIZANTES",
    "TALCOS"
  ],
  "PRODUCTOS DE FIESTA": [
    "BUDINES FIESTA",
    "CONFITURAS FIESTA",
    "HUEVOS DE PASCUA",
    "PAN DULCE",
    "TURRONES FIESTA"
  ],
  "PRODUCTOS FRESCOS": [
    "GRASA",
    "LEVADURA",
    "MILANESAS DE SOJA",
    "PASTAS FRESCAS",
    "SALCHICHAS DE VIENA",
    "TAPAS Y PREPIZZAS"
  ],
  "SIDRAS": [
    "SIDRAS"
  ]
}

function createSubgrupo(id: string, nombre: string): SubgrupoDef {
  const seedVal = seeded(id)
  const base = 5_000_000 + Math.round(seedVal * 35_000_000) // 5M a 40M ARS
  const articulos = 100 + Math.round(seedVal * 1500)
  const cmg = 15 + Math.round(seedVal * 25)
  const rrhh = 5 + seedVal * 5
  const rdoOp = 5 + seedVal * 15
  const acciones = 1 + seedVal * 4
  return sg(id, nombre, base, articulos, cmg, rrhh, rdoOp, acciones)
}

function parseRealSalon(): CategoriaDef[] {
  return Object.entries(REAL_SALON_STRUCT).map(([catNombre, grupos]) => {
    const catId = slugify(catNombre)
    const formattedCatName = CATEGORY_NAMES_FORMATTED[catNombre] || formatName(catNombre)
    return {
      id: catId,
      nombre: formattedCatName,
      grupos: grupos.map((gNombre) => {
        const gId = `${catId}-${slugify(gNombre)}`
        const formattedGName = formatName(gNombre)
        return {
          id: gId,
          nombre: formattedGName,
          subgrupos: [
            createSubgrupo(gId, formattedGName)
          ]
        }
      })
    }
  })
}

export const CATALOGO: SeccionDef[] = [
  {
    id: "salon",
    nombre: "Salón",
    categorias: parseRealSalon(),
  },
  {
    id: "frescos",
    nombre: "Frescos",
    categorias: [
      {
        id: "carniceria",
        nombre: "Carnicería",
        grupos: [
          {
            id: "carniceria-vacuno",
            nombre: "Vacuno",
            subgrupos: [
              sg("cortes-premium", "Cortes Premium", 34_000_000, 90, 21, 8.5, 8, 2.0),
              sg("cortes-populares", "Cortes Populares", 41_000_000, 140, 17, 8.0, 6.5, 1.8),
            ],
          },
          {
            id: "carniceria-otras",
            nombre: "Otras Carnes",
            subgrupos: [
              sg("cerdo", "Cerdo", 15_000_000, 70, 19, 7.8, 7.5, 2.1),
              sg("pollo", "Pollo", 23_000_000, 60, 16, 7.5, 6, 1.9),
            ],
          },
        ],
      },
      {
        id: "verduleria",
        nombre: "Verdulería",
        grupos: [
          {
            id: "verduleria-frutas",
            nombre: "Frutas",
            subgrupos: [sg("frutas-estacion", "Frutas de Estación", 26_000_000, 210, 25, 7.0, 11, 2.5)],
          },
          {
            id: "verduleria-verduras",
            nombre: "Verduras",
            subgrupos: [
              sg("verduras-hoja", "Verduras de Hoja", 14_000_000, 180, 28, 7.2, 12.5, 2.8),
              sg("tuberculos", "Tubérculos", 16_000_000, 95, 24, 6.8, 10, 2.4),
            ],
          },
        ],
      },
      {
        id: "fiambreria",
        nombre: "Fiambrería",
        grupos: [
          {
            id: "fiambreria-fiambres",
            nombre: "Fiambres",
            subgrupos: [
              sg("jamones", "Jamones", 22_000_000, 130, 26, 7.0, 13, 3.0),
              sg("quesos", "Quesos", 25_000_000, 160, 24, 6.8, 12, 3.2),
            ],
          },
        ],
      },
      {
        id: "lacteos",
        nombre: "Lácteos",
        grupos: [
          {
            id: "lacteos-refrigerados",
            nombre: "Refrigerados",
            subgrupos: [
              sg("leches-yogures", "Leches y Yogures", 33_000_000, 290, 18, 6.0, 8.5, 3.4),
              sg("quesos-frescos", "Quesos Frescos", 19_000_000, 150, 22, 6.4, 11, 3.6),
            ],
          },
        ],
      },
      {
        id: "panaderia",
        nombre: "Panadería",
        grupos: [
          {
            id: "panaderia-elaboracion",
            nombre: "Elaboración",
            subgrupos: [
              sg("pan-dia", "Pan del Día", 18_000_000, 45, 35, 9.0, 16, 2.2),
              sg("facturas", "Facturas", 11_000_000, 80, 38, 9.5, 18, 2.6),
            ],
          },
        ],
      },
      {
        id: "rotiseria",
        nombre: "Rotisería",
        grupos: [
          {
            id: "rotiseria-comidas",
            nombre: "Comidas",
            subgrupos: [sg("comidas-listas", "Comidas Listas", 9_500_000, 55, 33, 10.0, 12, 2.0, 12)],
          },
        ],
      },
    ],
  },
]

// --- Periodos disponibles (Ene 2025 → Jul 2026) ---

export interface Periodo {
  key: string // "2026-07"
  anio: number
  mes: number
  index: number
}

export const PERIODOS: Periodo[] = (() => {
  const out: Periodo[] = []
  let index = 0
  for (let anio = 2025; anio <= 2026; anio++) {
    const mesFin = anio === 2026 ? 7 : 12
    for (let mes = 1; mes <= mesFin; mes++) {
      out.push({ key: `${anio}-${String(mes).padStart(2, "0")}`, anio, mes, index })
      index++
    }
  }
  return out
})()

// Periodos seleccionables (los que tienen 12 meses de historia previa para comparar año a año)
export const PERIODOS_SELECCIONABLES = PERIODOS.filter((p) => p.index >= 12)

export const PERIODO_ACTUAL = PERIODOS_SELECCIONABLES[PERIODOS_SELECCIONABLES.length - 1]

// --- Generador determinístico ---


const SEASONAL: Record<number, number> = {
  1: 0.96,
  2: 0.94,
  3: 1.0,
  4: 0.99,
  5: 1.02,
  6: 1.03,
  7: 1.05,
  8: 1.0,
  9: 0.98,
  10: 1.01,
  11: 1.04,
  12: 1.18,
}

function subgrupoMetrics(def: SubgrupoDef, periodo: Periodo): Metrics {
  if (def.desde !== undefined && periodo.index < def.desde) {
    return {
      facturacion: 0,
      iva: 0,
      costo: 0,
      articulos: 0,
      cmg: 0,
      resultadoOperativo: 0,
      rrhhSobreVentas: 0,
      accionesSobreVentas: 0,
      resultadoFinal: 0,
    }
  }
  const trend = Math.pow(1.032, periodo.index) // ~3,2% nominal mensual
  const seasonal = SEASONAL[periodo.mes] ?? 1
  const noise = 0.9 + seeded(`${def.id}-${periodo.index}`) * 0.2 // 0.9..1.1
  const facturacion = Math.round(def.base * trend * seasonal * noise)
  const iva = Math.round(facturacion * 0.21) // IVA 21%
  const costo = Math.round(facturacion * (1 - def.cmg / 100)) // Costo basado en margen

  const rdoOpFactor = 0.85 + seeded(`op-${def.id}-${periodo.index}`) * 0.3
  const rdoOperativo = Math.round((facturacion * def.rdoOp * rdoOpFactor) / 100)
  const acciones = Math.round((facturacion * def.acciones) / 100)
  const resultadoFinal = rdoOperativo - acciones

  return {
    facturacion,
    iva,
    costo,
    articulos: def.articulos,
    cmg: def.cmg,
    resultadoOperativo: rdoOperativo,
    rrhhSobreVentas: def.rrhh,
    accionesSobreVentas: def.acciones,
    resultadoFinal,
  }
}

function emptyMetrics(): Metrics {
  return {
    facturacion: 0,
    iva: 0,
    costo: 0,
    articulos: 0,
    cmg: 0,
    resultadoOperativo: 0,
    rrhhSobreVentas: 0,
    accionesSobreVentas: 0,
    resultadoFinal: 0,
  }
}

function aggregate(items: Metrics[]): Metrics {
  const totalFact = items.reduce((s, m) => s + m.facturacion, 0)
  const acc = items.reduce(
    (a, m) => {
      a.facturacion += m.facturacion
      a.articulos += m.articulos
      a.facturacion += m.facturacion
      a.iva += m.iva
      a.costo += m.costo
      a.articulos += m.articulos
      a.margenBruto += (m.facturacion * m.cmg) / 100
      a.rrhhMonto += (m.facturacion * m.rrhhSobreVentas) / 100
      a.resultadoOperativo += m.resultadoOperativo
      a.acciones += (m.facturacion * m.accionesSobreVentas) / 100
      a.resultadoFinal += m.resultadoFinal
      return a
    },
    { facturacion: 0, iva: 0, costo: 0, articulos: 0, margenBruto: 0, rrhhMonto: 0, resultadoOperativo: 0, acciones: 0, resultadoFinal: 0 },
  )
  return {
    facturacion: acc.facturacion,
    iva: acc.iva,
    costo: acc.costo,
    articulos: acc.articulos,
    cmg: totalFact ? (acc.margenBruto / totalFact) * 100 : 0,
    resultadoOperativo: acc.resultadoOperativo,
    rrhhSobreVentas: totalFact ? (acc.rrhhMonto / totalFact) * 100 : 0,
    accionesSobreVentas: totalFact ? (acc.acciones / totalFact) * 100 : 0,
    resultadoFinal: acc.resultadoFinal,
  }
}

// --- Nodos del cuadro ---

export interface SubgrupoNode {
  id: string
  nombre: string
  metrics: MetricsConDerivados
}
export interface GrupoNode {
  id: string
  nombre: string
  metrics: MetricsConDerivados
  subgrupos: SubgrupoNode[]
}
export interface CategoriaNode {
  id: string
  nombre: string
  seccionId: string
  metrics: MetricsConDerivados
  grupos: GrupoNode[]
}
export interface SeccionNode {
  id: string
  nombre: string
  categorias: CategoriaNode[]
  total: Metrics
}
export interface Cuadro {
  periodo: Periodo
  secciones: SeccionNode[]
  total: Metrics
}

function metricsPorCategoria(catDef: CategoriaDef, periodo: Periodo): Metrics {
  const subs = catDef.grupos.flatMap((g) => g.subgrupos.map((s) => subgrupoMetrics(s, periodo)))
  return aggregate(subs)
}

function periodoRelativo(periodo: Periodo, offset: number): Periodo | null {
  return PERIODOS.find((p) => p.index === periodo.index + offset) ?? null
}

function derivar(
  metrics: Metrics,
  totalFacturacion: number,
  totalResultadoOperativo: number,
  factMesAnterior: number | null,
  factAnioAnterior: number | null,
): MetricsConDerivados {
  return {
    ...metrics,
    participacionFacturacion: totalFacturacion ? (metrics.facturacion / totalFacturacion) * 100 : 0,
    participacionResultadoOperativo: totalResultadoOperativo
      ? (metrics.resultadoOperativo / totalResultadoOperativo) * 100
      : 0,
    rdoOperativoSobreVentas: metrics.facturacion ? (metrics.resultadoOperativo / metrics.facturacion) * 100 : 0,
    rdoFinalSobreVentas: metrics.facturacion ? (metrics.resultadoFinal / metrics.facturacion) * 100 : 0,
    variacionMesAnterior: factMesAnterior ? ((metrics.facturacion - factMesAnterior) / factMesAnterior) * 100 : null,
    variacionAnioAnterior:
      factAnioAnterior ? ((metrics.facturacion - factAnioAnterior) / factAnioAnterior) * 100 : null,
  }
}

// Construye el cuadro completo para un periodo dado, incluyendo variaciones.
// Versión SÍNCRONA con datos simulados (fallback / SSR).
export function getCuadro(periodoKey: string): Cuadro {
  const periodo = PERIODOS.find((p) => p.key === periodoKey) ?? PERIODO_ACTUAL
  const prev = periodoRelativo(periodo, -1)
  const yoy = periodoRelativo(periodo, -12)

  // Totales del periodo para participaciones
  let totalFacturacion = 0
  let totalResultadoOperativo = 0
  for (const sec of CATALOGO) {
    for (const cat of sec.categorias) {
      const m = metricsPorCategoria(cat, periodo)
      totalFacturacion += m.facturacion
      totalResultadoOperativo += m.resultadoOperativo
    }
  }

  const secciones: SeccionNode[] = CATALOGO.map((secDef) => {
    const categorias: CategoriaNode[] = secDef.categorias.map((catDef) => {
      const catMetrics = metricsPorCategoria(catDef, periodo)
      const catPrev = prev ? metricsPorCategoria(catDef, prev) : null
      const catYoy = yoy ? metricsPorCategoria(catDef, yoy) : null
      const catDeriv = derivar(
        catMetrics,
        totalFacturacion,
        totalResultadoOperativo,
        catPrev ? catPrev.facturacion : null,
        catYoy ? catYoy.facturacion : null,
      )

      const grupos: GrupoNode[] = catDef.grupos.map((gDef) => {
        const gSubsMetrics = gDef.subgrupos.map((s) => subgrupoMetrics(s, periodo))
        const gMetrics = aggregate(gSubsMetrics)

        const gPrev = prev ? aggregate(gDef.subgrupos.map((s) => subgrupoMetrics(s, prev))) : null
        const gYoy = yoy ? aggregate(gDef.subgrupos.map((s) => subgrupoMetrics(s, yoy))) : null

        const gDeriv = derivar(
          gMetrics,
          catMetrics.facturacion,
          catMetrics.resultadoOperativo,
          gPrev ? gPrev.facturacion : null,
          gYoy ? gYoy.facturacion : null,
        )

        const subgrupos: SubgrupoNode[] = gDef.subgrupos.map((sDef, i) => {
          const sMetrics = gSubsMetrics[i]
          const sPrev = prev ? subgrupoMetrics(sDef, prev) : null
          const sYoy = yoy ? subgrupoMetrics(sDef, yoy) : null
          const sDeriv = derivar(
            sMetrics,
            gMetrics.facturacion,
            gMetrics.resultadoOperativo,
            sPrev ? sPrev.facturacion : null,
            sYoy ? sYoy.facturacion : null,
          )
          return { id: sDef.id, nombre: sDef.nombre, metrics: sDeriv }
        })
        return { id: gDef.id, nombre: gDef.nombre, metrics: gDeriv, subgrupos }
      })

      return {
        id: catDef.id,
        nombre: catDef.nombre,
        seccionId: secDef.id,
        metrics: catDeriv,
        grupos,
      }
    })

    const total = aggregate(categorias.map((c) => c.metrics))
    return { id: secDef.id, nombre: secDef.nombre, categorias, total }
  })

  const total = aggregate(secciones.flatMap((s) => s.categorias.map((c) => c.metrics)))

  return { periodo, secciones, total }
}

// Versión ASÍNCRONA: lee exclusivamente de Supabase. Devuelve null si no hay datos.
export async function getCuadroAsync(periodoKey: string, sucursalId = '__consolidado__'): Promise<Cuadro | null> {
  try {
    const { getCuadroFromDB } = await import('./data-db')
    return await getCuadroFromDB(periodoKey, sucursalId)
  } catch (err) {
    console.error('[data] Error al cargar de Supabase:', err)
    return null
  }
}

// Serie histórica de una métrica consolidada (para gráficos de evolución).
export type MetricaSerie = "facturacion" | "resultadoOperativo" | "resultadoFinal"

export interface PuntoSerie {
  key: string
  anio: number
  mes: number
  facturacion: number
  resultadoOperativo: number
  resultadoFinal: number
}

export function serieConsolidada(desdeIndex = 6): PuntoSerie[] {
  return PERIODOS.filter((p) => p.index >= desdeIndex).map((periodo) => {
    let facturacion = 0
    let resultadoOperativo = 0
    let resultadoFinal = 0
    for (const sec of CATALOGO) {
      for (const cat of sec.categorias) {
        const m = metricsPorCategoria(cat, periodo)
        facturacion += m.facturacion
        resultadoOperativo += m.resultadoOperativo
        resultadoFinal += m.resultadoFinal
      }
    }
    return { key: periodo.key, anio: periodo.anio, mes: periodo.mes, facturacion, resultadoOperativo, resultadoFinal }
  })
}

export function seriePorCategoria(categoriaId: string, desdeIndex = 6): PuntoSerie[] {
  const catDef = CATALOGO.flatMap((s) => s.categorias).find((c) => c.id === categoriaId)
  if (!catDef) return []
  return PERIODOS.filter((p) => p.index >= desdeIndex).map((periodo) => {
    const m = metricsPorCategoria(catDef, periodo)
    return {
      key: periodo.key,
      anio: periodo.anio,
      mes: periodo.mes,
      facturacion: m.facturacion,
      resultadoOperativo: m.resultadoOperativo,
      resultadoFinal: m.resultadoFinal,
    }
  })
}

export function todasLasCategorias(): { id: string; nombre: string; seccion: string }[] {
  return CATALOGO.flatMap((s) => s.categorias.map((c) => ({ id: c.id, nombre: c.nombre, seccion: s.nombre })))
}

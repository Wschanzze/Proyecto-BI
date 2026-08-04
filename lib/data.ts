// ---------------------------------------------------------------------------
// Modelo de datos del Cuadro de Resultados — Supermercados Monarca
// Jerarquía: Sección → Categoría → Grupo → Subgrupo
// Datos de EJEMPLO generados de forma determinística. En producción estos datos
// provendrán de Supabase (tablas resultados_categoria / resultados_grupo / etc.).
// ---------------------------------------------------------------------------

export interface Metrics {
  facturacion: number // Facturación s/IVA
  articulos: number // Cantidad de artículos
  cmg: number // Contribución Marginal (%)
  resultadoOperativo: number // Resultado Operativo (monto)
  rrhhSobreVentas: number // RRHH / Ventas (%)
  accionesSobreVentas: number // Acciones s/Ventas sin IVA (%)
  resultadoFinal: number // Resultado Final (monto)
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

export const CATALOGO: SeccionDef[] = [
  {
    id: "salon",
    nombre: "Salón",
    categorias: [
      {
        id: "almacen",
        nombre: "Almacén",
        grupos: [
          {
            id: "almacen-secos",
            nombre: "Secos",
            subgrupos: [
              sg("fideos-arroz", "Fideos y Arroz", 42_000_000, 1240, 24, 6.5, 11, 3.2),
              sg("aceites", "Aceites", 28_000_000, 420, 19, 5.8, 8.5, 2.8),
              sg("conservas", "Conservas", 18_500_000, 980, 26, 6.2, 12, 3.5),
            ],
          },
          {
            id: "almacen-desayuno",
            nombre: "Desayuno",
            subgrupos: [
              sg("infusiones", "Infusiones", 22_000_000, 560, 28, 6.0, 13, 3.6),
              sg("galletitas", "Galletitas", 19_000_000, 740, 25, 6.4, 11.5, 3.9),
            ],
          },
        ],
      },
      {
        id: "bebidas",
        nombre: "Bebidas",
        grupos: [
          {
            id: "bebidas-sin",
            nombre: "Sin Alcohol",
            subgrupos: [
              sg("gaseosas", "Gaseosas", 38_000_000, 320, 18, 5.2, 9, 4.5),
              sg("aguas-jugos", "Aguas y Jugos", 21_000_000, 410, 21, 5.6, 10.5, 3.8),
            ],
          },
          {
            id: "bebidas-con",
            nombre: "Con Alcohol",
            subgrupos: [
              sg("vinos", "Vinos", 31_000_000, 690, 27, 5.0, 15, 4.0),
              sg("cervezas", "Cervezas", 26_000_000, 240, 22, 5.4, 12, 4.2),
            ],
          },
        ],
      },
      {
        id: "perfumeria",
        nombre: "Perfumería",
        grupos: [
          {
            id: "perfumeria-personal",
            nombre: "Cuidado Personal",
            subgrupos: [
              sg("higiene", "Higiene", 17_000_000, 830, 30, 6.8, 14, 4.8),
              sg("cosmetica", "Cosmética", 12_500_000, 520, 34, 7.2, 16, 5.5),
            ],
          },
        ],
      },
      {
        id: "limpieza",
        nombre: "Limpieza",
        grupos: [
          {
            id: "limpieza-hogar",
            nombre: "Hogar",
            subgrupos: [
              sg("lavandina-detergentes", "Lavandina y Detergentes", 20_000_000, 610, 23, 6.0, 11, 4.0),
              sg("papeleria", "Papelería", 24_000_000, 380, 20, 5.5, 9.5, 3.7),
            ],
          },
        ],
      },
      {
        id: "golosinas",
        nombre: "Golosinas",
        grupos: [
          {
            id: "golosinas-dulces",
            nombre: "Dulces",
            subgrupos: [
              sg("chocolates", "Chocolates", 14_000_000, 470, 32, 6.5, 15, 5.0),
              sg("caramelos", "Caramelos", 8_000_000, 350, 29, 6.2, 13.5, 4.6),
            ],
          },
        ],
      },
    ],
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
            // Rubro nuevo: recién abre a partir del periodo índice 12 → periodos previos vacíos.
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

function seeded(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  // normaliza a [0,1)
  return ((h >>> 0) % 100000) / 100000
}

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

  const rdoOpFactor = 0.85 + seeded(`op-${def.id}-${periodo.index}`) * 0.3
  const rdoOperativo = Math.round((facturacion * def.rdoOp * rdoOpFactor) / 100)
  const acciones = Math.round((facturacion * def.acciones) / 100)
  const resultadoFinal = rdoOperativo - acciones

  return {
    facturacion,
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
      a.margenBruto += (m.facturacion * m.cmg) / 100
      a.rrhhMonto += (m.facturacion * m.rrhhSobreVentas) / 100
      a.resultadoOperativo += m.resultadoOperativo
      a.acciones += (m.facturacion * m.accionesSobreVentas) / 100
      a.resultadoFinal += m.resultadoFinal
      return a
    },
    { facturacion: 0, articulos: 0, margenBruto: 0, rrhhMonto: 0, resultadoOperativo: 0, acciones: 0, resultadoFinal: 0 },
  )
  return {
    facturacion: acc.facturacion,
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
        const gDeriv = derivar(gMetrics, catMetrics.facturacion, catMetrics.resultadoOperativo, null, null)

        const subgrupos: SubgrupoNode[] = gDef.subgrupos.map((sDef, i) => {
          const sMetrics = gSubsMetrics[i]
          const sDeriv = derivar(sMetrics, gMetrics.facturacion, gMetrics.resultadoOperativo, null, null)
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

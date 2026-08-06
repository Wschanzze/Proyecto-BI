// ---------------------------------------------------------------------------
// lib/data-db.ts
// Capa de acceso a datos reales desde Supabase.
// Construye el mismo árbol Cuadro que data.ts pero usando datos reales de DB.
// Si un período no tiene datos en DB, devuelve null (la app usa fallback simulado).
// ---------------------------------------------------------------------------

import { supabase, type DBResultadoGrupo, type DBPeriodo } from './supabase'
import type {
  Metrics,
  MetricsConDerivados,
  Periodo,
  Cuadro,
  SeccionNode,
  CategoriaNode,
  GrupoNode,
  SubgrupoNode,
} from './data'

// ────────────────────────────────────────────────────────────────────────────
// Cache en memoria para el catálogo (estructura estática)
// Se carga una vez y se reutiliza en todas las llamadas
// ────────────────────────────────────────────────────────────────────────────

type CatalogoCache = {
  secciones: { id: string; nombre: string; orden: number }[]
  categorias: { id: string; seccion_id: string; nombre: string; orden: number }[]
  grupos: { id: string; categoria_id: string; nombre: string; orden: number }[]
} | null

let catalogoCache: CatalogoCache = null

async function loadCatalogo(): Promise<NonNullable<CatalogoCache>> {
  if (catalogoCache) return catalogoCache

  const [secRes, catRes, grpRes] = await Promise.all([
    supabase.from('secciones').select('*').order('orden'),
    supabase.from('categorias').select('*').order('orden'),
    supabase.from('grupos').select('*').order('orden'),
  ])

  if (secRes.error || catRes.error || grpRes.error) {
    throw new Error(
      `Error al cargar catálogo: ${secRes.error?.message ?? catRes.error?.message ?? grpRes.error?.message}`
    )
  }

  catalogoCache = {
    secciones: secRes.data ?? [],
    categorias: catRes.data ?? [],
    grupos: grpRes.data ?? [],
  }
  return catalogoCache
}

// Limpia el cache (útil cuando se carga un nuevo período)
export function invalidateCatalogoCache() {
  catalogoCache = null
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers de métricas (misma lógica que aggregate() en data.ts)
// ────────────────────────────────────────────────────────────────────────────

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

function metricsFromDB(row: DBResultadoGrupo): Metrics {
  return {
    facturacion: Number(row.facturacion),
    articulos: row.articulos,
    cmg: Number(row.cmg_pct),
    resultadoOperativo: Number(row.resultado_operativo),
    rrhhSobreVentas: Number(row.rrhh_pct),
    accionesSobreVentas: Number(row.acciones_pct),
    resultadoFinal: Number(row.resultado_final),
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
    { facturacion: 0, articulos: 0, margenBruto: 0, rrhhMonto: 0, resultadoOperativo: 0, acciones: 0, resultadoFinal: 0 }
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

function derivar(
  metrics: Metrics,
  totalFacturacion: number,
  totalResultadoOperativo: number,
  factMesAnterior: number | null,
  factAnioAnterior: number | null
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
    variacionAnioAnterior: factAnioAnterior ? ((metrics.facturacion - factAnioAnterior) / factAnioAnterior) * 100 : null,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Función principal: carga el cuadro desde Supabase
// Devuelve null si no hay datos para ese período
// ────────────────────────────────────────────────────────────────────────────

export async function getCuadroFromDB(periodoKey: string): Promise<Cuadro | null> {
  try {
    // 1. Buscar el período en DB
    const { data: periodoData, error: periodoError } = await supabase
      .from('periodos')
      .select('*')
      .eq('key', periodoKey)
      .single()

    if (periodoError || !periodoData) {
      // Período no cargado en DB → usar fallback simulado
      return null
    }

    const dbPeriodo = periodoData as DBPeriodo

    // 2. Cargar el catálogo (con cache)
    const catalogo = await loadCatalogo()

    if (!catalogo.secciones.length || !catalogo.grupos.length) {
      return null // Catálogo vacío → usar fallback
    }

    // 3. Cargar los resultados del período
    const { data: resultados, error: resultError } = await supabase
      .from('resultados_grupo')
      .select('*')
      .eq('periodo_id', dbPeriodo.id)

    if (resultError || !resultados?.length) {
      return null // Sin datos de resultados → usar fallback
    }

    const resultadosPorGrupo = new Map<string, DBResultadoGrupo>()
    for (const r of resultados as DBResultadoGrupo[]) {
      resultadosPorGrupo.set(r.grupo_id, r)
    }

    // 4. Cargar períodos anterior y año anterior para variaciones
    const periodo: Periodo = {
      key: dbPeriodo.key,
      anio: dbPeriodo.anio,
      mes: dbPeriodo.mes,
      index: 0, // no usado en DB path
    }

    // Obtener facturación del mes anterior por grupo
    const prevKey = getPrevKey(periodoKey)
    const yoyKey = getYoyKey(periodoKey)

    const prevMap = await loadResultadosMap(prevKey)
    const yoyMap = await loadResultadosMap(yoyKey)

    // 5. Construir el árbol
    let totalFacturacion = 0
    let totalResultadoOperativo = 0

    // Primera pasada: calcular totales
    for (const sec of catalogo.secciones) {
      const catsDeSec = catalogo.categorias.filter((c) => c.seccion_id === sec.id)
      for (const cat of catsDeSec) {
        const gruposDeCat = catalogo.grupos.filter((g) => g.categoria_id === cat.id)
        for (const g of gruposDeCat) {
          const r = resultadosPorGrupo.get(g.id)
          if (r) {
            totalFacturacion += Number(r.facturacion)
            totalResultadoOperativo += Number(r.resultado_operativo)
          }
        }
      }
    }

    // Segunda pasada: construir nodos
    const secciones: SeccionNode[] = catalogo.secciones
      .sort((a, b) => a.orden - b.orden)
      .map((sec) => {
        const catsDeSec = catalogo.categorias
          .filter((c) => c.seccion_id === sec.id)
          .sort((a, b) => a.orden - b.orden)

        const categorias: CategoriaNode[] = catsDeSec.map((cat) => {
          const gruposDeCat = catalogo.grupos
            .filter((g) => g.categoria_id === cat.id)
            .sort((a, b) => a.orden - b.orden)

          const grupos: GrupoNode[] = gruposDeCat.map((g) => {
            const r = resultadosPorGrupo.get(g.id)
            const gMetrics = r ? metricsFromDB(r) : emptyMetrics()

            // Un grupo en la DB aparece como un "subgrupo" con el mismo nombre
            const subgrupo: SubgrupoNode = {
              id: g.id,
              nombre: g.nombre,
              metrics: derivar(gMetrics, gMetrics.facturacion, gMetrics.resultadoOperativo, null, null),
            }

            return {
              id: g.id,
              nombre: g.nombre,
              metrics: derivar(gMetrics, totalFacturacion, totalResultadoOperativo, null, null),
              subgrupos: [subgrupo],
            }
          })

          const catMetrics = aggregate(grupos.map((g) => g.metrics))
          const prevFact = getPrevFactForCat(cat.id, catsDeSec, catalogo.grupos, prevMap)
          const yoyFact = getPrevFactForCat(cat.id, catsDeSec, catalogo.grupos, yoyMap)

          return {
            id: cat.id,
            nombre: cat.nombre,
            seccionId: sec.id,
            metrics: derivar(catMetrics, totalFacturacion, totalResultadoOperativo, prevFact, yoyFact),
            grupos,
          }
        })

        const total = aggregate(categorias.map((c) => c.metrics))
        return { id: sec.id, nombre: sec.nombre, categorias, total }
      })

    const total = aggregate(secciones.flatMap((s) => s.categorias.map((c) => c.metrics)))

    return { periodo, secciones, total }
  } catch (err) {
    console.warn('[data-db] Error al cargar desde Supabase, usando datos simulados:', err)
    return null
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers para variaciones (mes anterior / año anterior)
// ────────────────────────────────────────────────────────────────────────────

function getPrevKey(key: string): string | null {
  const [anio, mes] = key.split('-').map(Number)
  if (mes === 1) return `${anio - 1}-12`
  return `${anio}-${String(mes - 1).padStart(2, '0')}`
}

function getYoyKey(key: string): string | null {
  const [anio, mes] = key.split('-').map(Number)
  return `${anio - 1}-${String(mes).padStart(2, '0')}`
}

async function loadResultadosMap(key: string | null): Promise<Map<string, number>> {
  if (!key) return new Map()
  const { data: p } = await supabase.from('periodos').select('id').eq('key', key).single()
  if (!p) return new Map()
  const { data: r } = await supabase.from('resultados_grupo').select('grupo_id, facturacion').eq('periodo_id', p.id)
  const map = new Map<string, number>()
  for (const row of r ?? []) {
    map.set(row.grupo_id, Number(row.facturacion))
  }
  return map
}

function getPrevFactForCat(
  catId: string,
  _cats: { id: string }[],
  grupos: { id: string; categoria_id: string }[],
  prevMap: Map<string, number>
): number | null {
  const gruposDeCat = grupos.filter((g) => g.categoria_id === catId)
  if (!gruposDeCat.length) return null
  let total = 0
  let found = false
  for (const g of gruposDeCat) {
    const f = prevMap.get(g.id)
    if (f !== undefined) {
      total += f
      found = true
    }
  }
  return found ? total : null
}

// ────────────────────────────────────────────────────────────────────────────
// Períodos disponibles en DB
// ────────────────────────────────────────────────────────────────────────────

export async function getPeriodosDB(): Promise<Periodo[]> {
  const { data, error } = await supabase
    .from('periodos')
    .select('key, anio, mes')
    .order('anio')
    .order('mes')

  if (error || !data?.length) return []

  return (data as { key: string; anio: number; mes: number }[]).map((p, i) => ({
    key: p.key,
    anio: p.anio,
    mes: p.mes,
    index: i,
  }))
}

// ────────────────────────────────────────────────────────────────────────────
// Guardar un período y sus resultados en DB
// Usado desde la pantalla de carga de datos
// ────────────────────────────────────────────────────────────────────────────

export interface ResultadoGrupoInput {
  grupo_id: string
  facturacion: number
  articulos: number
  cmg_pct: number
  resultado_operativo: number
  rrhh_pct: number
  acciones_pct: number
  resultado_final: number
}

export async function guardarResultados(
  anio: number,
  mes: number,
  archivo: string,
  resultados: ResultadoGrupoInput[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    const key = `${anio}-${String(mes).padStart(2, '0')}`

    // Upsert período
    const { data: periodoData, error: periodoError } = await supabase
      .from('periodos')
      .upsert({ key, anio, mes, archivo_nombre: archivo }, { onConflict: 'key' })
      .select('id')
      .single()

    if (periodoError || !periodoData) {
      return { ok: false, error: periodoError?.message ?? 'Error al crear período' }
    }

    const periodoId = periodoData.id

    // Insertar / actualizar resultados
    const rows = resultados.map((r) => ({ ...r, periodo_id: periodoId }))
    const { error: insertError } = await supabase
      .from('resultados_grupo')
      .upsert(rows, { onConflict: 'periodo_id,grupo_id' })

    if (insertError) {
      return { ok: false, error: insertError.message }
    }

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

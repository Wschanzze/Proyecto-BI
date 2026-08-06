// ---------------------------------------------------------------------------
// lib/data-db.ts
// Capa de acceso a datos reales desde Supabase.
//
// Estructura real de DB:   Categoría → Sector → Grupo
// Estructura app (data.ts): Sección   → Categoría → Grupo → (Subgrupo leaf)
//
// Mapeo:
//   DB.categorias  →  app: SeccionNode  (Salon, Frescos)
//   DB.sectores    →  app: CategoriaNode (ALMACEN, BEBES Y NIÑOS, ...)
//   DB.grupos      →  app: GrupoNode con un subgrupo "leaf" de mismo nombre
//
// Los resultados se agregan sumando las 5 sucursales.
// Métricas derivadas calculadas en esta capa:
//   CMg      = facturacion - costo
//   CMg%     = CMg / facturacion × 100
//   Rdo. Operativo = CMg  (RRHH y Acciones → 2da etapa)
//   Rdo. Final     = CMg  (idem)
// ---------------------------------------------------------------------------

import { supabase } from './supabase'
import type { DBCategoria, DBSector, DBGrupo, DBPeriodo, DBResultado, ResultadoInput } from './supabase'
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
// Cache del catálogo (estructura estática, se carga una vez)
// ────────────────────────────────────────────────────────────────────────────

type CatalogoCache = {
  categorias: DBCategoria[]
  sectores: DBSector[]
  grupos: DBGrupo[]
} | null

let catalogoCache: CatalogoCache = null

async function loadCatalogo(): Promise<NonNullable<CatalogoCache>> {
  if (catalogoCache) return catalogoCache

  const [catRes, secRes, grpRes] = await Promise.all([
    supabase.from('categorias').select('*').order('orden'),
    supabase.from('sectores').select('*').order('orden'),
    supabase.from('grupos').select('*').order('orden'),
  ])

  if (catRes.error || secRes.error || grpRes.error) {
    throw new Error(
      `Error cargando catálogo: ${catRes.error?.message ?? secRes.error?.message ?? grpRes.error?.message}`
    )
  }

  catalogoCache = {
    categorias: (catRes.data ?? []) as DBCategoria[],
    sectores: (secRes.data ?? []) as DBSector[],
    grupos: (grpRes.data ?? []) as DBGrupo[],
  }
  return catalogoCache
}

export function invalidateCatalogoCache() {
  catalogoCache = null
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers de métricas
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

/**
 * Convierte una fila de DB en Metrics.
 * CMg = facturacion - costo
 * Rdo. Operativo = CMg (sin RRHH/Acciones por ahora — 2da etapa)
 */
function metricsFromRaw(facturacion: number, costo: number, cantidad: number): Metrics {
  const cmgMonto = facturacion - costo
  const cmgPct = facturacion > 0 ? (cmgMonto / facturacion) * 100 : 0
  return {
    facturacion,
    articulos: cantidad,
    cmg: cmgPct,
    resultadoOperativo: cmgMonto,  // Fase 1: sin descontar RRHH
    rrhhSobreVentas: 0,            // Fase 2
    accionesSobreVentas: 0,        // Fase 2
    resultadoFinal: cmgMonto,      // Fase 1: sin descontar Acciones
  }
}

function aggregate(items: Metrics[]): Metrics {
  if (!items.length) return emptyMetrics()
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
    cmg: totalFact > 0 ? (acc.margenBruto / totalFact) * 100 : 0,
    resultadoOperativo: acc.resultadoOperativo,
    rrhhSobreVentas: totalFact > 0 ? (acc.rrhhMonto / totalFact) * 100 : 0,
    accionesSobreVentas: totalFact > 0 ? (acc.acciones / totalFact) * 100 : 0,
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
    participacionFacturacion: totalFacturacion > 0 ? (metrics.facturacion / totalFacturacion) * 100 : 0,
    participacionResultadoOperativo: totalResultadoOperativo > 0
      ? (metrics.resultadoOperativo / totalResultadoOperativo) * 100
      : 0,
    rdoOperativoSobreVentas: metrics.facturacion > 0 ? (metrics.resultadoOperativo / metrics.facturacion) * 100 : 0,
    rdoFinalSobreVentas: metrics.facturacion > 0 ? (metrics.resultadoFinal / metrics.facturacion) * 100 : 0,
    variacionMesAnterior: factMesAnterior ? ((metrics.facturacion - factMesAnterior) / factMesAnterior) * 100 : null,
    variacionAnioAnterior: factAnioAnterior ? ((metrics.facturacion - factAnioAnterior) / factAnioAnterior) * 100 : null,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Función principal: construye el Cuadro desde Supabase
// Devuelve null si el período no existe en DB → la app usa datos simulados
// ────────────────────────────────────────────────────────────────────────────

export async function getCuadroFromDB(periodoKey: string): Promise<Cuadro | null> {
  try {
    // 1. Buscar el período
    const { data: periodoData, error: periodoError } = await supabase
      .from('periodos')
      .select('*')
      .eq('key', periodoKey)
      .single()

    if (periodoError || !periodoData) return null  // → usar simulado

    const dbPeriodo = periodoData as DBPeriodo
    const periodo: Periodo = {
      key: dbPeriodo.key,
      anio: dbPeriodo.anio,
      mes: dbPeriodo.mes,
      index: 0,
    }

    // 2. Cargar catálogo (con cache)
    const catalogo = await loadCatalogo()
    if (!catalogo.categorias.length || !catalogo.grupos.length) return null

    // 3. Cargar todos los resultados del período (todas las sucursales)
    const { data: resultados, error: resError } = await supabase
      .from('resultados')
      .select('grupo_id, cantidad, facturacion, iva, costo')
      .eq('periodo_id', dbPeriodo.id)

    if (resError || !resultados?.length) return null

    // 4. Agregar por grupo sumando todas las sucursales
    const porGrupo = new Map<string, { facturacion: number; costo: number; cantidad: number }>()
    for (const r of resultados as DBResultado[]) {
      const prev = porGrupo.get(r.grupo_id) ?? { facturacion: 0, costo: 0, cantidad: 0 }
      porGrupo.set(r.grupo_id, {
        facturacion: prev.facturacion + Number(r.facturacion),
        costo: prev.costo + Number(r.costo),
        cantidad: prev.cantidad + Number(r.cantidad),
      })
    }

    // 5. Cargar facturación mes anterior y año anterior para variaciones
    const prevMap = await loadFacturacionMap(getPrevKey(periodoKey))
    const yoyMap  = await loadFacturacionMap(getYoyKey(periodoKey))

    // 6. Primera pasada: totales globales
    let totalFacturacion = 0
    let totalResultadoOperativo = 0
    for (const [, v] of porGrupo) {
      const m = metricsFromRaw(v.facturacion, v.costo, v.cantidad)
      totalFacturacion += m.facturacion
      totalResultadoOperativo += m.resultadoOperativo
    }

    // 7. Construir árbol: DB.categorias → SeccionNode
    const secciones: SeccionNode[] = catalogo.categorias
      .sort((a, b) => a.orden - b.orden)
      .map((cat) => {
        const sectoresDeCat = catalogo.sectores
          .filter((s) => s.categoria_id === cat.id)
          .sort((a, b) => a.orden - b.orden)

        // DB.sectores → CategoriaNode
        const categorias: CategoriaNode[] = sectoresDeCat.map((sec) => {
          const gruposDeSec = catalogo.grupos
            .filter((g) => g.sector_id === sec.id)
            .sort((a, b) => a.orden - b.orden)

          // DB.grupos → GrupoNode (con un SubgrupoNode leaf del mismo nombre)
          const grupos: GrupoNode[] = gruposDeSec.map((g) => {
            const raw = porGrupo.get(g.id)
            const gMetrics = raw
              ? metricsFromRaw(raw.facturacion, raw.costo, raw.cantidad)
              : emptyMetrics()

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
          const prevFact = sumFactFromMap(sec.id, catalogo.grupos, prevMap)
          const yoyFact  = sumFactFromMap(sec.id, catalogo.grupos, yoyMap)

          return {
            id: sec.id,
            nombre: sec.nombre,
            seccionId: cat.id,
            metrics: derivar(catMetrics, totalFacturacion, totalResultadoOperativo, prevFact, yoyFact),
            grupos,
          }
        })

        const total = aggregate(categorias.map((c) => c.metrics))
        return { id: cat.id, nombre: cat.nombre, categorias, total }
      })

    const total = aggregate(secciones.flatMap((s) => s.categorias.map((c) => c.metrics)))
    return { periodo, secciones, total }
  } catch (err) {
    console.warn('[data-db] Error al leer de Supabase, usando datos simulados:', err)
    return null
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers para variaciones temporales
// ────────────────────────────────────────────────────────────────────────────

function getPrevKey(key: string): string {
  const [anio, mes] = key.split('-').map(Number)
  return mes === 1 ? `${anio - 1}-12` : `${anio}-${String(mes - 1).padStart(2, '0')}`
}

function getYoyKey(key: string): string {
  const [anio, mes] = key.split('-').map(Number)
  return `${anio - 1}-${String(mes).padStart(2, '0')}`
}

/** Carga un mapa grupo_id → facturación_total para un período (sumando sucursales) */
async function loadFacturacionMap(key: string): Promise<Map<string, number>> {
  const { data: p } = await supabase.from('periodos').select('id').eq('key', key).single()
  if (!p) return new Map()
  const { data: rows } = await supabase
    .from('resultados')
    .select('grupo_id, facturacion')
    .eq('periodo_id', p.id)
  const map = new Map<string, number>()
  for (const row of rows ?? []) {
    const prev = map.get(row.grupo_id) ?? 0
    map.set(row.grupo_id, prev + Number(row.facturacion))
  }
  return map
}

/** Suma la facturación de todos los grupos de un sector desde el mapa */
function sumFactFromMap(
  sectorId: string,
  grupos: DBGrupo[],
  map: Map<string, number>
): number | null {
  const gruposDeSec = grupos.filter((g) => g.sector_id === sectorId)
  let total = 0
  let found = false
  for (const g of gruposDeSec) {
    const f = map.get(g.id)
    if (f !== undefined) { total += f; found = true }
  }
  return found ? total : null
}

// ────────────────────────────────────────────────────────────────────────────
// Períodos disponibles en DB (para el selector de período)
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
// Guardar resultados en DB (desde la pantalla de carga)
// ────────────────────────────────────────────────────────────────────────────

export async function guardarResultados(
  anio: number,
  mes: number,
  label: string,         // 'jun-26'
  archivo: string,
  filas: ResultadoInput[]
): Promise<{ ok: boolean; insertados?: number; error?: string }> {
  try {
    const key = `${anio}-${String(mes).padStart(2, '0')}`

    // Upsert período
    const { data: periodoData, error: periodoErr } = await supabase
      .from('periodos')
      .upsert({ key, anio, mes, label, archivo_nombre: archivo }, { onConflict: 'key' })
      .select('id')
      .single()

    if (periodoErr || !periodoData) {
      return { ok: false, error: periodoErr?.message ?? 'Error al crear período' }
    }

    const periodoId = periodoData.id

    // Upsert resultados en lotes de 200
    for (let i = 0; i < filas.length; i += 200) {
      const batch = filas.slice(i, i + 200).map((f) => ({ ...f, periodo_id: periodoId }))
      const { error: insertErr } = await supabase
        .from('resultados')
        .upsert(batch, { onConflict: 'periodo_id,sucursal_id,grupo_id' })
      if (insertErr) return { ok: false, error: `Lote ${i}: ${insertErr.message}` }
    }

    return { ok: true, insertados: filas.length }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

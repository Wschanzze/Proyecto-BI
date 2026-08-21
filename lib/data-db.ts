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
// Los resultados se agregan sumando las 5 sucursales (Consolidado) o filtrando por sucursal.
// Métricas derivadas calculadas en esta capa:
//   CMg      = facturacion - costo
//   CMg%     = CMg / facturacion × 100
//   Rdo. Operativo = CMg  (RRHH y Acciones → 2da etapa)
//   Rdo. Final     = CMg  (idem)
// ---------------------------------------------------------------------------

import { supabase } from './supabase'
import type { DBCategoria, DBSector, DBGrupo, DBPeriodo, DBResultado, DBSucursal } from './supabase'
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
// Cache del catálogo (se carga una vez)
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

function metricsFromRaw(facturacionConIva: number, iva: number, costo: number, cantidad: number): Metrics {
  const ventasSinIva = facturacionConIva - iva
  const cmgMonto = ventasSinIva - costo
  const cmgPct = ventasSinIva > 0 ? (cmgMonto / ventasSinIva) * 100 : 0
  return {
    facturacion: facturacionConIva, // Facturación bruta con IVA (Línea 1 del Cuadro Simplificado)
    iva,
    costo,
    articulos: cantidad,
    cmg: cmgPct,
    resultadoOperativo: cmgMonto,
    rrhhSobreVentas: 0,
    accionesSobreVentas: 0,
    resultadoFinal: cmgMonto,
  }
}

function aggregate(items: Metrics[]): Metrics {
  if (!items.length) return emptyMetrics()
  const totalFact = items.reduce((s, m) => s + m.facturacion, 0)
  const acc = items.reduce(
    (a, m) => {
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
    { facturacion: 0, iva: 0, costo: 0, articulos: 0, margenBruto: 0, rrhhMonto: 0, resultadoOperativo: 0, acciones: 0, resultadoFinal: 0 }
  )
  return {
    facturacion: acc.facturacion,
    iva: acc.iva,
    costo: acc.costo,
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
// Función principal: construye el Cuadro desde Supabase (filtrado por sucursal)
// ────────────────────────────────────────────────────────────────────────────

export async function getCuadroFromDB(periodoKey: string, sucursalId = '__consolidado__'): Promise<Cuadro | null> {
  try {
    // 1. Buscar el período
    const { data: periodoData, error: periodoError } = await supabase
      .from('periodos')
      .select('*')
      .eq('key', periodoKey)
      .maybeSingle()

    if (periodoError || !periodoData) return null

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

    // 3. Cargar resultados filtrados por período y opcionalmente por sucursal
    let query = supabase
      .from('resultados')
      .select('grupo_id, cantidad, facturacion, iva, costo')
      .eq('periodo_id', dbPeriodo.id)

    if (sucursalId !== '__consolidado__') {
      query = query.eq('sucursal_id', sucursalId)
    }

    const { data: resultados, error: resError } = await query

    if (resError || !resultados?.length) return null

    // 4. Agregar por grupo sumando todas las filas coincidentes
    const porGrupo = new Map<string, { facturacion: number; iva: number; costo: number; cantidad: number }>()
    for (const r of resultados as DBResultado[]) {
      const prev = porGrupo.get(r.grupo_id) ?? { facturacion: 0, iva: 0, costo: 0, cantidad: 0 }
      porGrupo.set(r.grupo_id, {
        facturacion: prev.facturacion + Number(r.facturacion),
        iva: prev.iva + Number(r.iva),
        costo: prev.costo + Number(r.costo),
        cantidad: prev.cantidad + Number(r.cantidad),
      })
    }

    // 5. Cargar facturación mes anterior y año anterior para variaciones
    const prevMap = await loadFacturacionMap(getPrevKey(periodoKey), sucursalId)
    const yoyMap  = await loadFacturacionMap(getYoyKey(periodoKey), sucursalId)

    // 5b. Cargar costos globales para este período (costos de cadena sin segmentar por sucursal)
    const { data: costosGlobalesRows } = await supabase
      .from('costos_globales')
      .select('grupo_id, costo_total')
      .eq('periodo_key', periodoKey)

    // Mapa: grupo_id → costo_total global
    const costosGlobalesMap = new Map<string, number>()
    for (const cg of (costosGlobalesRows || [])) {
      costosGlobalesMap.set(cg.grupo_id, Number(cg.costo_total))
    }

    // Si hay costos globales y estamos en vista por sucursal, necesitamos la facturación
    // total de TODAS las sucursales para cada grupo afectado (para calcular participación)
    const factTotalCadenaPorGrupo = new Map<string, number>()
    if (costosGlobalesMap.size > 0 && sucursalId !== '__consolidado__') {
      const grupoIdsConCosto = Array.from(costosGlobalesMap.keys())
      const { data: totalesCadena } = await supabase
        .from('resultados')
        .select('grupo_id, facturacion')
        .eq('periodo_id', dbPeriodo.id)
        .in('grupo_id', grupoIdsConCosto)

      for (const row of (totalesCadena || [])) {
        factTotalCadenaPorGrupo.set(
          row.grupo_id,
          (factTotalCadenaPorGrupo.get(row.grupo_id) || 0) + Number(row.facturacion)
        )
      }
    }

    // 6. Primera pasada: totales globales
    let totalFacturacion = 0
    let totalResultadoOperativo = 0
    for (const [, v] of porGrupo) {
      const m = metricsFromRaw(v.facturacion, v.iva, v.costo, v.cantidad)
      totalFacturacion += m.facturacion
      totalResultadoOperativo += m.resultadoOperativo
    }

    // 7. Construir árbol
    const secciones: SeccionNode[] = catalogo.categorias
      .sort((a, b) => a.orden - b.orden)
      .map((cat) => {
        const sectoresDeCat = catalogo.sectores
          .filter((s) => s.categoria_id === cat.id)
          .sort((a, b) => a.orden - b.orden)

        const categorias: CategoriaNode[] = sectoresDeCat.map((sec) => {
          const gruposDeSec = catalogo.grupos
            .filter((g) => g.sector_id === sec.id)
            .sort((a, b) => a.orden - b.orden)

          const grupos: GrupoNode[] = gruposDeSec.map((g) => {
            const raw = porGrupo.get(g.id)
            let gMetrics = raw
              ? metricsFromRaw(raw.facturacion, raw.iva, raw.costo, raw.cantidad)
              : emptyMetrics()

            // ── Prorrateo de costos globales ────────────────────────────────
            // Si este grupo tiene un costo global cargado (no segmentado por sucursal),
            // sumamos el costo prorrateado según participación en facturación total de la cadena.
            let esProrrateado = false
            const costoGlobal = costosGlobalesMap.get(g.id)
            if (costoGlobal && costoGlobal > 0) {
              let costoAdicional = 0
              if (sucursalId === '__consolidado__') {
                // Vista consolidada: usar el costo total directamente
                costoAdicional = costoGlobal
              } else {
                // Vista por sucursal: prorratear por participación en facturación de la cadena
                const factTotalCadena = factTotalCadenaPorGrupo.get(g.id) || 0
                const factSucursal = raw?.facturacion || 0
                if (factTotalCadena > 0 && factSucursal > 0) {
                  const participacion = factSucursal / factTotalCadena
                  costoAdicional = costoGlobal * participacion
                }
              }
              if (costoAdicional > 0) {
                // Sumar el costo prorrateado al costo existente y recalcular métricas
                const nuevoCosto = gMetrics.costo + costoAdicional
                gMetrics = metricsFromRaw(gMetrics.facturacion, gMetrics.iva, nuevoCosto, gMetrics.articulos)
                esProrrateado = true
              }
            }
            // ── Fórmula de markup fijo: Rotiseria ────────────────────────────
            // Rotisería tiene costo = facturación / 1.4 (markup 40% sobre costo).
            // El costo no está segmentado ni puede cargarse por sucursal,
            // por lo que se calcula automáticamente a partir de la facturación.
            const SECTOR_ID_ROTISERIA = 'frescos-rotiseria'
            let costoCalculadoTipo: 'prorrateado' | 'formula_markup' | undefined =
              esProrrateado ? 'prorrateado' : undefined

            if ((g.sector_id === SECTOR_ID_ROTISERIA || g.id.startsWith('frescos-rot-')) && gMetrics.facturacion > 0) {
              const facturacionBruta = gMetrics.facturacion
              // En Rotisería no se cargan datos de IVA; se calcula automáticamente al 21% (facturación / 1.21 * 0.21)
              const ivaFormula = facturacionBruta - (facturacionBruta / 1.21)
              const costoFormula = facturacionBruta / 1.4
              gMetrics = metricsFromRaw(facturacionBruta, ivaFormula, costoFormula, gMetrics.articulos)
              costoCalculadoTipo = 'formula_markup'
            }
            // ───────────────────────────────────────────────────────────────

            const gPrevFact = prevMap.get(g.id) ?? null
            const gYoyFact  = yoyMap.get(g.id) ?? null

            const subgrupo: SubgrupoNode = {
              id: g.id,
              nombre: g.nombre,
              metrics: derivar(gMetrics, gMetrics.facturacion, gMetrics.resultadoOperativo, gPrevFact, gYoyFact),
            }

            return {
              id: g.id,
              nombre: g.nombre,
              metrics: derivar(gMetrics, totalFacturacion, totalResultadoOperativo, gPrevFact, gYoyFact),
              subgrupos: [subgrupo],
              costoProrrateado: esProrrateado,
              costoCalculadoTipo,
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
    console.warn('[data-db] Error al leer de Supabase:', err)
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

async function loadFacturacionMap(key: string, sucursalId: string): Promise<Map<string, number>> {
  const { data: p } = await supabase.from('periodos').select('id').eq('key', key).maybeSingle()
  if (!p) return new Map()
  
  let query = supabase
    .from('resultados')
    .select('grupo_id, facturacion')
    .eq('periodo_id', p.id)

  if (sucursalId !== '__consolidado__') {
    query = query.eq('sucursal_id', sucursalId)
  }

  const { data: rows } = await query
  const map = new Map<string, number>()
  for (const row of rows ?? []) {
    const prev = map.get(row.grupo_id) ?? 0
    map.set(row.grupo_id, prev + Number(row.facturacion))
  }
  return map
}

function sumFactFromMap(sectorId: string, grupos: DBGrupo[], map: Map<string, number>): number | null {
  const gruposDeSec = grupos.filter((g) => g.sector_id === sectorId)
  let total = 0
  let found = false
  for (const g of gruposDeSec) {
    const f = map.get(g.id)
    if (f !== undefined) { total += f; found = true }
  }
  return found ? total : null
}

export function sanitizeSucursalNombre(nombre: string): string {
  if (!nombre) return ""
  // Limpia cualquier corrupción de encoding (como "Colﾃｳn", "San Martﾃｭn", "Perﾃｳn")
  if (nombre.includes("Col") && (nombre.includes("n") || nombre.includes("ﾃ"))) return "Colón"
  if (nombre.includes("Mart") && (nombre.includes("n") || nombre.includes("ﾃ"))) return "San Martín"
  if (nombre.includes("Per") && (nombre.includes("n") || nombre.includes("ﾃ"))) return "Perón"
  return nombre
}

export async function getSucursalesDB(): Promise<DBSucursal[]> {
  const { data, error } = await supabase
    .from('sucursales')
    .select('*')
    .order('orden')

  if (error || !data) return []
  return (data as DBSucursal[]).map((s) => ({
    ...s,
    nombre: sanitizeSucursalNombre(s.nombre),
  }))
}

// ────────────────────────────────────────────────────────────────────────────
// Períodos disponibles
// ────────────────────────────────────────────────────────────────────────────

export async function getPeriodosDB(): Promise<Periodo[]> {
  const { data, error } = await supabase
    .from('periodos')
    .select('key, anio, mes, label')
    .order('anio')
    .order('mes')

  if (error || !data?.length) return []

  return (data as { key: string; anio: number; mes: number; label: string }[]).map((p, i) => ({
    key: p.key,
    anio: p.anio,
    mes: p.mes,
    label: p.label,
    index: i,
  }))
}

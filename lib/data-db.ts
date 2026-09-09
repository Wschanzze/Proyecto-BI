// ---------------------------------------------------------------------------
// lib/data-db.ts
// Capa de datos simulada para modo DEMO autónomo.
// Genera datos determinísticos coherentes por sucursal y período.
// ---------------------------------------------------------------------------

import {
  getCuadro,
  PERIODOS,
  type Cuadro,
  type Periodo,
  type SeccionNode,
  type CategoriaNode,
  type GrupoNode,
  type SubgrupoNode,
  type MetricsConDerivados,
  type Metrics,
} from './data'
import type { DBSucursal } from './supabase'

export const SUCURSALES_DEMO: DBSucursal[] = [
  { id: 'colon', nombre: 'Colón', orden: 1 },
  { id: 'san-martin', nombre: 'San Martín', orden: 2 },
  { id: 'falucho', nombre: 'Falucho', orden: 3 },
  { id: 'peron', nombre: 'Perón', orden: 4 },
  { id: 'virtual', nombre: 'Virtual', orden: 5 },
]

export const SUCURSAL_FACTORS: Record<string, number> = {
  colon: 0.28,
  'san-martin': 0.25,
  falucho: 0.22,
  peron: 0.18,
  virtual: 0.07,
}

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

function scaleMetrics(m: MetricsConDerivados, factor: number): MetricsConDerivados {
  const facturacion = Math.round(m.facturacion * factor)
  const iva = Math.round(m.iva * factor)
  const costo = Math.round(m.costo * factor)
  const articulos = Math.round(m.articulos * factor)
  const ventasSinIva = facturacion - iva
  const cmg = ventasSinIva > 0 ? ((ventasSinIva - costo) / ventasSinIva) * 100 : m.cmg
  return {
    ...m,
    facturacion,
    iva,
    costo,
    articulos,
    cmg,
    resultadoOperativo: Math.round(m.resultadoOperativo * factor),
    resultadoFinal: Math.round(m.resultadoFinal * factor),
  }
}

function scaleMetricsBase(m: Metrics, factor: number): Metrics {
  const facturacion = Math.round(m.facturacion * factor)
  const iva = Math.round(m.iva * factor)
  const costo = Math.round(m.costo * factor)
  const articulos = Math.round(m.articulos * factor)
  const ventasSinIva = facturacion - iva
  const cmg = ventasSinIva > 0 ? ((ventasSinIva - costo) / ventasSinIva) * 100 : m.cmg
  return {
    ...m,
    facturacion,
    iva,
    costo,
    articulos,
    cmg,
    resultadoOperativo: Math.round(m.resultadoOperativo * factor),
    resultadoFinal: Math.round(m.resultadoFinal * factor),
  }
}

export function invalidateCatalogoCache(): void {
  // No-op en modo demo
}

export function sanitizeSucursalNombre(nombre: string): string {
  if (!nombre) return ""
  if (nombre.includes("Col") && (nombre.includes("n") || nombre.includes("ﾃ"))) return "Colón"
  if (nombre.includes("Mart") && (nombre.includes("n") || nombre.includes("ﾃ"))) return "San Martín"
  if (nombre.includes("Per") && (nombre.includes("n") || nombre.includes("ﾃ"))) return "Perón"
  return nombre
}

export async function getSucursalesDB(): Promise<DBSucursal[]> {
  return SUCURSALES_DEMO
}

export async function getPeriodosDB(): Promise<Periodo[]> {
  return PERIODOS.map((p) => ({
    ...p,
    label: `${MESES_CORTOS[p.mes - 1]}-${String(p.anio).slice(-2)}`,
  }))
}

export async function getCuadroFromDB(
  periodoKey: string,
  sucursalId = '__consolidado__'
): Promise<Cuadro | null> {
  const baseCuadro = getCuadro(periodoKey)
  if (!baseCuadro) return null

  if (sucursalId === '__consolidado__' || !SUCURSAL_FACTORS[sucursalId]) {
    return baseCuadro
  }

  const factor = SUCURSAL_FACTORS[sucursalId]

  const secciones: SeccionNode[] = baseCuadro.secciones.map((sec) => {
    const categorias: CategoriaNode[] = sec.categorias.map((cat) => {
      const grupos: GrupoNode[] = cat.grupos.map((g) => {
        const subgrupos: SubgrupoNode[] = g.subgrupos.map((s) => ({
          ...s,
          metrics: scaleMetrics(s.metrics, factor),
        }))
        return {
          ...g,
          metrics: scaleMetrics(g.metrics, factor),
          subgrupos,
        }
      })
      return {
        ...cat,
        metrics: scaleMetrics(cat.metrics, factor),
        grupos,
      }
    })
    return {
      ...sec,
      categorias,
      total: scaleMetricsBase(sec.total, factor),
    }
  })

  return {
    ...baseCuadro,
    secciones,
    total: scaleMetricsBase(baseCuadro.total, factor),
  }
}

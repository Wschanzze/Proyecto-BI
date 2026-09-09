// lib/rrhh-subcuentas.ts
// Gestión de subcuentas detalladas de RRHH en modo DEMO autónomo.

import { SUCURSAL_FACTORS, SUCURSALES_DEMO, getCuadroFromDB } from './data-db'

export interface RRHHSubcuentas {
  periodo_id: number
  sucursal_id: string
  sueldos: number
  cargas_sociales: number
  indemnizaciones: number
  tabla_merito: number
  total_rrhh: number
}

export interface RRHHSubcuentasCarga {
  sueldos?: number
  cargas_sociales?: number
  indemnizaciones?: number
  tabla_merito?: number
}

// Almacén en memoria de modificaciones del usuario
const rrhhCache: Map<string, RRHHSubcuentas> = new Map()

function getCacheKey(periodoKey: string, sucursalId: string): string {
  return `${periodoKey}__${sucursalId}`
}

export async function getRRHHSubcuentas(
  periodoKey: string,
  sucursalId: string = '__consolidado__'
): Promise<RRHHSubcuentas | null> {
  const cacheKey = getCacheKey(periodoKey, sucursalId)
  if (rrhhCache.has(cacheKey)) {
    return rrhhCache.get(cacheKey)!
  }

  // Si es consolidado y hay registros individuales en cache, consolidarlos
  if (sucursalId === '__consolidado__') {
    let totalSueldos = 0
    let totalCargas = 0
    let totalIndemnizaciones = 0
    let totalMerito = 0
    let hasCustom = false

    for (const suc of SUCURSALES_DEMO) {
      const key = getCacheKey(periodoKey, suc.id)
      if (rrhhCache.has(key)) {
        hasCustom = true
        const item = rrhhCache.get(key)!
        totalSueldos += item.sueldos
        totalCargas += item.cargas_sociales
        totalIndemnizaciones += item.indemnizaciones
        totalMerito += item.tabla_merito
      }
    }

    if (hasCustom) {
      return {
        periodo_id: 1,
        sucursal_id: '__consolidado__',
        sueldos: Math.round(totalSueldos),
        cargas_sociales: Math.round(totalCargas),
        indemnizaciones: Math.round(totalIndemnizaciones),
        tabla_merito: Math.round(totalMerito),
        total_rrhh: Math.round(totalSueldos + totalCargas + totalIndemnizaciones + totalMerito),
      }
    }
  }

  // Generación determinística basada en la facturación del período
  const cuadro = await getCuadroFromDB(periodoKey, sucursalId)
  const ventasSinIva = cuadro ? cuadro.total.facturacion - cuadro.total.iva : 150_000_000
  const totalRrhhEst = Math.round(ventasSinIva * 0.12) // 12% ratio estándar

  const sueldos = Math.round(totalRrhhEst * 0.70)
  const cargas_sociales = Math.round(totalRrhhEst * 0.26)
  const indemnizaciones = Math.round(totalRrhhEst * 0.025)
  const tabla_merito = Math.round(totalRrhhEst * 0.015)
  const total_rrhh = sueldos + cargas_sociales + indemnizaciones + tabla_merito

  return {
    periodo_id: 1,
    sucursal_id: sucursalId,
    sueldos,
    cargas_sociales,
    indemnizaciones,
    tabla_merito,
    total_rrhh,
  }
}

export async function upsertRRHHSubcuentas(
  periodoKey: string,
  sucursalId: string,
  datos: RRHHSubcuentasCarga
): Promise<{ success: boolean; error?: string }> {
  try {
    const prev = (await getRRHHSubcuentas(periodoKey, sucursalId)) || {
      periodo_id: 1,
      sucursal_id: sucursalId,
      sueldos: 0,
      cargas_sociales: 0,
      indemnizaciones: 0,
      tabla_merito: 0,
      total_rrhh: 0,
    }

    const updated: RRHHSubcuentas = {
      periodo_id: prev.periodo_id,
      sucursal_id: sucursalId,
      sueldos: datos.sueldos ?? prev.sueldos,
      cargas_sociales: datos.cargas_sociales ?? prev.cargas_sociales,
      indemnizaciones: datos.indemnizaciones ?? prev.indemnizaciones,
      tabla_merito: datos.tabla_merito ?? prev.tabla_merito,
      total_rrhh:
        (datos.sueldos ?? prev.sueldos) +
        (datos.cargas_sociales ?? prev.cargas_sociales) +
        (datos.indemnizaciones ?? prev.indemnizaciones) +
        (datos.tabla_merito ?? prev.tabla_merito),
    }

    rrhhCache.set(getCacheKey(periodoKey, sucursalId), updated)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al guardar subcuentas de RRHH' }
  }
}

export async function recalcularRRHHSubcuentas(
  periodoKey: string,
  sucursalId: string
): Promise<{ success: boolean; error?: string }> {
  rrhhCache.delete(getCacheKey(periodoKey, sucursalId))
  return { success: true }
}

export async function getAllRRHHSubcuentasByPeriodo(
  periodoKey: string
): Promise<RRHHSubcuentas[]> {
  const result: RRHHSubcuentas[] = []
  for (const suc of SUCURSALES_DEMO) {
    const item = await getRRHHSubcuentas(periodoKey, suc.id)
    if (item) result.push(item)
  }
  return result
}

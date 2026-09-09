// lib/ingresos-financieros-subcuentas.ts
// Gestión de subcuentas de Ingresos Financieros en modo DEMO autónomo.

import { SUCURSAL_FACTORS, SUCURSALES_DEMO, getCuadroFromDB } from './data-db'

export interface IngresosFinancierosSubcuentas {
  periodo_id: number
  sucursal_id: string
  operatoria_financiera: number
  rendimientos_financieros: number
  total_ingresos_financieros: number
}

export interface IngresosFinancierosSubcuentasCarga {
  operatoria_financiera?: number
  rendimientos_financieros?: number
}

const ingresosCache: Map<string, IngresosFinancierosSubcuentas> = new Map()

function getCacheKey(periodoKey: string, sucursalId: string): string {
  return `${periodoKey}__${sucursalId}`
}

export async function getIngresosFinancierosSubcuentas(
  periodoKey: string,
  sucursalId: string = '__consolidado__'
): Promise<IngresosFinancierosSubcuentas | null> {
  const cacheKey = getCacheKey(periodoKey, sucursalId)
  if (ingresosCache.has(cacheKey)) {
    return ingresosCache.get(cacheKey)!
  }

  // Consolidado desde sucursales en cache si existen
  if (sucursalId === '__consolidado__') {
    let totalOp = 0
    let totalRend = 0
    let hasCustom = false

    for (const suc of SUCURSALES_DEMO) {
      const key = getCacheKey(periodoKey, suc.id)
      if (ingresosCache.has(key)) {
        hasCustom = true
        const item = ingresosCache.get(key)!
        totalOp += item.operatoria_financiera
        totalRend += item.rendimientos_financieros
      }
    }

    if (hasCustom) {
      return {
        periodo_id: 1,
        sucursal_id: '__consolidado__',
        operatoria_financiera: Math.round(totalOp),
        rendimientos_financieros: Math.round(totalRend),
        total_ingresos_financieros: Math.round(totalOp + totalRend),
      }
    }
  }

  // Generación determinística basada en facturación
  const cuadro = await getCuadroFromDB(periodoKey, sucursalId)
  const ventasSinIva = cuadro ? cuadro.total.facturacion - cuadro.total.iva : 150_000_000
  const totalIngresos = Math.round(ventasSinIva * 0.005) // ~0.5% ratio estándar

  const operatoria_financiera = Math.round(totalIngresos * 0.70)
  const rendimientos_financieros = Math.round(totalIngresos * 0.30)
  const total_ingresos_financieros = operatoria_financiera + rendimientos_financieros

  return {
    periodo_id: 1,
    sucursal_id: sucursalId,
    operatoria_financiera,
    rendimientos_financieros,
    total_ingresos_financieros,
  }
}

export async function upsertIngresosFinancierosSubcuentas(
  periodoKey: string,
  sucursalId: string,
  datos: IngresosFinancierosSubcuentasCarga
): Promise<{ success: boolean; error?: string }> {
  try {
    const prev = (await getIngresosFinancierosSubcuentas(periodoKey, sucursalId)) || {
      periodo_id: 1,
      sucursal_id: sucursalId,
      operatoria_financiera: 0,
      rendimientos_financieros: 0,
      total_ingresos_financieros: 0,
    }

    const op = datos.operatoria_financiera ?? prev.operatoria_financiera
    const rend = datos.rendimientos_financieros ?? prev.rendimientos_financieros

    const updated: IngresosFinancierosSubcuentas = {
      periodo_id: prev.periodo_id,
      sucursal_id: sucursalId,
      operatoria_financiera: op,
      rendimientos_financieros: rend,
      total_ingresos_financieros: op + rend,
    }

    ingresosCache.set(getCacheKey(periodoKey, sucursalId), updated)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al guardar ingresos financieros' }
  }
}

export async function getAllIngresosFinancierosSubcuentasByPeriodo(
  periodoKey: string
): Promise<IngresosFinancierosSubcuentas[]> {
  const result: IngresosFinancierosSubcuentas[] = []
  for (const suc of SUCURSALES_DEMO) {
    const item = await getIngresosFinancierosSubcuentas(periodoKey, suc.id)
    if (item) result.push(item)
  }
  return result
}

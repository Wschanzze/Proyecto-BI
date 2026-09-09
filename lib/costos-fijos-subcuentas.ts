// lib/costos-fijos-subcuentas.ts
// Gestión de subcuentas detalladas de Costos Fijos (15 cuentas) en modo DEMO autónomo.

import { SUCURSAL_FACTORS, SUCURSALES_DEMO, getCuadroFromDB } from './data-db'

export interface CostosFijosSubcuentas {
  periodo_id: number
  sucursal_id: string
  alquileres: number
  honorarios: number
  tasas_servicios: number
  mantenimiento_servicios_tecnicos: number
  perdida_gestion_inventarios: number
  seguridad_vigilancia: number
  otros_servicios: number
  gastos_personal: number
  otros_gastos: number
  comisiones_gastos_bancarios: number
  gastos_extraordinarios: number
  gastos_comercializacion: number
  gastos_administracion: number
  gastos_financiacion: number
  diferencias_caja_perdida: number
  total_costos_fijos: number
}

export interface CostosFijosSubcuentasCarga {
  alquileres?: number
  honorarios?: number
  tasas_servicios?: number
  mantenimiento_servicios_tecnicos?: number
  perdida_gestion_inventarios?: number
  seguridad_vigilancia?: number
  otros_servicios?: number
  gastos_personal?: number
  otros_gastos?: number
  comisiones_gastos_bancarios?: number
  gastos_extraordinarios?: number
  gastos_comercializacion?: number
  gastos_administracion?: number
  gastos_financiacion?: number
  diferencias_caja_perdida?: number
}

// Almacén en memoria de modificaciones del usuario
const costosFijosCache: Map<string, CostosFijosSubcuentas> = new Map()

function getCacheKey(periodoKey: string, sucursalId: string): string {
  return `${periodoKey}__${sucursalId}`
}

export async function getCostosFijosSubcuentas(
  periodoKey: string,
  sucursalId: string = '__consolidado__'
): Promise<CostosFijosSubcuentas | null> {
  const cacheKey = getCacheKey(periodoKey, sucursalId)
  if (costosFijosCache.has(cacheKey)) {
    return costosFijosCache.get(cacheKey)!
  }

  // Si es consolidado y hay registros individuales en cache, consolidarlos
  if (sucursalId === '__consolidado__') {
    let hasCustom = false
    const sumFields: Partial<Record<keyof CostosFijosSubcuentasCarga, number>> = {}

    for (const suc of SUCURSALES_DEMO) {
      const key = getCacheKey(periodoKey, suc.id)
      if (costosFijosCache.has(key)) {
        hasCustom = true
        const item = costosFijosCache.get(key)!
        for (const [f, val] of Object.entries(item)) {
          if (typeof val === 'number' && f !== 'periodo_id') {
            const k = f as keyof CostosFijosSubcuentasCarga
            sumFields[k] = (sumFields[k] || 0) + val
          }
        }
      }
    }

    if (hasCustom) {
      const total = Object.values(sumFields).reduce((s, v) => s + (v || 0), 0)
      return {
        periodo_id: 1,
        sucursal_id: '__consolidado__',
        alquileres: sumFields.alquileres || 0,
        honorarios: sumFields.honorarios || 0,
        tasas_servicios: sumFields.tasas_servicios || 0,
        mantenimiento_servicios_tecnicos: sumFields.mantenimiento_servicios_tecnicos || 0,
        perdida_gestion_inventarios: sumFields.perdida_gestion_inventarios || 0,
        seguridad_vigilancia: sumFields.seguridad_vigilancia || 0,
        otros_servicios: sumFields.otros_servicios || 0,
        gastos_personal: sumFields.gastos_personal || 0,
        otros_gastos: sumFields.otros_gastos || 0,
        comisiones_gastos_bancarios: sumFields.comisiones_gastos_bancarios || 0,
        gastos_extraordinarios: sumFields.gastos_extraordinarios || 0,
        gastos_comercializacion: sumFields.gastos_comercializacion || 0,
        gastos_administracion: sumFields.gastos_administracion || 0,
        gastos_financiacion: sumFields.gastos_financiacion || 0,
        diferencias_caja_perdida: sumFields.diferencias_caja_perdida || 0,
        total_costos_fijos: total,
      }
    }
  }

  // Generación determinística basada en la facturación del período
  const cuadro = await getCuadroFromDB(periodoKey, sucursalId)
  const ventasSinIva = cuadro ? cuadro.total.facturacion - cuadro.total.iva : 5_970_000_000
  const totalCostosFijosEst = Math.round(ventasSinIva * 0.032) // ~3.2% ratio estándar

  const sub = {
    alquileres: Math.round(totalCostosFijosEst * 0.25),
    honorarios: Math.round(totalCostosFijosEst * 0.05),
    tasas_servicios: Math.round(totalCostosFijosEst * 0.10),
    mantenimiento_servicios_tecnicos: Math.round(totalCostosFijosEst * 0.08),
    perdida_gestion_inventarios: Math.round(totalCostosFijosEst * 0.05),
    seguridad_vigilancia: Math.round(totalCostosFijosEst * 0.07),
    otros_servicios: Math.round(totalCostosFijosEst * 0.05),
    gastos_personal: Math.round(totalCostosFijosEst * 0.03),
    otros_gastos: Math.round(totalCostosFijosEst * 0.07),
    comisiones_gastos_bancarios: Math.round(totalCostosFijosEst * 0.04),
    gastos_extraordinarios: Math.round(totalCostosFijosEst * 0.03),
    gastos_comercializacion: Math.round(totalCostosFijosEst * 0.10),
    gastos_administracion: Math.round(totalCostosFijosEst * 0.05),
    gastos_financiacion: Math.round(totalCostosFijosEst * 0.02),
    diferencias_caja_perdida: Math.round(totalCostosFijosEst * 0.01),
  }

  const total = Object.values(sub).reduce((a, b) => a + b, 0)

  return {
    periodo_id: 1,
    sucursal_id: sucursalId,
    ...sub,
    total_costos_fijos: total,
  }
}

export async function upsertCostosFijosSubcuentas(
  periodoKey: string,
  sucursalId: string,
  datos: CostosFijosSubcuentasCarga
): Promise<{ success: boolean; error?: string }> {
  try {
    const prev = (await getCostosFijosSubcuentas(periodoKey, sucursalId)) || {
      periodo_id: 1,
      sucursal_id: sucursalId,
      alquileres: 0,
      honorarios: 0,
      tasas_servicios: 0,
      mantenimiento_servicios_tecnicos: 0,
      perdida_gestion_inventarios: 0,
      seguridad_vigilancia: 0,
      otros_servicios: 0,
      gastos_personal: 0,
      otros_gastos: 0,
      comisiones_gastos_bancarios: 0,
      gastos_extraordinarios: 0,
      gastos_comercializacion: 0,
      gastos_administracion: 0,
      gastos_financiacion: 0,
      diferencias_caja_perdida: 0,
      total_costos_fijos: 0,
    }

    const updatedSub = {
      alquileres: datos.alquileres ?? prev.alquileres,
      honorarios: datos.honorarios ?? prev.honorarios,
      tasas_servicios: datos.tasas_servicios ?? prev.tasas_servicios,
      mantenimiento_servicios_tecnicos: datos.mantenimiento_servicios_tecnicos ?? prev.mantenimiento_servicios_tecnicos,
      perdida_gestion_inventarios: datos.perdida_gestion_inventarios ?? prev.perdida_gestion_inventarios,
      seguridad_vigilancia: datos.seguridad_vigilancia ?? prev.seguridad_vigilancia,
      otros_servicios: datos.otros_servicios ?? prev.otros_servicios,
      gastos_personal: datos.gastos_personal ?? prev.gastos_personal,
      otros_gastos: datos.otros_gastos ?? prev.otros_gastos,
      comisiones_gastos_bancarios: datos.comisiones_gastos_bancarios ?? prev.comisiones_gastos_bancarios,
      gastos_extraordinarios: datos.gastos_extraordinarios ?? prev.gastos_extraordinarios,
      gastos_comercializacion: datos.gastos_comercializacion ?? prev.gastos_comercializacion,
      gastos_administracion: datos.gastos_administracion ?? prev.gastos_administracion,
      gastos_financiacion: datos.gastos_financiacion ?? prev.gastos_financiacion,
      diferencias_caja_perdida: datos.diferencias_caja_perdida ?? prev.diferencias_caja_perdida,
    }

    const total = Object.values(updatedSub).reduce((a, b) => a + b, 0)

    const updated: CostosFijosSubcuentas = {
      periodo_id: prev.periodo_id,
      sucursal_id: sucursalId,
      ...updatedSub,
      total_costos_fijos: total,
    }

    costosFijosCache.set(getCacheKey(periodoKey, sucursalId), updated)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al guardar costos fijos' }
  }
}

export async function getAllCostosFijosSubcuentasByPeriodo(
  periodoKey: string
): Promise<CostosFijosSubcuentas[]> {
  const result: CostosFijosSubcuentas[] = []
  for (const suc of SUCURSALES_DEMO) {
    const item = await getCostosFijosSubcuentas(periodoKey, suc.id)
    if (item) result.push(item)
  }
  return result
}

export async function distribuirCostosFijosGlobales(
  periodoKey: string,
  datosGlobales: CostosFijosSubcuentasCarga
): Promise<{ success: boolean; error?: string }> {
  for (const suc of SUCURSALES_DEMO) {
    const factor = SUCURSAL_FACTORS[suc.id] || 0.2
    const sucData: CostosFijosSubcuentasCarga = {}
    for (const [k, v] of Object.entries(datosGlobales)) {
      if (typeof v === 'number') {
        (sucData as any)[k] = Math.round(v * factor)
      }
    }
    await upsertCostosFijosSubcuentas(periodoKey, suc.id, sucData)
  }
  return { success: true }
}

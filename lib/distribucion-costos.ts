// lib/distribucion-costos.ts
// Distribución de costos fijos en modo DEMO autónomo.

import { SUCURSAL_FACTORS } from './data-db'
import { upsertCostosFijosSubcuentas, type CostosFijosSubcuentasCarga } from './costos-fijos-subcuentas'
import { upsertIngresosFinancierosSubcuentas, type IngresosFinancierosSubcuentasCarga } from './ingresos-financieros-subcuentas'
import { upsertRRHHSubcuentas, type RRHHSubcuentasCarga } from './rrhh-subcuentas'

export async function distribuirCostosFijos(
  periodoKey: string,
  datosGlobales: CostosFijosSubcuentasCarga
): Promise<{ success: boolean; error?: string }> {
  for (const [sucursalId, factor] of Object.entries(SUCURSAL_FACTORS)) {
    const sucursalData: CostosFijosSubcuentasCarga = {}
    for (const [k, v] of Object.entries(datosGlobales)) {
      if (typeof v === 'number') {
        (sucursalData as any)[k] = Math.round(v * factor)
      }
    }
    await upsertCostosFijosSubcuentas(periodoKey, sucursalId, sucursalData)
  }
  return { success: true }
}

export async function distribuirIngresosFinancieros(
  periodoKey: string,
  datosGlobales: IngresosFinancierosSubcuentasCarga
): Promise<{ success: boolean; error?: string }> {
  for (const [sucursalId, factor] of Object.entries(SUCURSAL_FACTORS)) {
    const sucursalData: IngresosFinancierosSubcuentasCarga = {
      operatoria_financiera: datosGlobales.operatoria_financiera ? Math.round(datosGlobales.operatoria_financiera * factor) : undefined,
      rendimientos_financieros: datosGlobales.rendimientos_financieros ? Math.round(datosGlobales.rendimientos_financieros * factor) : undefined,
    }
    await upsertIngresosFinancierosSubcuentas(periodoKey, sucursalId, sucursalData)
  }
  return { success: true }
}

export async function distribuirRRHHSubcuentas(
  periodoKey: string,
  datosGlobales: RRHHSubcuentasCarga
): Promise<{ success: boolean; error?: string }> {
  for (const [sucursalId, factor] of Object.entries(SUCURSAL_FACTORS)) {
    const sucursalData: RRHHSubcuentasCarga = {
      sueldos: datosGlobales.sueldos ? Math.round(datosGlobales.sueldos * factor) : undefined,
      cargas_sociales: datosGlobales.cargas_sociales ? Math.round(datosGlobales.cargas_sociales * factor) : undefined,
      indemnizaciones: datosGlobales.indemnizaciones ? Math.round(datosGlobales.indemnizaciones * factor) : undefined,
      tabla_merito: datosGlobales.tabla_merito ? Math.round(datosGlobales.tabla_merito * factor) : undefined,
    }
    await upsertRRHHSubcuentas(periodoKey, sucursalId, sucursalData)
  }
  return { success: true }
}

export const distribuirRRHH = distribuirRRHHSubcuentas


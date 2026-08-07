// lib/ingresos-financieros-subcuentas.ts
// Gestión de subcuentas de Ingresos Financieros

import { supabase } from './supabase'

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

/**
 * Obtener subcuentas de Ingresos Financieros por período y sucursal
 */
export async function getIngresosFinancierosSubcuentas(
  periodoKey: string,
  sucursalId: string = '__consolidado__'
): Promise<IngresosFinancierosSubcuentas | null> {
  try {
    // Obtener periodo_id (la columna se llama 'key')
    const { data: periodo } = await supabase
      .from('periodos')
      .select('id')
      .eq('key', periodoKey)
      .single()

    if (!periodo) return null

    if (sucursalId === '__consolidado__') {
      // Consolidado: sumar todas las sucursales
      const { data, error } = await supabase
        .from('ingresos_financieros_subcuentas')
        .select('*')
        .eq('periodo_id', periodo.id)

      if (error) throw error
      if (!data || data.length === 0) return null

      return {
        periodo_id: periodo.id,
        sucursal_id: '__consolidado__',
        operatoria_financiera: data.reduce((sum, r) => sum + Number(r.operatoria_financiera || 0), 0),
        rendimientos_financieros: data.reduce((sum, r) => sum + Number(r.rendimientos_financieros || 0), 0),
        total_ingresos_financieros: data.reduce((sum, r) => sum + Number(r.total_ingresos_financieros || 0), 0),
      }
    } else {
      // Por sucursal específica
      const { data, error } = await supabase
        .from('ingresos_financieros_subcuentas')
        .select('*')
        .eq('periodo_id', periodo.id)
        .eq('sucursal_id', sucursalId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // No encontrado
        throw error
      }

      return data as IngresosFinancierosSubcuentas
    }
  } catch (error) {
    console.error('Error al obtener subcuentas de Ingresos Financieros:', error)
    return null
  }
}

/**
 * Cargar o actualizar subcuentas de Ingresos Financieros manualmente
 */
export async function upsertIngresosFinancierosSubcuentas(
  periodoKey: string,
  sucursalId: string,
  datos: IngresosFinancierosSubcuentasCarga
): Promise<{ success: boolean; error?: string }> {
  try {
    // Obtener periodo_id
    const { data: periodo } = await supabase
      .from('periodos')
      .select('id')
      .eq('key', periodoKey)
      .single()

    if (!periodo) {
      return { success: false, error: 'Período no encontrado' }
    }

    // Upsert en ingresos_financieros_subcuentas
    const { error } = await supabase
      .from('ingresos_financieros_subcuentas')
      .upsert({
        periodo_id: periodo.id,
        sucursal_id: sucursalId,
        operatoria_financiera: datos.operatoria_financiera || 0,
        rendimientos_financieros: datos.rendimientos_financieros || 0,
        archivo_origen: 'Carga manual desde interfaz',
        actualizado_en: new Date().toISOString(),
      }, {
        onConflict: 'periodo_id,sucursal_id'
      })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error al guardar subcuentas de Ingresos Financieros:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

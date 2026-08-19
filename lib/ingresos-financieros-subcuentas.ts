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
    const { data: periodo, error: periodoErr } = await supabase
      .from('periodos')
      .select('id')
      .eq('key', periodoKey)
      .single()

    if (periodoErr || !periodo) {
      return { success: false, error: `Período '${periodoKey}' no encontrado. Verifica que exista en la tabla periodos.` }
    }

    // --- Intentar via RPC (SECURITY DEFINER) ---
    const { data: rpcResult, error: rpcErr } = await supabase.rpc('guardar_ingresos_financieros_subcuentas', {
      p_periodo_id: periodo.id,
      p_sucursal_id: sucursalId,
      p_operatoria_financiera: datos.operatoria_financiera ?? 0,
      p_rendimientos_financieros: datos.rendimientos_financieros ?? 0,
    })

    if (!rpcErr && rpcResult) {
      const result = rpcResult as { success: boolean; error?: string }
      if (result.success) return { success: true }
      console.error('RPC guardar_ingresos_financieros_subcuentas error interno:', result.error)
      return { success: false, error: result.error ?? 'Error en función SQL' }
    }

    if (rpcErr) {
      console.warn('RPC no disponible, usando DELETE+INSERT directo. Error RPC:', rpcErr.message)
    }

    // --- Fallback: DELETE + INSERT ---
    await supabase
      .from('ingresos_financieros_subcuentas')
      .delete()
      .eq('periodo_id', periodo.id)
      .eq('sucursal_id', sucursalId)

    const { error: insErr } = await supabase
      .from('ingresos_financieros_subcuentas')
      .insert({
        periodo_id: periodo.id,
        sucursal_id: sucursalId,
        operatoria_financiera: datos.operatoria_financiera ?? 0,
        rendimientos_financieros: datos.rendimientos_financieros ?? 0,
        archivo_origen: 'Carga desde interfaz web',
        actualizado_en: new Date().toISOString(),
      })

    if (insErr) {
      const msg = `HTTP ${insErr.code} — ${insErr.message}${insErr.details ? ` | ${insErr.details}` : ''}${insErr.hint ? ` | Hint: ${insErr.hint}` : ''}`
      console.error('Error INSERT ingresos_financieros_subcuentas:', msg)
      throw new Error(msg)
    }

    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('Error al guardar subcuentas de Ingresos Financieros:', msg)
    return { success: false, error: msg }
  }
}

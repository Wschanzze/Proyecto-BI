// lib/costos-fijos-subcuentas.ts
// Gestión de subcuentas detalladas de Costos Fijos (15 cuentas)

import { supabase } from './supabase'

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

/**
 * Obtener subcuentas de Costos Fijos por período y sucursal
 */
export async function getCostosFijosSubcuentas(
  periodoKey: string,
  sucursalId: string = '__consolidado__'
): Promise<CostosFijosSubcuentas | null> {
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
        .from('costos_fijos_subcuentas')
        .select('*')
        .eq('periodo_id', periodo.id)

      if (error) throw error
      if (!data || data.length === 0) return null

      return {
        periodo_id: periodo.id,
        sucursal_id: '__consolidado__',
        alquileres: data.reduce((sum, r) => sum + Number(r.alquileres || 0), 0),
        honorarios: data.reduce((sum, r) => sum + Number(r.honorarios || 0), 0),
        tasas_servicios: data.reduce((sum, r) => sum + Number(r.tasas_servicios || 0), 0),
        mantenimiento_servicios_tecnicos: data.reduce((sum, r) => sum + Number(r.mantenimiento_servicios_tecnicos || 0), 0),
        perdida_gestion_inventarios: data.reduce((sum, r) => sum + Number(r.perdida_gestion_inventarios || 0), 0),
        seguridad_vigilancia: data.reduce((sum, r) => sum + Number(r.seguridad_vigilancia || 0), 0),
        otros_servicios: data.reduce((sum, r) => sum + Number(r.otros_servicios || 0), 0),
        gastos_personal: data.reduce((sum, r) => sum + Number(r.gastos_personal || 0), 0),
        otros_gastos: data.reduce((sum, r) => sum + Number(r.otros_gastos || 0), 0),
        comisiones_gastos_bancarios: data.reduce((sum, r) => sum + Number(r.comisiones_gastos_bancarios || 0), 0),
        gastos_extraordinarios: data.reduce((sum, r) => sum + Number(r.gastos_extraordinarios || 0), 0),
        gastos_comercializacion: data.reduce((sum, r) => sum + Number(r.gastos_comercializacion || 0), 0),
        gastos_administracion: data.reduce((sum, r) => sum + Number(r.gastos_administracion || 0), 0),
        gastos_financiacion: data.reduce((sum, r) => sum + Number(r.gastos_financiacion || 0), 0),
        diferencias_caja_perdida: data.reduce((sum, r) => sum + Number(r.diferencias_caja_perdida || 0), 0),
        total_costos_fijos: data.reduce((sum, r) => sum + Number(r.total_costos_fijos || 0), 0),
      }
    } else {
      // Por sucursal específica
      const { data, error } = await supabase
        .from('costos_fijos_subcuentas')
        .select('*')
        .eq('periodo_id', periodo.id)
        .eq('sucursal_id', sucursalId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // No encontrado
        throw error
      }

      return data as CostosFijosSubcuentas
    }
  } catch (error) {
    console.error('Error al obtener subcuentas de Costos Fijos:', error)
    return null
  }
}

/**
 * Cargar o actualizar subcuentas de Costos Fijos manualmente
 */
export async function upsertCostosFijosSubcuentas(
  periodoKey: string,
  sucursalId: string,
  datos: CostosFijosSubcuentasCarga
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

    // Upsert en costos_fijos_subcuentas
    const { error } = await supabase
      .from('costos_fijos_subcuentas')
      .upsert({
        periodo_id: periodo.id,
        sucursal_id: sucursalId,
        alquileres: datos.alquileres || 0,
        honorarios: datos.honorarios || 0,
        tasas_servicios: datos.tasas_servicios || 0,
        mantenimiento_servicios_tecnicos: datos.mantenimiento_servicios_tecnicos || 0,
        perdida_gestion_inventarios: datos.perdida_gestion_inventarios || 0,
        seguridad_vigilancia: datos.seguridad_vigilancia || 0,
        otros_servicios: datos.otros_servicios || 0,
        gastos_personal: datos.gastos_personal || 0,
        otros_gastos: datos.otros_gastos || 0,
        comisiones_gastos_bancarios: datos.comisiones_gastos_bancarios || 0,
        gastos_extraordinarios: datos.gastos_extraordinarios || 0,
        gastos_comercializacion: datos.gastos_comercializacion || 0,
        gastos_administracion: datos.gastos_administracion || 0,
        gastos_financiacion: datos.gastos_financiacion || 0,
        diferencias_caja_perdida: datos.diferencias_caja_perdida || 0,
        archivo_origen: 'Carga manual desde interfaz',
        actualizado_en: new Date().toISOString(),
      }, {
        onConflict: 'periodo_id,sucursal_id'
      })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error al guardar subcuentas de Costos Fijos:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Recalcular subcuentas de Costos Fijos desde costos_estructurales
 */
export async function recalcularCostosFijosSubcuentas(
  periodoKey: string,
  sucursalId: string
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

    // Llamar a la función SQL
    const { error } = await supabase.rpc('calcular_costos_fijos_subcuentas', {
      p_periodo_id: periodo.id,
      p_sucursal_id: sucursalId
    })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error al recalcular subcuentas de Costos Fijos:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

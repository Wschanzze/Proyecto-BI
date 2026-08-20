// lib/rrhh-subcuentas.ts
// Gestión de subcuentas detalladas de RRHH (Sueldos, Cargas Sociales, Indemnizaciones, Tabla Mérito)

import { supabase, supabaseAdmin } from './supabase'

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

/**
 * Obtener subcuentas RRHH por período y sucursal
 */
export async function getRRHHSubcuentas(
  periodoKey: string,
  sucursalId: string = '__consolidado__'
): Promise<RRHHSubcuentas | null> {
  try {
    const { data: periodo } = await supabaseAdmin
      .from('periodos')
      .select('id')
      .eq('key', periodoKey)
      .maybeSingle()

    if (!periodo) return null

    if (sucursalId === '__consolidado__') {
      const { data, error } = await supabaseAdmin
        .from('rrhh_subcuentas')
        .select('*')
        .eq('periodo_id', periodo.id)

      if (error) throw error
      if (!data || data.length === 0) return null

      return {
        periodo_id: periodo.id,
        sucursal_id: '__consolidado__',
        sueldos: data.reduce((sum, r) => sum + Number(r.sueldos || 0), 0),
        cargas_sociales: data.reduce((sum, r) => sum + Number(r.cargas_sociales || 0), 0),
        indemnizaciones: data.reduce((sum, r) => sum + Number(r.indemnizaciones || 0), 0),
        tabla_merito: data.reduce((sum, r) => sum + Number(r.tabla_merito || 0), 0),
        total_rrhh: data.reduce((sum, r) => sum + Number(r.total_rrhh || 0), 0),
      }
    } else {
      const { data, error } = await supabaseAdmin
        .from('rrhh_subcuentas')
        .select('*')
        .eq('periodo_id', periodo.id)
        .eq('sucursal_id', sucursalId)
        .maybeSingle()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      return data as RRHHSubcuentas
    }
  } catch (error) {
    console.error('Error al obtener subcuentas RRHH:', error)
    return null
  }
}

/**
 * Cargar o actualizar subcuentas RRHH manualmente
 */
export async function upsertRRHHSubcuentas(
  periodoKey: string,
  sucursalId: string,
  datos: RRHHSubcuentasCarga
): Promise<{ success: boolean; error?: string }> {
  try {
    // Buscar periodo_id — usar .maybeSingle() para no fallar con 406 si no existe
    const { data: periodo, error: periodoErr } = await supabaseAdmin
      .from('periodos')
      .select('id')
      .eq('key', periodoKey)
      .maybeSingle()

    if (periodoErr) {
      return { success: false, error: `Error buscando período '${periodoKey}': ${periodoErr.message}` }
    }
    if (!periodo) {
      return { success: false, error: `Período '${periodoKey}' no existe en la tabla periodos. Crealo primero.` }
    }

    // DELETE + INSERT directo usando service_role (sin RPC — function no creada aún en Supabase)
    await supabaseAdmin
      .from('rrhh_subcuentas')
      .delete()
      .eq('periodo_id', periodo.id)
      .eq('sucursal_id', sucursalId)

    const { error: insErr } = await supabaseAdmin
      .from('rrhh_subcuentas')
      .insert({
        periodo_id: periodo.id,
        sucursal_id: sucursalId,
        sueldos: datos.sueldos ?? 0,
        cargas_sociales: datos.cargas_sociales ?? 0,
        indemnizaciones: datos.indemnizaciones ?? 0,
        tabla_merito: datos.tabla_merito ?? 0,
        archivo_origen: 'Carga desde interfaz web',
        actualizado_en: new Date().toISOString(),
      })

    if (insErr) {
      const msg = `${insErr.code} — ${insErr.message}${insErr.details ? ` | ${insErr.details}` : ''}${insErr.hint ? ` | ${insErr.hint}` : ''}`
      console.error('Error INSERT rrhh_subcuentas:', msg)
      throw new Error(msg)
    }

    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('Error al guardar subcuentas RRHH:', msg)
    return { success: false, error: msg }
  }
}

/**
 * Recalcular subcuentas RRHH desde nómina mensual
 * (llama a la función SQL calcular_rrhh_subcuentas)
 */
export async function recalcularRRHHSubcuentas(
  periodoKey: string,
  sucursalId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Obtener periodo_id (la columna se llama 'key' no 'periodo_key')
    const { data: periodo } = await supabase
      .from('periodos')
      .select('id')
      .eq('key', periodoKey)
      .single()

    if (!periodo) {
      return { success: false, error: 'Período no encontrado' }
    }

    // Llamar a la función SQL
    const { error } = await supabase.rpc('calcular_rrhh_subcuentas', {
      p_periodo_id: periodo.id,
      p_sucursal_id: sucursalId
    })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error al recalcular subcuentas RRHH:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Obtener todas las subcuentas RRHH de un período (todas las sucursales)
 */
export async function getAllRRHHSubcuentasByPeriodo(
  periodoKey: string
): Promise<RRHHSubcuentas[]> {
  try {
    const { data: periodo } = await supabaseAdmin
      .from('periodos')
      .select('id')
      .eq('key', periodoKey)
      .single()

    if (!periodo) return []

    const { data, error } = await supabaseAdmin
      .from('rrhh_subcuentas')
      .select('*')
      .eq('periodo_id', periodo.id)
      .order('sucursal_id')

    if (error) throw error

    return (data || []) as RRHHSubcuentas[]
  } catch (error) {
    console.error('Error al obtener subcuentas RRHH por período:', error)
    return []
  }
}

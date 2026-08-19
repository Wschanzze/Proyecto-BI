// lib/distribucion-costos.ts
// Distribución de costos fijos según participación en ventas de cada sucursal

import { supabase } from './supabase'
import { upsertCostosFijosSubcuentas, type CostosFijosSubcuentasCarga } from './costos-fijos-subcuentas'
import { upsertIngresosFinancierosSubcuentas, type IngresosFinancierosSubcuentasCarga } from './ingresos-financieros-subcuentas'

/**
 * Calcular participación de cada sucursal en las ventas de un período
 */
async function calcularParticipacionVentas(periodoKey: string): Promise<{ [sucursalId: string]: number }> {
  try {
    // 1. Obtener periodo_id
    const { data: periodo } = await supabase
      .from('periodos')
      .select('id')
      .eq('key', periodoKey)
      .single()

    // Cargar sucursales de la DB para fallback equitativo
    const { data: sucursalesDB } = await supabase
      .from('sucursales')
      .select('id')

    const sucursalIds = (sucursalesDB && sucursalesDB.length > 0)
      ? sucursalesDB.map(s => s.id)
      : ['sucursal_1', 'sucursal_2', 'sucursal_3', 'sucursal_4', 'sucursal_5']

    const fallbackEq: { [key: string]: number } = {}
    const eqPct = 1 / sucursalIds.length
    sucursalIds.forEach(id => { fallbackEq[id] = eqPct })

    if (!periodo) return fallbackEq

    // 2. Obtener ventas por sucursal desde la tabla correcta 'resultados'
    const { data: resultados, error } = await supabase
      .from('resultados')
      .select('sucursal_id, facturacion')
      .eq('periodo_id', periodo.id)

    if (error || !resultados || resultados.length === 0) {
      return fallbackEq
    }

    // 3. Calcular totales por sucursal
    const ventasPorSucursal: { [key: string]: number } = {}
    let totalVentas = 0

    resultados.forEach(r => {
      if (!r.sucursal_id) return
      const facturacion = Number(r.facturacion || 0)
      ventasPorSucursal[r.sucursal_id] = (ventasPorSucursal[r.sucursal_id] || 0) + facturacion
      totalVentas += facturacion
    })

    if (totalVentas === 0) return fallbackEq

    // 4. Calcular porcentajes por sucursal
    const participacion: { [key: string]: number } = {}
    Object.keys(ventasPorSucursal).forEach(sucursalId => {
      participacion[sucursalId] = ventasPorSucursal[sucursalId] / totalVentas
    })

    return participacion
  } catch (error) {
    console.error('Error al calcular participación en ventas:', error)
    return {
      'sucursal_1': 0.20,
      'sucursal_2': 0.20,
      'sucursal_3': 0.20,
      'sucursal_4': 0.20,
      'sucursal_5': 0.20
    }
  }
}

/**
 * Distribuir costos fijos totales entre sucursales según participación en ventas
 */
export async function distribuirCostosFijos(
  periodoKey: string,
  costosTotal: CostosFijosSubcuentasCarga
): Promise<{ success: boolean; error?: string; detalles?: any[] }> {
  try {
    // Calcular participación de cada sucursal
    const participacion = await calcularParticipacionVentas(periodoKey)
    
    if (Object.keys(participacion).length === 0) {
      return { 
        success: false, 
        error: 'No hay datos de ventas para este período. Cargá primero los datos de facturación.' 
      }
    }

    // Distribuir y guardar para cada sucursal
    const detalles: any[] = []
    const resultados = await Promise.all(
      Object.entries(participacion).map(async ([sucursalId, porcentaje]) => {
        const costosDistribuidos: CostosFijosSubcuentasCarga = {
          alquileres: (costosTotal.alquileres || 0) * porcentaje,
          honorarios: (costosTotal.honorarios || 0) * porcentaje,
          tasas_servicios: (costosTotal.tasas_servicios || 0) * porcentaje,
          mantenimiento_servicios_tecnicos: (costosTotal.mantenimiento_servicios_tecnicos || 0) * porcentaje,
          perdida_gestion_inventarios: (costosTotal.perdida_gestion_inventarios || 0) * porcentaje,
          seguridad_vigilancia: (costosTotal.seguridad_vigilancia || 0) * porcentaje,
          otros_servicios: (costosTotal.otros_servicios || 0) * porcentaje,
          gastos_personal: (costosTotal.gastos_personal || 0) * porcentaje,
          otros_gastos: (costosTotal.otros_gastos || 0) * porcentaje,
          comisiones_gastos_bancarios: (costosTotal.comisiones_gastos_bancarios || 0) * porcentaje,
          gastos_extraordinarios: (costosTotal.gastos_extraordinarios || 0) * porcentaje,
          gastos_comercializacion: (costosTotal.gastos_comercializacion || 0) * porcentaje,
          gastos_administracion: (costosTotal.gastos_administracion || 0) * porcentaje,
          gastos_financiacion: (costosTotal.gastos_financiacion || 0) * porcentaje,
          diferencias_caja_perdida: (costosTotal.diferencias_caja_perdida || 0) * porcentaje,
        }

        const result = await upsertCostosFijosSubcuentas(periodoKey, sucursalId, costosDistribuidos)
        
        detalles.push({
          sucursalId,
          porcentaje: porcentaje * 100,
          total: Object.values(costosDistribuidos).reduce((sum, val) => sum + val, 0)
        })

        return result
      })
    )

    // Verificar si hubo errores
    const errores = resultados.filter(r => !r.success)
    if (errores.length > 0) {
      return { success: false, error: `Errores al guardar: ${errores.map(e => e.error).join(', ')}` }
    }

    return { success: true, detalles }
  } catch (error) {
    console.error('Error al distribuir costos fijos:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Distribuir ingresos financieros totales entre sucursales según participación en ventas
 */
export async function distribuirIngresosFinancieros(
  periodoKey: string,
  ingresosTotal: IngresosFinancierosSubcuentasCarga
): Promise<{ success: boolean; error?: string; detalles?: any[] }> {
  try {
    // Calcular participación de cada sucursal
    const participacion = await calcularParticipacionVentas(periodoKey)
    
    if (Object.keys(participacion).length === 0) {
      return { 
        success: false, 
        error: 'No hay datos de ventas para este período. Cargá primero los datos de facturación.' 
      }
    }

    // Distribuir y guardar para cada sucursal
    const detalles: any[] = []
    const resultados = await Promise.all(
      Object.entries(participacion).map(async ([sucursalId, porcentaje]) => {
        const ingresosDistribuidos: IngresosFinancierosSubcuentasCarga = {
          operatoria_financiera: (ingresosTotal.operatoria_financiera || 0) * porcentaje,
          rendimientos_financieros: (ingresosTotal.rendimientos_financieros || 0) * porcentaje,
        }

        const result = await upsertIngresosFinancierosSubcuentas(periodoKey, sucursalId, ingresosDistribuidos)
        
        detalles.push({
          sucursalId,
          porcentaje: porcentaje * 100,
          total: (ingresosDistribuidos.operatoria_financiera || 0) + (ingresosDistribuidos.rendimientos_financieros || 0)
        })

        return result
      })
    )

    // Verificar si hubo errores
    const errores = resultados.filter(r => !r.success)
    if (errores.length > 0) {
      return { success: false, error: `Errores al guardar: ${errores.map(e => e.error).join(', ')}` }
    }

    return { success: true, detalles }
  } catch (error) {
    console.error('Error al distribuir ingresos financieros:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

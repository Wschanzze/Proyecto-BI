// lib/metricas-admin.ts
import { supabase } from './supabase'
import type { MetricaConfigurable, ConfiguracionPL } from './data'

// Obtener todas las métricas configurables
export async function getMetricasConfigurables(): Promise<MetricaConfigurable[]> {
  const { data, error } = await supabase
    .from('metricas_configurables')
    .select('*')
    .eq('activo', true)
    .order('categoria', { ascending: true })
    .order('clave', { ascending: true })

  if (error) {
    console.error('Error al obtener métricas configurables:', error)
    return []
  }

  return data || []
}

// Obtener configuración consolidada para P&L
export async function getConfiguracionPL(sucursalId?: string): Promise<ConfiguracionPL> {
  const metricas = await getMetricasConfigurables()
  
  // Función auxiliar para buscar valor de métrica
  const getValor = (categoria: string, clave: string, defaultValue: number = 0): number => {
    const metrica = metricas.find(m => 
      m.categoria === categoria && 
      m.clave === clave &&
      (m.sucursal_id === null || m.sucursal_id === sucursalId) &&
      new Date(m.fecha_desde) <= new Date() &&
      (m.fecha_hasta === null || new Date(m.fecha_hasta) >= new Date())
    )
    return metrica?.valor || defaultValue
  }

    // Helper to get 12 months array
    const getMonthlyArray = (baseKey: string, defaultVal: number) => {
      const arr = []
      for (let i = 1; i <= 12; i++) {
        arr.push(getValor('proyecciones', `${baseKey}_m${i}`, defaultVal))
      }
      return arr
    }

    return {
      ratios: {
        iva: getValor('ratios', 'iva_porcentaje', 0.21),
        rrhh: getValor('ratios', 'rrhh_porcentaje', 0.12),
        gastosComerciales: getValor('ratios', 'gastos_comerciales_porcentaje', 0.03),
        impuestosOperativos: getValor('ratios', 'impuestos_operativos_porcentaje', 0.02),
        gastosGenerales: getValor('ratios', 'gastos_generales_porcentaje', 0.04),
        ingresosFinancieros: getValor('ratios', 'ingresos_financieros_porcentaje', 0.005),
        merma: getValor('ratios', 'merma_porcentaje', 0.016),
      },
      impuestos: {
        ivaResultado: getValor('impuestos', 'iva_resultado_porcentaje', 0.19),
        iibb: getValor('impuestos', 'iibb_porcentaje', 0.03),
        tuae: getValor('impuestos', 'tuae_porcentaje', 0.02),
      },
      estimaciones: {
        cmvSalon: getValor('estimaciones', 'cmv_salon_porcentaje', 0.75),
        cmvFrescos: getValor('estimaciones', 'cmv_frescos_porcentaje', 0.68),
      },
      kpis: {
        ticketPromedio: getValor('kpis', 'ticket_promedio', 2500),
        clientesPorVenta: getValor('kpis', 'clientes_por_venta', 25000),
        metrosTotales: getValor('kpis', 'metros_totales', 3200),
        metrosSalon: getValor('kpis', 'metros_salon', 2800),
        skuTotal: getValor('kpis', 'sku_total', 12500),
        rotacionPromedio: getValor('kpis', 'rotacion_promedio', 85),
        stockoutPromedio: getValor('kpis', 'stockout_promedio', 2.3),
      },
      proyecciones: {
        facturacionMensual: getMonthlyArray('proy_facturacion', 100000000),
        cmvPctMensual: getMonthlyArray('proy_cmv_pct', 0.70),
        rrhhPctMensual: getMonthlyArray('proy_rrhh_pct', 0.12),
        gastosComercialesPctMensual: getMonthlyArray('proy_gastos_comerciales_pct', 0.15),
        mermasPctMensual: getMonthlyArray('proy_mermas_pct', 0.02),
      }
    }
}

// Actualizar una métrica configurable
export async function actualizarMetrica(
  id: number,
  valor: number,
  userEmail?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('metricas_configurables')
      .update({
        valor,
        actualizado_en: new Date().toISOString(),
        creado_por: userEmail || null
      })
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: 'Error inesperado al actualizar métrica' }
  }
}

// Crear nueva métrica configurable
export async function crearMetrica(
  metrica: Omit<MetricaConfigurable, 'id' | 'creado_en' | 'actualizado_en'>
): Promise<{ success: boolean; data?: MetricaConfigurable; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('metricas_configurables')
      .insert([metrica])
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err) {
    return { success: false, error: 'Error inesperado al crear métrica' }
  }
}

// Desactivar métrica
export async function desactivarMetrica(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('metricas_configurables')
      .update({ activo: false, actualizado_en: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: 'Error inesperado al desactivar métrica' }
  }
}

// Obtener métricas por categoría
export async function getMetricasPorCategoria(categoria: string): Promise<MetricaConfigurable[]> {
  const { data, error } = await supabase
    .from('metricas_configurables')
    .select('*')
    .eq('categoria', categoria)
    .eq('activo', true)
    .order('clave', { ascending: true })

  if (error) {
    console.error('Error al obtener métricas por categoría:', error)
    return []
  }

  return data || []
}
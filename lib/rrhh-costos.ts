// lib/rrhh-costos.ts
import { supabase } from './supabase'
import type { 
  Empleado, 
  NominaMensual, 
  CostoEstructural, 
  PlantillaEmpleado,
  TemplateRRHH,
  TemplateCosto 
} from './data'

// ===== EMPLEADOS =====

export async function getEmpleados(sucursalId?: string): Promise<Empleado[]> {
  let query = supabase
    .from('empleados')
    .select('*')
    .eq('activo', true)
    .order('apellido', { ascending: true })

  if (sucursalId && sucursalId !== '__consolidado__') {
    query = query.eq('sucursal_id', sucursalId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error al obtener empleados:', error)
    return []
  }

  return data || []
}

export async function getPlantillaEmpleados(sucursalId: string): Promise<PlantillaEmpleado[]> {
  const { data, error } = await supabase
    .from('plantilla_empleados')
    .select('*')
    .eq('sucursal_id', sucursalId)
    .eq('activo', true)
    .order('orden_carga', { ascending: true })

  if (error) {
    console.error('Error al obtener plantilla empleados:', error)
    return []
  }

  return data || []
}

// ===== NÓMINA =====

export async function getNominaMensual(
  periodoId: number, 
  sucursalId?: string
): Promise<NominaMensual[]> {
  let query = supabase
    .from('nomina_mensual')
    .select(`
      *,
      empleados!inner(apellido, nombre, legajo, puesto)
    `)
    .eq('periodo_id', periodoId)

  if (sucursalId && sucursalId !== '__consolidado__') {
    query = query.eq('sucursal_id', sucursalId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error al obtener nómina mensual:', error)
    return []
  }

  return data || []
}

export async function cargarNominaMensual(
  periodoId: number,
  sucursalId: string,
  datosNomina: TemplateRRHH[],
  archivoOrigen?: string
): Promise<{ success: boolean; insertados: number; errores: string[] }> {
  try {
    const errores: string[] = []
    let insertados = 0

    // Obtener plantilla de empleados para validar
    const plantilla = await getPlantillaEmpleados(sucursalId)
    const plantillaMap = new Map(plantilla.map(p => [p.legajo, p]))

    // Validar y preparar datos
    const nominaParaInsertar: Partial<NominaMensual>[] = []

    for (const [index, registro] of datosNomina.entries()) {
      const empleadoPlantilla = plantillaMap.get(registro.legajo)
      
      if (!empleadoPlantilla) {
        errores.push(`Fila ${index + 1}: Legajo ${registro.legajo} no encontrado en plantilla`)
        continue
      }

      // Buscar o crear empleado
      let empleado = await getEmpleadoPorLegajo(registro.legajo, sucursalId)
      
      if (!empleado) {
        // Crear empleado desde plantilla
        empleado = await crearEmpleadoDesdeTemplate(empleadoPlantilla, sucursalId)
      }

      if (!empleado) {
        errores.push(`Fila ${index + 1}: No se pudo crear empleado para legajo ${registro.legajo}`)
        continue
      }

      // Calcular totales
      const totalRemunerativo = registro.sueldo_basico + (registro.horas_extras || 0) + (registro.premios || 0) + (registro.bonificaciones || 0)
      const totalNoRemunerativo = registro.viaticos || 0
      const jubilacion = totalRemunerativo * 0.11 // 11%
      const obraSocial = totalRemunerativo * 0.03 // 3%
      const totalDescuentos = jubilacion + obraSocial
      const netoACobrar = totalRemunerativo + totalNoRemunerativo - totalDescuentos
      const aportesPatronales = totalRemunerativo * 0.235 // 23.5%
      const art = totalRemunerativo * 0.012 // 1.2%
      const costoTotalEmpresa = totalRemunerativo + totalNoRemunerativo + aportesPatronales + art

      nominaParaInsertar.push({
        periodo_id: periodoId,
        sucursal_id: sucursalId,
        empleado_id: empleado.id,
        sueldo_basico: registro.sueldo_basico,
        horas_extras: registro.horas_extras || 0,
        premios: registro.premios || 0,
        bonificaciones: registro.bonificaciones || 0,
        total_remunerativo: totalRemunerativo,
        viaticos: registro.viaticos || 0,
        total_no_remunerativo: totalNoRemunerativo,
        jubilacion,
        obra_social: obraSocial,
        total_descuentos: totalDescuentos,
        aportes_patronales: aportesPatronales,
        art,
        neto_a_cobrar: netoACobrar,
        costo_total_empresa: costoTotalEmpresa,
        dias_trabajados: registro.dias_trabajados || 30,
        ausentismos: registro.ausentismos || 0,
        observaciones: registro.observaciones,
        archivo_origen: archivoOrigen
      })
    }

    // Insertar en lote
    if (nominaParaInsertar.length > 0) {
      const { data, error } = await supabase
        .from('nomina_mensual')
        .upsert(nominaParaInsertar, { 
          onConflict: 'periodo_id,empleado_id',
          ignoreDuplicates: false 
        })
        .select()

      if (error) {
        return { success: false, insertados: 0, errores: [`Error en inserción masiva: ${error.message}`] }
      }

      insertados = data?.length || 0
    }

    return {
      success: true,
      insertados,
      errores
    }
  } catch (err) {
    return {
      success: false,
      insertados: 0,
      errores: [`Error inesperado: ${err instanceof Error ? err.message : 'Error desconocido'}`]
    }
  }
}

// ===== COSTOS ESTRUCTURALES =====

export async function getCostosEstructurales(
  periodoId: number,
  sucursalId?: string
): Promise<CostoEstructural[]> {
  let query = supabase
    .from('costos_estructurales')
    .select('*')
    .eq('periodo_id', periodoId)

  if (sucursalId && sucursalId !== '__consolidado__') {
    query = query.eq('sucursal_id', sucursalId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error al obtener costos estructurales:', error)
    return []
  }

  return data || []
}

export async function cargarCostosEstructurales(
  periodoId: number,
  sucursalId: string,
  datosCostos: TemplateCosto[],
  archivoOrigen?: string
): Promise<{ success: boolean; insertados: number; errores: string[] }> {
  try {
    const errores: string[] = []
    const costosParaInsertar: Partial<CostoEstructural>[] = []

    for (const [index, registro] of datosCostos.entries()) {
      // Validaciones básicas
      if (!registro.categoria_costo || !registro.subcategoria || !registro.descripcion || !registro.importe) {
        errores.push(`Fila ${index + 1}: Datos incompletos (categoria_costo, subcategoria, descripcion e importe son obligatorios)`)
        continue
      }

      if (registro.importe <= 0) {
        errores.push(`Fila ${index + 1}: El importe debe ser mayor a 0`)
        continue
      }

      // Calcular componentes fijos y variables si no se especifican
      const importeFijo = registro.importe_fijo || (registro.importe_variable ? registro.importe - registro.importe_variable : registro.importe)
      const importeVariable = registro.importe_variable || 0

      costosParaInsertar.push({
        periodo_id: periodoId,
        sucursal_id: sucursalId,
        categoria_costo: registro.categoria_costo as any,
        subcategoria: registro.subcategoria,
        descripcion: registro.descripcion,
        importe: registro.importe,
        importe_variable: importeVariable,
        importe_fijo: importeFijo,
        tipo_gasto: (registro.tipo_gasto as any) || 'operativo',
        proveedor: registro.proveedor,
        numero_factura: registro.numero_factura,
        fecha_vencimiento: registro.fecha_vencimiento,
        observaciones: registro.observaciones,
        archivo_origen: archivoOrigen
      })
    }

    // Insertar en lote
    if (costosParaInsertar.length > 0) {
      const { data, error } = await supabase
        .from('costos_estructurales')
        .upsert(costosParaInsertar, {
          onConflict: 'periodo_id,sucursal_id,categoria_costo,subcategoria,descripcion',
          ignoreDuplicates: false
        })
        .select()

      if (error) {
        return { success: false, insertados: 0, errores: [`Error en inserción: ${error.message}`] }
      }

      return {
        success: true,
        insertados: data?.length || 0,
        errores
      }
    }

    return { success: true, insertados: 0, errores }
  } catch (err) {
    return {
      success: false,
      insertados: 0,
      errores: [`Error inesperado: ${err instanceof Error ? err.message : 'Error desconocido'}`]
    }
  }
}

// ===== FUNCIONES AUXILIARES =====

async function getEmpleadoPorLegajo(legajo: string, sucursalId: string): Promise<Empleado | null> {
  const { data, error } = await supabase
    .from('empleados')
    .select('*')
    .eq('legajo', legajo)
    .eq('sucursal_id', sucursalId)
    .single()

  return error ? null : data
}

async function crearEmpleadoDesdeTemplate(
  template: PlantillaEmpleado, 
  sucursalId: string
): Promise<Empleado | null> {
  const { data, error } = await supabase
    .from('empleados')
    .insert({
      legajo: template.legajo,
      apellido: template.apellido,
      nombre: template.nombre,
      dni: `00000000`, // Placeholder - se debe actualizar manualmente
      cuil: `00-00000000-0`, // Placeholder
      sucursal_id: sucursalId,
      puesto: template.puesto,
      categoria: template.categoria as any,
      fecha_ingreso: new Date().toISOString().split('T')[0],
      sueldo_basico: template.sueldo_basico_default
    })
    .select()
    .single()

  return error ? null : data
}

// ===== RESÚMENES Y TOTALES =====

export async function getResumenRRHHPorSucursal(
  periodoId: number
): Promise<Array<{ sucursal_id: string; total_empleados: number; costo_total: number; costo_promedio: number }>> {
  const { data, error } = await supabase
    .from('nomina_mensual')
    .select(`
      sucursal_id,
      costo_total_empresa,
      sucursales!inner(nombre)
    `)
    .eq('periodo_id', periodoId)

  if (error) {
    console.error('Error al obtener resumen RRHH:', error)
    return []
  }

  // Agrupar por sucursal
  const resumenMap = new Map<string, { total_empleados: number; costo_total: number }>()

  for (const registro of data || []) {
    const actual = resumenMap.get(registro.sucursal_id) || { total_empleados: 0, costo_total: 0 }
    actual.total_empleados += 1
    actual.costo_total += registro.costo_total_empresa
    resumenMap.set(registro.sucursal_id, actual)
  }

  return Array.from(resumenMap.entries()).map(([sucursal_id, datos]) => ({
    sucursal_id,
    total_empleados: datos.total_empleados,
    costo_total: datos.costo_total,
    costo_promedio: datos.total_empleados > 0 ? datos.costo_total / datos.total_empleados : 0
  }))
}

export async function getResumenCostosPorCategoria(
  periodoId: number,
  sucursalId?: string
): Promise<Array<{ categoria_costo: string; total_importe: number; cantidad_conceptos: number }>> {
  let query = supabase
    .from('costos_estructurales')
    .select('categoria_costo, importe')
    .eq('periodo_id', periodoId)

  if (sucursalId && sucursalId !== '__consolidado__') {
    query = query.eq('sucursal_id', sucursalId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error al obtener resumen costos:', error)
    return []
  }

  // Agrupar por categoría
  const resumenMap = new Map<string, { total_importe: number; cantidad_conceptos: number }>()

  for (const registro of data || []) {
    const actual = resumenMap.get(registro.categoria_costo) || { total_importe: 0, cantidad_conceptos: 0 }
    actual.total_importe += registro.importe
    actual.cantidad_conceptos += 1
    resumenMap.set(registro.categoria_costo, actual)
  }

  return Array.from(resumenMap.entries()).map(([categoria_costo, datos]) => ({
    categoria_costo,
    total_importe: datos.total_importe,
    cantidad_conceptos: datos.cantidad_conceptos
  }))
}
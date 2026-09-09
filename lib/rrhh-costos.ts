// lib/rrhh-costos.ts
// Gestión de empleados, nómina y plantillas en modo DEMO autónomo.

import type { 
  Empleado, 
  NominaMensual, 
  CostoEstructural, 
  PlantillaEmpleado,
  TemplateRRHH,
  TemplateCosto 
} from './data'

const PLANTILLA_DEMO: Record<string, PlantillaEmpleado[]> = {
  colon: [
    { id: 1, sucursal_id: 'colon', legajo: 'COL-001', apellido: 'Gómez', nombre: 'Carlos', puesto: 'Gerente de Sucursal', categoria: 'gerencial', sueldo_basico_default: 1450000, activo: true, orden_carga: 1 },
    { id: 2, sucursal_id: 'colon', legajo: 'COL-002', apellido: 'Rodríguez', nombre: 'Mariana', puesto: 'Cajera Senior', categoria: 'operativo', sueldo_basico_default: 890000, activo: true, orden_carga: 2 },
    { id: 3, sucursal_id: 'colon', legajo: 'COL-003', apellido: 'Pérez', nombre: 'Juan', puesto: 'Repositor', categoria: 'operativo', sueldo_basico_default: 780000, activo: true, orden_carga: 3 },
    { id: 4, sucursal_id: 'colon', legajo: 'COL-004', apellido: 'López', nombre: 'Lucía', puesto: 'Administrativa', categoria: 'administrativo', sueldo_basico_default: 920000, activo: true, orden_carga: 4 },
    { id: 5, sucursal_id: 'colon', legajo: 'COL-005', apellido: 'Fernández', nombre: 'Matías', puesto: 'Seguridad', categoria: 'operativo', sueldo_basico_default: 810000, activo: true, orden_carga: 5 },
  ],
  'san-martin': [
    { id: 6, sucursal_id: 'san-martin', legajo: 'SM-001', apellido: 'Díaz', nombre: 'Alejandro', puesto: 'Gerente', categoria: 'gerencial', sueldo_basico_default: 1450000, activo: true, orden_carga: 1 },
    { id: 7, sucursal_id: 'san-martin', legajo: 'SM-002', apellido: 'Martínez', nombre: 'Carla', puesto: 'Cajera', categoria: 'operativo', sueldo_basico_default: 870000, activo: true, orden_carga: 2 },
    { id: 8, sucursal_id: 'san-martin', legajo: 'SM-003', apellido: 'Sánchez', nombre: 'Diego', puesto: 'Cajero', categoria: 'operativo', sueldo_basico_default: 870000, activo: true, orden_carga: 3 },
    { id: 9, sucursal_id: 'san-martin', legajo: 'SM-004', apellido: 'Romero', nombre: 'Gastón', puesto: 'Repositor', categoria: 'operativo', sueldo_basico_default: 780000, activo: true, orden_carga: 4 },
    { id: 10, sucursal_id: 'san-martin', legajo: 'SM-005', apellido: 'Benítez', nombre: 'Rosa', puesto: 'Limpieza', categoria: 'operativo', sueldo_basico_default: 720000, activo: true, orden_carga: 5 },
  ],
  falucho: [
    { id: 11, sucursal_id: 'falucho', legajo: 'FAL-001', apellido: 'Silva', nombre: 'Martín', puesto: 'Gerente', categoria: 'gerencial', sueldo_basico_default: 1400000, activo: true, orden_carga: 1 },
    { id: 12, sucursal_id: 'falucho', legajo: 'FAL-002', apellido: 'Torres', nombre: 'Camila', puesto: 'Cajera', categoria: 'operativo', sueldo_basico_default: 870000, activo: true, orden_carga: 2 },
    { id: 13, sucursal_id: 'falucho', legajo: 'FAL-003', apellido: 'Flores', nombre: 'Pablo', puesto: 'Repositor', categoria: 'operativo', sueldo_basico_default: 780000, activo: true, orden_carga: 3 },
    { id: 14, sucursal_id: 'falucho', legajo: 'FAL-004', apellido: 'Acosta', nombre: 'Florencia', puesto: 'Administrativa', categoria: 'administrativo', sueldo_basico_default: 910000, activo: true, orden_carga: 4 },
  ],
  peron: [
    { id: 15, sucursal_id: 'peron', legajo: 'PER-001', apellido: 'Morales', nombre: 'Federico', puesto: 'Gerente', categoria: 'gerencial', sueldo_basico_default: 1400000, activo: true, orden_carga: 1 },
    { id: 16, sucursal_id: 'peron', legajo: 'PER-002', apellido: 'Ríos', nombre: 'Daniela', puesto: 'Cajera Senior', categoria: 'operativo', sueldo_basico_default: 890000, activo: true, orden_carga: 2 },
    { id: 17, sucursal_id: 'peron', legajo: 'PER-003', apellido: 'Castro', nombre: 'Lucas', puesto: 'Repositor', categoria: 'operativo', sueldo_basico_default: 780000, activo: true, orden_carga: 3 },
    { id: 18, sucursal_id: 'peron', legajo: 'PER-004', apellido: 'Medina', nombre: 'Jorge', puesto: 'Seguridad', categoria: 'operativo', sueldo_basico_default: 810000, activo: true, orden_carga: 4 },
  ],
  virtual: [
    { id: 19, sucursal_id: 'virtual', legajo: 'VIR-001', apellido: 'Navarro', nombre: 'Esteban', puesto: 'Director Comercial', categoria: 'gerencial', sueldo_basico_default: 2100000, activo: true, orden_carga: 1 },
    { id: 20, sucursal_id: 'virtual', legajo: 'VIR-002', apellido: 'Suárez', nombre: 'Valeria', puesto: 'Contadora', categoria: 'administrativo', sueldo_basico_default: 1650000, activo: true, orden_carga: 2 },
    { id: 21, sucursal_id: 'virtual', legajo: 'VIR-003', apellido: 'Vega', nombre: 'Paula', puesto: 'Jefa de RRHH', categoria: 'administrativo', sueldo_basico_default: 1650000, activo: true, orden_carga: 3 },
    { id: 22, sucursal_id: 'virtual', legajo: 'VIR-004', apellido: 'Paz', nombre: 'Gonzalo', puesto: 'Administrativo eCommerce', categoria: 'administrativo', sueldo_basico_default: 950000, activo: true, orden_carga: 4 },
  ],
}

export async function getEmpleados(sucursalId?: string): Promise<Empleado[]> {
  const target = sucursalId && sucursalId !== '__consolidado__' ? sucursalId : 'colon'
  const list = PLANTILLA_DEMO[target] || PLANTILLA_DEMO.colon
  return list.map(p => ({
    id: p.id,
    legajo: p.legajo,
    apellido: p.apellido,
    nombre: p.nombre,
    dni: '35123456',
    cuil: '20-35123456-8',
    sucursal_id: p.sucursal_id,
    puesto: p.puesto,
    categoria: p.categoria as any,
    fecha_ingreso: '2023-01-01',
    fecha_egreso: null,
    sueldo_basico: p.sueldo_basico_default,
    activo: true,
    creado_en: '2023-01-01T00:00:00Z',
    actualizado_en: '2023-01-01T00:00:00Z',
  }))
}

export async function getPlantillaEmpleados(sucursalId: string): Promise<PlantillaEmpleado[]> {
  return PLANTILLA_DEMO[sucursalId] || PLANTILLA_DEMO.colon
}

export async function getNominaMensual(periodoId: number, sucursalId?: string): Promise<NominaMensual[]> {
  return []
}

export async function cargarNominaMensual(
  periodoId: number,
  sucursalId: string,
  datosNomina: TemplateRRHH[],
  archivoOrigen?: string,
  modoIncremental: boolean = false
): Promise<{ success: boolean; insertados: number; errores: string[] }> {
  return {
    success: true,
    insertados: datosNomina.length,
    errores: []
  }
}

export async function getCostosEstructurales(periodoId: number, sucursalId?: string): Promise<CostoEstructural[]> {
  return []
}

export async function cargarCostosEstructurales(
  periodoId: number,
  sucursalId: string,
  datosCostos: TemplateCosto[],
  archivoOrigen?: string,
  modoIncremental: boolean = false
): Promise<{ success: boolean; insertados: number; errores: string[] }> {
  return {
    success: true,
    insertados: datosCostos.length,
    errores: []
  }
}

export async function getResumenRRHHPorSucursal(periodoId: number) {
  return [
    { sucursal_id: 'colon', total_empleados: 5, costo_total: 6200000, costo_promedio: 1240000 },
    { sucursal_id: 'san-martin', total_empleados: 5, costo_total: 5800000, costo_promedio: 1160000 },
    { sucursal_id: 'falucho', total_empleados: 4, costo_total: 5000000, costo_promedio: 1250000 },
    { sucursal_id: 'peron', total_empleados: 4, costo_total: 4900000, costo_promedio: 1225000 },
    { sucursal_id: 'virtual', total_empleados: 4, costo_total: 7800000, costo_promedio: 1950000 },
  ]
}

export async function getResumenCostosPorCategoria(periodoId: number, sucursalId?: string) {
  return [
    { categoria_costo: 'Servicios', total_importe: 1800000, cantidad_conceptos: 4 },
    { categoria_costo: 'Mantenimiento', total_importe: 950000, cantidad_conceptos: 3 },
    { categoria_costo: 'Alquiler', total_importe: 2500000, cantidad_conceptos: 1 },
  ]
}

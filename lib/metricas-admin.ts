// lib/metricas-admin.ts
// Gestión de métricas configurables en modo DEMO autónomo con persistencia en localStorage.

import type { MetricaConfigurable, ConfiguracionPL } from './data'

const STORAGE_KEY = 'monarca_demo_metricas'

const DEFAULT_METRICAS: MetricaConfigurable[] = [
  // Ratios P&L
  { id: 1, categoria: 'ratios', clave: 'iva_porcentaje', nombre: 'IVA General', descripcion: 'Impuesto al Valor Agregado aplicado a ventas', valor: 0.187528, tipo: 'porcentaje', unidad: '%', activo: true, sucursal_id: null, fecha_desde: '2026-01-01', fecha_hasta: null, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z', creado_por: 'demo@monarca.com' },
  { id: 2, categoria: 'ratios', clave: 'rrhh_porcentaje', nombre: 'RRHH sobre Ventas', descripcion: 'Recursos Humanos como porcentaje de ventas sin IVA', valor: 0.12, tipo: 'porcentaje', unidad: '%', activo: true, sucursal_id: null, fecha_desde: '2026-01-01', fecha_hasta: null, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z', creado_por: 'demo@monarca.com' },
  { id: 3, categoria: 'ratios', clave: 'gastos_comerciales_porcentaje', nombre: 'Gastos Comerciales', descripcion: 'Marketing y gastos de comercialización sobre ventas', valor: 0.03, tipo: 'porcentaje', unidad: '%', activo: true, sucursal_id: null, fecha_desde: '2026-01-01', fecha_hasta: null, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z', creado_por: 'demo@monarca.com' },
  { id: 4, categoria: 'ratios', clave: 'impuestos_operativos_porcentaje', nombre: 'Impuestos Operativos', descripcion: 'Impuestos y cargas operativas sobre ventas', valor: 0.02, tipo: 'porcentaje', unidad: '%', activo: true, sucursal_id: null, fecha_desde: '2026-01-01', fecha_hasta: null, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z', creado_por: 'demo@monarca.com' },
  { id: 5, categoria: 'ratios', clave: 'gastos_generales_porcentaje', nombre: 'Gastos Generales', descripcion: 'Gastos operativos generales sobre ventas', valor: 0.04, tipo: 'porcentaje', unidad: '%', activo: true, sucursal_id: null, fecha_desde: '2026-01-01', fecha_hasta: null, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z', creado_por: 'demo@monarca.com' },
  { id: 6, categoria: 'ratios', clave: 'ingresos_financieros_porcentaje', nombre: 'Ingresos Financieros', descripcion: 'Ingresos financieros externos sobre ventas', valor: 0.005, tipo: 'porcentaje', unidad: '%', activo: true, sucursal_id: null, fecha_desde: '2026-01-01', fecha_hasta: null, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z', creado_por: 'demo@monarca.com' },
  { id: 7, categoria: 'ratios', clave: 'merma_porcentaje', nombre: 'Merma Estándar', descripcion: 'Merma calculada sobre ventas sin IVA (estándar retail)', valor: 0.016, tipo: 'porcentaje', unidad: '%', activo: true, sucursal_id: null, fecha_desde: '2026-01-01', fecha_hasta: null, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z', creado_por: 'demo@monarca.com' },

  // Impuestos
  { id: 8, categoria: 'impuestos', clave: 'iva_resultado_porcentaje', nombre: 'IVA en Resultado', descripcion: 'Porcentaje de IVA que impacta en resultado impositivo', valor: 0.19, tipo: 'porcentaje', unidad: '%', activo: true, sucursal_id: null, fecha_desde: '2026-01-01', fecha_hasta: null, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z', creado_por: 'demo@monarca.com' },
  { id: 9, categoria: 'impuestos', clave: 'iibb_porcentaje', nombre: 'Ingresos Brutos', descripcion: 'Impuesto sobre Ingresos Brutos', valor: 0.03, tipo: 'porcentaje', unidad: '%', activo: true, sucursal_id: null, fecha_desde: '2026-01-01', fecha_hasta: null, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z', creado_por: 'demo@monarca.com' },
  { id: 10, categoria: 'impuestos', clave: 'tuae_porcentaje', nombre: 'TUAE', descripcion: 'Tasa de Análisis de Expedientes', valor: 0.02, tipo: 'porcentaje', unidad: '%', activo: true, sucursal_id: null, fecha_desde: '2026-01-01', fecha_hasta: null, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z', creado_por: 'demo@monarca.com' },

  // Estimaciones
  { id: 11, categoria: 'estimaciones', clave: 'cmv_salon_porcentaje', nombre: 'CMV Salón Estimado', descripcion: 'Costo estimado de Salón', valor: 0.75, tipo: 'porcentaje', unidad: '%', activo: true, sucursal_id: null, fecha_desde: '2026-01-01', fecha_hasta: null, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z', creado_por: 'demo@monarca.com' },
  { id: 12, categoria: 'estimaciones', clave: 'cmv_frescos_porcentaje', nombre: 'CMV Frescos Estimado', descripcion: 'Costo estimado de Frescos', valor: 0.68, tipo: 'porcentaje', unidad: '%', activo: true, sucursal_id: null, fecha_desde: '2026-01-01', fecha_hasta: null, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z', creado_por: 'demo@monarca.com' },

  // KPIs
  { id: 13, categoria: 'kpis', clave: 'ticket_promedio', nombre: 'Ticket Promedio', descripcion: 'Ticket promedio', valor: 2500, tipo: 'monto', unidad: 'ARS', activo: true, sucursal_id: null, fecha_desde: '2026-01-01', fecha_hasta: null, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z', creado_por: 'demo@monarca.com' },
  { id: 14, categoria: 'kpis', clave: 'clientes_por_venta', nombre: 'Clientes por Venta', descripcion: 'Clientes por venta', valor: 25000, tipo: 'cantidad', unidad: 'clientes', activo: true, sucursal_id: null, fecha_desde: '2026-01-01', fecha_hasta: null, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z', creado_por: 'demo@monarca.com' },
  { id: 15, categoria: 'kpis', clave: 'metros_totales', nombre: 'Metros Totales', descripcion: 'Metros totales', valor: 3200, tipo: 'cantidad', unidad: 'm²', activo: true, sucursal_id: null, fecha_desde: '2026-01-01', fecha_hasta: null, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z', creado_por: 'demo@monarca.com' },
  { id: 16, categoria: 'kpis', clave: 'metros_salon', nombre: 'Metros Salón', descripcion: 'Metros de salón', valor: 2800, tipo: 'cantidad', unidad: 'm²', activo: true, sucursal_id: null, fecha_desde: '2026-01-01', fecha_hasta: null, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z', creado_por: 'demo@monarca.com' },
  { id: 17, categoria: 'kpis', clave: 'sku_total', nombre: 'SKUs Totales', descripcion: 'SKUs totales', valor: 12500, tipo: 'cantidad', unidad: 'unidades', activo: true, sucursal_id: null, fecha_desde: '2026-01-01', fecha_hasta: null, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z', creado_por: 'demo@monarca.com' },
  { id: 18, categoria: 'kpis', clave: 'rotacion_promedio', nombre: 'Rotación Promedio', descripcion: 'Días de rotación', valor: 85, tipo: 'cantidad', unidad: 'días', activo: true, sucursal_id: null, fecha_desde: '2026-01-01', fecha_hasta: null, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z', creado_por: 'demo@monarca.com' },
  { id: 19, categoria: 'kpis', clave: 'stockout_promedio', nombre: 'Stockout Promedio', descripcion: 'Quiebre de stock', valor: 2.3, tipo: 'porcentaje', unidad: '%', activo: true, sucursal_id: null, fecha_desde: '2026-01-01', fecha_hasta: null, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z', creado_por: 'demo@monarca.com' },
]

// Generar proyecciones mes a mes 1..12
let autoId = 20
const FACT_BASE = [110000000, 114000000, 122000000, 120000000, 125000000, 129000000, 134000000, 131000000, 128000000, 133000000, 138000000, 155000000]

for (let i = 1; i <= 12; i++) {
  DEFAULT_METRICAS.push({
    id: autoId++,
    categoria: 'proyecciones',
    clave: `proy_facturacion_m${i}`,
    nombre: `Facturación Mes ${i}`,
    descripcion: `Facturación proyectada mes ${i}`,
    valor: FACT_BASE[i - 1],
    tipo: 'monto',
    unidad: 'ARS',
    activo: true,
    sucursal_id: null,
    fecha_desde: '2026-01-01',
    fecha_hasta: null,
    creado_en: '2026-01-01T00:00:00Z',
    actualizado_en: '2026-01-01T00:00:00Z',
    creado_por: 'demo@monarca.com',
  })
  DEFAULT_METRICAS.push({
    id: autoId++,
    categoria: 'proyecciones',
    clave: `proy_cmv_pct_m${i}`,
    nombre: `CMV Objetivo Mes ${i}`,
    descripcion: `CMV objetivo mes ${i}`,
    valor: 0.70,
    tipo: 'porcentaje',
    unidad: '%',
    activo: true,
    sucursal_id: null,
    fecha_desde: '2026-01-01',
    fecha_hasta: null,
    creado_en: '2026-01-01T00:00:00Z',
    actualizado_en: '2026-01-01T00:00:00Z',
    creado_por: 'demo@monarca.com',
  })
  DEFAULT_METRICAS.push({
    id: autoId++,
    categoria: 'proyecciones',
    clave: `proy_rrhh_pct_m${i}`,
    nombre: `RRHH Objetivo Mes ${i}`,
    descripcion: `RRHH objetivo mes ${i}`,
    valor: 0.12,
    tipo: 'porcentaje',
    unidad: '%',
    activo: true,
    sucursal_id: null,
    fecha_desde: '2026-01-01',
    fecha_hasta: null,
    creado_en: '2026-01-01T00:00:00Z',
    actualizado_en: '2026-01-01T00:00:00Z',
    creado_por: 'demo@monarca.com',
  })
  DEFAULT_METRICAS.push({
    id: autoId++,
    categoria: 'proyecciones',
    clave: `proy_gastos_comerciales_pct_m${i}`,
    nombre: `Gastos Comerciales Mes ${i}`,
    descripcion: `Costos fijos objetivo mes ${i}`,
    valor: 0.15,
    tipo: 'porcentaje',
    unidad: '%',
    activo: true,
    sucursal_id: null,
    fecha_desde: '2026-01-01',
    fecha_hasta: null,
    creado_en: '2026-01-01T00:00:00Z',
    actualizado_en: '2026-01-01T00:00:00Z',
    creado_por: 'demo@monarca.com',
  })
  DEFAULT_METRICAS.push({
    id: autoId++,
    categoria: 'proyecciones',
    clave: `proy_mermas_pct_m${i}`,
    nombre: `Mermas Objetivo Mes ${i}`,
    descripcion: `Mermas objetivo mes ${i}`,
    valor: 0.02,
    tipo: 'porcentaje',
    unidad: '%',
    activo: true,
    sucursal_id: null,
    fecha_desde: '2026-01-01',
    fecha_hasta: null,
    creado_en: '2026-01-01T00:00:00Z',
    actualizado_en: '2026-01-01T00:00:00Z',
    creado_por: 'demo@monarca.com',
  })
}

// Helper para leer/escribir estado
let inMemoryMetricas: MetricaConfigurable[] = [...DEFAULT_METRICAS]

function loadState(): MetricaConfigurable[] {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        return JSON.parse(raw)
      } catch (e) {}
    }
  }
  return inMemoryMetricas
}

function saveState(list: MetricaConfigurable[]) {
  inMemoryMetricas = list
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  }
}

export async function getMetricasConfigurables(): Promise<MetricaConfigurable[]> {
  const current = loadState()
  return current.filter((m) => m.activo)
}

export async function getConfiguracionPL(sucursalId?: string): Promise<ConfiguracionPL> {
  const metricas = await getMetricasConfigurables()

  const getValor = (categoria: string, clave: string, defaultValue: number = 0): number => {
    const metrica = metricas.find(
      (m) =>
        m.categoria === categoria &&
        m.clave === clave &&
        (m.sucursal_id === null || m.sucursal_id === sucursalId)
    )
    return metrica?.valor !== undefined ? Number(metrica.valor) : defaultValue
  }

  const getMonthlyArray = (baseKey: string, defaultVal: number) => {
    const arr = []
    for (let i = 1; i <= 12; i++) {
      arr.push(getValor('proyecciones', `${baseKey}_m${i}`, defaultVal))
    }
    return arr
  }

  return {
    ratios: {
      iva: getValor('ratios', 'iva_porcentaje', 0.187528),
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
      facturacionMensual: getMonthlyArray('proy_facturacion', 120000000),
      cmvPctMensual: getMonthlyArray('proy_cmv_pct', 0.70),
      rrhhPctMensual: getMonthlyArray('proy_rrhh_pct', 0.12),
      gastosComercialesPctMensual: getMonthlyArray('proy_gastos_comerciales_pct', 0.15),
      mermasPctMensual: getMonthlyArray('proy_mermas_pct', 0.02),
    },
  }
}

export async function actualizarMetrica(
  id: number,
  valor: number,
  userEmail?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const list = loadState()
    const idx = list.findIndex((m) => m.id === id)
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        valor,
        actualizado_en: new Date().toISOString(),
        creado_por: userEmail || list[idx].creado_por,
      }
      saveState(list)
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al actualizar métrica' }
  }
}

export async function crearMetrica(
  metrica: Omit<MetricaConfigurable, 'id' | 'creado_en' | 'actualizado_en'>
): Promise<{ success: boolean; data?: MetricaConfigurable; error?: string }> {
  const list = loadState()
  const newId = Math.max(...list.map((m) => m.id), 0) + 1
  const created: MetricaConfigurable = {
    ...metrica,
    id: newId,
    creado_en: new Date().toISOString(),
    actualizado_en: new Date().toISOString(),
  }
  list.push(created)
  saveState(list)
  return { success: true, data: created }
}

export async function desactivarMetrica(id: number): Promise<{ success: boolean; error?: string }> {
  const list = loadState()
  const idx = list.findIndex((m) => m.id === id)
  if (idx !== -1) {
    list[idx] = { ...list[idx], activo: false }
    saveState(list)
  }
  return { success: true }
}

export async function getMetricasPorCategoria(categoria: string): Promise<MetricaConfigurable[]> {
  const all = await getMetricasConfigurables()
  return all.filter((m) => m.categoria === categoria)
}

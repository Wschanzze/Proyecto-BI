import type { ConfiguracionPL, CuadroResultadoLinea } from "./data"
import { SUCURSAL_FACTORS } from "./data-db"

export interface MesProyectado extends CuadroResultadoLinea {
  mes: number
  anio: number
  key: string
  labelCorto: string
}

const FACT_BASE_2025 = [
  4850000000, 4500000000, 5200000000, 5000000000, 4900000000, 4950000000,
  5280000000, 5200000000, 4900000000, 5180000000, 5750000000, 7050000000
]

const FACT_BASE_2026 = [
  6450000000, 6000000000, 6420000000, 6380000000, 6300000000, 6520000000,
  7050000000, 6950000000, 6800000000, 7200000000, 7850000000, 9500000000
]

export function calcularProyeccionAnual(
  anio: number,
  config: ConfiguracionPL,
  sucursalId: string = "__consolidado__"
): MesProyectado[] {
  const proy = config.proyecciones
  const meses: MesProyectado[] = []
  
  const branchFactor = (sucursalId && sucursalId !== "__consolidado__" && SUCURSAL_FACTORS[sucursalId])
    ? SUCURSAL_FACTORS[sucursalId]
    : 1.0
  
  for (let mes = 1; mes <= 12; mes++) {
    const idx = mes - 1
    let facturacionBase: number
    
    if (anio === 2025) {
      facturacionBase = FACT_BASE_2025[idx]
    } else if (anio === 2026) {
      facturacionBase = proy.facturacionMensual[idx] || FACT_BASE_2026[idx]
    } else {
      // Proyección futura (ej. 2027) con crecimiento proyectado
      const base2026 = proy.facturacionMensual[idx] || FACT_BASE_2026[idx]
      facturacionBase = Math.round(base2026 * Math.pow(1.25, anio - 2026))
    }
    
    const facturacion = Math.round(facturacionBase * branchFactor)
    
    // Usar tasa de IVA ponderada efectiva del mix real (Carnicería/Frescos al 10.5% + Salón al 21%)
    const ivaTasa = config.ratios.iva || 0.187528
    const ventasSinIva = Math.round(facturacion / (1 + ivaTasa))
    const iva = facturacion - ventasSinIva
    
    const cmvPct = proy.cmvPctMensual[idx] ?? 0.695
    const cmv = Math.round(ventasSinIva * cmvPct)
    const contribucionMarginal = ventasSinIva - cmv
    
    const rrhhPct = proy.rrhhPctMensual[idx] ?? 0.12
    const rrhh = Math.round(ventasSinIva * rrhhPct)
    
    const costosFijosPct = proy.gastosComercialesPctMensual[idx] ?? 0.032
    const costosFijos = Math.round(ventasSinIva * costosFijosPct)
    
    const resultadoOperativo = contribucionMarginal - rrhh - costosFijos
    
    const impuestos = Math.round(ventasSinIva * (config.ratios.impuestosOperativos ?? 0.02))
    const merma = Math.round(ventasSinIva * (proy.mermasPctMensual[idx] ?? 0.016))
    
    const resultadoSupermercado = resultadoOperativo - impuestos - merma
    const ingresosFinancieros = Math.round(ventasSinIva * (config.ratios.ingresosFinancieros ?? 0.005))
    
    const resultadoTotal = resultadoSupermercado + ingresosFinancieros
    
    // Mocks para subcuentas estructuradas
    const rrhhSubcuentas = {
      sueldos: Math.round(rrhh * 0.70),
      cargas_sociales: Math.round(rrhh * 0.26),
      indemnizaciones: Math.round(rrhh * 0.025),
      tabla_merito: Math.round(rrhh * 0.015),
    }
    const costosFijosSubcuentas = { 
      alquileres: Math.round(costosFijos * 0.25),
      honorarios: Math.round(costosFijos * 0.05),
      tasas_servicios: Math.round(costosFijos * 0.10), 
      mantenimiento_servicios_tecnicos: Math.round(costosFijos * 0.08),
      perdida_gestion_inventarios: Math.round(costosFijos * 0.05), 
      seguridad_vigilancia: Math.round(costosFijos * 0.07),
      otros_servicios: Math.round(costosFijos * 0.05),
      gastos_personal: Math.round(costosFijos * 0.03), 
      otros_gastos: Math.round(costosFijos * 0.07),
      comisiones_gastos_bancarios: Math.round(costosFijos * 0.04),
      gastos_extraordinarios: Math.round(costosFijos * 0.03), 
      gastos_comercializacion: Math.round(costosFijos * 0.10),
      gastos_administracion: Math.round(costosFijos * 0.05),
      gastos_financiacion: Math.round(costosFijos * 0.02), 
      diferencias_caja_perdida: Math.round(costosFijos * 0.01) 
    }
    const ingresosFinancierosSubcuentas = {
      intereses_plazos_fijos: Math.round(ingresosFinancieros * 0.5),
      rendimientos_fci: Math.round(ingresosFinancieros * 0.3),
      descuentos_obtenidos: Math.round(ingresosFinancieros * 0.1),
      diferencia_cambio: Math.round(ingresosFinancieros * 0.1),
      operatoria_financiera: Math.round(ingresosFinancieros * 0.7),
      rendimientos_financieros: Math.round(ingresosFinancieros * 0.3),
    }

    meses.push({
      mes,
      anio,
      key: `${anio}-${String(mes).padStart(2, '0')}`,
      labelCorto: getMesAbreviado(mes),
      facturacion,
      iva,
      ventasSinIva,
      cmv,
      contribucionMarginal,
      rrhh,
      rrhhSubcuentas,
      costosFijos,
      costosFijosSubcuentas,
      resultadoOperativo,
      impuestos,
      merma,
      resultadoSupermercado,
      ingresosFinancieros,
      ingresosFinancierosSubcuentas,
      resultadoTotal
    })
  }
  
  return meses
}

function getMesAbreviado(mes: number): string {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  return meses[mes - 1]
}

export function calcularMAPE(reales: number[], proyectados: number[]): number | null {
  if (reales.length === 0 || proyectados.length === 0) return null
  
  let sumaErrores = 0
  let count = 0
  
  for (let i = 0; i < Math.min(reales.length, proyectados.length); i++) {
    const real = reales[i]
    const proy = proyectados[i]
    if (real !== 0 && real != null) {
      sumaErrores += Math.abs((real - proy) / real)
      count++
    }
  }
  
  return count > 0 ? (sumaErrores / count) * 100 : null
}

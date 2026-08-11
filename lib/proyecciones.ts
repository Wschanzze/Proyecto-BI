import type { ConfiguracionPL, CuadroResultadoLinea } from "./data"

export interface MesProyectado extends CuadroResultadoLinea {
  mes: number
  anio: number
  key: string
  labelCorto: string
}

export function calcularProyeccionAnual(anio: number, config: ConfiguracionPL): MesProyectado[] {
  const proy = config.proyecciones
  const meses: MesProyectado[] = []
  
  let facturacionAcumulada = proy.facturacionBase
  
  for (let mes = 1; mes <= 12; mes++) {
    const facturacion = mes === 1 ? facturacionAcumulada : facturacionAcumulada * (1 + proy.crecimientoMensual)
    facturacionAcumulada = facturacion // update for next month
    
    // Asumimos IVA 21% estándar para simplificar, o calcular inverso: facturacion / 1.21
    const ivaTasa = config.ratios.iva || 0.21
    const ventasSinIva = facturacion / (1 + ivaTasa)
    const iva = facturacion - ventasSinIva
    
    const cmv = ventasSinIva * proy.cmvPct
    const contribucionMarginal = ventasSinIva - cmv
    
    const rrhh = ventasSinIva * proy.rrhhPct
    const costosFijos = ventasSinIva * proy.gastosComercialesPct
    
    const resultadoOperativo = contribucionMarginal - rrhh - costosFijos
    
    const impuestos = ventasSinIva * config.ratios.impuestosOperativos
    const merma = ventasSinIva * proy.mermasPct
    
    const resultadoSupermercado = resultadoOperativo - impuestos - merma
    const ingresosFinancieros = ventasSinIva * config.ratios.ingresosFinancieros
    
    const resultadoTotal = resultadoSupermercado + ingresosFinancieros
    
    // Mocks para subcuentas (no se muestran completas en el proyectado simplificado, pero deben cumplir la interfaz)
    const rrhhSubcuentas = { sueldos: rrhh * 0.7, cargas_sociales: rrhh * 0.3, indemnizaciones: 0, tabla_merito: 0 }
    const costosFijosSubcuentas = { 
      alquileres: costosFijos * 0.25, honorarios: costosFijos * 0.05, tasas_servicios: costosFijos * 0.1, 
      mantenimiento_servicios_tecnicos: costosFijos * 0.08, perdida_gestion_inventarios: costosFijos * 0.05, 
      seguridad_vigilancia: costosFijos * 0.07, otros_servicios: costosFijos * 0.05, gastos_personal: costosFijos * 0.03, 
      otros_gastos: costosFijos * 0.07, comisiones_gastos_bancarios: costosFijos * 0.04, gastos_extraordinarios: costosFijos * 0.03, 
      gastos_comercializacion: costosFijos * 0.1, gastos_administracion: costosFijos * 0.05, gastos_financiacion: costosFijos * 0.02, 
      diferencias_caja_perdida: costosFijos * 0.01 
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

// lib/estacionalidad.ts
import fs from 'fs'
import path from 'path'
import * as XLSX from 'xlsx'

export interface RegistroMensualEstacionalidad {
  fechaKey: string // 'YYYY-MM'
  anio: number
  mes: number // 1..12
  clientes: number
  productos: number
  facturacion: number
  changoPromedio: number
  ticketPromedio: number
  varClientes: number | null
  varProductos: number | null
  varFacturacion: number | null
  varChangoPromedio: number | null
  varTicketPromedio: number | null
  esProyectado?: boolean
}

export interface RegistroInflacion {
  anio: number
  mes: number
  periodoKey: string
  inflacionMensual: number
  inflacionAnual: number
}

export interface KPICardData {
  titulo: string
  clave: string
  valorActual: number
  sufijo: string
  formato: 'numero' | 'moneda' | 'decimal'
  mom: number | null
  yoy: number | null
  ytd: number | null
}

export interface MatrizEstacionalidadRow {
  anio: number
  meses: (number | null)[] // 12 valores ENE..DIC (variación en %)
}

export interface EstadisticasMes {
  mesNombre: string
  media: number
  std: number
  kurtosis: number
}

export interface CorrelacionInflacion {
  indicador: string
  r: number
}

const MESES_ABREV = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

const MESES_MAP: Record<string, number> = {
  'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6,
  'JUL': 7, 'AGO': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12,
  'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4, 'MAYO': 5, 'JUNIO': 6,
  'JULIO': 7, 'AGOSTO': 8, 'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12
}

function parseExcelDate(val: any): Date | null {
  if (!val) return null
  if (val instanceof Date) return val
  if (typeof val === 'number') {
    return new Date((val - (25567 + 2)) * 86400 * 1000)
  }
  const str = String(val).trim()
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

// 1. CARGA DE DATOS HISTÓRICOS DESDE EXCEL
export function cargarDatosEstacionalidadLocal(): RegistroMensualEstacionalidad[] {
  const filePath = path.join(process.cwd(), 'datos_estacionalidad.xlsx')
  if (!fs.existsSync(filePath)) return []

  const wb = XLSX.readFile(filePath)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows: any[] = XLSX.utils.sheet_to_json(sheet)

  // Agrupar transacciones diarias a nivel mensual
  const agrupado: Record<string, { clientes: number; productos: number; facturacion: number; count: number }> = {}

  rows.forEach(r => {
    const fObj = parseExcelDate(r['Fecha'] || r['fecha'])
    if (!fObj) return

    const y = fObj.getUTCFullYear()
    const m = String(fObj.getUTCMonth() + 1).padStart(2, '0')
    const key = `${y}-${m}`

    const c = parseInt(r['Cantidad'] || r['clientes'] || r['Clientes'] || 0) || 0
    const p = parseInt(r['Productos'] || r['productos'] || 0) || 0
    const fact = parseFloat(r['Facturacion'] || r['facturacion'] || 0) || 0

    if (!agrupado[key]) {
      agrupado[key] = { clientes: 0, productos: 0, facturacion: 0, count: 0 }
    }
    agrupado[key].clientes += c
    agrupado[key].productos += p
    agrupado[key].facturacion += fact
    agrupado[key].count++
  })

  const keysOrdenados = Object.keys(agrupado).sort()
  const resultado: RegistroMensualEstacionalidad[] = []

  for (let i = 0; i < keysOrdenados.length; i++) {
    const key = keysOrdenados[i]
    const [yStr, mStr] = key.split('-')
    const anio = parseInt(yStr)
    const mes = parseInt(mStr)
    const item = agrupado[key]

    const clientes = item.clientes
    const productos = item.productos
    const facturacion = item.facturacion
    const changoPromedio = clientes > 0 ? productos / clientes : 0
    const ticketPromedio = clientes > 0 ? facturacion / clientes : 0

    const anterior = i > 0 ? resultado[i - 1] : null

    const calcVar = (curr: number, prev: number | null | undefined) => {
      if (!prev || prev === 0) return null
      return ((curr - prev) / prev) * 100
    }

    resultado.push({
      fechaKey: key,
      anio,
      mes,
      clientes,
      productos,
      facturacion,
      changoPromedio,
      ticketPromedio,
      varClientes: anterior ? calcVar(clientes, anterior.clientes) : null,
      varProductos: anterior ? calcVar(productos, anterior.productos) : null,
      varFacturacion: anterior ? calcVar(facturacion, anterior.facturacion) : null,
      varChangoPromedio: anterior ? calcVar(changoPromedio, anterior.changoPromedio) : null,
      varTicketPromedio: anterior ? calcVar(ticketPromedio, anterior.ticketPromedio) : null,
      esProyectado: false
    })
  }

  return resultado
}

export function cargarDatosInflacionLocal(): RegistroInflacion[] {
  const filePath = path.join(process.cwd(), 'inflacion.xlsx')
  if (!fs.existsSync(filePath)) return []

  const wb = XLSX.readFile(filePath)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows: any[] = XLSX.utils.sheet_to_json(sheet)

  const resultado: RegistroInflacion[] = []

  rows.forEach(r => {
    const anio = parseInt(r['Año'] || r['Anio'] || r['anio'])
    const mesStr = String(r['Mes'] || r['mes'] || '').trim().toUpperCase()
    const mesNum = MESES_MAP[mesStr] || parseInt(mesStr)
    const infM = parseFloat(r['Inflacion_Mensual'] || r['inflacion_mensual'] || 0) || 0
    const infA = parseFloat(r['Inflacion_Anual'] || r['inflacion_anual'] || 0) || 0

    if (anio && mesNum >= 1 && mesNum <= 12) {
      const periodoKey = `${anio}-${String(mesNum).padStart(2, '0')}`
      resultado.push({
        anio,
        mes: mesNum,
        periodoKey,
        inflacionMensual: infM,
        inflacionAnual: infA
      })
    }
  })

  return resultado.sort((a, b) => a.periodoKey.localeCompare(b.periodoKey))
}

// 2. CÁLCULO HOLT-WINTERS (EXPONENTIAL SMOOTHING)
export function calcularPronosticoHoltWinters(
  serie: number[],
  mesesPronostico: number,
  alpha = 0.2,
  beta = 0.1,
  gamma = 0.3
): number[] {
  if (serie.length < 24 || mesesPronostico <= 0) return []

  const seasonLength = 12
  const numSeasons = Math.floor(serie.length / seasonLength)

  // Estimación inicial del nivel y la tendencia
  let level = 0
  for (let i = 0; i < seasonLength; i++) {
    level += serie[i]
  }
  level /= seasonLength

  let trend = 0
  for (let i = 0; i < seasonLength; i++) {
    trend += (serie[seasonLength + i] - serie[i]) / seasonLength
  }
  trend /= seasonLength

  // Estimación inicial de estacionalidad
  const seasonals: number[] = new Array(seasonLength).fill(0)
  for (let i = 0; i < numSeasons; i++) {
    for (let j = 0; j < seasonLength; j++) {
      seasonals[j] += serie[i * seasonLength + j] - level
    }
  }
  for (let j = 0; j < seasonLength; j++) {
    seasonals[j] /= numSeasons
  }

  // Iteración paso a paso
  let currentLevel = level
  let currentTrend = trend
  const currentSeasonals = [...seasonals]

  for (let t = 0; t < serie.length; t++) {
    const val = serie[t]
    const seasonIdx = t % seasonLength
    const prevLevel = currentLevel
    const prevTrend = currentTrend
    const prevSeasonal = currentSeasonals[seasonIdx]

    currentLevel = alpha * (val - prevSeasonal) + (1 - alpha) * (prevLevel + prevTrend)
    currentTrend = beta * (currentLevel - prevLevel) + (1 - beta) * prevTrend
    currentSeasonals[seasonIdx] = gamma * (val - currentLevel) + (1 - gamma) * prevSeasonal
  }

  // Pronóstico proyectado
  const forecast: number[] = []
  for (let h = 1; h <= mesesPronostico; h++) {
    const seasonIdx = (serie.length + h - 1) % seasonLength
    const valPred = currentLevel + h * currentTrend + currentSeasonals[seasonIdx]
    forecast.push(Math.max(0, valPred))
  }

  return forecast
}

// 3. CÁLCULO DE VARIACIONES MOM, YOY, YTD
export function calcularMetricasResumen(
  historico: RegistroMensualEstacionalidad[]
): {
  ultimoMes: RegistroMensualEstacionalidad | null
  kpis: KPICardData[]
} {
  if (historico.length === 0) return { ultimoMes: null, kpis: [] }

  const ultimo = historico[historico.length - 1]
  const penultimo = historico.length >= 2 ? historico[historico.length - 2] : null

  // Mismo mes año anterior
  const anioAnterior = ultimo.anio - 1
  const mismoMesAnioAnterior = historico.find(h => h.anio === anioAnterior && h.mes === ultimo.mes)

  // Acumulados YTD (Enero a mes actual)
  const ytdActualList = historico.filter(h => h.anio === ultimo.anio && h.mes <= ultimo.mes)
  const ytdAnteriorList = historico.filter(h => h.anio === anioAnterior && h.mes <= ultimo.mes)

  const calcPct = (act: number, ant: number | null | undefined) => {
    if (ant === null || ant === undefined || ant === 0) return null
    return ((act - ant) / ant) * 100
  }

  const getKPI = (
    titulo: string,
    clave: string,
    valActual: number,
    sufijo: string,
    formato: 'numero' | 'moneda' | 'decimal',
    valPenultimo: number | null | undefined,
    valAnoAnterior: number | null | undefined,
    sumActual: number,
    sumAnterior: number
  ): KPICardData => {
    return {
      titulo,
      clave,
      valorActual: valActual,
      sufijo,
      formato,
      mom: calcPct(valActual, valPenultimo),
      yoy: calcPct(valActual, valAnoAnterior),
      ytd: calcPct(sumActual, sumAnterior)
    }
  }

  // Clientes
  const sumClientesAct = ytdActualList.reduce((acc, h) => acc + h.clientes, 0)
  const sumClientesAnt = ytdAnteriorList.reduce((acc, h) => acc + h.clientes, 0)

  // Productos
  const sumProdAct = ytdActualList.reduce((acc, h) => acc + h.productos, 0)
  const sumProdAnt = ytdAnteriorList.reduce((acc, h) => acc + h.productos, 0)

  // Facturación
  const sumFactAct = ytdActualList.reduce((acc, h) => acc + h.facturacion, 0)
  const sumFactAnt = ytdAnteriorList.reduce((acc, h) => acc + h.facturacion, 0)

  // Chango promedio YTD = sum(prod) / sum(cli)
  const changoYtdAct = sumClientesAct > 0 ? sumProdAct / sumClientesAct : 0
  const changoYtdAnt = sumClientesAnt > 0 ? sumProdAnt / sumClientesAnt : 0

  // Ticket promedio YTD = sum(fact) / sum(cli)
  const ticketYtdAct = sumClientesAct > 0 ? sumFactAct / sumClientesAct : 0
  const ticketYtdAnt = sumClientesAnt > 0 ? sumFactAnt / sumClientesAnt : 0

  const kpis: KPICardData[] = [
    getKPI('Clientes', 'clientes', ultimo.clientes, '', 'numero', penultimo?.clientes, mismoMesAnioAnterior?.clientes, sumClientesAct, sumClientesAnt),
    getKPI('Productos', 'productos', ultimo.productos, '', 'numero', penultimo?.productos, mismoMesAnioAnterior?.productos, sumProdAct, sumProdAnt),
    getKPI('Facturación', 'facturacion', ultimo.facturacion, '', 'moneda', penultimo?.facturacion, mismoMesAnioAnterior?.facturacion, sumFactAct, sumFactAnt),
    getKPI('Chango promedio', 'changoPromedio', ultimo.changoPromedio, ' u/cli', 'decimal', penultimo?.changoPromedio, mismoMesAnioAnterior?.changoPromedio, changoYtdAct, changoYtdAnt),
    getKPI('Ticket promedio', 'ticketPromedio', ultimo.ticketPromedio, ' $/cli', 'moneda', penultimo?.ticketPromedio, mismoMesAnioAnterior?.ticketPromedio, ticketYtdAct, ticketYtdAnt),
  ]

  return { ultimoMes: ultimo, kpis }
}

// 4. CÁLCULO DE CORRELACIÓN DE PEARSON VS INFLACIÓN
export function calcularCorrelacionesInflacion(
  historico: RegistroMensualEstacionalidad[],
  inflacion: RegistroInflacion[]
): CorrelacionInflacion[] {
  const infMap = new Map<string, number>()
  inflacion.forEach(i => infMap.set(i.periodoKey, i.inflacionMensual))

  const indicadores = [
    { key: 'varClientes', label: 'Clientes' },
    { key: 'varProductos', label: 'Productos' },
    { key: 'varFacturacion', label: 'Facturación' },
    { key: 'varChangoPromedio', label: 'Chango prom.' },
    { key: 'varTicketPromedio', label: 'Ticket prom.' }
  ]

  const calcularPearson = (x: number[], y: number[]) => {
    if (x.length < 3 || x.length !== y.length) return 0
    const n = x.length
    const meanX = x.reduce((a, b) => a + b, 0) / n
    const meanY = y.reduce((a, b) => a + b, 0) / n

    let num = 0
    let denX = 0
    let denY = 0

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX
      const dy = y[i] - meanY
      num += dx * dy
      denX += dx * dx
      denY += dy * dy
    }

    if (denX === 0 || denY === 0) return 0
    return num / Math.sqrt(denX * denY)
  }

  return indicadores.map(ind => {
    const xVals: number[] = []
    const yVals: number[] = []

    historico.forEach(h => {
      const varVal = (h as any)[ind.key]
      const infVal = infMap.get(h.fechaKey)

      if (varVal !== null && varVal !== undefined && infVal !== undefined && !isNaN(varVal) && !isNaN(infVal)) {
        xVals.push(varVal)
        yVals.push(infVal)
      }
    })

    return {
      indicador: ind.label,
      r: calcularPearson(xVals, yVals)
    }
  })
}

// 5. CÁLCULO DE MATRIZ DE ESTACIONALIDAD Y ESTADÍSTICAS POR MES
export function calcularMatrizEstacionalidad(
  historico: RegistroMensualEstacionalidad[],
  campoVar: 'varClientes' | 'varFacturacion' | 'varProductos' = 'varClientes'
): {
  matriz: MatrizEstacionalidadRow[]
  estadisticas: EstadisticasMes[]
} {
  const aniosSet = new Set<number>()
  historico.forEach(h => aniosSet.add(h.anio))
  const anios = Array.from(aniosSet).sort((a, b) => a - b)

  const matriz: MatrizEstacionalidadRow[] = []

  anios.forEach(anio => {
    const meses: (number | null)[] = new Array(12).fill(null)
    for (let m = 1; m <= 12; m++) {
      const reg = historico.find(h => h.anio === anio && h.mes === m)
      if (reg) {
        const val = reg[campoVar]
        meses[m - 1] = val !== null && !isNaN(val) ? val : null
      }
    }
    matriz.push({ anio, meses })
  })

  // Estadísticas por mes (columnas 1..12)
  const estadisticas: EstadisticasMes[] = []

  for (let m = 0; m < 12; m++) {
    const valoresMes: number[] = []
    matriz.forEach(row => {
      const v = row.meses[m]
      if (v !== null && !isNaN(v)) {
        valoresMes.push(v)
      }
    })

    if (valoresMes.length === 0) {
      estadisticas.push({
        mesNombre: MESES_ABREV[m],
        media: 0,
        std: 0,
        kurtosis: 0
      })
      continue
    }

    const n = valoresMes.length
    const media = valoresMes.reduce((a, b) => a + b, 0) / n

    const variance = n > 1
      ? valoresMes.reduce((acc, v) => acc + Math.pow(v - media, 2), 0) / (n - 1)
      : 0
    const std = Math.sqrt(variance)

    // Kurtosis de Fisher (0 = normal)
    let kurtosis = 0
    if (n > 3 && std > 0) {
      const m4 = valoresMes.reduce((acc, v) => acc + Math.pow(v - media, 4), 0) / n
      kurtosis = (m4 / Math.pow(variance, 2)) - 3
    }

    estadisticas.push({
      mesNombre: MESES_ABREV[m],
      media,
      std,
      kurtosis
    })
  }

  return { matriz, estadisticas }
}

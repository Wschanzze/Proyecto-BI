// app/api/estacionalidad/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  cargarDatosEstacionalidadLocal,
  cargarDatosInflacionLocal,
  calcularPronosticoHoltWinters,
  calcularMetricasResumen,
  calcularCorrelacionesInflacion,
  calcularMatrizEstacionalidad,
  type RegistroMensualEstacionalidad,
  type RegistroInflacion
} from '@/lib/estacionalidad'

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://wlaotnafjrvckoxbdokk.supabase.co'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const anioInicioStr = searchParams.get('anioInicio')
    const anioFinStr = searchParams.get('anioFin')
    const mesesPronosticoStr = searchParams.get('mesesPronostico')

    const anioInicio = anioInicioStr ? parseInt(anioInicioStr) : null
    const anioFin = anioFinStr ? parseInt(anioFinStr) : null
    const mesesPronostico = mesesPronosticoStr ? parseInt(mesesPronosticoStr) : 0

    // 1. Intentar cargar desde Supabase DB primero
    let datosMensuales: RegistroMensualEstacionalidad[] = []
    let inflacionData: RegistroInflacion[] = []

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })

    const { data: dbVentas } = await supabase
      .from('historico_ventas_diario')
      .select('fecha, periodo_key, clientes, productos, facturacion')
      .order('fecha', { ascending: true })

    const { data: dbInflacion } = await supabase
      .from('historico_inflacion')
      .select('anio, mes, periodo_key, inflacion_mensual, inflacion_anual')
      .order('periodo_key', { ascending: true })

    if (dbVentas && dbVentas.length > 0) {
      // Agrupar ventas diarias de DB por periodo_key
      const agrupado: Record<string, { clientes: number; productos: number; facturacion: number }> = {}
      dbVentas.forEach(r => {
        const pKey = r.periodo_key
        if (!agrupado[pKey]) {
          agrupado[pKey] = { clientes: 0, productos: 0, facturacion: 0 }
        }
        agrupado[pKey].clientes += r.clientes || 0
        agrupado[pKey].productos += r.productos || 0
        agrupado[pKey].facturacion += parseFloat(r.facturacion || 0)
      })

      const keysOrdenados = Object.keys(agrupado).sort()
      const calcVar = (curr: number, prev: number | null | undefined) => {
        if (!prev || prev === 0) return null
        return ((curr - prev) / prev) * 100
      }

      for (let i = 0; i < keysOrdenados.length; i++) {
        const key = keysOrdenados[i]
        const [yStr, mStr] = key.split('-')
        const anio = parseInt(yStr)
        const mes = parseInt(mStr)
        const item = agrupado[key]

        const changoPromedio = item.clientes > 0 ? item.productos / item.clientes : 0
        const ticketPromedio = item.clientes > 0 ? item.facturacion / item.clientes : 0

        const prev = i > 0 ? datosMensuales[i - 1] : null

        datosMensuales.push({
          fechaKey: key,
          anio,
          mes,
          clientes: item.clientes,
          productos: item.productos,
          facturacion: item.facturacion,
          changoPromedio,
          ticketPromedio,
          varClientes: prev ? calcVar(item.clientes, prev.clientes) : null,
          varProductos: prev ? calcVar(item.productos, prev.productos) : null,
          varFacturacion: prev ? calcVar(item.facturacion, prev.facturacion) : null,
          varChangoPromedio: prev ? calcVar(changoPromedio, prev.changoPromedio) : null,
          varTicketPromedio: prev ? calcVar(ticketPromedio, prev.ticketPromedio) : null,
          esProyectado: false
        })
      }
    } else {
      // Fallback a archivos locales Excel
      datosMensuales = cargarDatosEstacionalidadLocal()
    }

    if (dbInflacion && dbInflacion.length > 0) {
      inflacionData = dbInflacion.map(r => ({
        anio: r.anio,
        mes: r.mes,
        periodoKey: r.periodo_key,
        inflacionMensual: parseFloat(r.inflacion_mensual || 0),
        inflacionAnual: parseFloat(r.inflacion_anual || 0)
      }))
    } else {
      inflacionData = cargarDatosInflacionLocal()
    }

    // 2. Obtener lista de años disponibles en el dataset
    const aniosDisponibles = Array.from(new Set(datosMensuales.map(d => d.anio))).sort((a, b) => a - b)

    // 3. Aplicar filtro por rango de años si está especificado
    let datosHistoricosFiltrados = datosMensuales
    if (anioInicio !== null && anioFin !== null) {
      datosHistoricosFiltrados = datosMensuales.filter(d => d.anio >= anioInicio && d.anio <= anioFin)
    }

    // Guardar copia estricta de históricos antes del pronóstico
    const copiaHistorico = [...datosHistoricosFiltrados]

    // 4. Calcular Métricas Resumen (MoM, YoY, YTD) sobre datos reales estrictos
    const { ultimoMes, kpis } = calcularMetricasResumen(copiaHistorico)

    // 5. Aplicar Pronóstico Holt-Winters si mesesPronostico > 0
    let datosConPronostico = [...copiaHistorico]

    if (mesesPronostico > 0 && copiaHistorico.length >= 24) {
      const serieClientes = copiaHistorico.map(h => h.clientes)
      const serieFacturacion = copiaHistorico.map(h => h.facturacion)

      const predClientes = calcularPronosticoHoltWinters(serieClientes, mesesPronostico)
      const predFacturacion = calcularPronosticoHoltWinters(serieFacturacion, mesesPronostico)

      const ultimoReg = copiaHistorico[copiaHistorico.length - 1]
      let currAnio = ultimoReg.anio
      let currMes = ultimoReg.mes

      for (let i = 0; i < mesesPronostico; i++) {
        currMes++
        if (currMes > 12) {
          currMes = 1
          currAnio++
        }

        const key = `${currAnio}-${String(currMes).padStart(2, '0')}`
        const cPred = predClientes[i] || 0
        const fPred = predFacturacion[i] || 0
        const tPred = cPred > 0 ? fPred / cPred : 0

        const prevReg = datosConPronostico[datosConPronostico.length - 1]

        datosConPronostico.push({
          fechaKey: key,
          anio: currAnio,
          mes: currMes,
          clientes: cPred,
          productos: 0, // Productos no se pronostica
          facturacion: fPred,
          changoPromedio: 0,
          ticketPromedio: tPred,
          varClientes: prevReg ? ((cPred - prevReg.clientes) / prevReg.clientes) * 100 : null,
          varProductos: null,
          varFacturacion: prevReg ? ((fPred - prevReg.facturacion) / prevReg.facturacion) * 100 : null,
          varChangoPromedio: null,
          varTicketPromedio: prevReg && prevReg.ticketPromedio ? ((tPred - prevReg.ticketPromedio) / prevReg.ticketPromedio) * 100 : null,
          esProyectado: true
        })
      }
    }

    // 6. Correlaciones vs Inflación
    const correlaciones = calcularCorrelacionesInflacion(copiaHistorico, inflacionData)

    // 7. Matriz de Estacionalidad & Estadísticos por Mes
    const matrizClientes = calcularMatrizEstacionalidad(copiaHistorico, 'varClientes')
    const matrizFacturacion = calcularMatrizEstacionalidad(copiaHistorico, 'varFacturacion')

    return NextResponse.json({
      aniosDisponibles,
      ultimoMes,
      kpis,
      datosMensuales: datosConPronostico,
      datosHistoricos: copiaHistorico,
      inflacion: inflacionData,
      correlaciones,
      matrizClientes,
      matrizFacturacion,
      fechaCorte: ultimoMes ? ultimoMes.fechaKey : null
    })
  } catch (error: any) {
    console.error('[api/estacionalidad] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al procesar estacionalidad' }, { status: 500 })
  }
}

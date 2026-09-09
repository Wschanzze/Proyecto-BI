// app/api/estacionalidad/route.ts
import { NextResponse } from 'next/server'
import {
  cargarDatosEstacionalidadLocal,
  cargarDatosInflacionLocal,
  calcularPronosticoHoltWinters,
  calcularMetricasResumen,
  calcularCorrelacionesInflacion,
  calcularMatrizEstacionalidad,
} from '@/lib/estacionalidad'

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

    const datosMensuales = cargarDatosEstacionalidadLocal()
    const inflacionData = cargarDatosInflacionLocal()

    const aniosDisponibles = Array.from(new Set(datosMensuales.map((d) => d.anio))).sort((a, b) => a - b)

    let datosHistoricosFiltrados = datosMensuales
    if (anioInicio !== null && anioFin !== null) {
      datosHistoricosFiltrados = datosMensuales.filter((d) => d.anio >= anioInicio && d.anio <= anioFin)
    }

    const copiaHistorico = [...datosHistoricosFiltrados]
    const { ultimoMes, kpis } = calcularMetricasResumen(copiaHistorico)

    let datosConPronostico = [...copiaHistorico]

    if (mesesPronostico > 0 && copiaHistorico.length >= 24) {
      const serieClientes = copiaHistorico.map((h) => h.clientes)
      const serieFacturacion = copiaHistorico.map((h) => h.facturacion)

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
          productos: 0,
          facturacion: fPred,
          changoPromedio: 0,
          ticketPromedio: tPred,
          varClientes: prevReg ? ((cPred - prevReg.clientes) / prevReg.clientes) * 100 : null,
          varProductos: null,
          varFacturacion: prevReg ? ((fPred - prevReg.facturacion) / prevReg.facturacion) * 100 : null,
          varChangoPromedio: null,
          varTicketPromedio: prevReg && prevReg.ticketPromedio ? ((tPred - prevReg.ticketPromedio) / prevReg.ticketPromedio) * 100 : null,
          esProyectado: true,
        })
      }
    }

    const correlaciones = calcularCorrelacionesInflacion(copiaHistorico, inflacionData)
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
      fechaCorte: ultimoMes ? ultimoMes.fechaKey : null,
    })
  } catch (error: any) {
    console.error('[api/estacionalidad] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al procesar estacionalidad' }, { status: 500 })
  }
}

// lib/reportes-data.ts
// Tipos y generador de datos determinísticos de alta fidelidad para el módulo de Reportes

export interface ReportTemplateDef {
  id: string
  title: string
  category: "Ventas" | "Stock" | "Promociones" | "Operativo"
  description: string
  iconName: string
  queryType: string
  badge?: string
}

export const REPORT_TEMPLATES: ReportTemplateDef[] = [
  {
    id: "participacion-sucursales",
    title: "Participación de Sucursales",
    category: "Ventas",
    description: "Porcentaje de participación sobre la venta total por sucursal con opción de exclusión dinámica y gráficos de distribución.",
    iconName: "PieChart",
    queryType: "participacionSucursales",
    badge: "Nuevo",
  },
  {
    id: "quiebres-carniceria",
    title: "Quiebres de Carnicería",
    category: "Operativo",
    description: "Análisis por fecha de 1ª y última venta de comprobantes para CARNE VACUNA. Detecta quiebres prematuros de stock en mostrador.",
    iconName: "Flame",
    queryType: "quiebresCarniceria",
    badge: "Nuevo",
  },
  {
    id: "control-surtido",
    title: "Elaboración Control Surtido y Stock",
    category: "Stock",
    description: "Carga de Stock General, Movimientos y BOCA con cruce de ventas SECOS en 15 días y exportación Excel oficial.",
    iconName: "Layers",
    queryType: "controlSurtido",
    badge: "Nuevo",
  },
  {
    id: "resumen-sucursal",
    title: "Reporte Ejecutivo de Ventas por Sucursal",
    category: "Ventas",
    description: "Análisis consolidado de facturación, número de tickets, ticket promedio y cajeros activos por sucursal.",
    iconName: "Store",
    queryType: "resumenPorSucursal",
    badge: "Principal",
  },
  {
    id: "secos-quiebre",
    title: "Reporte de Ventas SECOS y Quiebre de Stock",
    category: "Stock",
    description: "Rotación diaria de productos secos por sucursal, productos críticos y estimación de días en período.",
    iconName: "AlertTriangle",
    queryType: "promedioVentaSecosPorSucursal",
    badge: "Crítico",
  },
  {
    id: "ventas-diarias",
    title: "Reporte de Evolución Diaria de Ventas",
    category: "Ventas",
    description: "Tendencia de ingresos diarios, volumen de transacciones y sucursales operativas por fecha.",
    iconName: "TrendingUp",
    queryType: "ventasPorDia",
  },
  {
    id: "top-productos",
    title: "Reporte Top 50 Productos Más Vendidos",
    category: "Ventas",
    description: "Ranking de los productos con mayor importe facturado y volumen de unidades vendidas.",
    iconName: "ShoppingBag",
    queryType: "productosMasVendidos",
  },
  {
    id: "horas-pico",
    title: "Reporte de Distribución de Horas Pico",
    category: "Operativo",
    description: "Concentración de clientes y ventas por hora del día para optimización de personal de caja.",
    iconName: "Clock",
    queryType: "horasPico",
  },
  {
    id: "ticket-promedio",
    title: "Reporte de Ticket Promedio y Dispersión",
    category: "Ventas",
    description: "Métricas de gasto promedio por cliente, mínimo y máximo valor por sucursal.",
    iconName: "DollarSign",
    queryType: "ticketPromedio",
  },
]

export const SUCURSALES_NOMBRES = [
  "Colón",
  "San Martín",
  "Falucho",
  "Perón",
  "Monarca Virtual",
]

// Ponderación histórica aproximada de ventas de la red Monarca
export const SUCURSAL_WEIGHTS: Record<string, number> = {
  "Colón": 0.28,
  "San Martín": 0.25,
  "Falucho": 0.22,
  "Perón": 0.18,
  "Monarca Virtual": 0.07,
}

// -------------------------------------------------------------
// 1. Participación de Sucursales
// -------------------------------------------------------------
export interface ParticipacionSucursalItem {
  posicion: number
  sucursal: string
  ventaTotal: number
  porcentaje: number
  porcentajeTexto: string
  tickets: number
  ticketPromedio: number
  color: string
}

export interface ParticipacionReporteResponse {
  ok: boolean
  origen: "SQL_LOCAL" | "DEMO_SIMULADA"
  periodo: { desde: string; hasta: string }
  totalVenta: number
  totalTickets: number
  ticketPromedio: number
  sucursalesEvaluadas: number
  data: ParticipacionSucursalItem[]
}

const PALETA_SUCURSALES: Record<string, string> = {
  "Colón": "#0046ad",
  "San Martín": "#FF5C15",
  "Falucho": "#10b981",
  "Perón": "#8b5cf6",
  "Monarca Virtual": "#06b6d4",
}

export function getParticipacionSucursalesDemo(
  desde?: string,
  hasta?: string,
  excluidas: string[] = []
): ParticipacionReporteResponse {
  const dFin = hasta || new Date().toISOString().slice(0, 10)
  const dIni = desde || (() => {
    const d = new Date(dFin)
    d.setDate(d.getDate() - 15)
    return d.toISOString().slice(0, 10)
  })()

  // Base de facturación para el período (aprox 15 días: ~$3.200M)
  const dias = Math.max(1, Math.round((new Date(dFin).getTime() - new Date(dIni).getTime()) / (1000 * 60 * 60 * 24)) + 1)
  const baseVentaPeriodo = (6_500_000_000 / 30) * dias

  const sucursalesActivas = SUCURSALES_NOMBRES.filter((s) => !excluidas.includes(s))
  const pesoTotalActivas = sucursalesActivas.reduce((acc, s) => acc + (SUCURSAL_WEIGHTS[s] || 0.2), 0)

  let rawList = sucursalesActivas.map((s) => {
    const pesoRel = (SUCURSAL_WEIGHTS[s] || 0.2) / (pesoTotalActivas || 1)
    const factorRuido = 0.96 + ((s.charCodeAt(0) * 17) % 8) * 0.01 // determinístico leve
    const venta = Math.round(baseVentaPeriodo * pesoRel * factorRuido)
    const ticketProm = Math.round(34_000 + ((s.charCodeAt(1) || 70) * 85) % 8000)
    const tickets = Math.round(venta / ticketProm)
    return {
      sucursal: s,
      ventaTotal: venta,
      tickets,
      ticketPromedio: ticketProm,
      color: PALETA_SUCURSALES[s] || "#64748b",
    }
  })

  // Ordenar descendente por venta
  rawList.sort((a, b) => b.ventaTotal - a.ventaTotal)

  const granTotalVenta = rawList.reduce((acc, r) => acc + r.ventaTotal, 0)
  const granTotalTickets = rawList.reduce((acc, r) => acc + r.tickets, 0)
  const ticketPromedioGral = granTotalTickets > 0 ? granTotalVenta / granTotalTickets : 0

  const items: ParticipacionSucursalItem[] = rawList.map((r, idx) => {
    const pct = granTotalVenta > 0 ? (r.ventaTotal / granTotalVenta) * 100 : 0
    return {
      posicion: idx + 1,
      sucursal: r.sucursal,
      ventaTotal: r.ventaTotal,
      porcentaje: Number(pct.toFixed(2)),
      porcentajeTexto: `${pct.toFixed(1)}%`,
      tickets: r.tickets,
      ticketPromedio: r.ticketPromedio,
      color: r.color,
    }
  })

  return {
    ok: true,
    origen: "DEMO_SIMULADA",
    periodo: { desde: dIni, hasta: dFin },
    totalVenta: granTotalVenta,
    totalTickets: granTotalTickets,
    ticketPromedio: ticketPromedioGral,
    sucursalesEvaluadas: items.length,
    data: items,
  }
}

// -------------------------------------------------------------
// 2. Quiebres de Carnicería (Cortes Vacunos)
// -------------------------------------------------------------
export interface QuiebreCarniceriaItem {
  id: string
  fecha: string
  sucursal: string
  codBarra: string
  producto: string
  primeraCompra: string
  ultimaCompra: string
  totalKilosVendidos: number
  ticketsVendidos: number
  quiebreDetectado: boolean
  estadoQuiebre: "NORMAL" | "ALERTA_TEMPRANA" | "QUIEBRE_CRITICO"
  observacion: string
}

const CORTES_CARNICERIA = [
  { cod: "200001001", nombre: "ASADO ESPECIAL NOVILLO" },
  { cod: "200001002", nombre: "VACIO ESPECIAL NOVILLO" },
  { cod: "200001003", nombre: "MATAMBRE VACUNO SELECCION" },
  { cod: "200001004", nombre: "COLITA DE CUADRIL" },
  { cod: "200001005", nombre: "BIFE DE CHORIZO X KG" },
  { cod: "200001006", nombre: "BIFE ANCHO ESPECIAL" },
  { cod: "200001007", nombre: "NALGA CORTADA PARA MILANESA" },
  { cod: "200001008", nombre: "BOLA DE LOMO MILANESA" },
  { cod: "200001009", nombre: "PICADA ESPECIAL NOVILLO" },
  { cod: "200001010", nombre: "PECETO SELECCIONADO" },
  { cod: "200001011", nombre: "ENTRAÑA FINA X KG" },
  { cod: "200001012", nombre: "OSSOBUCO VACUNO" },
]

export function getQuiebresCarniceriaDemo(
  desde?: string,
  hasta?: string,
  sucursal?: string
): { ok: boolean; data: QuiebreCarniceriaItem[]; resumen: any } {
  const h = hasta || new Date().toISOString().slice(0, 10)
  const d = desde || (() => {
    const date = new Date(h)
    date.setDate(date.getDate() - 7)
    return date.toISOString().slice(0, 10)
  })()

  const sucursalesFiltradas = sucursal && sucursal !== "TODAS"
    ? [sucursal]
    : SUCURSALES_NOMBRES.filter(s => s !== "Monarca Virtual") // Carnicería física

  const resultados: QuiebreCarniceriaItem[] = []

  // Generar datos determinísticos por fecha y sucursal
  const cur = new Date(d)
  const end = new Date(h)

  while (cur <= end) {
    const fStr = cur.toISOString().slice(0, 10)
    const daySeed = cur.getDate() + (cur.getMonth() + 1) * 31

    for (const suc of sucursalesFiltradas) {
      const sucSeed = suc.charCodeAt(0) + suc.charCodeAt(1)

      for (let i = 0; i < CORTES_CARNICERIA.length; i++) {
        const corte = CORTES_CARNICERIA[i]
        const hash = (daySeed * 7 + sucSeed * 13 + i * 19) % 100

        // Primera compra típica entre 8:15 y 9:45
        const hIni = 8 + Math.floor((hash % 15) / 10)
        const mIni = 10 + ((hash * 3) % 45)
        const primera = `${String(hIni).padStart(2, "0")}:${String(mIni).padStart(2, "0")}`

        // Si hash < 18 -> quiebre crítico (última compra antes de 14:30)
        // Si 18 <= hash < 35 -> alerta temprana (última compra entre 14:30 y 18:30)
        // Si hash >= 35 -> normal (última compra después de 19:30 hasta 21:30)
        let ultima = ""
        let estado: "NORMAL" | "ALERTA_TEMPRANA" | "QUIEBRE_CRITICO" = "NORMAL"
        let obs = "Venta fluida durante toda la jornada"
        let quiebre = false

        if (hash < 18) {
          const hFin = 12 + Math.floor((hash % 3))
          const mFin = (hash * 7) % 55
          ultima = `${String(hFin).padStart(2, "0")}:${String(mFin).padStart(2, "0")}`
          estado = "QUIEBRE_CRITICO"
          quiebre = true
          obs = `Quiebre prematuro detectado a las ${ultima}hs. Mostrador sin stock por la tarde.`
        } else if (hash < 35) {
          const hFin = 15 + Math.floor((hash % 4))
          const mFin = (hash * 5) % 55
          ultima = `${String(hFin).padStart(2, "0")}:${String(mFin).padStart(2, "0")}`
          estado = "ALERTA_TEMPRANA"
          quiebre = true
          obs = `Última venta a las ${ultima}hs. Posible falta de reposición en turno vespertino.`
        } else {
          const hFin = 20 + Math.floor((hash % 2))
          const mFin = (hash * 4) % 40
          ultima = `${String(hFin).padStart(2, "0")}:${String(mFin).padStart(2, "0")}`
          estado = "NORMAL"
          quiebre = false
          obs = "Cobertura completa hasta el cierre del local."
        }

        const kilos = Math.round(18 + ((hash * 1.8) % 85))
        const tickets = Math.round(8 + ((hash * 0.9) % 35))

        resultados.push({
          id: `${fStr}-${suc}-${corte.cod}`,
          fecha: fStr,
          sucursal: suc,
          codBarra: corte.cod,
          producto: corte.nombre,
          primeraCompra: primera,
          ultimaCompra: ultima,
          totalKilosVendidos: kilos,
          ticketsVendidos: tickets,
          quiebreDetectado: quiebre,
          estadoQuiebre: estado,
          observacion: obs,
        })
      }
    }
    cur.setDate(cur.getDate() + 1)
  }

  resultados.sort((a, b) => {
    if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha)
    if (a.estadoQuiebre === "QUIEBRE_CRITICO" && b.estadoQuiebre !== "QUIEBRE_CRITICO") return -1
    if (b.estadoQuiebre === "QUIEBRE_CRITICO" && a.estadoQuiebre !== "QUIEBRE_CRITICO") return 1
    return 0
  })

  const criticos = resultados.filter(r => r.estadoQuiebre === "QUIEBRE_CRITICO").length
  const alertas = resultados.filter(r => r.estadoQuiebre === "ALERTA_TEMPRANA").length
  const normales = resultados.filter(r => r.estadoQuiebre === "NORMAL").length

  return {
    ok: true,
    data: resultados,
    resumen: {
      totalEvaluados: resultados.length,
      quiebresCriticos: criticos,
      alertasTempranas: alertas,
      coberturaNormal: normales,
      tasaQuiebrePct: resultados.length > 0 ? Number(((criticos + alertas) / resultados.length * 100).toFixed(1)) : 0,
    },
  }
}

// -------------------------------------------------------------
// 3. Consultas Estándar (Ventas por Sucursal, Top 50, etc.)
// -------------------------------------------------------------
export function getConsultaEstandarDemo(
  tipo: string,
  params: { desde?: string; hasta?: string; sucursal?: string }
): { ok: boolean; data: any[]; queryType: string } {
  const { hasta, sucursal } = params

  switch (tipo) {
    case "resumenPorSucursal": {
      const rows = SUCURSALES_NOMBRES.filter(s => !sucursal || sucursal === "TODAS" || s === sucursal).map(s => {
        const peso = SUCURSAL_WEIGHTS[s] || 0.2
        const venta = Math.round(6_500_000_000 * peso)
        const tickets = Math.round(venta / 35_500)
        return {
          Sucursal: s,
          TotalTickets: tickets,
          VentaTotal: venta,
          PromedioVenta: Math.round(venta / tickets),
          DiasVenta: 30,
          CajerosActivos: s === "Monarca Virtual" ? 4 : Math.round(14 + peso * 20),
        }
      })
      rows.sort((a, b) => b.VentaTotal - a.VentaTotal)
      return { ok: true, data: rows, queryType: tipo }
    }

    case "ventasPorDia": {
      const rows = []
      const hoy = new Date(hasta || new Date().toISOString().slice(0, 10))
      for (let i = 0; i < 20; i++) {
        const d = new Date(hoy)
        d.setDate(d.getDate() - i)
        const fStr = d.toISOString().slice(0, 10)
        const esFinde = d.getDay() === 0 || d.getDay() === 6
        const baseDia = esFinde ? 260_000_000 : 205_000_000
        const ruido = 0.94 + ((d.getDate() * 11) % 15) * 0.01
        const v = Math.round(baseDia * ruido)
        const t = Math.round(v / 36_000)
        rows.push({
          Fecha: fStr,
          VentaTotal: v,
          CantidadTickets: t,
          SucursalesActivas: 5,
        })
      }
      return { ok: true, data: rows, queryType: tipo }
    }

    case "productosMasVendidos": {
      const productosBase = [
        { cod: "7790895000111", nombre: "LECHE LA SERENISIMA ENTERA 1L SACHET", cant: 45200, precio: 1250 },
        { cod: "7790895000222", nombre: "LECHE LA SERENISIMA DESCREMADA 1L", cant: 39800, precio: 1250 },
        { cod: "7791234567890", nombre: "COCA COLA SABOR ORIGINAL 2.25L", cant: 28400, precio: 3400 },
        { cod: "2000010010000", nombre: "ASADO ESPECIAL DE NOVILLO X KG", cant: 14200, precio: 9800 },
        { cod: "7790040112233", nombre: "YERBA MATE PLAYADITO SUAVE 1KG", cant: 18500, precio: 4600 },
        { cod: "2000010020000", nombre: "VACIO ESPECIAL DE NOVILLO X KG", cant: 11200, precio: 10400 },
        { cod: "7791234567891", nombre: "COCA COLA SIN AZUCARES 2.25L", cant: 21000, precio: 3400 },
        { cod: "7790070114455", nombre: "ACEITE DE GIRASOL COCINERO 1.5L", cant: 16800, precio: 3100 },
        { cod: "2000050010000", nombre: "PAN FRANCES TRADICIONAL X KG", cant: 32000, precio: 2200 },
        { cod: "7790580123456", nombre: "QUESO CREMOSO LA PAULINA X KG", cant: 12400, precio: 7900 },
        { cod: "7790010203040", nombre: "AZUCAR LEDESMA COMUN CLASICA 1KG", cant: 24500, precio: 1100 },
        { cod: "7790020304050", nombre: "HARINA DE TRIGO 000 PUREZA 1KG", cant: 19400, precio: 950 },
        { cod: "7790080405060", nombre: "FIDEOS TALLARIN MATARAZZO 500G", cant: 23100, precio: 1450 },
        { cod: "7790080405061", nombre: "FIDEOS TIRABUZON MATARAZZO 500G", cant: 21800, precio: 1450 },
        { cod: "7790150607080", nombre: "CERVEZA QUILMES CLASICA LATA 473ML", cant: 34500, precio: 1650 },
        { cod: "7790150607081", nombre: "CERVEZA HEINEKEN LATA 473ML", cant: 26200, precio: 2400 },
        { cod: "7790040113344", nombre: "YERBA MATE TARAGUI CON PALO 1KG", cant: 14300, precio: 4300 },
        { cod: "2000010070000", nombre: "NALGA SELECCIONADA P/ MILANESA X KG", cant: 9600, precio: 11200 },
        { cod: "2000020010000", nombre: "POLLO ENTERO EVISCERADO X KG", cant: 28000, precio: 3100 },
        { cod: "7790895000555", nombre: "MANTECA LA SERENISIMA 200G", cant: 17800, precio: 2850 },
        { cod: "7790895000666", nombre: "DULCE DE LECHE LA SERENISIMA 400G", cant: 15400, precio: 2300 },
        { cod: "7790060201010", nombre: "GALLETITAS OREO PACK X 3 354G", cant: 18900, precio: 2100 },
        { cod: "7790070202020", nombre: "ARROZ LARGO FINO GALLO ORO 1KG", cant: 16200, precio: 2400 },
        { cod: "7790090303030", nombre: "MAYONESA HELLMANNS REGULAR DOYPACK 475G", cant: 19100, precio: 2200 },
        { cod: "7790100404040", nombre: "AGUA MINERAL SIN GAS VILLA DEL SUR 2L", cant: 25600, precio: 1400 },
        { cod: "7790110505050", nombre: "JABON EN POLVO SKIP REGULAR 3KG", cant: 8400, precio: 9800 },
        { cod: "7790120606060", nombre: "SUAVIZANTE VIVEX CELESTE 900ML", cant: 11300, precio: 2900 },
        { cod: "7790130707070", nombre: "PAPEL HIGIENICO HIGIENOL MAX 4X80M", cant: 14200, precio: 3800 },
        { cod: "7790140808080", nombre: "ROLLO DE COCINA SUSSEX CLASICO 3X50P", cant: 16900, precio: 2600 },
        { cod: "7790160909090", nombre: "DETERGENTE MAGISTRAL LIMON 500ML", cant: 22400, precio: 2350 },
      ]

      const rows = productosBase.map((p, idx) => {
        const factor = sucursal && sucursal !== "TODAS" ? (SUCURSAL_WEIGHTS[sucursal] || 0.25) : 1
        const cant = Math.round(p.cant * factor)
        const imp = Math.round(cant * p.precio)
        const veces = Math.round(cant * 0.72)
        return {
          Posicion: idx + 1,
          CodigoProducto: p.cod,
          NombreProducto: p.nombre,
          CantidadVendida: cant,
          ImporteTotal: imp,
          VecesVendido: veces,
          PrecioPromedio: p.precio,
        }
      })
      return { ok: true, data: rows, queryType: tipo }
    }

    case "ticketPromedio": {
      const rows = SUCURSALES_NOMBRES.filter(s => !sucursal || sucursal === "TODAS" || s === sucursal).map(s => {
        const peso = SUCURSAL_WEIGHTS[s] || 0.2
        const v = Math.round(6_500_000_000 * peso)
        const avg = Math.round(33_000 + ((s.charCodeAt(0) * 123) % 8000))
        const t = Math.round(v / avg)
        const minT = Math.round(1200 + ((s.charCodeAt(1) || 70) * 12) % 1500)
        const maxT = Math.round(420_000 + ((s.charCodeAt(2) || 80) * 2500) % 180_000)
        return {
          Sucursal: s,
          TotalTickets: t,
          VentaTotal: v,
          TicketPromedio: avg,
          TicketMinimo: minT,
          TicketMaximo: maxT,
        }
      })
      rows.sort((a, b) => b.VentaTotal - a.VentaTotal)
      return { ok: true, data: rows, queryType: tipo }
    }

    case "horasPico": {
      const curve = [
        { h: 8, pct: 0.02 },
        { h: 9, pct: 0.04 },
        { h: 10, pct: 0.07 },
        { h: 11, pct: 0.11 },
        { h: 12, pct: 0.12 },
        { h: 13, pct: 0.07 },
        { h: 14, pct: 0.04 },
        { h: 15, pct: 0.04 },
        { h: 16, pct: 0.06 },
        { h: 17, pct: 0.08 },
        { h: 18, pct: 0.11 },
        { h: 19, pct: 0.13 },
        { h: 20, pct: 0.08 },
        { h: 21, pct: 0.03 },
      ]

      const factorSucursal = sucursal && sucursal !== "TODAS" ? (SUCURSAL_WEIGHTS[sucursal] || 0.25) : 1
      const vDiariaTotal = 215_000_000 * factorSucursal

      const rows = curve.map(c => {
        const v = Math.round(vDiariaTotal * c.pct)
        const ticketAvg = Math.round(35_000 + (c.h === 11 || c.h === 19 ? 4500 : 0))
        const t = Math.round(v / ticketAvg)
        return {
          HoraDelDia: `${String(c.h).padStart(2, "0")}:00 hs`,
          TotalTickets: t,
          VentaTotal: v,
          TicketPromedio: ticketAvg,
        }
      })
      return { ok: true, data: rows, queryType: tipo }
    }

    case "promedioVentaSecosPorSucursal":
    case "secos-quiebre": {
      const secosItems = [
        { barra: "7790040112233", cod: "SEC-101", prod: "YERBA MATE PLAYADITO 1KG", marca: "PLAYADITO", cat: "Almacén", ventaDiaria: 85, diasVta: 15, vPesos: 5865000 },
        { barra: "7790070114455", cod: "SEC-102", prod: "ACEITE GIRASOL COCINERO 1.5L", marca: "COCINERO", cat: "Comestibles", ventaDiaria: 72, diasVta: 14, vPesos: 3348000 },
        { barra: "7790010203040", cod: "SEC-103", prod: "AZUCAR LEDESMA COMUN 1KG", marca: "LEDESMA", cat: "Almacén", ventaDiaria: 110, diasVta: 15, vPesos: 1815000 },
        { barra: "7790080405060", cod: "SEC-104", prod: "FIDEOS TALLARIN MATARAZZO 500G", marca: "MATARAZZO", cat: "Pastas Secas", ventaDiaria: 94, diasVta: 15, vPesos: 2044500 },
        { barra: "7790070202020", cod: "SEC-105", prod: "ARROZ LARGO FINO GALLO 1KG", marca: "GALLO", cat: "Arroces", ventaDiaria: 68, diasVta: 13, vPesos: 2448000 },
        { barra: "7790090303030", cod: "SEC-106", prod: "MAYONESA HELLMANNS DOYPACK 475G", marca: "HELLMANNS", cat: "Aderezos", ventaDiaria: 82, diasVta: 15, vPesos: 2706000 },
        { barra: "7790100404040", cod: "SEC-107", prod: "AGUA MINERAL VILLA DEL SUR 2L", marca: "VILLA DEL SUR", cat: "Aguas", ventaDiaria: 135, diasVta: 15, vPesos: 2835000 },
        { barra: "7790110505050", cod: "SEC-108", prod: "JABON SKIP POLVO 3KG", marca: "SKIP", cat: "Limpieza Ropa", ventaDiaria: 34, diasVta: 12, vPesos: 3998400 },
        { barra: "7790160909090", cod: "SEC-109", prod: "DETERGENTE MAGISTRAL LIMON 500ML", marca: "MAGISTRAL", cat: "Limpieza Vajilla", ventaDiaria: 98, diasVta: 15, vPesos: 3454500 },
        { barra: "7790130707070", cod: "SEC-110", prod: "PAPEL HIGIENICO HIGIENOL MAX 4X80M", marca: "HIGIENOL", cat: "Papelera", ventaDiaria: 62, diasVta: 14, vPesos: 3534000 },
      ]

      const rows = secosItems.map(item => ({
        Barra: item.barra,
        CodInt: item.cod,
        Producto: item.prod,
        Marca: item.marca,
        Categoria: item.cat,
        TotalCantidadVendida: item.ventaDiaria * item.diasVta,
        DiasConVenta: item.diasVta,
        DiasEnPeriodo: 15,
        PromVentaDiaria_DiasVenta: item.ventaDiaria,
        PromVentaDiaria_PeriodoTotal: Number((item.ventaDiaria * item.diasVta / 15).toFixed(1)),
        VentaTotalPesos: item.vPesos,
      }))
      return { ok: true, data: rows, queryType: tipo }
    }

    default:
      return { ok: true, data: [], queryType: tipo }
  }
}

// -------------------------------------------------------------
// 4. Control de Surtido y Stock (Cruce inicial de muestra)
// -------------------------------------------------------------
export interface SurtidoItem {
  sucursal: string
  int: string
  ean: string
  producto: string
  categoria: string
  grupo: string
  stockActual: number
  diasSinVenta: number
  estado: "CRITICO" | "REGULAR" | "OPTIMO"
}

export function getControlSurtidoDemo(): { ok: boolean; data: SurtidoItem[] } {
  const items: SurtidoItem[] = [
    { sucursal: "Colón", int: "10045", ean: "7790895000111", producto: "LECHE LA SERENISIMA ENTERA 1L", categoria: "Lácteos", grupo: "Refrigerados", stockActual: 14, diasSinVenta: 0, estado: "CRITICO" },
    { sucursal: "Colón", int: "10082", ean: "7790040112233", producto: "YERBA MATE PLAYADITO 1KG", categoria: "Almacén", grupo: "Infusiones", stockActual: 120, diasSinVenta: 0, estado: "OPTIMO" },
    { sucursal: "San Martín", int: "10115", ean: "7791234567890", producto: "COCA COLA REGULAR 2.25L", categoria: "Bebidas", grupo: "Gaseosas", stockActual: 28, diasSinVenta: 0, estado: "REGULAR" },
    { sucursal: "San Martín", int: "10234", ean: "2000010010000", producto: "ASADO ESPECIAL NOVILLO X KG", categoria: "Carnicería", grupo: "Carne Vacuna", stockActual: 0, diasSinVenta: 1, estado: "CRITICO" },
    { sucursal: "Falucho", int: "10312", ean: "7790070114455", producto: "ACEITE GIRASOL COCINERO 1.5L", categoria: "Almacén", grupo: "Aceites", stockActual: 45, diasSinVenta: 0, estado: "OPTIMO" },
    { sucursal: "Falucho", int: "10450", ean: "7790580123456", producto: "QUESO CREMOSO LA PAULINA X KG", categoria: "Fiambrería", grupo: "Quesos", stockActual: 12, diasSinVenta: 0, estado: "REGULAR" },
    { sucursal: "Perón", int: "10560", ean: "7790010203040", producto: "AZUCAR LEDESMA 1KG", categoria: "Almacén", grupo: "Endulzantes", stockActual: 5, diasSinVenta: 0, estado: "CRITICO" },
    { sucursal: "Perón", int: "10620", ean: "7790150607080", producto: "CERVEZA QUILMES LATA 473ML", categoria: "Bebidas", grupo: "Cervezas", stockActual: 240, diasSinVenta: 0, estado: "OPTIMO" },
    { sucursal: "Monarca Virtual", int: "10045", ean: "7790895000111", producto: "LECHE LA SERENISIMA ENTERA 1L", categoria: "Lácteos", grupo: "Refrigerados", stockActual: 60, diasSinVenta: 0, estado: "OPTIMO" },
    { sucursal: "Monarca Virtual", int: "10115", ean: "7791234567890", producto: "COCA COLA REGULAR 2.25L", categoria: "Bebidas", grupo: "Gaseosas", stockActual: 85, diasSinVenta: 0, estado: "OPTIMO" },
  ]
  return { ok: true, data: items }
}

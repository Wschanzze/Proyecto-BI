// Formateo de números para Argentina (es-AR): punto de miles, coma decimal.

const currencyFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
})

const currencyCompactFmt = new Intl.NumberFormat("es-AR", {
  notation: "compact",
  maximumFractionDigits: 1,
})

const numberFmt = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
})

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"
  return currencyFmt.format(value)
}

export function formatCurrencyCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"
  return "$" + currencyCompactFmt.format(value)
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"
  return numberFmt.format(value)
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"
  return (
    new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value) + "%"
  )
}

export function formatSigned(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"
  const sign = value > 0 ? "+" : ""
  return (
    sign +
    new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value) +
    "%"
  )
}

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]

const MESES_CORTO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

export function mesNombre(mes: number): string {
  return MESES[mes - 1] ?? ""
}

export function mesCorto(mes: number): string {
  return MESES_CORTO[mes - 1] ?? ""
}

export function periodoLabel(anio: number, mes: number): string {
  return `${mesNombre(mes)} ${anio}`
}

export function periodoLabelCorto(anio: number, mes: number): string {
  return `${mesCorto(mes)} '${String(anio).slice(2)}`
}

// lib/excel-styler.ts
// Motor de exportación profesional a Microsoft Excel (.xlsx) con estética corporativa de Supermercados Monarca
import ExcelJS from "exceljs"

export type ColumnType = "currency" | "percent" | "number" | "text" | "date" | "status" | "time"

export interface ExcelColumnDef {
  key: string
  header: string
  width?: number
  type?: ColumnType
  align?: "left" | "center" | "right"
}

export interface ExcelExportOptions {
  titulo: string
  subtitulo?: string
  nombreArchivo: string
  nombreHoja?: string
  columnas: ExcelColumnDef[]
  datos: Record<string, any>[]
  kpis?: Array<{ label: string; value: string }>
  totales?: Record<string, any>
  colorPrimario?: string // ARGB hex, default FF0046AD (Azul Monarca)
  colorAcento?: string   // ARGB hex, default FFFF5C15 (Naranja Monarca)
}

// Paleta Corporativa Monarca (ARGB)
const COLOR_AZUL_MONARCA = "FF0046AD"
const COLOR_AZUL_ENCABEZADO = "FF1E3A8A"
const COLOR_NARANJA_MONARCA = "FFFF5C15"
const COLOR_BLANCO = "FFFFFFFF"
const COLOR_ZEBRA = "FFF8FAFC"
const COLOR_BORDE = "FFE2E8F0"
const COLOR_SUBTITULO_BG = "FFF1F5F9"
const COLOR_TEXTO_MUTED = "FF64748B"
const COLOR_TEXTO_OSCURO = "FF0F172A"
const COLOR_TOTALES_BG = "FFEFF6FF"

export async function exportarExcelProfesional(options: ExcelExportOptions): Promise<void> {
  const {
    titulo,
    subtitulo,
    nombreArchivo,
    nombreHoja = "Reporte",
    columnas,
    datos,
    kpis,
    totales,
    colorPrimario = COLOR_AZUL_MONARCA,
  } = options

  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Supermercados Monarca BI Analytics"
  workbook.created = new Date()
  workbook.modified = new Date()

  const worksheet = workbook.addWorksheet(nombreHoja, {
    views: [{ showGridLines: true }],
  })

  const colCount = Math.max(columnas.length, 4)

  // -------------------------------------------------------------
  // 1. Banner Corporativo Monarca (Fila 1)
  // -------------------------------------------------------------
  const titleRow = worksheet.addRow(["SUPERMERCADOS MONARCA · ANALYTICS BI"])
  titleRow.height = 32
  worksheet.mergeCells(1, 1, 1, colCount)
  const titleCell = worksheet.getCell(1, 1)
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: colorPrimario },
  }
  titleCell.font = {
    name: "Segoe UI",
    size: 13,
    bold: true,
    color: { argb: COLOR_BLANCO },
  }
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 }

  // -------------------------------------------------------------
  // 2. Título Específico del Reporte (Fila 2)
  // -------------------------------------------------------------
  const reportTitleRow = worksheet.addRow([titulo.toUpperCase()])
  reportTitleRow.height = 24
  worksheet.mergeCells(2, 1, 2, colCount)
  const reportTitleCell = worksheet.getCell(2, 1)
  reportTitleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0A2540" },
  }
  reportTitleCell.font = {
    name: "Segoe UI",
    size: 11,
    bold: true,
    color: { argb: COLOR_BLANCO },
  }
  reportTitleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 }

  // -------------------------------------------------------------
  // 3. Subtítulo / Metadatos (Fila 3)
  // -------------------------------------------------------------
  const metadataText = subtitulo
    ? `${subtitulo} | Generado el ${new Date().toLocaleDateString("es-AR")} a las ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs`
    : `Generado el ${new Date().toLocaleDateString("es-AR")} a las ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs`

  const subRow = worksheet.addRow([metadataText])
  subRow.height = 20
  worksheet.mergeCells(3, 1, 3, colCount)
  const subCell = worksheet.getCell(3, 1)
  subCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLOR_SUBTITULO_BG },
  }
  subCell.font = {
    name: "Segoe UI",
    size: 9.5,
    italic: true,
    color: { argb: COLOR_TEXTO_MUTED },
  }
  subCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 }

  // -------------------------------------------------------------
  // 4. Bloque Opcional de KPIs Ejecutivos (Filas 4 y 5)
  // -------------------------------------------------------------
  let currentRowIndex = 4

  if (kpis && kpis.length > 0) {
    worksheet.addRow([]) // Fila vacía separadora
    currentRowIndex++

    const kpiLabelRow = worksheet.addRow(kpis.map((k) => k.label.toUpperCase()))
    kpiLabelRow.height = 18
    kpiLabelRow.eachCell((cell) => {
      cell.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: COLOR_TEXTO_MUTED } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }
      cell.alignment = { vertical: "middle", horizontal: "center" }
      cell.border = {
        top: { style: "thin", color: { argb: COLOR_BORDE } },
        bottom: { style: "thin", color: { argb: COLOR_BORDE } },
        left: { style: "thin", color: { argb: COLOR_BORDE } },
        right: { style: "thin", color: { argb: COLOR_BORDE } },
      }
    })
    currentRowIndex++

    const kpiValueRow = worksheet.addRow(kpis.map((k) => k.value))
    kpiValueRow.height = 26
    kpiValueRow.eachCell((cell) => {
      cell.font = { name: "Segoe UI", size: 12, bold: true, color: { argb: COLOR_AZUL_MONARCA } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_TOTALES_BG } }
      cell.alignment = { vertical: "middle", horizontal: "center" }
      cell.border = {
        top: { style: "thin", color: { argb: COLOR_BORDE } },
        bottom: { style: "medium", color: { argb: "FF93C5FD" } },
        left: { style: "thin", color: { argb: COLOR_BORDE } },
        right: { style: "thin", color: { argb: COLOR_BORDE } },
      }
    })
    currentRowIndex++
  }

  // Fila separadora antes de la tabla
  worksheet.addRow([])
  currentRowIndex++

  // -------------------------------------------------------------
  // 5. Encabezados de Columnas
  // -------------------------------------------------------------
  const headerRowIndex = currentRowIndex
  const headerRow = worksheet.addRow(columnas.map((c) => c.header))
  headerRow.height = 26

  headerRow.eachCell((cell, colNum) => {
    const colDef = columnas[colNum - 1]
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR_AZUL_ENCABEZADO },
    }
    cell.font = {
      name: "Segoe UI",
      size: 10,
      bold: true,
      color: { argb: COLOR_BLANCO },
    }
    cell.alignment = {
      vertical: "middle",
      horizontal: colDef?.align || (colDef?.type === "currency" || colDef?.type === "number" || colDef?.type === "percent" ? "right" : "left"),
      wrapText: true,
    }
    cell.border = {
      top: { style: "medium", color: { argb: "FF0F172A" } },
      bottom: { style: "medium", color: { argb: COLOR_NARANJA_MONARCA } },
      left: { style: "thin", color: { argb: "FF3B82F6" } },
      right: { style: "thin", color: { argb: "FF3B82F6" } },
    }
  })
  currentRowIndex++

  // -------------------------------------------------------------
  // 6. Filas de Datos con Zebra Striping y Formato de Celda
  // -------------------------------------------------------------
  datos.forEach((item, rIdx) => {
    const rowValues = columnas.map((col) => {
      const val = item[col.key]
      if (val === undefined || val === null) return ""
      return val
    })

    const dataRow = worksheet.addRow(rowValues)
    dataRow.height = 20

    const isEven = rIdx % 2 === 0
    const rowBgColor = isEven ? COLOR_BLANCO : COLOR_ZEBRA

    dataRow.eachCell((cell, colNum) => {
      const colDef = columnas[colNum - 1]
      const val = cell.value

      // Fondo y bordes por defecto
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowBgColor },
      }
      cell.font = {
        name: "Segoe UI",
        size: 9.5,
        color: { argb: COLOR_TEXTO_OSCURO },
      }
      cell.border = {
        top: { style: "thin", color: { argb: COLOR_BORDE } },
        bottom: { style: "thin", color: { argb: COLOR_BORDE } },
        left: { style: "thin", color: { argb: COLOR_BORDE } },
        right: { style: "thin", color: { argb: COLOR_BORDE } },
      }

      // Alineación
      const defaultAlign =
        colDef?.type === "currency" || colDef?.type === "number" || colDef?.type === "percent"
          ? "right"
          : colDef?.type === "date" || colDef?.type === "status" || colDef?.type === "time"
          ? "center"
          : "left"
      cell.alignment = {
        vertical: "middle",
        horizontal: colDef?.align || defaultAlign,
      }

      // Formato numérico en Excel
      if (colDef?.type === "currency" && typeof val === "number") {
        cell.numFmt = '"$"#,##0'
        cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: COLOR_TEXTO_OSCURO } }
      } else if (colDef?.type === "percent" && typeof val === "number") {
        // Si el valor viene como 35.5 (en porcentaje 0-100), dividir por 100 si es necesario
        if (val > 1) {
          cell.value = val / 100
        }
        cell.numFmt = "0.0%"
        cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: COLOR_AZUL_MONARCA } }
      } else if (colDef?.type === "number" && typeof val === "number") {
        cell.numFmt = "#,##0"
      }

      // Formato semántico de estado
      if (colDef?.type === "status" || String(colDef?.key).toLowerCase().includes("estado")) {
        const strVal = String(val).toUpperCase()
        if (strVal.includes("CRITICO") || strVal.includes("QUIEBRE")) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } }
          cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFDC2626" } }
        } else if (strVal.includes("ALERTA") || strVal.includes("REGULAR") || strVal.includes("TEMPRANA")) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } }
          cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFD97706" } }
        } else if (strVal.includes("NORMAL") || strVal.includes("OPTIMO") || strVal.includes("ACTIVO")) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } }
          cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF16A34A" } }
        }
      }
    })

    currentRowIndex++
  })

  // -------------------------------------------------------------
  // 7. Fila de Totales Contables (Si se provee)
  // -------------------------------------------------------------
  if (totales) {
    const totalValues = columnas.map((col) => {
      const val = totales[col.key]
      if (val === undefined || val === null) return ""
      return val
    })

    const totalRow = worksheet.addRow(totalValues)
    totalRow.height = 24

    totalRow.eachCell((cell, colNum) => {
      const colDef = columnas[colNum - 1]
      const val = cell.value

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLOR_TOTALES_BG },
      }
      cell.font = {
        name: "Segoe UI",
        size: 10,
        bold: true,
        color: { argb: COLOR_AZUL_MONARCA },
      }
      cell.alignment = {
        vertical: "middle",
        horizontal: colDef?.align || (colDef?.type === "currency" || colDef?.type === "number" || colDef?.type === "percent" ? "right" : "left"),
      }
      // Borde doble inferior de contabilidad
      cell.border = {
        top: { style: "thin", color: { argb: "FF0F172A" } },
        bottom: { style: "double", color: { argb: "FF0F172A" } },
        left: { style: "thin", color: { argb: COLOR_BORDE } },
        right: { style: "thin", color: { argb: COLOR_BORDE } },
      }

      if (colDef?.type === "currency" && typeof val === "number") {
        cell.numFmt = '"$"#,##0'
      } else if (colDef?.type === "percent" && typeof val === "number") {
        if (val > 1) cell.value = val / 100
        cell.numFmt = "0.0%"
      } else if (colDef?.type === "number" && typeof val === "number") {
        cell.numFmt = "#,##0"
      }
    })
  }

  // -------------------------------------------------------------
  // 8. Ajuste Inteligente de Ancho de Columnas (Auto-fit con padding)
  // -------------------------------------------------------------
  columnas.forEach((colDef, idx) => {
    const colNumber = idx + 1
    const col = worksheet.getColumn(colNumber)

    if (colDef.width) {
      col.width = colDef.width
      return
    }

    // Calcular longitud máxima de contenido en la columna
    let maxLength = colDef.header.length
    datos.forEach((row) => {
      const val = row[colDef.key]
      if (val !== undefined && val !== null) {
        let strLen = String(val).length
        if (colDef.type === "currency") strLen += 6 // agregar espacio para $, comas y puntos
        if (colDef.type === "percent") strLen += 3
        if (strLen > maxLength) {
          maxLength = strLen
        }
      }
    })

    // Padding adicional de 4 caracteres, mínimo 12, máximo 50
    col.width = Math.min(50, Math.max(12, maxLength + 4))
  })

  // -------------------------------------------------------------
  // 9. Generación del Buffer y Descarga en el Navegador
  // -------------------------------------------------------------
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = nombreArchivo.endsWith(".xlsx") ? nombreArchivo : `${nombreArchivo}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

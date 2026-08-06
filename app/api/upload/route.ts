// app/api/upload/route.ts
// Recibe un archivo Excel/CSV, lo procesa y guarda los resultados en Supabase.
// Utiliza la service_role key para saltarse las políticas RLS.

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

function getRowVal(row: Record<string, any>, keys: string[]): any {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) return row[k]
  }
  for (const k of keys) {
    const lowerKey = k.toLowerCase().trim()
    for (const actualKey of Object.keys(row)) {
      if (actualKey.toLowerCase().trim() === lowerKey && row[actualKey] !== undefined && row[actualKey] !== null) {
        return row[actualKey]
      }
    }
  }
  return undefined
}

function parseMesColumn(val: any): { key: string; anio: number; mes: number; label: string } {
  if (val === null || val === undefined) throw new Error("Valor de mes nulo")

  let mes: number | null = null
  let anio: number | null = null

  // 1. Si es un número (Excel date serial code)
  if (typeof val === 'number') {
    const dateObj = XLSX.SSF.parse_date_code(val)
    if (dateObj) {
      mes = dateObj.m
      anio = dateObj.y
    }
  }
  // 2. Si es una instancia de Date
  else if (val instanceof Date && !isNaN(val.getTime())) {
    mes = val.getUTCMonth() + 1
    anio = val.getUTCFullYear()
  }
  // 3. Si es un string
  else {
    const str = String(val).trim()

    // 3a. Formato DD/MM/YYYY o DD-MM-YYYY (ej: "01/06/2026", "1/5/2026", "01/01/2025")
    const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
    if (ddmmyyyy) {
      mes = parseInt(ddmmyyyy[2], 10)
      const rawAnio = parseInt(ddmmyyyy[3], 10)
      anio = rawAnio < 100 ? 2000 + rawAnio : rawAnio
    } 
    // 3b. Formato YYYY-MM-DD
    else {
      const yyyymmdd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
      if (yyyymmdd) {
        anio = parseInt(yyyymmdd[1], 10)
        mes = parseInt(yyyymmdd[2], 10)
      } 
      // 3c. Formato mmm-yy (ej: "jun-26", "ene-25")
      else {
        const parts = str.toLowerCase().split(/[\/\-]/)
        if (parts.length === 2) {
          const mesLabel = parts[0].trim()
          const anioShort = parseInt(parts[1].trim(), 10)
          if (!isNaN(anioShort)) {
            anio = 2000 + anioShort
            const mesesMap: Record<string, number> = {
              ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
              jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12,
              jan: 1, apr: 4, aug: 8, dec: 12
            }
            mes = mesesMap[mesLabel] || null
          }
        }
      }
    }
  }

  if (!mes || !anio || mes < 1 || mes > 12 || anio < 2000 || anio > 2100) {
    throw new Error(`Fecha/Mes no reconocido: ${val}`)
  }

  const mesesLabels = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
  const label = `${mesesLabels[mes - 1]}-${String(anio).slice(-2)}`
  const key = `${anio}-${String(mes).padStart(2, '0')}`

  return { key, anio, mes, label }
}

function mapSucursal(name: string): string {
  const norm = slugify(name)
  if (norm.includes("colon")) return "colon"
  if (norm.includes("san-martin") || norm.includes("martin")) return "san-martin"
  if (norm.includes("falucho")) return "falucho"
  if (norm.includes("peron")) return "peron"
  if (norm.includes("virtual")) return "virtual"
  return norm
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    
    // Convertir a JSON crudo
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[]
    if (rows.length === 0) {
      return NextResponse.json({ error: 'El archivo está vacío' }, { status: 400 })
    }

    // Inicializar Supabase Client con service_role key
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q"
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wlaotnafjrvckoxbdokk.supabase.co",
      serviceRoleKey
    )

    // Cargar grupos de la base de datos
    const { data: dbGrupos, error: grpErr } = await client.from('grupos').select('*')
    if (grpErr || !dbGrupos) {
      throw new Error(`Error al consultar grupos del catálogo: ${grpErr?.message}`)
    }

    // Map rápido por slug para búsqueda O(1)
    const gruposMapBySlug = new Map<string, any>()
    for (const g of dbGrupos) {
      gruposMapBySlug.set(slugify(g.nombre), g)
    }

    // Detectar el período de la primera fila que tenga 'Mes' o 'Fecha'
    let periodoInfo: { key: string; anio: number; mes: number; label: string } | null = null
    for (const row of rows) {
      const rawMes = getRowVal(row, ['Mes', 'mes', 'FECHA', 'Fecha', 'Periodo', 'periodo'])
      if (rawMes) {
        try {
          periodoInfo = parseMesColumn(rawMes)
          break
        } catch {
          // Continuar buscando un mes válido
        }
      }
    }

    if (!periodoInfo) {
      const sampleHeaders = Object.keys(rows[0] || {}).join(', ')
      return NextResponse.json({
        error: `No se pudo detectar la columna de Mes/Período. Columnas encontradas: ${sampleHeaders}`
      }, { status: 400 })
    }

    // Upsert período en la DB
    const { data: pData, error: pErr } = await client
      .from('periodos')
      .upsert({
        key: periodoInfo.key,
        anio: periodoInfo.anio,
        mes: periodoInfo.mes,
        label: periodoInfo.label,
        archivo_nombre: file.name
      }, { onConflict: 'key' })
      .select('id')
      .single()

    if (pErr || !pData) {
      throw new Error(`Error al registrar el período: ${pErr?.message ?? 'No data returned'}`)
    }

    const periodoId = pData.id

    // Procesar filas
    const resultadosMap = new Map<string, { cantidad: number; facturacion: number; iva: number; costo: number }>()
    const erroresMapeo: string[] = []

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx]
      
      const rawSucursal = getRowVal(row, ['Sucursal', 'sucursal', 'SUCURSAL'])
      const rawSector = getRowVal(row, ['SECTOR', 'sector', 'Sector'])
      const rawGrupo = getRowVal(row, ['GRUPO', 'grupo', 'Grupo'])

      if (!rawSucursal || !rawGrupo) {
        continue // Omitir filas vacías
      }

      // 1. Mapear Sucursal
      const sucursalId = mapSucursal(String(rawSucursal))
      
      // 2. Buscar grupo en el catálogo
      const grupoSlug = slugify(String(rawGrupo))
      let matchedGrp = gruposMapBySlug.get(grupoSlug)

      // Fallback: búsqueda parcial si no hay coincidencia exacta
      if (!matchedGrp) {
        for (const [s, g] of gruposMapBySlug.entries()) {
          if (s.includes(grupoSlug) || grupoSlug.includes(s)) {
            matchedGrp = g
            break
          }
        }
      }

      if (!matchedGrp) {
        erroresMapeo.push(`Fila ${idx + 2}: Grupo no hallado "${rawGrupo}" (Sector: "${rawSector}")`)
        continue
      }

      // 3. Extraer números financieros
      const cantidad = parseInt(String(getRowVal(row, ['Cantidad', 'cantidad', 'CANTIDAD']) || '0'), 10) || 0
      
      const parseMoney = (val: any) => {
        if (typeof val === 'number') return val
        if (!val) return 0
        return parseFloat(String(val).replace(/[$\s,]/g, '').replace(/^-/, '')) || 0
      }

      const facturacion = parseMoney(getRowVal(row, ['Facturación', 'Facturacion', 'facturacion', 'Facturación s/IVA', 'Facturacion s/IVA', 'Fact_s_IVA', 'VENTAS', 'Ventas']))
      const iva = parseMoney(getRowVal(row, ['IVA', 'Iva', 'iva']))
      const costo = parseMoney(getRowVal(row, ['Costo', 'costo', 'CMV', 'Costo_Mercaderia_Vendida']))

      // Agrupar filas repetidas dentro del mismo archivo para la misma sucursal × grupo
      const itemKey = `${sucursalId}:${matchedGrp.id}`
      const prev = resultadosMap.get(itemKey) || { cantidad: 0, facturacion: 0, iva: 0, costo: 0 }
      
      resultadosMap.set(itemKey, {
        cantidad: prev.cantidad + cantidad,
        facturacion: prev.facturacion + facturacion,
        iva: prev.iva + iva,
        costo: prev.costo + costo,
      })
    }

    if (resultadosMap.size === 0) {
      const sampleHeaders = Object.keys(rows[0] || {}).join(', ')
      return NextResponse.json({
        error: `No se pudieron vincular las filas con el catálogo de grupos. Columnas detectadas: [${sampleHeaders}]`,
        detalles: erroresMapeo.slice(0, 10)
      }, { status: 400 })
    }

    // Convertir Map a Array para inserción
    const resultados = Array.from(resultadosMap.entries()).map(([k, v]) => {
      const [sucursalId, grupoId] = k.split(':')
      return {
        periodo_id: periodoId,
        sucursal_id: sucursalId,
        grupo_id: grupoId,
        cantidad: v.cantidad,
        facturacion: v.facturacion,
        iva: v.iva,
        costo: v.costo
      }
    })

    // Limpiar resultados anteriores para este período
    await client.from('resultados').delete().eq('periodo_id', periodoId)

    // Insertar en lotes de 200
    for (let k = 0; k < resultados.length; k += 200) {
      const batch = resultados.slice(k, k + 200)
      const { error: insErr } = await client.from('resultados').insert(batch)
      if (insErr) {
        throw new Error(`Error de inserción en lote ${k}: ${insErr.message}`)
      }
    }

    return NextResponse.json({
      ok: true,
      periodo: periodoInfo.label,
      key: periodoInfo.key,
      records: resultados.length,
      warning: erroresMapeo.length > 0 ? `${erroresMapeo.length} filas no coincidieron con el catálogo` : null,
      detallesIgnorados: erroresMapeo.slice(0, 10)
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

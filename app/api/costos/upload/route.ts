// app/api/costos/upload/route.ts
// Sube un archivo Excel/CSV con costos globales de cadena (Sucursal = "Total").
// Los costos se almacenan en costos_globales y se prorratean automáticamente
// por participación en facturación cuando se consulta una sucursal específica.
//
// Formato esperado del archivo:
// | Sucursal | Grupo | subgrupo | Costo | Mes |
// | Total    | Carniceria | Achuras | 1223.83 | 01/01/2026 |

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://wlaotnafjrvckoxbdokk.supabase.co'

// ── Helpers reutilizados del upload principal ────────────────────────────────

function slugify(text: string): string {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\bsuperficies\b/g, 'sup')
    .replace(/\bsup\b/g, 'sup')
    .replace(/\bproductos\b/g, 'prod')
    .replace(/\bprod\b/g, 'prod')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function cleanCodePrefix(text: string): string {
  return text.trim().replace(/^[\d.\-\s]+/, '').trim()
}

function getRowVal(row: Record<string, any>, keys: string[]): any {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) return row[k]
  }
  for (const k of keys) {
    const lowerKey = k.toLowerCase().trim()
    for (const actualKey of Object.keys(row)) {
      if (actualKey.toLowerCase().trim() === lowerKey && row[actualKey] !== undefined) {
        return row[actualKey]
      }
    }
  }
  return undefined
}

function parseMesColumn(val: any): { key: string; anio: number; mes: number; label: string } {
  if (val === null || val === undefined) throw new Error('Valor de mes nulo')

  let mes: number | null = null
  let anio: number | null = null

  if (typeof val === 'number') {
    const dateObj = XLSX.SSF.parse_date_code(val)
    if (dateObj) { mes = dateObj.m; anio = dateObj.y }
  } else if (val instanceof Date && !isNaN(val.getTime())) {
    mes = val.getUTCMonth() + 1
    anio = val.getUTCFullYear()
  } else {
    const str = String(val).trim()
    const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
    if (ddmmyyyy) {
      mes = parseInt(ddmmyyyy[2], 10)
      const rawAnio = parseInt(ddmmyyyy[3], 10)
      anio = rawAnio < 100 ? 2000 + rawAnio : rawAnio
    } else {
      const yyyymmdd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
      if (yyyymmdd) {
        anio = parseInt(yyyymmdd[1], 10)
        mes = parseInt(yyyymmdd[2], 10)
      } else {
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

  const mesesLabels = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const label = `${mesesLabels[mes - 1]}-${String(anio).slice(-2)}`
  const key = `${anio}-${String(mes).padStart(2, '0')}`
  return { key, anio, mes, label }
}

function parseMoney(val: any): number {
  if (typeof val === 'number') return Math.abs(val)
  if (!val) return 0
  return parseFloat(String(val).replace(/[$\s,]/g, '').replace(/^-/, '')) || 0
}

// ── Handler principal ────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 })
    }

    // Parsear Excel/CSV
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[]

    if (rows.length === 0) {
      return NextResponse.json({ error: 'El archivo está vacío' }, { status: 400 })
    }

    const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Cargar catálogo de grupos y sectores
    const [grpRes, secRes] = await Promise.all([
      client.from('grupos').select('*'),
      client.from('sectores').select('*'),
    ])
    if (grpRes.error || !grpRes.data) {
      throw new Error(`Error al consultar grupos: ${grpRes.error?.message}`)
    }

    const dbGrupos = grpRes.data
    const dbSectores = secRes.data || []

    const gruposMapBySlug = new Map<string, any>()
    for (const g of dbGrupos) {
      gruposMapBySlug.set(slugify(g.nombre), g)
    }

    const sectorToFirstGroupMap = new Map<string, any>()
    for (const s of dbSectores) {
      const sSlug = slugify(s.nombre)
      const matchingGrp = dbGrupos.find((g) => g.sector_id === s.id)
      if (matchingGrp) sectorToFirstGroupMap.set(sSlug, matchingGrp)
    }

    // Acumular costos por periodo_key × grupo_id
    // key: "periodoKey:grupoId" → costo acumulado
    const costosAcumulados = new Map<string, { periodoKey: string; grupoId: string; costoTotal: number }>()
    const unmappedSet = new Set<string>()

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx]

      const rawMes = getRowVal(row, ['Mes', 'mes', 'FECHA', 'Fecha', 'Periodo', 'periodo'])
      const rawGrupo = getRowVal(row, ['Grupo', 'grupo', 'GRUPO', 'Sector', 'sector'])
      const rawSubgrupo = getRowVal(row, ['subgrupo', 'Subgrupo', 'SUBGRUPO'])
      const rawCosto = getRowVal(row, ['Costo', 'costo', 'CMV', 'COSTO', 'Costo Total', 'costo_total'])

      // El campo Sucursal debe ser "Total" (o estar vacío/ausente) — validar
      const rawSucursal = getRowVal(row, ['Sucursal', 'sucursal', 'SUCURSAL'])
      if (rawSucursal && !String(rawSucursal).toLowerCase().includes('total')) {
        // Si tiene una sucursal específica, ignorar (esto va al upload normal)
        continue
      }

      if (!rawMes || !rawCosto) continue

      // Parsear período
      let periodoKey: string
      try {
        periodoKey = parseMesColumn(rawMes).key
      } catch {
        continue
      }

      // El leaf más específico = subgrupo si existe, sino grupo
      const leafStr = rawSubgrupo || rawGrupo
      if (!leafStr) continue

      const cleanLeaf = cleanCodePrefix(String(leafStr))
      const leafSlug = slugify(cleanLeaf)
      const grupoSlug = rawGrupo ? slugify(cleanCodePrefix(String(rawGrupo).trim())) : null

      let matchedGrp: any = null

      // Paso 1: contexto grupo + subgrupo
      if (grupoSlug && rawSubgrupo) {
        matchedGrp = dbGrupos.find((g) => {
          const gSlug = slugify(g.nombre)
          if (gSlug !== leafSlug) return false
          const sector = dbSectores.find((s) => s.id === g.sector_id)
          if (!sector) return false
          return slugify(sector.nombre) === grupoSlug
        })
      }

      // Paso 2: por slug directo
      if (!matchedGrp) matchedGrp = gruposMapBySlug.get(leafSlug)

      // Paso 3: por sector
      if (!matchedGrp && sectorToFirstGroupMap.has(leafSlug)) {
        matchedGrp = sectorToFirstGroupMap.get(leafSlug)
      }

      // Paso 4: flexible sin guiones
      if (!matchedGrp) {
        for (const [s, g] of gruposMapBySlug.entries()) {
          if (s.replace(/-/g, '') === leafSlug.replace(/-/g, '')) {
            matchedGrp = g
            break
          }
        }
      }

      if (!matchedGrp) {
        unmappedSet.add(`"${String(leafStr).trim()}" (Fila ${idx + 2})`)
        continue
      }

      const costoVal = parseMoney(rawCosto)
      const itemKey = `${periodoKey}:${matchedGrp.id}`
      const prev = costosAcumulados.get(itemKey)
      costosAcumulados.set(itemKey, {
        periodoKey,
        grupoId: matchedGrp.id,
        costoTotal: (prev?.costoTotal || 0) + costoVal,
      })
    }

    if (costosAcumulados.size === 0) {
      return NextResponse.json(
        {
          error: 'No se encontraron registros de costos globales válidos. Verificá que el archivo tenga columnas "Grupo" o "subgrupo", "Costo" y "Mes", y que la columna "Sucursal" sea "Total".',
          unmapped: Array.from(unmappedSet),
        },
        { status: 400 }
      )
    }

    // Determinar período principal del lote (el más frecuente)
    const periodoCounts = new Map<string, number>()
    for (const v of costosAcumulados.values()) {
      periodoCounts.set(v.periodoKey, (periodoCounts.get(v.periodoKey) || 0) + 1)
    }
    const periodoKeyLote = [...periodoCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]

    // Registrar lote
    const { data: loteData, error: loteError } = await client
      .from('lotes_costos')
      .insert({
        periodo_key: periodoKeyLote,
        nombre_archivo: file.name,
        total_registros: costosAcumulados.size,
      })
      .select('id')
      .single()

    if (loteError || !loteData) {
      throw new Error(`Error al crear lote: ${loteError?.message}`)
    }

    // Insertar o actualizar costos globales (UPSERT por periodo_key + grupo_id)
    const costosToInsert = Array.from(costosAcumulados.values()).map((c) => ({
      lote_id: loteData.id,
      periodo_key: c.periodoKey,
      grupo_id: c.grupoId,
      costo_total: c.costoTotal,
    }))

    // Eliminar registros anteriores del mismo periodo × grupo para este lote
    // (UPSERT no funciona bien con lote_id variable, hacemos DELETE + INSERT)
    for (const c of costosToInsert) {
      await client
        .from('costos_globales')
        .delete()
        .eq('periodo_key', c.periodo_key)
        .eq('grupo_id', c.grupo_id)
    }

    const { error: insertError } = await client.from('costos_globales').insert(costosToInsert)
    if (insertError) throw new Error(`Error al insertar costos globales: ${insertError.message}`)

    return NextResponse.json({
      ok: true,
      loteId: loteData.id,
      periodoKey: periodoKeyLote,
      records: costosAcumulados.size,
      unmappedCount: unmappedSet.size,
      detallesIgnorados: unmappedSet.size > 0 ? Array.from(unmappedSet).slice(0, 20) : [],
    })
  } catch (err: any) {
    console.error('[costos/upload]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

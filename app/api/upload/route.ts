// app/api/upload/route.ts
// Recibe un archivo Excel/CSV, lo procesa y guarda los resultados en Supabase.
// Soporta archivos multi-período (filas con meses distintos en el mismo archivo).

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

function slugify(text: string): string {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bsuperficies\b/g, "sup")
    .replace(/\bsup\b/g, "sup")
    .replace(/\bproductos\b/g, "prod")
    .replace(/\bprod\b/g, "prod")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
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
    const modoIncremental = formData.get('incremental') === 'true' // Nuevo parámetro opcional
    
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

    // Cargar catálogo de grupos y sectores
    const [grpRes, secRes] = await Promise.all([
      client.from('grupos').select('*'),
      client.from('sectores').select('*')
    ])

    if (grpRes.error || !grpRes.data) {
      throw new Error(`Error al consultar grupos del catálogo: ${grpRes.error?.message}`)
    }

    const dbGrupos = grpRes.data
    const dbSectores = secRes.data || []

    // Map de búsqueda directa por slug
    const gruposMapBySlug = new Map<string, any>()
    for (const g of dbGrupos) {
      gruposMapBySlug.set(slugify(g.nombre), g)
    }

    // Map de sectores a su primer grupo
    const sectorToFirstGroupMap = new Map<string, any>()
    for (const s of dbSectores) {
      const sSlug = slugify(s.nombre)
      const matchingGrp = dbGrupos.find(g => g.sector_id === s.id)
      if (matchingGrp) {
        sectorToFirstGroupMap.set(sSlug, matchingGrp)
      }
    }

    const specialSubgrupoAliases: Record<string, string> = {
      'almacen': 'salon-almacen-venta-a-departamento',
      'kiosco': 'salon-kio-golosinas',
      'limpieza': 'salon-lim-otros',
      'perfumeria': 'salon-per-otros',
    }

    // Cache local de períodos procesados (key -> id)
    const periodosMap = new Map<string, { id: number; label: string }>()

    async function getOrCreatePeriodo(rawMes: any): Promise<{ id: number; label: string } | null> {
      try {
        const pInfo = parseMesColumn(rawMes)
        if (periodosMap.has(pInfo.key)) {
          return periodosMap.get(pInfo.key)!
        }

        const { data: pData, error: pErr } = await client
          .from('periodos')
          .upsert({
            key: pInfo.key,
            anio: pInfo.anio,
            mes: pInfo.mes,
            label: pInfo.label,
            archivo_nombre: file.name
          }, { onConflict: 'key' })
          .select('id, label')
          .single()

        if (pErr || !pData) return null

        const result = { id: pData.id, label: pData.label }
        periodosMap.set(pInfo.key, result)
        return result
      } catch {
        return null
      }
    }

    // Map para agrupar resultados: `periodoId:sucursalId:grupoId` -> acumulados
    const resultadosMap = new Map<string, { periodoId: number; sucursalId: string; grupoId: string; cantidad: number; facturacion: number; iva: number; costo: number }>()
    const unmappedGroupsSet = new Set<string>()

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx]
      
      const rawMes = getRowVal(row, ['Mes', 'mes', 'FECHA', 'Fecha', 'Periodo', 'periodo'])
      const rawSucursal = getRowVal(row, ['Sucursal', 'sucursal', 'SUCURSAL'])
      const rawCategoria = getRowVal(row, ['Categoria', 'Categoría', 'categoria', 'CATEGORIA'])
      const rawGrupo = getRowVal(row, ['Grupo', 'grupo', 'GRUPO', 'Sector', 'sector', 'SECTOR'])
      const rawSubgrupo = getRowVal(row, ['subgrupo', 'Subgrupo', 'SUBGRUPO'])
      const leafStr = rawSubgrupo || rawGrupo

      if (!rawMes || !rawSucursal || !leafStr) {
        continue // Omitir filas sin mes, sucursal o grupo
      }

      // 1. Resolver el período individual de esta fila
      const periodoObj = await getOrCreatePeriodo(rawMes)
      if (!periodoObj) continue

      // 2. Mapear Sucursal
      let sucursalId = mapSucursal(String(rawSucursal).trim())

      // Auto-corrección si las columnas de sucursal y grupo están cruzadas o desplazadas
      const sucursalesValidas = ['colon', 'falucho', 'peron', 'san-martin', 'virtual']
      if (!sucursalesValidas.includes(sucursalId) && rawGrupo) {
        const sucursalDesdeGrupo = mapSucursal(String(rawGrupo).trim())
        if (sucursalesValidas.includes(sucursalDesdeGrupo)) {
          sucursalId = sucursalDesdeGrupo
        }
      }
      
      // 3. Mapear Grupo con contexto de Categoría y Sector
      const cleanLeaf = cleanCodePrefix(String(leafStr))
      const leafSlug = slugify(cleanLeaf)
      
      // Slugs de contexto para búsqueda más precisa
      const categoriaSlug = rawCategoria ? slugify(String(rawCategoria).trim()) : null
      const grupoSlug = rawGrupo ? slugify(cleanCodePrefix(String(rawGrupo).trim())) : null

      let matchedGrp = null
      
      // Paso 1: Búsqueda con contexto completo (categoría + sector + subgrupo)
      if (categoriaSlug && grupoSlug) {
        // Buscar grupo que pertenezca al sector correcto de la categoría correcta
        matchedGrp = dbGrupos.find(g => {
          const gSlug = slugify(g.nombre)
          if (gSlug !== leafSlug) return false
          
          // Verificar que el grupo pertenece al sector correcto
          const sector = dbSectores.find(s => s.id === g.sector_id)
          if (!sector) return false
          
          const sectorSlug = slugify(sector.nombre)
          if (sectorSlug !== grupoSlug) return false
          
          // Verificar que el sector pertenece a la categoría correcta
          const categoria = sector.categoria_id
          return slugify(categoria) === categoriaSlug
        })
      }
      
      // Paso 2: Búsqueda por slug del nombre (backward compatibility)
      if (!matchedGrp) {
        matchedGrp = gruposMapBySlug.get(leafSlug)
      }

      // Paso 3: Alias especiales
      if (!matchedGrp && specialSubgrupoAliases[leafSlug]) {
        const aliasId = specialSubgrupoAliases[leafSlug]
        matchedGrp = dbGrupos.find(g => g.id === aliasId)
      }

      // Paso 4: Búsqueda por sector
      if (!matchedGrp && sectorToFirstGroupMap.has(leafSlug)) {
        matchedGrp = sectorToFirstGroupMap.get(leafSlug)
      }

      // Paso 5: Búsqueda flexible ignorando guiones
      if (!matchedGrp) {
        for (const [s, g] of gruposMapBySlug.entries()) {
          if (s === leafSlug || s.replace(/-/g, '') === leafSlug.replace(/-/g, '')) {
            matchedGrp = g
            break
          }
        }
      }

      if (!matchedGrp) {
        const contexto = categoriaSlug && grupoSlug ? ` [${rawCategoria} → ${rawGrupo}]` : ''
        unmappedGroupsSet.add(`"${String(leafStr).trim()}"${contexto} (Fila ${idx + 2})`)
        continue
      }

      // 4. Extraer números financieros
      const cantidad = parseInt(String(getRowVal(row, ['Cantidad', 'cantidad', 'CANTIDAD', 'UNIDADES', 'Unidades']) || '0'), 10) || 0
      
      const parseMoney = (val: any) => {
        if (typeof val === 'number') return val
        if (!val) return 0
        return parseFloat(String(val).replace(/[$\s,]/g, '').replace(/^-/, '')) || 0
      }

      const facturacion = parseMoney(getRowVal(row, ['Facturación', 'Facturacion', 'facturacion', 'Facturación s/IVA', 'Facturacion s/IVA', 'Fact_s_IVA', 'VENTAS', 'Ventas', 'IMPORTE', 'Importe']))
      const iva = parseMoney(getRowVal(row, ['IVA', 'Iva', 'iva']))
      const costo = parseMoney(getRowVal(row, ['Costo', 'costo', 'CMV', 'Costo_Mercaderia_Vendida', 'COSTO']))

      // Agrupar filas para el mismo periodoId × sucursalId × grupoId
      const itemKey = `${periodoObj.id}:${sucursalId}:${matchedGrp.id}`
      const prev = resultadosMap.get(itemKey) || { 
        periodoId: periodoObj.id, 
        sucursalId, 
        grupoId: matchedGrp.id, 
        cantidad: 0, 
        facturacion: 0, 
        iva: 0, 
        costo: 0 
      }
      
      resultadosMap.set(itemKey, {
        ...prev,
        cantidad: prev.cantidad + cantidad,
        facturacion: prev.facturacion + facturacion,
        iva: prev.iva + iva,
        costo: prev.costo + costo,
      })
    }

    const unmappedList = Array.from(unmappedGroupsSet)

    if (resultadosMap.size === 0) {
      const sampleHeaders = Object.keys(rows[0] || {}).join(', ')
      return NextResponse.json({
        error: `No se pudieron procesar las filas del archivo. Columnas detectadas: [${sampleHeaders}]`,
        detalles: unmappedList.slice(0, 15)
      }, { status: 400 })
    }

    // Limpiar únicamente los registros específicos: período × sucursal × grupo
    // Esto permite cargar FRESCOS sin borrar SALON, o recargar un mes sin afectar otros
    const affectedPeriodIds = Array.from(new Set(Array.from(resultadosMap.values()).map(r => r.periodoId)))
    const affectedGrupoIds = Array.from(new Set(Array.from(resultadosMap.values()).map(r => r.grupoId)))
    
    if (!modoIncremental) {
      // Modo normal: eliminar los grupos del archivo antes de insertar
      console.log("Limpiando registros afectados - Períodos:", affectedPeriodIds, "Grupos:", affectedGrupoIds.length)
      
      for (const periodoId of affectedPeriodIds) {
        await client
          .from('resultados')
          .delete()
          .eq('periodo_id', periodoId)
          .in('grupo_id', affectedGrupoIds)
      }
    } else {
      console.log("Modo incremental activado - No se borrarán datos existentes")
    }

    // Convertir Map a Array para inserción en DB
    const resultados = Array.from(resultadosMap.values()).map(v => ({
      periodo_id: v.periodoId,
      sucursal_id: v.sucursalId,
      grupo_id: v.grupoId,
      cantidad: v.cantidad,
      facturacion: v.facturacion,
      iva: v.iva,
      costo: v.costo
    }))

    // Insertar en lotes de 200
    for (let k = 0; k < resultados.length; k += 200) {
      const batch = resultados.slice(k, k + 200)
      const { error: insErr } = await client.from('resultados').insert(batch)
      if (insErr) {
        throw new Error(`Error de inserción en lote ${k}: ${insErr.message}`)
      }
    }

    const periodosLabelsList = Array.from(periodosMap.values()).map(p => p.label.toUpperCase()).join(', ')

    return NextResponse.json({
      ok: true,
      periodo: periodosLabelsList,
      totalPeriodos: periodosMap.size,
      records: resultados.length,
      unmappedCount: unmappedList.length,
      warning: unmappedList.length > 0 ? `${unmappedList.length} subgrupos del archivo no coincidieron con el catálogo.` : null,
      detallesIgnorados: unmappedList.slice(0, 20)
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

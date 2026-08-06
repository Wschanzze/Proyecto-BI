// app/api/upload/route.ts
// Recibe un archivo Excel, lo procesa y guarda los resultados en Supabase.
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

function parseMesColumn(mesStr: string): { key: string; anio: number; mes: number; label: string } {
  // Formato esperado: "ene-25", "jun-26", etc.
  const parts = mesStr.toLowerCase().split('-')
  if (parts.length !== 2) throw new Error(`Formato de mes inválido: ${mesStr}`)
  
  const mesLabel = parts[0].trim()
  const anioShort = parseInt(parts[1].trim(), 10)
  if (isNaN(anioShort)) throw new Error(`Año inválido: ${parts[1]}`)
  const anio = 2000 + anioShort

  const mesesMap: Record<string, number> = {
    ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
    jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12,
    jan: 1, apr: 4, aug: 8, dec: 12 // Fallbacks comunes en inglés
  }
  
  const mes = mesesMap[mesLabel]
  if (!mes) throw new Error(`Mes no reconocido: ${mesLabel}`)
  
  const key = `${anio}-${String(mes).padStart(2, '0')}`
  return { key, anio, mes, label: mesStr }
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
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    
    // Convertir a JSON crudo (array de objetos)
    const rows = XLSX.utils.sheet_to_json(sheet) as any[]
    if (rows.length === 0) {
      return NextResponse.json({ error: 'El archivo está vacío' }, { status: 400 })
    }

    // Inicializar Supabase Client con service_role key
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYW90bmFmanJ2Y2tveGJkb2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MTk4NywiZXhwIjoyMTAxNTM3OTg3fQ.d9MOFM3FhUH0E1UnMK_URT5HM3TUNmBwUt3JqSOvL3Q"
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wlaotnafjrvckoxbdokk.supabase.co",
      serviceRoleKey
    )

    // Cargar catálogo de la base de datos para mapeo exacto de grupos
    const [catRes, secRes, grpRes] = await Promise.all([
      client.from('categorias').select('*'),
      client.from('sectores').select('*'),
      client.from('grupos').select('*'),
    ])

    if (catRes.error || secRes.error || grpRes.error) {
      throw new Error(`Error de catálogo: ${catRes.error?.message ?? secRes.error?.message ?? grpRes.error?.message}`)
    }

    const dbCategorias = catRes.data || []
    const dbSectores = secRes.data || []
    const dbGrupos = grpRes.data || []

    // Detectar el período (leído del primer registro válido de la columna 'Mes')
    let periodoInfo: { key: string; anio: number; mes: number; label: string } | null = null
    for (const row of rows) {
      const rawMes = row.Mes || row.mes || row.periodo || row.Periodo
      if (rawMes) {
        try {
          periodoInfo = parseMesColumn(String(rawMes))
          break
        } catch {
          // Continuar buscando un mes válido
        }
      }
    }

    if (!periodoInfo) {
      return NextResponse.json({ error: 'No se pudo detectar la columna de Mes/Período válida (ej: jun-26)' }, { status: 400 })
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

    // Procesar las filas para resultados
    const resultados = []
    const erroresMapeo: string[] = []

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx]
      
      const rawSucursal = row.Sucursal || row.sucursal
      const rawSector = row.SECTOR || row.sector || row.Sector
      const rawGrupo = row.GRUPO || row.grupo || row.Grupo
      const rawCategoria = row.Categoria || row.categoria || row.Categoría || 'Salon' // Default a Salon

      if (!rawSucursal || !rawSector || !rawGrupo) {
        continue // Omitir filas vacías o totales parciales
      }

      // 1. Mapear Sucursal
      const sucursalId = mapSucursal(String(rawSucursal))
      
      // 2. Buscar sector y grupo coincidentes por nombre en la base de datos
      const matchedCat = dbCategorias.find(c => slugify(c.nombre) === slugify(String(rawCategoria)))
      const matchedSec = dbSectores.find(s => slugify(s.nombre) === slugify(String(rawSector)) && (!matchedCat || s.categoria_id === matchedCat.id))
      const matchedGrp = dbGrupos.find(g => slugify(g.nombre) === slugify(String(rawGrupo)) && (!matchedSec || g.sector_id === matchedSec.id))

      if (!matchedGrp) {
        erroresMapeo.push(`Fila ${idx + 2}: No se encontró el grupo "${rawGrupo}" bajo el sector "${rawSector}"`)
        continue
      }

      // 3. Extraer métricas financieras
      const cantidad = parseInt(row.Cantidad || row.cantidad || '0', 10) || 0
      
      // Limpiar signos de dólar y comas si vienen formateados como string
      const parseMoney = (val: any) => {
        if (typeof val === 'number') return val
        if (!val) return 0
        return parseFloat(String(val).replace(/[$\s,]/g, '').replace(/^-/, '')) || 0
      }

      const facturacion = parseMoney(row.Facturación || row.Facturacion || row['Facturación s/IVA'] || row['Facturacion s/IVA'] || row.Fact_s_IVA)
      const iva = parseMoney(row.IVA || row.Iva || row.iva)
      const costo = parseMoney(row.Costo || row.costo || row.Costo_Mercaderia_Vendida)

      resultados.push({
        periodo_id: periodoId,
        sucursal_id: sucursalId,
        grupo_id: matchedGrp.id,
        cantidad,
        facturacion,
        iva,
        costo
      })
    }

    if (resultados.length === 0) {
      return NextResponse.json({
        error: 'No se encontraron registros de datos financieros válidos para importar.',
        detalles: erroresMapeo.slice(0, 5)
      }, { status: 400 })
    }

    // Limpiar resultados anteriores para este período para evitar basura/duplicados
    console.log(`Borrando registros previos para periodo_id = ${periodoId}...`)
    const { error: delErr } = await client
      .from('resultados')
      .delete()
      .eq('periodo_id', periodoId)

    if (delErr) {
      throw new Error(`Error al limpiar período previo: ${delErr.message}`)
    }

    // Insertar resultados por lotes de 200
    for (let k = 0; k < resultados.length; k += 200) {
      const batch = resultados.slice(k, k + 200)
      const { error: insErr } = await client
        .from('resultados')
        .insert(batch)
      if (insErr) {
        throw new Error(`Error de inserción en lote ${k}: ${insErr.message}`)
      }
    }

    return NextResponse.json({
      ok: true,
      periodo: periodoInfo.label,
      key: periodoInfo.key,
      records: resultados.length,
      warning: erroresMapeo.length > 0 ? `${erroresMapeo.length} filas ignoradas por no coincidir con el catálogo` : null,
      detallesIgnorados: erroresMapeo.slice(0, 10)
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Cargar variables de entorno desde .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) {
      process.env[key.trim()] = vals.join('=').trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Sin credenciales de Supabase en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MESES_ES = {
  'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6,
  'JUL': 7, 'AGO': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12,
  'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4, 'MAYO': 5, 'JUNIO': 6,
  'JULIO': 7, 'AGOSTO': 8, 'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12
};

function parseExcelDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    // Convertir serie Excel a fecha JS (basada en 1900-01-01)
    const date = new Date((val - (25567 + 2)) * 86400 * 1000);
    return date;
  }
  const str = String(val).trim();
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateISO(date) {
  if (!date) return null;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function seedInflacion() {
  console.log('\n📊 Procesando inflacion.xlsx...');
  const filePath = path.join(__dirname, '..', 'inflacion.xlsx');
  if (!fs.existsSync(filePath)) {
    console.error('❌ Archivo inflacion.xlsx no encontrado');
    return;
  }

  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);

  const registros = [];
  for (const r of rows) {
    const anio = parseInt(r['Año'] || r['Anio'] || r['anio']);
    const mesStr = String(r['Mes'] || r['mes'] || '').trim().toUpperCase();
    const mesNum = MESES_ES[mesStr] || parseInt(mesStr);
    const infMensual = parseFloat(r['Inflacion_Mensual'] || r['inflacion_mensual'] || 0);
    const infAnual = parseFloat(r['Inflacion_Anual'] || r['inflacion_anual'] || 0);

    if (anio && mesNum >= 1 && mesNum <= 12) {
      const periodoKey = `${anio}-${String(mesNum).padStart(2, '0')}`;
      registros.push({
        anio,
        mes: mesNum,
        periodo_key: periodoKey,
        inflacion_mensual: isNaN(infMensual) ? 0 : infMensual,
        inflacion_anual: isNaN(infAnual) ? 0 : infAnual,
      });
    }
  }

  console.log(`  → Leídos ${registros.length} registros de inflación.`);
  
  // Insertar en lote (upsert)
  const { data, error } = await supabase
    .from('historico_inflacion')
    .upsert(registros, { onConflict: 'anio,mes' });

  if (error) {
    console.error('❌ Error al guardar historico_inflacion:', error.message);
  } else {
    console.log('✅ historico_inflacion guardado exitosamente.');
  }
}

async function seedVentasDiarias() {
  console.log('\n🛍️ Procesando datos_estacionalidad.xlsx...');
  const filePath = path.join(__dirname, '..', 'datos_estacionalidad.xlsx');
  if (!fs.existsSync(filePath)) {
    console.error('❌ Archivo datos_estacionalidad.xlsx no encontrado');
    return;
  }

  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);

  const registros = [];
  for (const r of rows) {
    const fechaObj = parseExcelDate(r['Fecha'] || r['fecha']);
    if (!fechaObj) continue;

    const fechaISO = formatDateISO(fechaObj);
    const anio = fechaObj.getUTCFullYear();
    const mesNum = fechaObj.getUTCMonth() + 1;
    const periodoKey = `${anio}-${String(mesNum).padStart(2, '0')}`;

    const clientes = parseInt(r['Cantidad'] || r['clientes'] || r['Clientes'] || 0);
    const productos = parseInt(r['Productos'] || r['productos'] || 0);
    const facturacion = parseFloat(r['Facturacion'] || r['facturacion'] || 0);

    registros.push({
      fecha: fechaISO,
      periodo_key: periodoKey,
      clientes: isNaN(clientes) ? 0 : clientes,
      productos: isNaN(productos) ? 0 : productos,
      facturacion: isNaN(facturacion) ? 0 : facturacion,
      sucursal_id: '__consolidado__',
    });
  }

  console.log(`  → Leídos ${registros.length} registros de ventas diarias.`);

  // Insertar en lotes de 500 para evitar timeouts
  const BATCH_SIZE = 500;
  let guardados = 0;
  for (let i = 0; i < registros.length; i += BATCH_SIZE) {
    const batch = registros.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('historico_ventas_diario')
      .upsert(batch, { onConflict: 'fecha,sucursal_id' });

    if (error) {
      console.error(`❌ Error en lote ${i}:`, error.message);
    } else {
      guardados += batch.length;
    }
  }

  console.log(`✅ historico_ventas_diario guardado exitosamente (${guardados}/${registros.length} filas).`);
}

async function run() {
  console.log('🚀 Iniciando Seed de Estacionalidad...');
  await seedInflacion();
  await seedVentasDiarias();
  console.log('\n✨ Seed de Estacionalidad completado!');
}

run();

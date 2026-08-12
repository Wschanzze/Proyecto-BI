import { getCuadroFromDB } from '../lib/data-db';

async function run() {
  console.log("Fetching P&L detailed for 2026-01 (Consolidado)...");
  try {
    const cuadro = await getCuadroFromDB('2026-01', '__consolidado__');
    if (!cuadro) {
      console.log("No data returned!");
      return;
    }
    // Busquemos la sección frescos
    const frescos = cuadro.secciones.find(s => s.nombre.toLowerCase().includes("fresco"));
    if (!frescos) {
      console.log("Sección Frescos no encontrada");
      return;
    }
    
    // Busquemos la categoría Frutas y Verduras
    const fyv = frescos.categorias.find(c => c.nombre.toLowerCase().includes("fruta"));
    if (!fyv) {
      console.log("Categoría Frutas y Verduras no encontrada en Frescos");
      return;
    }

    console.log("=== CATEGORIA: " + fyv.nombre + " ===");
    console.log("Metrics:", fyv.metrics);
    console.log("Grupos:");
    for (const g of fyv.grupos) {
      console.log(` - Grupo: ${g.nombre} (ID: ${g.id}), Prorrateado: ${g.costoProrrateado}, CostoCalculadoTipo: ${g.costoCalculadoTipo}`);
      console.log(`   Metrics:`, g.metrics);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

run();

# Mapeo de Grupos FRESCOS

Este documento describe cómo se mapean los datos del archivo CSV cargado en `/admin` a la estructura de base de datos para la categoría **FRESCOS**.

## Estructura de FRESCOS

La categoría FRESCOS está organizada en 4 **Sectores** (Grupos principales) con sus respectivos **Subgrupos**:

### 1. Carnicería (`frescos-carniceria`)

| Subgrupo en CSV | ID en DB | Nombre en App |
|----------------|----------|---------------|
| Achuras | `frescos-car-achuras` | Achuras |
| Carne Porcina | `frescos-car-carne-porcina` | Carne Porcina |
| Carne Vacuna | `frescos-car-carne-vacuna` | Carne Vacuna |
| Pescado | `frescos-car-pescado` | Pescado |
| Pollo | `frescos-car-pollo` | Pollo |
| Producción | `frescos-car-produccion` | Producción |

### 2. Fiambrería (`frescos-fiambreria`)

| Subgrupo en CSV | ID en DB | Nombre en App |
|----------------|----------|---------------|
| Dulces | `frescos-fia-dulces` | Dulces |
| Encurtidos | `frescos-fia-encurtidos` | Encurtidos |
| Fiambres | `frescos-fia-fiambres` | Fiambres |
| Frutas | `frescos-fia-frutas` | Frutas |
| Quesos | `frescos-fia-quesos` | Quesos |

### 3. Frutas y Verduras (`frescos-frutas-y-verduras`)

| Subgrupo en CSV | ID en DB | Nombre en App |
|----------------|----------|---------------|
| FRUTAS FRESCAS | `frescos-fyv-frutas-frescas` | Frutas Frescas |
| HUEVOS | `frescos-fyv-huevos` | Huevos |
| LEÑA Y CARBON | `frescos-fyv-lena-y-carbon` | Leña y Carbón |
| VERDURAS FRESCAS | `frescos-fyv-verduras-frescas` | Verduras Frescas |

### 4. Rotisería (`frescos-rotiseria`)

| Subgrupo en CSV | ID en DB | Nombre en App |
|----------------|----------|---------------|
| Arrollado | `frescos-rot-arrollado` | Arrollado |
| Arroz | `frescos-rot-arroz` | Arroz |
| Carnes | `frescos-rot-carnes` | Carnes |
| Cerdo | `frescos-rot-cerdo` | Cerdo |
| Empanadas | `frescos-rot-empanadas` | Empanadas |
| Ensaladas | `frescos-rot-ensaladas` | Ensaladas |
| Entrada | `frescos-rot-entrada` | Entrada |
| Milanesas | `frescos-rot-milanesas` | Milanesas |
| Papas | `frescos-rot-papas` | Papas |
| Pastas | `frescos-rot-pastas` | Pastas |
| Pescado | `frescos-rot-pescado` | Pescado |
| Pollo | `frescos-rot-pollo` | Pollo |
| Postre | `frescos-rot-postre` | Postre |
| Tartas y tortillas | `frescos-rot-tartas-y-tortillas` | Tartas y Tortillas |
| Verduras | `frescos-rot-verduras` | Verduras |

## Formato del Archivo CSV

El archivo debe contener las siguientes columnas:

- **Categoria** o **Categoría**: `Frescos`
- **Grupo**: El sector (Carniceria, Fiambreria, Frutas y Verduras, Rotiseria)
- **Subgrupo**: El nombre del subgrupo según la tabla de arriba
- **Mes** o **Fecha**: El período en formato `mmm-yy` (ej: `jun-26`) o fecha completa
- **Sucursal**: Nombre de la sucursal (Colón, San Martín, Falucho, Perón, Virtual)
- **Facturación** o **Facturación s/IVA**: Monto de facturación sin IVA
- **IVA**: Monto de IVA
- **Costo** o **CMV**: Costo de mercadería vendida
- **Cantidad**: Cantidad de unidades vendidas

## Lógica de Mapeo

El sistema realiza el mapeo en el siguiente orden:

1. **Búsqueda directa por slug**: Convierte el nombre del subgrupo a slug (minúsculas, sin tildes, guiones) y busca coincidencia exacta en la base de datos.
   - Ejemplo: `"Carne Vacuna"` → slug `"carne-vacuna"` → busca grupo con ID que termine en `-carne-vacuna`

2. **Búsqueda por sector**: Si no encuentra coincidencia directa, busca el sector por su nombre y asigna el primer grupo de ese sector.

3. **Alias especiales**: Algunos nombres comunes tienen mapeos predefinidos en el código.

## Notas Importantes

- **Mayúsculas/Minúsculas**: El sistema es insensible a mayúsculas.
- **Tildes**: Las tildes se normalizan automáticamente.
- **Espacios**: Los espacios se convierten a guiones en los slugs.
- **Prefijos numéricos**: Se eliminan automáticamente (ej: "01. Achuras" → "Achuras")

## Ejemplo de Fila CSV

```csv
Categoria,Grupo,Subgrupo,Mes,Sucursal,Facturación s/IVA,IVA,Costo,Cantidad
Frescos,Carniceria,Carne Vacuna,jun-26,Colón,1500000,315000,900000,450
Frescos,Rotiseria,Empanadas,jun-26,San Martín,280000,58800,140000,320
Frescos,Frutas y Verduras,FRUTAS FRESCAS,jun-26,Falucho,650000,136500,390000,890
```

## Verificación Post-Carga

Después de cargar el archivo:

1. El sistema muestra cuántos registros se insertaron correctamente
2. Si hay subgrupos que no pudieron mapearse, se listan en "detalles ignorados"
3. Verifica el **Cuadro de Resultados — Detallado** para confirmar que los datos aparecen correctamente organizados

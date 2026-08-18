-- Migración 010: Tablas para Estacionalidad Histórica e Inflación

-- 1. Tabla de Inflación Mensual e Interanual
CREATE TABLE IF NOT EXISTS public.historico_inflacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anio INTEGER NOT NULL,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    periodo_key VARCHAR(7) NOT NULL, -- ej: '2026-01'
    inflacion_mensual NUMERIC(8, 4) NOT NULL DEFAULT 0, -- ej: 2.88 (%)
    inflacion_anual NUMERIC(8, 4) NOT NULL DEFAULT 0,   -- ej: 33.55 (%)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_inflacion_periodo UNIQUE (anio, mes)
);

-- 2. Tabla de Ventas y Métricas Comerciales Diarias
CREATE TABLE IF NOT EXISTS public.historico_ventas_diario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    periodo_key VARCHAR(7) NOT NULL, -- ej: '2026-01'
    clientes INTEGER NOT NULL DEFAULT 0,
    productos INTEGER NOT NULL DEFAULT 0,
    facturacion NUMERIC(15, 2) NOT NULL DEFAULT 0,
    sucursal_id VARCHAR(50) NOT NULL DEFAULT '__consolidado__',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_ventas_diario_fecha_sucursal UNIQUE (fecha, sucursal_id)
);

-- Índices para consultas de agregación rápidas
CREATE INDEX IF NOT EXISTS idx_inflacion_periodo ON public.historico_inflacion(periodo_key);
CREATE INDEX IF NOT EXISTS idx_inflacion_anio_mes ON public.historico_inflacion(anio, mes);

CREATE INDEX IF NOT EXISTS idx_ventas_diarias_fecha ON public.historico_ventas_diario(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_diarias_periodo ON public.historico_ventas_diario(periodo_key);
CREATE INDEX IF NOT EXISTS idx_ventas_diarias_sucursal ON public.historico_ventas_diario(sucursal_id);

-- RLS (Row Level Security)
ALTER TABLE public.historico_inflacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_ventas_diario ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso de lectura
CREATE POLICY "Permitir lectura publica historico_inflacion"
    ON public.historico_inflacion FOR SELECT USING (true);

CREATE POLICY "Permitir lectura publica historico_ventas_diario"
    ON public.historico_ventas_diario FOR SELECT USING (true);

-- Políticas de modificación
CREATE POLICY "Permitir insercion historico_inflacion"
    ON public.historico_inflacion FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir insercion historico_ventas_diario"
    ON public.historico_ventas_diario FOR ALL USING (true) WITH CHECK (true);

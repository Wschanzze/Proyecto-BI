-- ============================================================
-- Monarca BI — Fix upsert constraints en subcuentas
-- Agrega constraints UNIQUE con nombre explícito para que
-- Supabase PostgREST pueda resolver el onConflict correctamente
-- ============================================================

-- 1. costos_fijos_subcuentas: renombrar constraint anónima a nombre explícito
DO $$ BEGIN
  -- Eliminar constraint existente si no tiene nombre explícito
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'costos_fijos_subcuentas'::regclass
      AND conname = 'uq_costos_fijos_periodo_sucursal'
  ) THEN
    -- Primero eliminar la constraint UNIQUE anónima existente (si existe)
    ALTER TABLE costos_fijos_subcuentas
      DROP CONSTRAINT IF EXISTS costos_fijos_subcuentas_periodo_id_sucursal_id_key;
    -- Agregar constraint con nombre explícito
    ALTER TABLE costos_fijos_subcuentas
      ADD CONSTRAINT uq_costos_fijos_periodo_sucursal
      UNIQUE (periodo_id, sucursal_id);
  END IF;
END $$;

-- 2. ingresos_financieros_subcuentas: igual
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'ingresos_financieros_subcuentas'::regclass
      AND conname = 'uq_ingresos_financieros_periodo_sucursal'
  ) THEN
    ALTER TABLE ingresos_financieros_subcuentas
      DROP CONSTRAINT IF EXISTS ingresos_financieros_subcuentas_periodo_id_sucursal_id_key;
    ALTER TABLE ingresos_financieros_subcuentas
      ADD CONSTRAINT uq_ingresos_financieros_periodo_sucursal
      UNIQUE (periodo_id, sucursal_id);
  END IF;
END $$;

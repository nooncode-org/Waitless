-- =============================================================================
-- tables_config: aislar mesas por tenant (antes era una tabla GLOBAL compartida)
-- =============================================================================
-- Problema: tables_config no tenía tenant_id → TODOS los restaurantes veían y
-- editaban el mismo set de mesas (un tenant nuevo ya "veía" las mesas de otro).
-- Este cambio agrega tenant_id, respalda los datos existentes, hace la unicidad
-- de número POR-tenant y aísla lectura/escritura por RLS.
--
-- IMPORTANTE: el backfill asigna las mesas existentes al tenant de 'noon'
-- (el único tenant real al momento de migrar). Si tu cuenta principal no es
-- 'noon', cambiá el username en el UPDATE antes de correr.
-- =============================================================================

-- 1) Columna tenant_id (cascada al borrar el tenant)
ALTER TABLE tables_config
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

-- 2) Backfill: mesas globales existentes → tenant de 'noon'.
--    Otros/nuevos tenants arrancan sin mesas (las crean ellos).
UPDATE tables_config
SET tenant_id = (
  SELECT tenant_id FROM profiles
  WHERE username = 'noon' AND tenant_id IS NOT NULL
  LIMIT 1
)
WHERE tenant_id IS NULL;

-- 3) Unicidad de número AHORA por tenant (antes era global)
DROP INDEX IF EXISTS tables_config_numero_idx;
CREATE UNIQUE INDEX IF NOT EXISTS tables_config_tenant_numero_idx
  ON tables_config(tenant_id, numero);
CREATE INDEX IF NOT EXISTS tables_config_tenant_idx
  ON tables_config(tenant_id);

-- 4) RLS: reemplazar las políticas globales/públicas por aislamiento por tenant.
--    El staff autenticado solo lee/escribe las mesas de SU tenant.
--    Las rutas server usan service_role (bypassan RLS) y filtran por tenant en código.
DROP POLICY IF EXISTS "auth_all"                 ON tables_config;
DROP POLICY IF EXISTS "auth_write_tables_config" ON tables_config;
DROP POLICY IF EXISTS "public_read_tables_config" ON tables_config;

CREATE POLICY "tenant_read_tables_config" ON tables_config FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_write_tables_config" ON tables_config FOR ALL TO authenticated
  USING      (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

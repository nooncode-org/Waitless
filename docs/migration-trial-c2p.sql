-- =============================================================================
-- WAITLESS — Migración: periodo de prueba de 14 días (modelo C2P)
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Modelo:
--   trial_ends_at   → fin de la prueba gratuita (now()+14d al registrar).
--   plan_expires_at → fin del periodo pago vigente (ya existe, de la migración
--                     Stripe). El operador lo setea al confirmar el pago por C2P.
--
-- Acceso (ver lib/plans.ts):
--   - now < trial_ends_at                      → en prueba, acceso total.
--   - trial vencido y plan_expires_at vigente  → acceso según plan.
--   - trial vencido y sin plan vigente         → BLOQUEADO.
--   - trial_ends_at NULL (tenants legacy)      → nunca bloquea.
-- =============================================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- plan_expires_at ya se agrega en docs/migration-billing-stripe.sql.
-- Por si esa migración no corrió aún, lo aseguramos acá también (idempotente):
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

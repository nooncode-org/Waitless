-- =============================================================================
-- LIMPIEZA ÚNICA: negocios (tenants) huérfanos creados por el bug de
-- "registro con Google" (commit a078b44).
--
-- Causa: /api/registro/completar creaba el tenant ANTES de linkear el profile,
-- y si el linkeo fallaba (colisión con profiles_email_unique) el error no se
-- chequeaba → quedaba un tenant sin profile y cada nuevo login generaba otro.
--
-- Definición de huérfano: tenant SIN ningún profile que lo referencie
-- (profiles.tenant_id = tenants.id no existe para ese tenant).
--
-- Al borrar un tenant:
--   • app_config y todos los datos operativos (orders, menu, etc.) se borran
--     solos por ON DELETE CASCADE.
--   • profiles.tenant_id que apunten ahí quedan en NULL (ON DELETE SET NULL),
--     pero los huérfanos por definición no tienen profiles, así que no afecta
--     tu cuenta real.
--
-- EJECUCIÓN: correr en Supabase → SQL Editor. Es idempotente (se puede repetir).
-- RECOMENDADO: ejecutar primero los PASOS 1 y 2 (solo lectura), revisar, y
-- recién entonces ejecutar el PASO 3.
-- =============================================================================

-- ── PASO 1 (PREVIEW · solo lectura) ──────────────────────────────────────────
-- Tenants huérfanos que se van a ELIMINAR. Revisá esta lista antes de borrar.
SELECT t.id, t.nombre, t.slug, t.plan, t.created_at
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.tenant_id = t.id)
ORDER BY t.created_at;

-- ── PASO 2 (CONTEXTO · solo lectura) ─────────────────────────────────────────
-- Tus profiles, para confirmar cuál es tu cuenta real (la que tiene tenant_id).
SELECT id, email, username, role, tenant_id, activo, created_at
FROM profiles
ORDER BY created_at;

-- ── PASO 3 (BORRADO) ─────────────────────────────────────────────────────────
-- Elimina los tenants huérfanos. CASCADE limpia app_config y datos asociados.
DELETE FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.tenant_id = t.id);

-- ── PASO 4 (VERIFICACIÓN · solo lectura) ─────────────────────────────────────
-- Debe devolver 0 filas si la limpieza fue completa.
SELECT count(*) AS tenants_huerfanos_restantes
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.tenant_id = t.id);

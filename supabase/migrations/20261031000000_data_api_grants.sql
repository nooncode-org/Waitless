-- =============================================================================
-- WAITLESS — Grants para Data API (supabase-js / PostgREST / GraphQL)
--
-- Desde el 30/oct/2026 Supabase dejó de otorgar automáticamente acceso al
-- Data API a las tablas nuevas de "public". Este repo no tenía ningún GRANT:
-- dependía del auto-grant. Sin esto, un deploy limpio (proyecto nuevo, preview
-- branch o `supabase db reset`) deja la API devolviendo "permission denied".
--
-- Esta migración:
--   1) Otorga a TODAS las tablas actuales de public.
--   2) Configura privilegios por defecto para las tablas FUTURAS (recrea el
--      comportamiento del auto-grant a nivel proyecto).
--
-- La seguridad real sigue siendo RLS (el grant solo expone la tabla al API;
-- las policies filtran las filas). Debe correr DESPUÉS de crear las tablas.
-- Idempotente: se puede reaplicar sin efectos adversos.
-- =============================================================================

grant usage on schema public to anon, authenticated, service_role;

-- ── Tablas existentes ────────────────────────────────────────────────────────
grant select
  on all tables in schema public to anon;

grant select, insert, update, delete
  on all tables in schema public to authenticated;

grant all
  on all tables in schema public to service_role;

-- ── Secuencias (por si alguna PK/columna usa serial/identity) ────────────────
grant usage, select
  on all sequences in schema public to anon, authenticated, service_role;

-- ── Tablas y secuencias FUTURAS (default privileges) ─────────────────────────
alter default privileges in schema public
  grant select on tables to anon;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant all on tables to service_role;

alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;

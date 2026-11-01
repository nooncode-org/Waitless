-- =============================================================================
-- WAITLESS — Migración: costo de envío fijo (delivery)
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Modelo: el restaurante define UN costo de envío fijo (app_config.costo_envio).
-- 0 = envío gratis. Se cobra en pedidos de delivery y se persiste por pedido.
-- =============================================================================

ALTER TABLE app_config
  ADD COLUMN IF NOT EXISTS costo_envio numeric NOT NULL DEFAULT 0;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS costo_envio numeric NOT NULL DEFAULT 0;

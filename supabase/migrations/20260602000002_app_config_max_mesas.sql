-- Tope de mesas por restaurante (configuración general de la cuenta).
--
-- max_mesas define la cantidad TOTAL de mesas con la que trabaja el local.
-- Ninguna mesa puede tener un número mayor a este valor (ej. si max_mesas = 50,
-- no puede existir la mesa 55). NULL = sin límite (comportamiento previo).
--
-- Idempotente.

alter table public.app_config add column if not exists max_mesas integer;

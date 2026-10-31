// Fuente única de verdad de planes: gating de features, tope de mesas y precio.
// Los precios acá deben coincidir con la landing (app/page.tsx).

export type Plan = 'starter' | 'pro' | 'enterprise'

export interface PlanDef {
  key: Plan
  label: string
  price: string            // display — igual que la landing
  maxMesas: number | null  // null = ilimitado
  features: ReadonlySet<string>
}

const BASE = ['orders', 'tables', 'kitchen', 'qr'] as const
const PRO  = [...BASE, 'analytics', 'waitlist', 'push_notifications', 'refunds'] as const

export const PLANS: Record<Plan, PlanDef> = {
  starter:    { key: 'starter',    label: 'Starter',    price: '$29 / mes', maxMesas: 8,    features: new Set(BASE) },
  pro:        { key: 'pro',        label: 'Pro',        price: '$89 / mes', maxMesas: null, features: new Set(PRO) },
  enterprise: { key: 'enterprise', label: 'Enterprise', price: 'A medida',  maxMesas: null, features: new Set([...PRO, 'multi_tenant_admin', 'white_label']) },
}

/** ¿El plan incluye la feature? Sin plan (single-tenant) = acceso total. */
export function planHasFeature(plan: Plan | null | undefined, feature: string): boolean {
  if (!plan) return true
  return PLANS[plan]?.features.has(feature) ?? false
}

/** Tope de mesas del plan (null = ilimitado / single-tenant). */
export function planMaxMesas(plan: Plan | null | undefined): number | null {
  return plan ? (PLANS[plan]?.maxMesas ?? null) : null
}

/** Tope efectivo = el menor entre el config del local y el del plan. */
export function effectiveMaxMesas(configMax: number | null | undefined, plan: Plan | null | undefined): number | null {
  const caps = [configMax, planMaxMesas(plan)].filter((n): n is number => typeof n === 'number' && n > 0)
  return caps.length ? Math.min(...caps) : null
}

// ── Prueba gratuita (modelo C2P) ────────────────────────────────────────────
// trial_ends_at: fin de la prueba. plan_expires_at: fin del periodo pago (lo
// setea el operador al confirmar el pago por Pago Móvil/C2P). Ver migration-trial-c2p.sql.

export const TRIAL_DAYS = 14

export interface TrialState {
  trialEndsAt?: string | Date | null
  planExpiresAt?: string | Date | null
}

const toMs = (d?: string | Date | null): number | null =>
  d == null ? null : new Date(d).getTime()

/** ¿El tenant está en prueba vigente? (acceso total a todas las funciones). */
export function isInTrial(t: TrialState, now = Date.now()): boolean {
  const end = toMs(t.trialEndsAt)
  return end != null && now < end
}

/**
 * ¿Acceso revocado? Prueba vencida y sin plan pago vigente.
 * Sin trial_ends_at (tenants legacy / single-tenant) nunca bloquea.
 */
export function isTenantBlocked(t: TrialState, now = Date.now()): boolean {
  const trialEnd = toMs(t.trialEndsAt)
  if (trialEnd == null) return false        // legacy / single-tenant
  if (now < trialEnd) return false          // en prueba
  const planEnd = toMs(t.planExpiresAt)
  return planEnd == null || now >= planEnd  // sin plan pago vigente → bloqueado
}

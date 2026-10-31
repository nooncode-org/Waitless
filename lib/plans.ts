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

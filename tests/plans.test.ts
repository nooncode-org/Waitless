import { describe, it, expect } from 'vitest'
import { isInTrial, isTenantBlocked } from '../lib/plans'

const DAY = 86_400_000
const now = Date.now()

describe('prueba gratuita (modelo C2P)', () => {
  it('en prueba → activo, no bloqueado', () => {
    const t = { trialEndsAt: now + 5 * DAY }
    expect(isInTrial(t, now)).toBe(true)
    expect(isTenantBlocked(t, now)).toBe(false)
  })

  it('prueba vencida y sin plan → bloqueado', () => {
    const t = { trialEndsAt: now - DAY }
    expect(isInTrial(t, now)).toBe(false)
    expect(isTenantBlocked(t, now)).toBe(true)
  })

  it('prueba vencida pero plan pago vigente → no bloqueado', () => {
    const t = { trialEndsAt: now - DAY, planExpiresAt: now + 10 * DAY }
    expect(isTenantBlocked(t, now)).toBe(false)
  })

  it('prueba y plan vencidos → bloqueado', () => {
    const t = { trialEndsAt: now - 10 * DAY, planExpiresAt: now - DAY }
    expect(isTenantBlocked(t, now)).toBe(true)
  })

  it('tenant legacy sin trial_ends_at → nunca bloquea', () => {
    expect(isTenantBlocked({}, now)).toBe(false)
    expect(isInTrial({}, now)).toBe(false)
  })
})

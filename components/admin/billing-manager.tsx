'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"

type Plan = 'starter' | 'pro' | 'enterprise'

const PLANS: {
  key: Plan
  label: string
  price: string
  symbol: string
  description: string
  features: string[]
  cta: string
  highlight?: boolean
}[] = [
  {
    key: 'starter',
    label: 'Starter',
    price: 'Gratis',
    symbol: '◎',
    description: 'Para empezar sin compromisos.',
    features: ['Pedidos por mesa', 'KDS (cocina)', 'Menú QR', 'Hasta 5 mesas'],
    cta: 'Plan actual',
  },
  {
    key: 'pro',
    label: 'Pro',
    price: '$29 / mes',
    symbol: '⚡',
    description: 'Para restaurantes en crecimiento.',
    features: ['Todo de Starter', 'Analítica de ventas', 'Lista de espera', 'Notificaciones push', 'Reembolsos', 'Mesas ilimitadas'],
    cta: 'Suscribirse a Pro',
    highlight: true,
  },
  {
    key: 'enterprise',
    label: 'Enterprise',
    price: '$99 / mes',
    symbol: '⊞',
    description: 'Para cadenas y grupos.',
    features: ['Todo de Pro', 'Multi-sucursal', 'White label', 'Soporte prioritario', 'SLA garantizado'],
    cta: 'Suscribirse a Enterprise',
  },
]

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export function BillingManager() {
  const { tenantPlan } = useApp()
  const [loading, setLoading] = useState<Plan | 'portal' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUpgrade = async (plan: 'pro' | 'enterprise') => {
    setLoading(plan)
    setError(null)
    try {
      const token = await getToken()
      if (!token) { setError('Sin sesión activa'); return }
      const origin = window.location.origin
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ plan, successUrl: `${origin}/`, cancelUrl: `${origin}/` }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al crear sesión de pago'); return }
      window.location.href = data.url
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(null)
    }
  }

  const handlePortal = async () => {
    setLoading('portal')
    setError(null)
    try {
      const token = await getToken()
      if (!token) { setError('Sin sesión activa'); return }
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ returnUrl: window.location.origin }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al abrir portal'); return }
      window.open(data.url, '_blank')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: FONT }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 11, fontWeight: 900, color: '#111', textTransform: 'uppercase', letterSpacing: '.08em' }}>
          Plan &amp; Facturación
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6B7280' }}>
          Plan actual:{' '}
          <span style={{ fontWeight: 700, color: '#111', textTransform: 'capitalize' }}>{tenantPlan}</span>
        </p>
      </div>

      {error && (
        <div style={{ padding: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, fontSize: 12, color: '#EF4444' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
        {PLANS.map((plan) => {
          const isCurrent = tenantPlan === plan.key
          const isUpgrade = plan.key !== 'starter' && !isCurrent

          const borderColor = plan.highlight ? '#111' : isCurrent ? '#BEEBBE' : '#E5E5E5'

          return (
            <div
              key={plan.key}
              style={{
                position: 'relative', borderRadius: 14, border: `2px solid ${borderColor}`,
                padding: 20, display: 'flex', flexDirection: 'column', gap: 16, background: '#fff',
              }}
            >
              {plan.highlight && (
                <span style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 10, fontWeight: 700, background: '#111', color: '#fff',
                  padding: '2px 12px', borderRadius: 999, whiteSpace: 'nowrap',
                }}>
                  Más popular
                </span>
              )}
              {isCurrent && (
                <span style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 10, fontWeight: 700, background: '#BEEBBE', color: '#0a3a0a',
                  padding: '2px 12px', borderRadius: 999, whiteSpace: 'nowrap',
                }}>
                  Plan activo
                </span>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                    background: isCurrent ? '#D1FAE5' : '#F3F4F6',
                    color: isCurrent ? '#0a3a0a' : '#374151',
                  }}>
                    {plan.symbol}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111' }}>{plan.label}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>{plan.description}</p>
                  </div>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111' }}>{plan.price}</p>

              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#6B7280' }}>
                    <span style={{ color: '#059669', flexShrink: 0, marginTop: 1, fontWeight: 700 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                plan.key !== 'starter' ? (
                  <button
                    onClick={handlePortal}
                    disabled={loading === 'portal'}
                    style={{
                      width: '100%', height: 36, borderRadius: 10, border: '1px solid #E5E5E5',
                      background: '#fff', color: '#374151', fontSize: 12, fontWeight: 500,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      cursor: loading === 'portal' ? 'not-allowed' : 'pointer',
                      opacity: loading === 'portal' ? 0.5 : 1,
                      fontFamily: FONT,
                    }}
                  >
                    {loading === 'portal'
                      ? <><span style={{ fontSize: 24, color: '#CCC' }}>↻</span> Cargando…</>
                      : <><span>↗</span> Gestionar suscripción</>}
                  </button>
                ) : (
                  <div style={{ padding: '8px 0', textAlign: 'center', fontSize: 12, color: '#059669', fontWeight: 600 }}>
                    Plan activo
                  </div>
                )
              ) : isUpgrade ? (
                <button
                  onClick={() => handleUpgrade(plan.key as 'pro' | 'enterprise')}
                  disabled={!!loading}
                  style={{
                    width: '100%', height: 36, borderRadius: 10,
                    border: plan.highlight ? 'none' : '1px solid #E5E5E5',
                    background: plan.highlight ? '#111' : '#fff',
                    color: plan.highlight ? '#fff' : '#374151',
                    fontSize: 12, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                    fontFamily: FONT,
                  }}
                >
                  {loading === plan.key && <span style={{ fontSize: 24, color: '#CCC' }}>↻</span>}
                  {plan.cta}
                </button>
              ) : null}
            </div>
          )
        })}
      </div>

      <p style={{ margin: 0, fontSize: 10, color: '#9CA3AF', textAlign: 'center' }}>
        Los pagos son procesados de forma segura por Stripe. Podés cancelar en cualquier momento desde el portal de facturación.
      </p>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

interface Liquidacion {
  id: string
  period_start: string
  period_end: string
  bruto_cents: number
  comision_waitless_cents: number
  neto_cents: number
  transaction_count: number
  status: 'pendiente' | 'procesada' | 'fallida'
  stripe_transfer_id: string | null
  error_message: string | null
  created_at: string
  processed_at: string | null
}

function cents(n: number) {
  return `$${(n / 100).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(d: string) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getPrevWeek(): { periodStart: string; periodEnd: string } {
  const now = new Date()
  const dow = now.getUTCDay() === 0 ? 7 : now.getUTCDay()
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - dow + 1)
  monday.setUTCHours(0, 0, 0, 0)
  const prevMon = new Date(monday); prevMon.setUTCDate(monday.getUTCDate() - 7)
  const prevSun = new Date(monday); prevSun.setUTCDate(monday.getUTCDate() - 1)
  return {
    periodStart: prevMon.toISOString().split('T')[0],
    periodEnd:   prevSun.toISOString().split('T')[0],
  }
}

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  pendiente: { bg: '#FEF3C7', color: '#92400E', label: 'Pendiente' },
  procesada: { bg: '#BEEBBE', color: '#0a3a0a', label: 'Procesada' },
  fallida:   { bg: '#FEE2E2', color: '#991B1B', label: 'Fallida' },
}

export function LiquidacionView() {
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [genError, setGenError] = useState('')
  const [genSuccess, setGenSuccess] = useState(false)

  const { periodStart, periodEnd } = getPrevWeek()

  const fetchLiquidaciones = useCallback(async (tok: string) => {
    const res = await fetch('/api/admin/liquidacion', { headers: { Authorization: `Bearer ${tok}` } })
    if (res.ok) {
      const data = await res.json()
      setLiquidaciones(data.liquidaciones ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      setToken(session.access_token)
      fetchLiquidaciones(session.access_token)
    })
  }, [fetchLiquidaciones])

  const handleGenerate = async () => {
    if (!token || generating) return
    setGenerating(true); setGenError(''); setGenSuccess(false)
    const res = await fetch('/api/admin/liquidacion/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ periodStart, periodEnd }),
    })
    const data = await res.json()
    if (res.ok) {
      setGenSuccess(true)
      fetchLiquidaciones(token)
      setTimeout(() => setGenSuccess(false), 4000)
    } else {
      setGenError(data.error ?? 'Error generando liquidación')
    }
    setGenerating(false)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0', fontFamily: FONT }}>
        <span style={{ fontSize: 24, color: '#CCC' }}>↻</span>
      </div>
    )
  }

  const totalBruto    = liquidaciones.filter(l => l.status === 'procesada').reduce((s, l) => s + l.bruto_cents, 0)
  const totalNeto     = liquidaciones.filter(l => l.status === 'procesada').reduce((s, l) => s + l.neto_cents, 0)
  const totalComision = liquidaciones.filter(l => l.status === 'procesada').reduce((s, l) => s + l.comision_waitless_cents, 0)

  return (
    <div style={{ padding: 24, maxWidth: 720, fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Liquidaciones semanales</h2>
          <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Historial de transferencias de Waitless a tu cuenta bancaria.</p>
        </div>
        <button
          onClick={() => token && fetchLiquidaciones(token)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#999', padding: 4 }}
          title="Actualizar"
        >↻</button>
      </div>

      {/* Summary */}
      {liquidaciones.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
          {[
            { label: 'Bruto total',       value: cents(totalBruto),    accent: false },
            { label: 'Comisión Waitless', value: `-${cents(totalComision)}`, accent: false, red: true },
            { label: 'Neto recibido',     value: cents(totalNeto),     accent: true },
          ].map(({ label, value, accent, red }) => (
            <div key={label} style={{ background: accent ? '#F0FFF0' : '#fff', border: `1px solid ${accent ? '#BEEBBE' : '#E5E5E5'}`, borderRadius: 14, padding: 16, textAlign: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: MONO, color: accent ? '#0a3a0a' : red ? '#DC2626' : '#000' }}>{value}</p>
              <p style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Generate */}
      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>Semana anterior</p>
          <span style={{ fontSize: 12, color: '#999', fontFamily: MONO }}>{fmtDate(periodStart)} — {fmtDate(periodEnd)}</span>
        </div>
        {genError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#991B1B', background: '#FEE2E2', borderRadius: 10, padding: '8px 12px' }}>
            ⚠ {genError}
          </div>
        )}
        {genSuccess && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#0a3a0a', background: '#BEEBBE', borderRadius: 10, padding: '8px 12px' }}>
            ✓ Liquidación generada correctamente
          </div>
        )}
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{ width: '100%', height: 44, background: generating ? '#CCC' : '#000', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: generating ? 'default' : 'pointer', fontFamily: FONT }}
        >
          {generating ? '↻ Generando...' : '$ Generar liquidación'}
        </button>
        <p style={{ fontSize: 11, color: '#999', textAlign: 'center', margin: 0 }}>
          Las liquidaciones automáticas se generan cada lunes a las 3am UTC.
        </p>
      </div>

      {/* List */}
      {liquidaciones.length === 0 ? (
        <div style={{ border: '1px dashed #E5E5E5', borderRadius: 16, padding: '56px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 32, margin: '0 0 8px' }}>Ø</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#666', margin: 0 }}>Aún no hay liquidaciones</p>
          <p style={{ fontSize: 12, color: '#999', marginTop: 6 }}>Aparecerán aquí una vez que generes la primera.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {liquidaciones.map(liq => {
            const meta = STATUS_COLORS[liq.status] ?? STATUS_COLORS.pendiente
            const isOpen = expanded === liq.id
            return (
              <div key={liq.id} style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14, overflow: 'hidden' }}>
                <button
                  onClick={() => setExpanded(isOpen ? null : liq.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: FONT }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: meta.bg, color: meta.color, flexShrink: 0 }}>{meta.label}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fmtDate(liq.period_start)} — {fmtDate(liq.period_end)}
                    </p>
                    <p style={{ fontSize: 11, color: '#999', margin: '2px 0 0' }}>
                      {liq.transaction_count} transacción{liq.transaction_count !== 1 ? 'es' : ''}
                    </p>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0a3a0a', fontFamily: MONO, flexShrink: 0 }}>{cents(liq.neto_cents)}</span>
                  <span style={{ fontSize: 14, color: '#999', transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                </button>

                {isOpen && (
                  <div style={{ borderTop: '1px solid #F5F5F5', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, textAlign: 'center' }}>
                      {[
                        { label: 'Bruto', value: cents(liq.bruto_cents), color: '#000' },
                        { label: 'Comisión (5%)', value: `-${cents(liq.comision_waitless_cents)}`, color: '#DC2626' },
                        { label: 'Neto transferido', value: cents(liq.neto_cents), color: '#0a3a0a' },
                      ].map(({ label, value, color }) => (
                        <div key={label}>
                          <p style={{ fontSize: 11, color: '#999', margin: 0 }}>{label}</p>
                          <p style={{ fontSize: 13, fontWeight: 700, color, margin: '2px 0 0', fontFamily: MONO }}>{value}</p>
                        </div>
                      ))}
                    </div>
                    {liq.stripe_transfer_id && (
                      <p style={{ fontSize: 10, color: '#999', fontFamily: MONO, margin: 0 }}>Transfer: {liq.stripe_transfer_id}</p>
                    )}
                    {liq.error_message && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#991B1B', background: '#FEE2E2', borderRadius: 10, padding: '8px 12px' }}>
                        ⚠ {liq.error_message}
                      </div>
                    )}
                    {liq.processed_at && (
                      <p style={{ fontSize: 11, color: '#999', margin: 0 }}>Procesada: {new Date(liq.processed_at).toLocaleString('es')}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

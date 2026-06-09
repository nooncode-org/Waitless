'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { formatPrice, formatDateTime } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MINT = '#BEEBBE'
const MINT_DEEP = '#0a3a0a'

interface SalesEntry {
  id: string
  mesa: number
  token: string
  createdAt: string
  expiresAt: string
  usedAt: string | null
  estado: 'activo' | 'cerrado' | 'expirado'
  totalVendido: number
  pedidos: number
  orders: Array<{ id: string; numero: number; total: number; createdAt: string; status: string }>
}

const ESTADO_STYLE: Record<SalesEntry['estado'], { bg: string; color: string; label: string }> = {
  activo:   { bg: MINT,      color: MINT_DEEP, label: '✓ Activo' },
  cerrado:  { bg: '#EEF2FF', color: '#3730a3', label: '✓ Cerrado' },
  expirado: { bg: '#F3F4F6', color: '#6b7280', label: '○ Expirado' },
}

export function SalesHistoryManager() {
  const { currentUser } = useApp()
  const [entries, setEntries] = useState<SalesEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const limit = 20
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const qrImageUrl = (mesa: number, token: string, size = 240) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${baseUrl}/restaurante?mesa=${mesa}&token=${token}`
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=0&data=${encodeURIComponent(url)}`
  }

  const fetchHistory = useCallback(async (currentPage: number) => {
    setLoading(true); setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { setError('Sin sesión'); setLoading(false); return }
      const res = await fetch(`/api/admin/sales-history?page=${currentPage}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) { setError('Error al cargar el historial'); setLoading(false); return }
      const json = await res.json()
      setEntries(json.entries ?? [])
      setTotal(json.total ?? 0)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchHistory(page) }, [fetchHistory, page])

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
    return <p style={{ fontSize: 13, color: '#aaa', padding: 16, fontFamily: FONT }}>Sin acceso</p>
  }

  const totalGeneral = entries.reduce((s, e) => s + e.totalVendido, 0)

  return (
    <div style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`.sh-card{transition:box-shadow .15s,border-color .15s}.sh-card:hover{box-shadow:0 8px 28px rgba(0,0,0,.06);border-color:#dcdcdc}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: '#111', margin: 0, letterSpacing: '-0.02em' }}>Historial de ventas</h2>
          <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '3px 0 0' }}>Cada QR de mesa con su venta asociada</p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 999, border: '1px solid #E5E5E5', color: '#6b7280' }}>
          {total} QR · {formatPrice(totalGeneral)} en esta página
        </span>
      </div>

      {error && (
        <div style={{ fontSize: 12.5, color: '#c0392b', background: 'rgba(192,57,43,0.07)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 10, padding: '10px 14px' }}>{error}</div>
      )}

      {loading && entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af', fontSize: 13 }}>Cargando…</div>
      ) : entries.length === 0 ? (
        <div style={{ border: '1px solid #E5E5E5', borderRadius: 16, textAlign: 'center', padding: '56px 20px', color: '#9ca3af' }}>
          <div style={{ fontSize: 40, opacity: 0.25, marginBottom: 10 }}>◈</div>
          <p style={{ fontSize: 13, margin: 0, color: '#6b7280', fontWeight: 600 }}>Todavía no hay QR generados</p>
          <p style={{ fontSize: 12, margin: '4px 0 0' }}>Generá QR en “Mesas → Configuración” y acá verás cada venta.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {entries.map(e => {
            const est = ESTADO_STYLE[e.estado]
            const isOpen = expanded === e.id
            return (
              <div key={e.id} className="sh-card" style={{ border: '1px solid #E5E5E5', borderRadius: 16, background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: 12, padding: 14 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrImageUrl(e.mesa, e.token, 200)} alt={`QR Mesa ${e.mesa}`} width={72} height={72}
                    style={{ width: 72, height: 72, borderRadius: 10, border: '1px solid #EEE', flexShrink: 0, background: '#fff' }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: 0, letterSpacing: '-0.02em' }}>Mesa {e.mesa}</h3>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 999, background: est.bg, color: est.color, whiteSpace: 'nowrap' }}>{est.label}</span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#111', marginTop: 4, letterSpacing: '-0.02em' }}>{formatPrice(e.totalVendido)}</div>
                    <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 2 }}>
                      {e.pedidos} {e.pedidos === 1 ? 'pedido' : 'pedidos'} · {formatDateTime(new Date(e.createdAt))}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #F2F2F2', padding: '8px 14px', fontSize: 10.5, color: '#9ca3af', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span>Generado: {formatDateTime(new Date(e.createdAt))}</span>
                  <span>{e.usedAt ? `Cerrado: ${formatDateTime(new Date(e.usedAt))}` : `Expira: ${formatDateTime(new Date(e.expiresAt))}`}</span>
                </div>

                {e.pedidos > 0 && (
                  <>
                    <button onClick={() => setExpanded(isOpen ? null : e.id)}
                      style={{ border: 'none', borderTop: '1px solid #F2F2F2', background: '#fff', cursor: 'pointer', padding: '9px 14px', fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: '#374151', textAlign: 'left' }}>
                      {isOpen ? '▾ Ocultar pedidos' : '▸ Ver pedidos'}
                    </button>
                    {isOpen && (
                      <div style={{ padding: '4px 14px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {e.orders.map(o => (
                          <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#374151', borderBottom: '1px solid #F7F7F7', paddingBottom: 4 }}>
                            <span>#{o.numero} · {formatDateTime(new Date(o.createdAt))}</span>
                            <span style={{ fontWeight: 700 }}>{formatPrice(o.total)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading}
            style={{ height: 34, padding: '0 14px', borderRadius: 999, border: '1px solid #E5E5E5', background: '#fff', cursor: page <= 1 ? 'default' : 'pointer', fontFamily: FONT, fontSize: 12, opacity: page <= 1 ? 0.4 : 1 }}>← Anterior</button>
          <span style={{ fontSize: 12, color: '#6b7280' }}>Página {page} de {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}
            style={{ height: 34, padding: '0 14px', borderRadius: 999, border: '1px solid #E5E5E5', background: '#fff', cursor: page >= totalPages ? 'default' : 'pointer', fontFamily: FONT, fontSize: 12, opacity: page >= totalPages ? 0.4 : 1 }}>Siguiente →</button>
        </div>
      )}
    </div>
  )
}

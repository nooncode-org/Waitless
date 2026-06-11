'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Feedback } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"

function StarRow({ rating, total }: { rating: number; total: number }) {
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating)
  return stars
}

function StarDisplay({ filled, total = 5 }: { filled: number; total?: number }) {
  return (
    <span style={{ fontSize: 11, letterSpacing: 1 }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{ color: i < filled ? '#F59E0B' : '#E5E7EB' }}>★</span>
      ))}
    </span>
  )
}

export function FeedbackManager() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) {
          setFeedbackList(data.map(row => ({
            id: row.id,
            sessionId: row.session_id,
            mesa: row.mesa,
            rating: row.rating,
            comentario: row.comentario,
            createdAt: new Date(row.created_at),
          })))
        }
        setLoading(false)
      })
  }, [])

  const avgRating = feedbackList.length
    ? (feedbackList.reduce((s, f) => s + f.rating, 0) / feedbackList.length).toFixed(1)
    : '—'

  const distribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: feedbackList.filter(f => f.rating === star).length,
    pct: feedbackList.length
      ? Math.round((feedbackList.filter(f => f.rating === star).length / feedbackList.length) * 100)
      : 0,
  }))

  const promoters = feedbackList.filter(f => f.rating >= 4).length
  const nps = feedbackList.length
    ? Math.round((promoters / feedbackList.length) * 100)
    : 0

  const cardStyle: React.CSSProperties = {
    border: '1px solid #E5E5E5',
    borderRadius: 14,
    background: '#fff',
    padding: 16,
    textAlign: 'center',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720, fontFamily: FONT }}>
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 900, color: '#111', margin: 0 }}>Feedback de clientes</h2>
        <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
          {feedbackList.length} respuestas recibidas
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 20, color: '#F59E0B', marginBottom: 4 }}>★</div>
          <p style={{ fontSize: 26, fontWeight: 900, color: '#111', margin: 0 }}>{avgRating}</p>
          <p style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>Promedio</p>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 20, color: '#0a3a0a', marginBottom: 4 }}>↑</div>
          <p style={{ fontSize: 26, fontWeight: 900, color: '#111', margin: 0 }}>{nps}%</p>
          <p style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>Satisfechos (≥4★)</p>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 20, color: '#9CA3AF', marginBottom: 4 }}>◫</div>
          <p style={{ fontSize: 26, fontWeight: 900, color: '#111', margin: 0 }}>
            {feedbackList.filter(f => f.comentario).length}
          </p>
          <p style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>Con comentario</p>
        </div>
      </div>

      {/* Distribution */}
      <div style={{ border: '1px solid #E5E5E5', borderRadius: 14, background: '#fff', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6' }}>
          <p style={{ fontSize: 11, fontWeight: 900, color: '#111', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            Distribución
          </p>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {distribution.map(d => (
            <div key={d.star} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 64, flexShrink: 0 }}>
                <StarDisplay filled={d.star} />
              </div>
              <div style={{ flex: 1, height: 8, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%', background: '#111',
                    borderRadius: 99, width: `${d.pct}%`,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
              <span style={{ fontSize: 11, color: '#9CA3AF', width: 28, textAlign: 'right' }}>{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Comments */}
      <div style={{ border: '1px solid #E5E5E5', borderRadius: 14, background: '#fff', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6' }}>
          <p style={{ fontSize: 11, fontWeight: 900, color: '#111', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            Últimos comentarios
          </p>
        </div>
        <div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '32px 0' }}>
              <span style={{ fontSize: 24, color: '#CCC' }}>↻</span>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>Cargando...</p>
            </div>
          ) : feedbackList.filter(f => f.comentario).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: 36, color: '#D1D5DB' }}>Ø</div>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>Sin comentarios aún</p>
            </div>
          ) : (
            feedbackList.filter(f => f.comentario).slice(0, 20).map((f, idx) => (
              <div
                key={f.id}
                style={{
                  padding: '12px 16px',
                  borderTop: idx > 0 ? '1px solid #F3F4F6' : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <StarDisplay filled={f.rating} />
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                    Mesa {f.mesa} · {new Date(f.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#111', margin: 0 }}>{f.comentario}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'
import { formatPrice, formatDateTime, formatTime, type TableSession } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MINT = '#BEEBBE'
const MINT_DEEP = '#0a3a0a'

export function TableHistory() {
  const { tableSessions, tables } = useApp()
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [selectedSession, setSelectedSession] = useState<TableSession | null>(null)

  const activeTables = tables.filter(t => t.activa).sort((a, b) => a.numero - b.numero)

  const closedSessions = selectedTable !== null
    ? tableSessions
        .filter(s => s.mesa === selectedTable && !s.activa)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : []

  const card: React.CSSProperties = {
    border: '1px solid #E5E5E5',
    borderRadius: 14,
    background: '#fff',
  }

  const btnBack: React.CSSProperties = {
    fontFamily: FONT,
    height: 32,
    padding: '0 12px',
    borderRadius: 10,
    border: '1px solid #E5E5E5',
    background: '#fff',
    color: '#374151',
    fontSize: 12,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  }

  if (selectedSession) {
    return (
      <div style={{ padding: 12, fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setSelectedSession(null)} style={btnBack}>
            ← Regresar
          </button>
          <h2 style={{ fontFamily: FONT, fontSize: 13, fontWeight: 900, color: '#111', margin: 0 }}>Mesa {selectedSession.mesa} — Detalle de sesión</h2>
        </div>

        <div style={{ ...card, padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, fontSize: 12 }}>
            <div>
              <p style={{ color: '#9ca3af', margin: '0 0 2px' }}>Inicio</p>
              <p style={{ fontWeight: 500, color: '#111', margin: 0 }}>{formatDateTime(selectedSession.createdAt)}</p>
            </div>
            <div>
              <p style={{ color: '#9ca3af', margin: '0 0 2px' }}>Cierre</p>
              <p style={{ fontWeight: 500, color: '#111', margin: 0 }}>{selectedSession.paidAt ? formatDateTime(selectedSession.paidAt) : 'Sin pago registrado'}</p>
            </div>
            <div>
              <p style={{ color: '#9ca3af', margin: '0 0 2px' }}>Estado</p>
              <span style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 20,
                display: 'inline-block',
                marginTop: 2,
                background: selectedSession.paymentStatus === 'pagado' ? MINT + '55' : '#f3f4f6',
                color: selectedSession.paymentStatus === 'pagado' ? MINT_DEEP : '#9ca3af',
                border: selectedSession.paymentStatus === 'pagado' ? `1px solid ${MINT}` : '1px solid #E5E5E5',
              }}>
                {selectedSession.paymentStatus === 'pagado' ? '✓ Pagada' : 'Cerrada sin pago'}
              </span>
            </div>
            <div>
              <p style={{ color: '#9ca3af', margin: '0 0 2px' }}>Método de pago</p>
              <p style={{ fontWeight: 500, color: '#111', margin: 0 }}>
                {selectedSession.paymentMethod === 'tarjeta' ? 'Tarjeta' :
                 selectedSession.paymentMethod === 'efectivo' ? 'Efectivo' :
                 selectedSession.paymentMethod === 'transferencia' ? 'Transferencia' :
                 selectedSession.paymentMethod === 'apple_pay' ? 'Apple Pay' : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <h3 style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: '#111', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          ≡ Pedidos ({selectedSession.orders.length})
        </h3>

        {selectedSession.orders.length === 0 ? (
          <div style={{ border: '1px dashed #E5E5E5', borderRadius: 14, padding: '24px 0', textAlign: 'center' }}>
            <p style={{ fontFamily: FONT, fontSize: 12, color: '#9ca3af', margin: 0 }}>No hay pedidos registrados para esta sesión</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedSession.orders.map((order) => {
              const orderTotal = order.items.reduce((sum, item) => {
                const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
                return sum + (item.menuItem.precio + extrasTotal) * item.cantidad
              }, 0)
              return (
                <div key={order.id} style={{ ...card, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#111' }}>Pedido #{order.numero}</span>
                    <span style={{ fontFamily: FONT, fontSize: 10, color: '#9ca3af' }}>{formatTime(order.createdAt)}</span>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {order.items.map((item) => {
                      const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
                      return (
                        <li key={item.id} style={{ fontSize: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#111' }}>
                            <span>{item.cantidad}x {item.menuItem.nombre}</span>
                            <span style={{ color: '#9ca3af' }}>{formatPrice((item.menuItem.precio + extrasTotal) * item.cantidad)}</span>
                          </div>
                          {item.extras && item.extras.length > 0 && (
                            <div style={{ marginLeft: 12 }}>
                              {item.extras.map((extra) => (
                                <p key={extra.id} style={{ fontSize: 10, color: '#3b82f6', margin: 0 }}>+ {extra.nombre} (+{formatPrice(extra.precio)})</p>
                              ))}
                            </div>
                          )}
                          {item.notas && <p style={{ marginLeft: 12, fontSize: 10, color: '#9ca3af', fontStyle: 'italic', margin: '2px 0 0 12px' }}>{item.notas}</p>}
                        </li>
                      )
                    })}
                  </ul>
                  <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#111', borderTop: '1px dashed #E5E5E5', paddingTop: 4 }}>{formatPrice(orderTotal)}</div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ ...card, padding: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
              <span>Subtotal</span><span>{formatPrice(selectedSession.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
              <span>IVA</span><span>{formatPrice(selectedSession.impuestos)}</span>
            </div>
            {selectedSession.descuento > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: MINT_DEEP }}>
                <span>Descuento {selectedSession.descuentoMotivo ? `(${selectedSession.descuentoMotivo})` : ''}</span>
                <span>-{formatPrice(selectedSession.descuento)}</span>
              </div>
            )}
            {selectedSession.propina > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
                <span>Propina</span><span>{formatPrice(selectedSession.propina)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: '#111', paddingTop: 8, borderTop: '1px solid #E5E5E5' }}>
              <span>Total</span><span>{formatPrice(selectedSession.total)}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (selectedTable !== null) {
    return (
      <div style={{ padding: 12, fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setSelectedTable(null)} style={btnBack}>
            ← Mesas
          </button>
          <h2 style={{ fontFamily: FONT, fontSize: 13, fontWeight: 900, color: '#111', margin: 0 }}>Historial — Mesa {selectedTable}</h2>
          <span style={{ fontFamily: FONT, fontSize: 10, padding: '2px 8px', borderRadius: 20, border: '1px solid #E5E5E5', color: '#9ca3af' }}>
            {closedSessions.length} sesión{closedSessions.length !== 1 ? 'es' : ''}
          </span>
        </div>

        {closedSessions.length === 0 ? (
          <div style={{ border: '1px dashed #E5E5E5', borderRadius: 14, padding: '32px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 28, color: '#d1d5db', marginBottom: 12 }}>◎</div>
            <p style={{ fontFamily: FONT, fontSize: 13, color: '#9ca3af', margin: 0 }}>No hay sesiones pasadas para esta mesa</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {closedSessions.map((session) => {
              const orderCount = session.orders.length
              const itemCount = session.orders.reduce((sum, o) => sum + o.items.length, 0)
              return (
                <div
                  key={session.id}
                  style={{ ...card, padding: 12, cursor: 'pointer' }}
                  onClick={() => setSelectedSession(session)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ color: '#9ca3af', fontSize: 11 }}>◎</span>
                        <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: '#111' }}>{formatDateTime(session.createdAt)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: '#9ca3af' }}>
                        <span>{orderCount} pedido{orderCount !== 1 ? 's' : ''}</span>
                        <span>{itemCount} ítem{itemCount !== 1 ? 's' : ''}</span>
                        {session.paymentMethod && (
                          <span>
                            ◈ {session.paymentMethod === 'tarjeta' ? 'Tarjeta' : session.paymentMethod === 'efectivo' ? 'Efectivo' : 'Apple Pay'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#111', margin: 0 }}>{formatPrice(session.total)}</p>
                        <span style={{
                          fontSize: 9,
                          padding: '2px 8px',
                          borderRadius: 20,
                          display: 'inline-block',
                          marginTop: 2,
                          background: session.paymentStatus === 'pagado' ? MINT + '55' : '#f3f4f6',
                          color: session.paymentStatus === 'pagado' ? MINT_DEEP : '#9ca3af',
                          border: session.paymentStatus === 'pagado' ? `1px solid ${MINT}` : '1px solid #E5E5E5',
                        }}>
                          {session.paymentStatus === 'pagado' ? '✓ Pagada' : 'Cerrada'}
                        </span>
                      </div>
                      <span style={{ fontSize: 14, color: '#9ca3af' }}>→</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 14, color: '#6b7280' }}>◎</span>
        <h2 style={{ fontFamily: FONT, fontSize: 13, fontWeight: 900, color: '#111', margin: 0 }}>Historial por mesa</h2>
      </div>
      <p style={{ fontFamily: FONT, fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Selecciona una mesa para ver el historial de sesiones pasadas.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
        {activeTables.map((table) => {
          const sessionCount = tableSessions.filter(s => s.mesa === table.numero && !s.activa).length
          const totalRevenue = tableSessions
            .filter(s => s.mesa === table.numero && !s.activa && s.paymentStatus === 'pagado')
            .reduce((sum, s) => sum + s.total, 0)
          return (
            <div
              key={table.id}
              style={{ ...card, padding: 12, textAlign: 'center', cursor: 'pointer' }}
              onClick={() => setSelectedTable(table.numero)}
            >
              <p style={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, color: '#111', margin: 0 }}>{table.numero}</p>
              <p style={{ fontFamily: FONT, fontSize: 10, color: '#9ca3af', margin: '2px 0 8px' }}>Mesa</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <p style={{ fontFamily: FONT, fontSize: 10, color: '#9ca3af', margin: 0 }}>{sessionCount} sesión{sessionCount !== 1 ? 'es' : ''}</p>
                {totalRevenue > 0 && <p style={{ fontFamily: FONT, fontSize: 10, fontWeight: 500, color: MINT_DEEP, margin: 0 }}>{formatPrice(totalRevenue)}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

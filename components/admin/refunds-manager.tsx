'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'
import { RefundDialog } from '@/components/shared/refund-dialog'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MINT = '#BEEBBE'
const MINT_DEEP = '#0a3a0a'

export function RefundsManager() {
  const { refunds, orders, users, currentUser } = useApp()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrderForRefund, setSelectedOrderForRefund] = useState<string | null>(null)
  const canProcessRefund = currentUser?.role === 'admin'

  const formatPrice = (price: number) => `$${price.toFixed(2)}`

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  const getOrderNumber = (orderId: string) => orders.find(o => o.id === orderId)?.numero || 'N/A'
  const getUserName = (userId: string) => users.find(u => u.id === userId)?.nombre || 'Sistema'

  const filteredRefunds = refunds.filter(refund => {
    if (!searchTerm) return true
    return getOrderNumber(refund.orderId).toString().includes(searchTerm) ||
           refund.motivo.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const sortedRefunds = [...filteredRefunds].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const totalRefunded = refunds.reduce((sum, r) => sum + r.monto, 0)
  const today = new Date()
  const refundedToday = refunds
    .filter(r => new Date(r.createdAt).toDateString() === today.toDateString())
    .reduce((sum, r) => sum + r.monto, 0)

  const refundableOrders = orders.filter(o =>
    o.status === 'entregado' && !refunds.some(r => r.orderId === o.id && r.tipo === 'total')
  )

  const selectedOrder = selectedOrderForRefund ? orders.find(o => o.id === selectedOrderForRefund) : null

  const card: React.CSSProperties = {
    border: '1px solid #E5E5E5',
    borderRadius: 14,
    background: '#fff',
    overflow: 'hidden',
  }

  const statIconStyle = (bg: string): React.CSSProperties => ({
    padding: '6px',
    borderRadius: 10,
    background: bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    flexShrink: 0,
  })

  return (
    <div style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { icon: '↺', iconColor: '#d97706', bg: '#fef3c7', label: 'Total Reembolsos', value: String(refunds.length) },
          { icon: '$', iconColor: '#dc2626', bg: '#fee2e2', label: 'Monto Total', value: formatPrice(totalRefunded) },
          { icon: '◎', iconColor: '#2563eb', bg: '#dbeafe', label: 'Hoy', value: formatPrice(refundedToday) },
        ].map(stat => (
          <div key={stat.label} style={{ ...card, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ ...statIconStyle(stat.bg), color: stat.iconColor }}>{stat.icon}</div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontFamily: FONT, fontSize: 10, color: '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stat.label}</p>
                <p style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: '#111', margin: 0 }}>{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!canProcessRefund && (
        <div style={{ border: '1px solid #fcd34d', background: '#fffbeb', borderRadius: 14, padding: 12 }}>
          <p style={{ fontFamily: FONT, fontSize: 12, color: '#b45309', fontWeight: 500, margin: 0 }}>Solo el administrador puede procesar reembolsos.</p>
        </div>
      )}

      {refundableOrders.length > 0 && canProcessRefund && (
        <div style={card}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #E5E5E5' }}>
            <p style={{ fontFamily: FONT, fontSize: 12, fontWeight: 900, color: '#111', margin: 0 }}>Procesar Nuevo Reembolso</p>
          </div>
          <div style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {refundableOrders.slice(0, 10).map(order => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrderForRefund(order.id)}
                  style={{
                    height: 32,
                    padding: '0 12px',
                    borderRadius: 10,
                    border: '1px solid #E5E5E5',
                    background: '#fff',
                    color: '#374151',
                    fontFamily: FONT,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  #{order.numero}
                </button>
              ))}
              {refundableOrders.length > 10 && (
                <span style={{ fontFamily: FONT, fontSize: 12, color: '#9ca3af', alignSelf: 'center' }}>+{refundableOrders.length - 10} más</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9ca3af', pointerEvents: 'none' }}>⊞</span>
        <input
          placeholder="Buscar por número de pedido o motivo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            fontFamily: FONT,
            fontSize: 13,
            height: 38,
            border: '1px solid #E5E5E5',
            borderRadius: 10,
            padding: '0 10px 0 32px',
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box',
            background: '#fff',
          }}
        />
      </div>

      {/* Table */}
      <div style={card}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E5E5' }}>
                {['Pedido', 'Tipo', 'Monto', 'Motivo', 'Procesado por', 'Fecha', 'Inventario'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontFamily: FONT, fontWeight: 600, color: '#9ca3af', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRefunds.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px 0', fontFamily: FONT, color: '#9ca3af' }}>Ø No hay reembolsos registrados</td>
                </tr>
              ) : (
                sortedRefunds.map(refund => (
                  <tr key={refund.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '10px 16px', fontFamily: FONT, fontWeight: 500, color: '#111' }}>#{getOrderNumber(refund.orderId)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 20,
                        background: refund.tipo === 'total' ? '#fee2e2' : '#f3f4f6',
                        color: refund.tipo === 'total' ? '#dc2626' : '#6b7280',
                      }}>
                        {refund.tipo === 'total' ? 'Total' : 'Parcial'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', fontFamily: FONT, fontWeight: 500, color: '#dc2626' }}>-{formatPrice(refund.monto)}</td>
                    <td style={{ padding: '10px 16px', maxWidth: 200 }}>
                      <p style={{ fontFamily: FONT, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={refund.motivo}>{refund.motivo}</p>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT, color: '#374151' }}>
                        <span style={{ color: '#9ca3af' }}>◉</span>{getUserName(refund.userId)}
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', fontFamily: FONT, color: '#9ca3af' }}>{formatDate(refund.createdAt)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      {refund.inventarioRevertido ? (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, border: `1px solid ${MINT}`, color: MINT_DEEP, display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content', background: MINT + '44' }}>
                          ◈ Revertido
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, border: '1px solid #fcd34d', color: '#d97706' }}>Pendiente</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <RefundDialog order={selectedOrder} open={!!selectedOrderForRefund} onOpenChange={(open) => !open && setSelectedOrderForRefund(null)} />
      )}
    </div>
  )
}

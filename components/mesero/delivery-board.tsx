'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'
import { formatPrice, getChannelLabel, getStatusLabel, getTimeDiff, orderTotal } from '@/lib/store'
import { notifyConsumerDelivery } from '@/lib/push-triggers'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

export function DeliveryBoard() {
  const { orders, users, updateOrderStatus, assignRepartidor } = useApp()
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [selectedRepartidor, setSelectedRepartidor] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyTrackingLink = (orderId: string) => {
    const url = `${window.location.origin}/tracking/${orderId}`
    navigator.clipboard.writeText(url)
    setCopiedId(orderId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const deliveryStaff = users.filter(u =>
    u.activo && (u.role === 'repartidor' || u.role === 'mesero' || u.role === 'manager')
  )

  const pendingOrders = orders.filter(o =>
    o.status !== 'entregado' &&
    (o.canal === 'mesa' || o.canal === 'para_llevar' || o.canal === 'delivery' || o.canal === 'mesero')
  ).sort((a, b) => {
    if (a.status === 'listo' && b.status !== 'listo') return -1
    if (b.status === 'listo' && a.status !== 'listo') return 1
    if (a.status === 'en_camino' && b.status !== 'en_camino') return -1
    if (b.status === 'en_camino' && a.status !== 'en_camino') return 1
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  const handleMarkDelivered = (orderId: string) => {
    updateOrderStatus(orderId, 'entregado')
    notifyConsumerDelivery(orderId, 'entregado')
  }
  // Asigna el repartidor y deja el pedido en "listo". El repartidor marca el
  // retiro (en camino) desde su propia vista — no lo forzamos acá.
  const handleConfirmRepartidor = (orderId: string) => {
    if (!selectedRepartidor) return
    assignRepartidor(orderId, selectedRepartidor)
    setAssigningId(null)
    setSelectedRepartidor('')
  }

  const readyCount     = pendingOrders.filter(o => o.status === 'listo').length
  const preparingCount = pendingOrders.filter(o => o.status === 'preparando').length
  const enCaminoCount  = pendingOrders.filter(o => o.status === 'en_camino').length

  return (
    <div style={{ padding: 16, fontFamily: FONT }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Listos',     value: readyCount,     color: '#BEEBBE', textColor: '#0a3a0a' },
          { label: 'En camino',  value: enCaminoCount,  color: '#000', textColor: '#fff' },
          { label: 'Preparando', value: preparingCount, color: '#FEF3C7', textColor: '#92400E' },
          { label: 'Total',      value: pendingOrders.length, color: '#FAFAFA', textColor: '#333' },
        ].map(({ label, value, color, textColor }) => (
          <div key={label} style={{ background: color, borderRadius: 12, padding: '10px 6px', textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: textColor, margin: 0, fontFamily: MONO, lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: 10, fontWeight: 600, color: textColor, margin: '4px 0 0', opacity: 0.8 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Title */}
      <p style={{ fontSize: 12, fontWeight: 700, color: '#333', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
        Tablero de entregas
      </p>

      {pendingOrders.length === 0 ? (
        <div style={{ border: '1px dashed #E5E5E5', borderRadius: 16, padding: '48px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 32, margin: '0 0 8px' }}>Ø</p>
          <p style={{ fontSize: 14, color: '#999', fontWeight: 600, margin: 0 }}>Sin órdenes pendientes</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {pendingOrders.map((order) => {
            const isReady     = order.status === 'listo'
            const isEnCamino  = order.status === 'en_camino'
            const allKitchensReady = order.cocinaStatus === 'listo'
            const isDelivery  = order.canal === 'delivery'
            const isAssigning = assigningId === order.id
            const repartidorUser = order.repartidorId ? users.find(u => u.id === order.repartidorId) : null

            const total = orderTotal(order)

            const cardBg =
              isReady     ? '#F0FFF0' :
              isEnCamino  ? '#FAFAFA' :
              '#fff'
            const cardBorder =
              isReady     ? '#BEEBBE' :
              isEnCamino  ? '#CCC' :
              '#E5E5E5'

            return (
              <div key={order.id} style={{ border: `1px solid ${cardBorder}`, borderRadius: 16, background: cardBg, overflow: 'hidden' }}>
                {/* Card header */}
                <div style={{ padding: '12px 14px 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, margin: 0, fontFamily: MONO }}>#{order.numero}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span style={{
                          fontSize: 10, padding: '2px 7px', borderRadius: 999,
                          border: `1px solid ${order.canal === 'delivery' ? '#CCC' : order.canal === 'para_llevar' ? '#FCD34D' : '#E5E5E5'}`,
                          color: order.canal === 'para_llevar' ? '#92400E' : '#666',
                        }}>
                          {order.canal === 'delivery' ? '↑ ' : order.canal === 'para_llevar' ? '◫ ' : ''}{getChannelLabel(order.canal)}
                        </span>
                        {order.mesa && (
                          <span style={{ fontSize: 10, color: '#999' }}>Mesa {order.mesa}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: 10, padding: '3px 8px', borderRadius: 999, fontWeight: 700,
                        background: isReady ? '#BEEBBE' : isEnCamino ? '#000' : order.status === 'preparando' ? '#FEF3C7' : '#F5F5F5',
                        color: isReady ? '#0a3a0a' : isEnCamino ? '#fff' : order.status === 'preparando' ? '#92400E' : '#666',
                      }}>
                        {isEnCamino ? 'En camino' : getStatusLabel(order.status)}
                      </span>
                      <p style={{ fontSize: 10, color: '#999', margin: '4px 0 0', fontFamily: MONO }}>
                        ⏱ {getTimeDiff(order.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '0 14px 14px' }}>
                  {/* Customer info */}
                  {(isDelivery || order.canal === 'para_llevar') && order.nombreCliente && (
                    <div style={{ background: '#F5F5F5', borderRadius: 8, padding: '8px 10px', marginBottom: 8, fontSize: 12 }}>
                      <p style={{ fontWeight: 700, margin: 0 }}>{order.nombreCliente}</p>
                      {order.telefono && <p style={{ color: '#666', margin: '2px 0 0' }}>☎ {order.telefono}</p>}
                      {order.direccion && <p style={{ color: '#666', margin: '2px 0 0' }}>⊙ {order.direccion}</p>}
                      {order.zonaReparto && (
                        <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, background: '#E5E5E5', color: '#555', padding: '2px 7px', borderRadius: 999 }}>{order.zonaReparto}</span>
                      )}
                    </div>
                  )}

                  {/* Repartidor */}
                  {isEnCamino && repartidorUser && (
                    <p style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>◎ {repartidorUser.nombre}</p>
                  )}

                  {/* Items */}
                  <ul style={{ margin: '0 0 8px', padding: 0, listStyle: 'none' }}>
                    {order.items.map(item => (
                      <li key={item.id} style={{ fontSize: 12, color: '#333', lineHeight: '1.5' }}>
                        {item.cantidad}× {item.menuItem.nombre}
                      </li>
                    ))}
                  </ul>

                  {/* Total */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)', marginBottom: 8 }}>
                    <span style={{ color: '#999' }}>Total</span>
                    <span style={{ fontWeight: 700, fontFamily: MONO }}>{formatPrice(total)}</span>
                  </div>

                  {/* Kitchen status */}
                  {!isEnCamino && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <span style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 6,
                        background: order.cocinaStatus === 'listo' ? '#BEEBBE' : order.cocinaStatus === 'preparando' ? '#FEF3C7' : '#F5F5F5',
                        color: order.cocinaStatus === 'listo' ? '#0a3a0a' : order.cocinaStatus === 'preparando' ? '#92400E' : '#666',
                      }}>
                        Cocina: {order.cocinaStatus === 'listo' ? 'Listo' : order.cocinaStatus === 'preparando' ? 'Prep.' : 'Cola'}
                      </span>
                      {!allKitchensReady && (
                        <span style={{ fontSize: 10, color: '#999' }}>⚠ Esperando</span>
                      )}
                    </div>
                  )}

                  {/* CTA: asignar / esperando retiro / entregar */}
                  {allKitchensReady && isReady && !isAssigning && (
                    isDelivery ? (
                      order.repartidorId ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <p style={{ fontSize: 11, color: '#666', margin: 0 }}>◎ {repartidorUser?.nombre ?? 'Repartidor'} · esperando retiro</p>
                          <button
                            onClick={() => copyTrackingLink(order.id)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '6px 0', border: '1px dashed #CCC', borderRadius: 8, background: 'transparent', fontSize: 11, cursor: 'pointer', fontFamily: FONT, color: copiedId === order.id ? '#0a3a0a' : '#999' }}
                          >
                            {copiedId === order.id ? '✓ Link copiado' : '⎘ Copiar link de tracking'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAssigningId(order.id); setSelectedRepartidor('') }}
                          style={{ width: '100%', height: 36, borderRadius: 8, border: 'none', background: '#000', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}
                        >
                          ◎ Asignar repartidor
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => handleMarkDelivered(order.id)}
                        style={{ width: '100%', height: 36, borderRadius: 8, border: 'none', background: '#BEEBBE', color: '#0a3a0a', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}
                      >
                        ✓ {order.canal === 'para_llevar' ? 'Entregar' : 'Entregado'}
                      </button>
                    )
                  )}

                  {/* Assign repartidor panel */}
                  {isAssigning && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>Asignar repartidor</p>
                      <select
                        value={selectedRepartidor}
                        onChange={e => setSelectedRepartidor(e.target.value)}
                        style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid #E5E5E5', background: '#fff', fontSize: 13, fontFamily: FONT, padding: '0 8px', outline: 'none' }}
                      >
                        <option value="">Seleccioná quién lleva</option>
                        {deliveryStaff.map(u => (
                          <option key={u.id} value={u.id}>{u.nombre}</option>
                        ))}
                      </select>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => { setAssigningId(null); setSelectedRepartidor('') }}
                          style={{ flex: 1, height: 34, borderRadius: 8, border: '1px solid #E5E5E5', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, color: '#333' }}
                        >
                          Cancelar
                        </button>
                        <button
                          disabled={!selectedRepartidor}
                          onClick={() => handleConfirmRepartidor(order.id)}
                          style={{ flex: 1, height: 34, borderRadius: 8, border: 'none', background: !selectedRepartidor ? '#CCC' : '#000', color: '#fff', fontSize: 12, fontWeight: 700, cursor: !selectedRepartidor ? 'default' : 'pointer', fontFamily: FONT }}
                        >
                          ↑ Salir
                        </button>
                      </div>
                    </div>
                  )}

                  {/* En camino actions */}
                  {isEnCamino && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {isDelivery && (
                        <button
                          onClick={() => copyTrackingLink(order.id)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '6px 0', border: '1px dashed #CCC', borderRadius: 8, background: 'transparent', fontSize: 11, cursor: 'pointer', fontFamily: FONT, color: copiedId === order.id ? '#0a3a0a' : '#999' }}
                        >
                          {copiedId === order.id ? '✓ Link copiado' : '⎘ Copiar link de tracking'}
                        </button>
                      )}
                      <button
                        onClick={() => handleMarkDelivered(order.id)}
                        style={{ width: '100%', height: 36, borderRadius: 8, border: 'none', background: '#BEEBBE', color: '#0a3a0a', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}
                      >
                        ✓ Entregado
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

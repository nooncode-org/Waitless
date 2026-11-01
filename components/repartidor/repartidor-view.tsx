'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'
import { formatPrice, getTimeDiff, formatTime, orderTotal } from '@/lib/store'
import { notifyConsumerDelivery } from '@/lib/push-triggers'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

interface RepartidorViewProps {
  onBack: () => void
}

export function RepartidorView({ onBack }: RepartidorViewProps) {
  const { orders, currentUser, updateOrderStatus, config } = useApp()
  const [tab, setTab] = useState<'pendiente' | 'completado'>('pendiente')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  if (!currentUser) return null

  const myOrders = orders.filter(
    o => o.canal === 'delivery' && o.repartidorId === currentUser.id
  )

  const pendingOrders = myOrders.filter(
    o => o.status !== 'entregado' && o.status !== 'cancelado'
  ).sort((a, b) => {
    if (a.status === 'en_camino' && b.status !== 'en_camino') return -1
    if (b.status === 'en_camino' && a.status !== 'en_camino') return 1
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  const completedOrders = myOrders.filter(o => o.status === 'entregado')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 20)

  const activeList = tab === 'pendiente' ? pendingOrders : completedOrders
  const selectedOrder = selectedOrderId ? myOrders.find(o => o.id === selectedOrderId) : null

  // Total real a cobrar (incluye envío/impuestos/propina si el pedido los persistió).
  const getTotal = (order: typeof myOrders[0]) => orderTotal(order)

  const getStatusStep = (status: string): number => {
    if (status === 'listo') return 1
    if (status === 'en_camino') return 2
    if (status === 'entregado') return 3
    return 0
  }

  const btnBase: React.CSSProperties = {
    fontFamily: FONT, border: 'none', cursor: 'pointer', borderRadius: 999,
    fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  }

  const initials = currentUser.nombre
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F5', display: 'flex', flexDirection: 'column', fontFamily: FONT }}>

      {/* ─── Header ─── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff', borderBottom: '1px solid #E5E5E5', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, letterSpacing: '-0.03em', fontSize: 15, flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ lineHeight: 1.15, flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser.nombre} · Repartidor
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, color: '#909090' }}>
              {config.restaurantName ?? 'Waitless'}
            </div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, background: '#BEEBBE', color: '#0a3a0a', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            En turno
            <div style={{ width: 32, height: 18, background: '#0a3a0a', borderRadius: 999, position: 'relative', flexShrink: 0 }}>
              <div style={{ position: 'absolute', right: 2, top: 2, width: 14, height: 14, background: '#BEEBBE', borderRadius: 50 }} />
            </div>
          </div>
          <button onClick={onBack} style={{ height: 36, padding: '0 12px', background: '#F0F0F0', border: 'none', borderRadius: 999, color: '#666', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, flexShrink: 0 }}>
            ← Salir
          </button>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
          {[
            { label: 'Pendientes', value: pendingOrders.length, accent: false },
            { label: 'Entregados hoy', value: completedOrders.length, accent: true },
            { label: 'En camino', value: pendingOrders.filter(o => o.status === 'en_camino').length, accent: false },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: kpi.accent ? '#BEEBBE' : '#F7F7F5', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-0.04em', color: kpi.accent ? '#0a3a0a' : '#000', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontFamily: MONO, fontSize: 9.5, color: kpi.accent ? '#0a3a0a' : '#909090', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{kpi.label}</div>
            </div>
          ))}
        </div>
      </header>

      {/* ─── Tab bar ─── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E5E5', display: 'flex' }}>
        {([
          { id: 'pendiente' as const, label: 'Activos', count: pendingOrders.length },
          { id: 'completado' as const, label: 'Historial', count: completedOrders.length },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: FONT, background: 'transparent', color: tab === t.id ? '#000' : '#909090', borderBottom: `2px solid ${tab === t.id ? '#000' : 'transparent'}` }}>
            {t.label}
            {t.count > 0 && (
              <span style={{ marginLeft: 6, fontFamily: MONO, fontSize: 10, fontWeight: 700, background: tab === t.id ? '#000' : '#E5E5E5', color: tab === t.id ? '#fff' : '#666', padding: '1px 6px', borderRadius: 999 }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Order list ─── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {activeList.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, letterSpacing: '-0.06em', fontSize: 70, color: 'rgba(0,0,0,0.08)', lineHeight: 1 }}>Ø</div>
            <div style={{ fontWeight: 700, letterSpacing: '-0.04em', fontSize: 22, marginTop: 14 }}>
              {tab === 'pendiente' ? 'Sin entregas asignadas' : 'Sin historial hoy'}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 11.5, color: '#909090', marginTop: 6 }}>
              {tab === 'pendiente' ? 'Las órdenes de delivery aparecen acá cuando te son asignadas.' : 'Las entregas completadas se muestran acá.'}
            </div>
          </div>
        ) : tab === 'completado' ? (
          /* ── Historial view (2C) ── */
          <>
            {completedOrders.map((order, i) => (
              <div key={order.id} style={{ display: 'grid', gridTemplateColumns: '50px 1fr auto', gap: 10, alignItems: 'baseline', padding: '11px 0', borderBottom: i < completedOrders.length - 1 ? '1px solid #EFEFEF' : 'none' }}>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700 }}>#{order.numero}</span>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.02em' }}>
                    {order.nombreCliente ?? 'Cliente'}
                    {order.direccion ? ` · ${order.direccion.split('·')[0]?.trim() ?? ''}` : ''}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: '#909090', marginTop: 1 }}>{formatTime(order.updatedAt)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, letterSpacing: '-0.03em', fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>{formatPrice(getTotal(order))}</div>
                  <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, background: '#BEEBBE', color: '#0a3a0a', padding: '2px 6px', borderRadius: 999, display: 'inline-block', marginTop: 2 }}>Entregada</span>
                </div>
              </div>
            ))}
            {/* Day total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '18px 16px', background: '#000', color: '#fff', borderRadius: 14, marginTop: 8 }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.7 }}>Total turno</div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, opacity: 0.55, marginTop: 2 }}>{completedOrders.length} entregas</div>
              </div>
              <div style={{ fontWeight: 700, letterSpacing: '-0.05em', fontSize: 36, fontVariantNumeric: 'tabular-nums' }}>
                {formatPrice(completedOrders.reduce((s, o) => s + getTotal(o), 0))}
              </div>
            </div>
          </>
        ) : (
          /* ── Active orders (2A cards) ── */
          activeList.map(order => {
            const isEnCamino = order.status === 'en_camino'
            const isListo = order.status === 'listo'
            const isDone = order.status === 'entregado'
            const total = getTotal(order)

            return (
              <div key={order.id} style={{ background: isEnCamino ? '#000' : '#fff', border: `1px solid ${isEnCamino ? '#000' : isListo ? '#BEEBBE' : '#E5E5E5'}`, borderRadius: 14, padding: 14, cursor: 'pointer' }}
                onClick={() => setSelectedOrderId(order.id)}>
                {/* Card head */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 700, letterSpacing: '-0.04em', fontSize: 20, color: isEnCamino ? '#fff' : '#000' }}>#{order.numero}</span>
                  <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 14, color: isEnCamino ? 'rgba(255,255,255,0.85)' : '#000' }}>{formatPrice(total)}</span>
                </div>

                <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 6, color: isEnCamino ? '#fff' : '#000' }}>
                  {config.restaurantName ?? 'Restaurante'}
                </div>

                {order.direccion && (
                  <div style={{ fontFamily: MONO, fontSize: 11.5, color: isEnCamino ? 'rgba(255,255,255,0.6)' : '#909090', marginTop: 2, lineHeight: 1.45 }}>
                    → {order.direccion}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 14, marginTop: 12, fontFamily: MONO, fontSize: 11 }}>
                  {order.nombreCliente && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.16em', color: isEnCamino ? 'rgba(255,255,255,0.55)' : '#909090' }}>Cliente</span>
                      <span style={{ fontWeight: 700, color: isEnCamino ? '#fff' : '#000' }}>{order.nombreCliente}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.16em', color: isEnCamino ? 'rgba(255,255,255,0.55)' : '#909090' }}>Tiempo</span>
                    <span style={{ fontWeight: 700, color: isEnCamino ? '#fff' : '#000' }}>{getTimeDiff(order.createdAt)}</span>
                  </div>
                </div>

                {/* CTA */}
                {!isDone && (
                  <div style={{ marginTop: 14 }}>
                    {isListo && (
                      <button
                        onClick={e => { e.stopPropagation(); updateOrderStatus(order.id, 'en_camino'); notifyConsumerDelivery(order.id, 'en_camino') }}
                        style={{ ...btnBase, width: '100%', height: 48, fontSize: 14, background: '#BEEBBE', color: '#0a3a0a' }}
                      >
                        Ir a retirar →
                      </button>
                    )}
                    {isEnCamino && (
                      <button
                        onClick={e => { e.stopPropagation(); updateOrderStatus(order.id, 'entregado'); notifyConsumerDelivery(order.id, 'entregado') }}
                        style={{ ...btnBase, width: '100%', height: 48, fontSize: 14, background: '#BEEBBE', color: '#0a3a0a' }}
                      >
                        Confirmar entrega →
                      </button>
                    )}
                    {order.status !== 'listo' && order.status !== 'en_camino' && (
                      <div style={{ textAlign: 'center', padding: '8px 0', fontFamily: MONO, fontSize: 11, color: '#909090' }}>
                        Esperando que cocina marque el pedido como listo
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ─── Order detail overlay (2B) ─── */}
      {selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#fff', overflowY: 'auto', fontFamily: FONT }}>
          {/* Back nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 6px', borderBottom: '1px solid #EFEFEF', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
            <button onClick={() => setSelectedOrderId(null)}
              style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #E5E5E5', background: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ←
            </button>
            <span style={{ fontFamily: MONO, fontSize: 11, color: '#909090', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Orden #{selectedOrder.numero}</span>
          </div>

          {/* Status + timing */}
          <div style={{ padding: '10px 16px 16px' }}>
            <div style={{ fontWeight: 700, letterSpacing: '-0.04em', fontSize: 30, lineHeight: 1 }}>
              {selectedOrder.status === 'listo' ? 'Lista para retiro' :
               selectedOrder.status === 'en_camino' ? 'En camino' :
               selectedOrder.status === 'entregado' ? 'Entregada' : 'Asignada'}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: '#909090', marginTop: 4 }}>
              {getTimeDiff(selectedOrder.createdAt)}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 14, background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14, margin: '0 16px 14px' }}>
            {['Asign.', 'Retiro', 'Camino', 'Entrega'].map((label, i) => {
              const step = getStatusStep(selectedOrder.status)
              const done = i < step
              const live = i === step
              return (
                <>
                  <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: done ? '#000' : live ? '#BEEBBE' : '#fff', border: `2px solid ${done ? '#000' : live ? '#BEEBBE' : 'rgba(0,0,0,0.15)'}` }} />
                    <span style={{ fontFamily: MONO, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.14em', color: done || live ? '#000' : '#909090', fontWeight: 700, textAlign: 'center' }}>{label}</span>
                  </div>
                  {i < 3 && (
                    <div key={`conn-${i}`} style={{ flex: 1, height: 2, background: done ? '#000' : 'rgba(0,0,0,0.12)', marginBottom: 14 }} />
                  )}
                </>
              )
            })}
          </div>

          {/* Pickup address */}
          <div style={{ padding: '14px 16px', borderBottom: '1px dashed rgba(0,0,0,0.12)' }}>
            <div style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#909090', fontWeight: 700, marginBottom: 6 }}>Origen · retiro</div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>{config.restaurantName ?? 'Restaurante'}</div>
            <div style={{ fontFamily: MONO, fontSize: 11.5, color: '#909090', marginTop: 2 }}>Mostrador de pedidos</div>
          </div>

          {/* Delivery address */}
          {(selectedOrder.direccion || selectedOrder.nombreCliente) && (
            <div style={{ padding: '14px 16px', borderBottom: '1px dashed rgba(0,0,0,0.12)' }}>
              <div style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#909090', fontWeight: 700, marginBottom: 6 }}>Destino · entrega</div>
              {selectedOrder.direccion && (
                <a href={`https://maps.google.com/?q=${encodeURIComponent(selectedOrder.direccion)}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', display: 'block', color: '#000', textDecoration: 'none' }}>
                  {selectedOrder.direccion}
                </a>
              )}
              {selectedOrder.nombreCliente && (
                <div style={{ fontFamily: MONO, fontSize: 11.5, color: '#909090', marginTop: 2 }}>{selectedOrder.nombreCliente}</div>
              )}
              {selectedOrder.telefono && (
                <a href={`tel:${selectedOrder.telefono}`} style={{ fontFamily: MONO, fontSize: 11.5, color: '#0a3a0a', marginTop: 4, display: 'block', textDecoration: 'none' }}>
                  ☎ {selectedOrder.telefono}
                </a>
              )}
            </div>
          )}

          {/* Items */}
          <div style={{ padding: '0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0 10px', fontFamily: MONO, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em' }}>
              <span>Items</span>
              <span style={{ color: '#909090' }}>{selectedOrder.items.length} producto{selectedOrder.items.length !== 1 ? 's' : ''}</span>
            </div>
            {selectedOrder.items.map((item, i) => {
              const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
              const itemTotal = (item.menuItem.precio + extrasTotal) * item.cantidad
              return (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < selectedOrder.items.length - 1 ? '1px dashed rgba(0,0,0,0.12)' : 'none', fontSize: 13 }}>
                  <span><span style={{ fontFamily: MONO, fontWeight: 700, marginRight: 8 }}>{item.cantidad}×</span>{item.menuItem.nombre}</span>
                  <span style={{ fontFamily: MONO, fontWeight: 700 }}>{formatPrice(itemTotal)}</span>
                </div>
              )
            })}
            {selectedOrder.costoEnvio ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontSize: 13, color: '#909090' }}>
                <span>Envío</span>
                <span style={{ fontFamily: MONO }}>{formatPrice(selectedOrder.costoEnvio)}</span>
              </div>
            ) : null}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid #000', marginTop: 4, fontWeight: 700, fontSize: 15 }}>
              <span>Total</span>
              <span style={{ fontFamily: MONO }}>{formatPrice(getTotal(selectedOrder))}</span>
            </div>
          </div>

          {/* CTA */}
          {selectedOrder.status !== 'entregado' && (
            <div style={{ padding: '12px 16px 32px' }}>
              {selectedOrder.status === 'listo' && (
                <button
                  onClick={() => { updateOrderStatus(selectedOrder.id, 'en_camino'); notifyConsumerDelivery(selectedOrder.id, 'en_camino'); setSelectedOrderId(null) }}
                  style={{ ...btnBase, width: '100%', height: 52, fontSize: 15, background: '#000', color: '#fff', borderRadius: 999 }}>
                  Confirmar retiro en {config.restaurantName ?? 'restaurante'} →
                </button>
              )}
              {selectedOrder.status === 'en_camino' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedOrder.direccion && (
                    <button
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            pos => window.open(`https://maps.google.com/maps?saddr=${pos.coords.latitude},${pos.coords.longitude}&daddr=${encodeURIComponent(selectedOrder.direccion!)}`, '_blank'),
                            () => window.open(`https://maps.google.com/?q=${encodeURIComponent(selectedOrder.direccion!)}`, '_blank')
                          )
                        } else {
                          window.open(`https://maps.google.com/?q=${encodeURIComponent(selectedOrder.direccion!)}`, '_blank')
                        }
                      }}
                      style={{ ...btnBase, width: '100%', height: 48, fontSize: 14, background: '#F4F4F2', color: '#000', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      📍 Abrir navegación
                    </button>
                  )}
                  <button
                    onClick={() => { updateOrderStatus(selectedOrder.id, 'entregado'); notifyConsumerDelivery(selectedOrder.id, 'entregado'); setSelectedOrderId(null) }}
                    style={{ ...btnBase, width: '100%', height: 52, fontSize: 15, background: '#BEEBBE', color: '#0a3a0a', borderRadius: 999 }}>
                    Confirmar entrega →
                  </button>
                </div>
              )}
              {selectedOrder.status !== 'listo' && selectedOrder.status !== 'en_camino' && (
                <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 12, color: '#909090', padding: '12px 0' }}>
                  Esperando que cocina marque el pedido como listo
                </div>
              )}
              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <span style={{ fontFamily: MONO, fontSize: 11, color: '#991B1B', cursor: 'pointer', borderBottom: '1px solid rgba(153,27,27,0.3)' }}>Reportar problema</span>
              </div>
            </div>
          )}
          {selectedOrder.status === 'entregado' && (
            <div style={{ margin: '0 16px 32px', padding: '14px 16px', background: '#BEEBBE', color: '#0a3a0a', borderRadius: 14, textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>✓ Entregada correctamente</div>
              <div style={{ fontFamily: MONO, fontSize: 11, marginTop: 4, opacity: 0.7 }}>{formatTime(selectedOrder.updatedAt)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

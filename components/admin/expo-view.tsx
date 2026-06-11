'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/context'
import { getTimeDiffMinutes } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

export function ExpoView() {
  const { orders, markOrderDelivered } = useApp()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(interval)
  }, [])

  const readyOrders = orders.filter(
    o =>
      o.status !== 'entregado' &&
      o.status !== 'cancelado' &&
      (o.status === 'listo' || o.cocinaStatus === 'listo')
  )

  const byTable = readyOrders.reduce<Record<string, typeof readyOrders>>((acc, order) => {
    const key = order.mesa != null ? `Mesa ${order.mesa}` : order.nombreCliente || 'Para llevar'
    if (!acc[key]) acc[key] = []
    acc[key].push(order)
    return acc
  }, {})

  const tableKeys = Object.keys(byTable).sort()
  const getElapsed = (order: (typeof readyOrders)[0]) => getTimeDiffMinutes(order.createdAt)
  const elapsedColor = (min: number) =>
    min >= 15 ? '#DC2626' : min >= 10 ? '#D97706' : '#0a3a0a'

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: '#BEEBBE', borderRadius: 999 }}>
          <span style={{ fontSize: 14 }}>◎</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0a3a0a' }}>
            {readyOrders.length} pedido{readyOrders.length !== 1 ? 's' : ''} listos para entregar
          </span>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 12, color: '#999' }}>
          {now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {tableKeys.length === 0 && (
        <div style={{ border: '1px dashed #E5E5E5', borderRadius: 16, padding: '48px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 32, margin: '0 0 8px' }}>Ø</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#666', margin: 0 }}>Sin pedidos listos para entregar</p>
          <p style={{ fontSize: 12, color: '#999', marginTop: 6 }}>Los pedidos aparecerán aquí cuando la cocina los marque como listos</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {tableKeys.map(tableKey => (
          <div key={tableKey} style={{ border: '1px solid #BEEBBE', background: '#F6FFF6', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{tableKey}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#BEEBBE', color: '#0a3a0a' }}>
                {byTable[tableKey].length} pedido{byTable[tableKey].length !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {byTable[tableKey].map(order => {
                const elapsed = getElapsed(order)
                return (
                  <div key={order.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E5E5', padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO }}>#{order.numero}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: elapsedColor(elapsed), fontFamily: MONO }}>
                        ⏱ {elapsed}min
                      </span>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      {order.items.map(item => (
                        <div key={item.id} style={{ display: 'flex', gap: 6, fontSize: 12, lineHeight: '1.5' }}>
                          <span style={{ fontWeight: 700, flexShrink: 0, fontFamily: MONO }}>{item.cantidad}×</span>
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontWeight: 600 }}>{item.menuItem.nombre}</span>
                            {item.notas && (
                              <p style={{ color: '#D97706', fontSize: 11, margin: '1px 0 0', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.notas}</p>
                            )}
                            {item.extras && item.extras.length > 0 && (
                              <p style={{ color: '#999', fontSize: 11, margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                + {item.extras.map(e => e.nombre).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => markOrderDelivered(order.id)}
                      style={{ width: '100%', height: 32, borderRadius: 8, border: 'none', background: '#BEEBBE', color: '#0a3a0a', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}
                    >
                      ✓ Marcar entregado
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

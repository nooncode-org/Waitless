'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { formatPrice, formatTime, getTimeDiffMinutes } from '@/lib/store'
import { FloorMap } from './floor-map'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

export function TablesManager() {
  const {
    tableSessions, getActiveTables, getPendingCalls,
    moveTableSession, mergeTableSessions, splitTableSession, closeTableSession,
  } = useApp()

  const [now, setNow] = useState(new Date())
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid')
  const [selectedMesa, setSelectedMesa] = useState<number | null>(null)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [showMergeDialog, setShowMergeDialog] = useState(false)
  const [showSplitDialog, setShowSplitDialog] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [splitSelectedOrders, setSplitSelectedOrders] = useState<string[]>([])
  const [splitTargetMesa, setSplitTargetMesa] = useState<number | null>(null)

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  void now

  const pendingCalls = getPendingCalls()
  const activeTables = getActiveTables()

  const getTableInfo = (mesa: number) => {
    const session = tableSessions.find(s => s.mesa === mesa && s.activa)
    const tableOrders = session?.orders?.filter(o => o.status !== 'cancelado') || []
    const activeOrders = tableOrders.filter(o => o.status !== 'entregado')
    const tableCalls = pendingCalls.filter(c => c.mesa === mesa)
    // "Solicita cuenta" = el cliente pidió pagar (billStatus 'en_pago'), un pago
    // parcial en curso, o una llamada de mesero tipo 'cuenta'. NO usar
    // paymentStatus === 'pendiente': es el default de toda sesión nueva y marcaba
    // "Solicita cuenta" en cada mesa recién abierta.
    const paymentRequested =
      session?.billStatus === 'en_pago' ||
      session?.paymentStatus === 'parcial' ||
      tableCalls.some(c => c.tipo === 'cuenta')
    const hasAttentionCall = tableCalls.some(c => c.tipo === 'atencion' || c.tipo === 'otro')
    const elapsedMin = session ? getTimeDiffMinutes(session.createdAt) : 0
    const total = session?.total ?? 0

    if (!session) return { status: 'libre' as const, label: 'Libre', session: null, activeOrders: [], tableOrders: [], elapsedMin: 0, hasCall: false, hasBillRequest: false, hasReady: false, hasPreparing: false, total: 0 }

    const isPaid = session.billStatus === 'pagada'
    const hasReady = activeOrders.some(o => o.status === 'listo')
    const hasPreparing = activeOrders.some(o => o.status === 'preparando')
    const status = isPaid ? 'pagada' as const : hasReady ? 'listo' as const : hasPreparing ? 'preparando' as const : 'ocupada' as const
    const label = isPaid ? 'Pagada'
      : paymentRequested ? 'Solicita cuenta'
      : hasReady ? 'Listo — Entregar'
      : hasPreparing ? 'En cocina'
      : 'Ocupada'

    return { status, label, session, activeOrders, tableOrders, elapsedMin, hasCall: hasAttentionCall, hasBillRequest: paymentRequested, hasReady, hasPreparing, total }
  }

  const tableInfos = activeTables.map(t => ({ ...t, ...getTableInfo(t.numero) }))
  const selectedInfo = selectedMesa !== null ? getTableInfo(selectedMesa) : null
  const selectedSession = selectedInfo?.session ?? null

  const formatElapsed = (min: number) => {
    if (min < 1) return '< 1 min'
    if (min < 60) return `${min} min`
    const h = Math.floor(min / 60), m = min % 60
    return `${h}h${m > 0 ? ` ${m}m` : ''}`
  }

  const getCellStyle = (status: string, hasCall: boolean, hasBillRequest: boolean, isSelected: boolean): React.CSSProperties => {
    const base: React.CSSProperties = { border: '1px solid #E5E5E5', borderRadius: 14, aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '10px 8px', cursor: 'pointer', transition: 'all 0.15s', position: 'relative', background: '#fff' }
    if (isSelected) return { ...base, outline: '2px solid #000', outlineOffset: 1 }
    if (hasCall || hasBillRequest) return { ...base, outline: '2px solid #DC2626', outlineOffset: 1 }
    if (status === 'libre') return { ...base, background: '#FAFAFA' }
    if (status === 'listo') return { ...base, background: '#BEEBBE', borderColor: '#BEEBBE' }
    if (status === 'pagada') return { ...base, background: '#BEEBBE', borderColor: '#BEEBBE' }
    if (status === 'preparando') return { ...base, background: '#FEF3C7', borderColor: '#FBBF24' }
    return { ...base, background: '#000' }
  }

  const getDotColor = (status: string) => {
    if (status === 'libre') return 'rgba(0,0,0,0.15)'
    if (status === 'listo' || status === 'pagada') return '#0a3a0a'
    if (status === 'preparando') return '#92400E'
    return '#fff'
  }

  const getTextColor = (status: string) => {
    if (status === 'listo' || status === 'pagada') return '#0a3a0a'
    if (status === 'preparando') return '#92400E'
    if (status === 'ocupada') return '#fff'
    return 'rgba(0,0,0,0.35)'
  }

  const freeTables = activeTables.filter(t => t.numero !== selectedMesa && !tableSessions.some(s => s.mesa === t.numero && s.activa))
  const otherActiveSessions = tableSessions.filter(s => s.activa && s.mesa !== selectedMesa)

  const isPaid = selectedSession?.billStatus === 'pagada'
  const canClose = selectedSession && ((isPaid && (selectedInfo?.activeOrders.length ?? 0) === 0) || (selectedInfo?.tableOrders.length ?? 0) === 0)

  const freeCount = tableInfos.filter(t => t.status === 'libre').length
  const readyCount = tableInfos.filter(t => t.status === 'listo').length
  const preparingCount = tableInfos.filter(t => t.status === 'preparando').length
  const occupiedCount = tableInfos.filter(t => t.status === 'ocupada' || t.status === 'pagada').length

  const getOrderChip = (status: string) => {
    if (status === 'entregado' || status === 'listo') return { bg: '#BEEBBE', color: '#0a3a0a', label: status === 'listo' ? 'Listo' : 'Entregado' }
    if (status === 'cancelado') return { bg: '#FEE2E2', color: '#991B1B', label: 'Cancelado' }
    if (status === 'preparando') return { bg: '#FEF3C7', color: '#92400E', label: 'Preparando' }
    return { bg: 'rgba(0,0,0,0.07)', color: 'rgba(0,0,0,0.55)', label: 'Cola' }
  }

  const modal: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.5)', padding: 16,
  }
  const modalBox: React.CSSProperties = {
    background: '#fff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 14,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  }
  const btn: React.CSSProperties = {
    height: 36, padding: '0 14px', border: '1px solid #E5E5E5', borderRadius: 10,
    fontSize: 13, fontFamily: FONT, background: '#fff', cursor: 'pointer',
  }
  const btnPrimary: React.CSSProperties = { ...btn, border: 'none', background: '#000', color: '#fff', fontWeight: 700 }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', fontFamily: FONT }}>
      <style>{`.adm-tm-cell:hover{filter:brightness(0.96)!important}.adm-tm-list-row:hover{background:#FAFAFA!important}`}</style>

      {/* Left — table grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {[
            { label: 'Libres', value: freeCount, dot: 'rgba(0,0,0,0.15)' },
            { label: 'En cocina', value: preparingCount, dot: '#FBBF24' },
            { label: 'Listos', value: readyCount, dot: '#BEEBBE' },
            { label: 'Ocupadas', value: occupiedCount, dot: '#000' },
          ].map(stat => (
            <div key={stat.label} style={{ border: '1px solid #E5E5E5', borderRadius: 14, padding: '12px 14px', background: '#fff' }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: stat.dot, flexShrink: 0, display: 'inline-block', border: stat.dot === 'rgba(0,0,0,0.15)' ? '1px solid #E5E5E5' : 'none' }} />
                <span style={{ fontSize: 11.5, fontFamily: MONO, color: 'rgba(0,0,0,0.55)', fontWeight: 600 }}>{stat.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 16, fontFamily: MONO, fontSize: 11 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: '#FAFAFA', border: '1px solid #E5E5E5', display: 'inline-block' }} />Libre · {freeCount}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: '#000', display: 'inline-block' }} />Ocupada · {occupiedCount}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: '#BEEBBE', display: 'inline-block' }} />Lista · {readyCount}</span>
          </div>
          <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.05)', borderRadius: 10, padding: 3 }}>
            {([['grid', '⊞'], ['list', '≡'], ['map', '⊡']] as const).map(([mode, icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                style={{ width: 30, height: 26, border: 'none', borderRadius: 7, fontSize: 14, cursor: 'pointer', background: viewMode === mode ? '#fff' : 'transparent', fontWeight: viewMode === mode ? 700 : 400, color: viewMode === mode ? '#000' : 'rgba(0,0,0,0.45)', transition: 'all 0.15s' }}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Views */}
        {viewMode === 'map' ? (
          <FloorMap />
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 10 }}>
            {tableInfos.map(info => {
              const isSelected = selectedMesa === info.numero
              const cellStyle = getCellStyle(info.status, info.hasCall, info.hasBillRequest, isSelected)
              return (
                <button key={info.id} onClick={() => setSelectedMesa(isSelected ? null : info.numero)}
                  className="adm-tm-cell" style={cellStyle}>
                  {(info.hasCall || info.hasBillRequest) && (
                    <span style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 999, background: info.hasCall ? '#DC2626' : '#FBBF24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700, fontFamily: MONO }}>
                      {info.hasCall ? '!' : '$'}
                    </span>
                  )}
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: getDotColor(info.status), display: 'inline-block' }} />
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', color: info.status === 'ocupada' ? '#fff' : info.status === 'libre' ? 'rgba(0,0,0,0.3)' : '#0a3a0a' }}>{info.numero}</div>
                  <div style={{ fontSize: 9.5, fontFamily: MONO, color: getTextColor(info.status), textAlign: 'center', width: '100%', fontWeight: 600 }}>
                    {info.status === 'libre' ? 'Libre' : info.elapsedMin > 0 ? formatElapsed(info.elapsedMin) : null}
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tableInfos.map(info => {
              const isSelected = selectedMesa === info.numero
              return (
                <button key={info.id} onClick={() => setSelectedMesa(isSelected ? null : info.numero)}
                  className="adm-tm-list-row"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: `1px solid ${isSelected ? '#000' : '#E5E5E5'}`, borderRadius: 12, background: '#fff', cursor: 'pointer', textAlign: 'left', outline: isSelected ? '2px solid #000' : 'none', outlineOffset: 1 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: info.status === 'libre' ? 'rgba(0,0,0,0.15)' : info.status === 'listo' || info.status === 'pagada' ? '#BEEBBE' : info.status === 'preparando' ? '#FBBF24' : '#000', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '-0.02em', width: 70, flexShrink: 0 }}>Mesa {info.numero}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: info.status === 'libre' ? 'rgba(0,0,0,0.35)' : '#000', letterSpacing: '-0.01em' }}>{info.label}</div>
                    {info.activeOrders.length > 0 && <div style={{ fontSize: 11.5, fontFamily: MONO, color: 'rgba(0,0,0,0.45)' }}>{info.activeOrders.length} pedido{info.activeOrders.length !== 1 ? 's' : ''}</div>}
                  </div>
                  {info.elapsedMin > 0 && <span style={{ fontSize: 12, fontFamily: MONO, color: 'rgba(0,0,0,0.5)', flexShrink: 0 }}>{formatElapsed(info.elapsedMin)}</span>}
                  {info.hasCall && <span style={{ width: 20, height: 20, borderRadius: 999, background: '#DC2626', color: '#fff', fontSize: 10, fontWeight: 700, fontFamily: MONO, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>!</span>}
                  {info.hasBillRequest && !info.hasCall && <span style={{ width: 20, height: 20, borderRadius: 999, background: '#FBBF24', color: '#000', fontSize: 10, fontWeight: 700, fontFamily: MONO, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>$</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Right — detail panel */}
      {selectedMesa !== null && selectedInfo && (
        <div style={{ width: 272, flexShrink: 0, borderLeft: '1px solid #E5E5E5', background: '#fff', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid #E5E5E5' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em' }}>Mesa {selectedMesa}</div>
              <div style={{ fontSize: 12, fontFamily: MONO, color: 'rgba(0,0,0,0.5)', marginTop: 2 }}>{selectedInfo.label}</div>
            </div>
            <button onClick={() => setSelectedMesa(null)} style={{ width: 28, height: 28, border: '1px solid #E5E5E5', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
          </div>

          {selectedSession ? (
            <>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #E5E5E5', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Abierta', value: formatTime(selectedSession.createdAt) },
                  { label: 'Pedidos activos', value: String(selectedInfo.activeOrders.length) },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12.5, fontFamily: MONO, color: 'rgba(0,0,0,0.5)' }}>{r.label}</span>
                    <span style={{ fontSize: 12.5, fontFamily: MONO, fontWeight: 700 }}>{r.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #E5E5E5', marginTop: 2 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.02em' }}>Total</span>
                  <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.03em', fontFamily: MONO }}>{formatPrice(selectedInfo.total)}</span>
                </div>
              </div>

              {selectedInfo.tableOrders.length > 0 && (
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #E5E5E5' }}>
                  <div style={{ fontSize: 10.5, fontFamily: MONO, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', marginBottom: 10 }}>PEDIDOS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {selectedInfo.tableOrders.map(order => {
                      const chip = getOrderChip(order.status)
                      return (
                        <div key={order.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 12.5, color: '#000', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            #{order.numero} — {order.items.map(i => `${i.cantidad}x ${i.menuItem.nombre}`).join(', ').slice(0, 24)}
                          </span>
                          <span style={{ background: chip.bg, color: chip.color, padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontFamily: MONO, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{chip.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div style={{ padding: '14px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 10.5, fontFamily: MONO, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', marginBottom: 4 }}>ACCIONES</div>
                {!isPaid && (
                  <button onClick={() => setShowMoveDialog(true)} style={{ ...btn, width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, height: 40 }}>
                    <span style={{ fontSize: 15 }}>⇄</span> Mover mesa a...
                  </button>
                )}
                {!isPaid && (
                  <button onClick={() => setShowMergeDialog(true)} disabled={otherActiveSessions.length === 0}
                    style={{ ...btn, width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, height: 40, opacity: otherActiveSessions.length === 0 ? 0.4 : 1, cursor: otherActiveSessions.length === 0 ? 'not-allowed' : 'pointer' }}>
                    <span style={{ fontSize: 15 }}>⊕</span> Unir con mesa...
                  </button>
                )}
                {!isPaid && selectedInfo.activeOrders.length > 1 && (
                  <button onClick={() => { setSplitSelectedOrders([]); setSplitTargetMesa(null); setShowSplitDialog(true) }}
                    style={{ ...btn, width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, height: 40 }}>
                    <span style={{ fontSize: 15 }}>✂</span> Separar pedidos...
                  </button>
                )}
                {canClose && (
                  <button onClick={() => setShowCloseConfirm(true)}
                    style={{ ...btn, width: '100%', border: '1px solid #FCA5A5', color: '#DC2626', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, height: 40, marginTop: 4 }}>
                    <span style={{ fontSize: 15 }}>⬡</span> Cerrar mesa
                  </button>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
              <span style={{ fontSize: 12.5, fontFamily: MONO, color: 'rgba(0,0,0,0.35)' }}>Mesa libre — sin sesión activa</span>
            </div>
          )}
        </div>
      )}

      {/* Move Modal */}
      {showMoveDialog && selectedMesa !== null && selectedSession && (
        <div style={modal}>
          <div style={modalBox}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em' }}>Mover Mesa {selectedMesa}</div>
              <button onClick={() => setShowMoveDialog(false)} style={{ ...btn, width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>×</button>
            </div>
            <div style={{ fontSize: 12.5, fontFamily: MONO, color: 'rgba(0,0,0,0.5)' }}>Selecciona la mesa destino (solo libres)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {freeTables.map(t => (
                <button key={t.numero} onClick={() => { moveTableSession(selectedSession.id, t.numero); setShowMoveDialog(false); setSelectedMesa(t.numero) }}
                  style={{ height: 44, border: '1px solid #E5E5E5', borderRadius: 10, fontSize: 15, fontWeight: 800, fontFamily: MONO, background: '#fff', cursor: 'pointer', letterSpacing: '-0.02em' }}>
                  {t.numero}
                </button>
              ))}
            </div>
            {freeTables.length === 0 && <div style={{ textAlign: 'center', fontSize: 12.5, fontFamily: MONO, color: 'rgba(0,0,0,0.35)' }}>No hay mesas libres</div>}
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {showMergeDialog && selectedMesa !== null && selectedSession && (
        <div style={modal}>
          <div style={modalBox}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em' }}>Unir con Mesa {selectedMesa}</div>
              <button onClick={() => setShowMergeDialog(false)} style={{ ...btn, width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>×</button>
            </div>
            <div style={{ fontSize: 12.5, fontFamily: MONO, color: 'rgba(0,0,0,0.5)' }}>Los pedidos se traen a Mesa {selectedMesa}.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {otherActiveSessions.map(s => (
                <button key={s.id} onClick={() => { mergeTableSessions(selectedSession.id, s.id); setShowMergeDialog(false) }}
                  style={{ height: 44, border: '1px solid #E5E5E5', borderRadius: 10, fontSize: 15, fontWeight: 800, fontFamily: MONO, background: '#fff', cursor: 'pointer', letterSpacing: '-0.02em' }}>
                  {s.mesa}
                </button>
              ))}
            </div>
            {otherActiveSessions.length === 0 && <div style={{ textAlign: 'center', fontSize: 12.5, fontFamily: MONO, color: 'rgba(0,0,0,0.35)' }}>No hay otras mesas activas</div>}
          </div>
        </div>
      )}

      {/* Split Modal */}
      {showSplitDialog && selectedMesa !== null && selectedSession && selectedInfo && (
        <div style={modal}>
          <div style={{ ...modalBox, maxWidth: 380 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em' }}>Separar — Mesa {selectedMesa}</div>
              <button onClick={() => setShowSplitDialog(false)} style={{ ...btn, width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>×</button>
            </div>
            <div style={{ fontSize: 12.5, fontFamily: MONO, color: 'rgba(0,0,0,0.5)' }}>Selecciona pedidos a mover y la mesa destino (libre).</div>
            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {selectedInfo.activeOrders.map(order => (
                <label key={order.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 8, background: splitSelectedOrders.includes(order.id) ? '#FAFAFA' : 'transparent' }}>
                  <input type="checkbox" checked={splitSelectedOrders.includes(order.id)}
                    onChange={e => setSplitSelectedOrders(prev => e.target.checked ? [...prev, order.id] : prev.filter(id => id !== order.id))}
                    style={{ marginTop: 2, accentColor: '#000' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em' }}>Pedido #{order.numero}</div>
                    <div style={{ fontSize: 11.5, fontFamily: MONO, color: 'rgba(0,0,0,0.45)' }}>{order.items.map(i => `${i.cantidad}x ${i.menuItem.nombre}`).join(', ')}</div>
                  </div>
                </label>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 12, fontFamily: MONO, fontWeight: 700, color: 'rgba(0,0,0,0.5)', marginBottom: 8 }}>Mesa destino:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
                {freeTables.map(t => (
                  <button key={t.numero} onClick={() => setSplitTargetMesa(t.numero)}
                    style={{ height: 38, border: '1px solid #E5E5E5', borderRadius: 8, fontSize: 14, fontWeight: 800, fontFamily: MONO, background: splitTargetMesa === t.numero ? '#000' : '#fff', color: splitTargetMesa === t.numero ? '#fff' : '#000', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {t.numero}
                  </button>
                ))}
                {freeTables.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', fontSize: 12.5, fontFamily: MONO, color: 'rgba(0,0,0,0.35)' }}>No hay mesas libres</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowSplitDialog(false)} style={{ ...btn, flex: 1, height: 42 }}>Cancelar</button>
              <button disabled={splitSelectedOrders.length === 0 || splitTargetMesa === null}
                onClick={() => { if (splitTargetMesa !== null) { splitTableSession(selectedSession.id, splitSelectedOrders, splitTargetMesa); setShowSplitDialog(false); setSplitSelectedOrders([]) } }}
                style={{ ...btnPrimary, flex: 1, height: 42, opacity: splitSelectedOrders.length === 0 || splitTargetMesa === null ? 0.4 : 1, cursor: splitSelectedOrders.length === 0 || splitTargetMesa === null ? 'not-allowed' : 'pointer' }}>
                Separar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Confirm */}
      {showCloseConfirm && selectedMesa !== null && selectedSession && (
        <div style={{ ...modal, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 28, width: '100%', maxWidth: 360, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 52, height: 52, borderRadius: 999, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>⚠</div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em' }}>Cerrar Mesa {selectedMesa}</div>
            <div style={{ fontSize: 13.5, fontFamily: MONO, color: 'rgba(0,0,0,0.55)', lineHeight: 1.5 }}>Esta acción cierra la sesión activa. El siguiente cliente podrá iniciar una nueva sesión.</div>
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button onClick={() => setShowCloseConfirm(false)} style={{ ...btn, flex: 1, height: 44 }}>Cancelar</button>
              <button onClick={() => { closeTableSession(selectedSession.id); setShowCloseConfirm(false); setSelectedMesa(null) }}
                style={{ flex: 1, height: 44, border: 'none', borderRadius: 10, fontSize: 13, fontFamily: FONT, fontWeight: 700, background: '#DC2626', color: '#fff', cursor: 'pointer' }}>
                Cerrar mesa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

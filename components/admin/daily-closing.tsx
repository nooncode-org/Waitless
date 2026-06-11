'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import {
  formatPrice,
  calculateOrderTotal,
} from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

function paymentLabel(method: string) {
  if (method === 'tarjeta') return 'Tarjeta'
  if (method === 'apple_pay') return 'Apple Pay'
  if (method === 'transferencia') return 'QR / Transfer.'
  return 'Efectivo'
}

export function DailyClosing() {
  const { orders, refunds, getPaymentsForDate, config } = useApp()

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [shiftOpen, setShiftOpen] = useState(false)
  const [shiftStart, setShiftStart] = useState<Date | null>(null)
  const [shiftEnd, setShiftEnd] = useState<Date | null>(null)
  const [shiftNote, setShiftNote] = useState('')
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [fondoCajaApertura, setFondoCajaApertura] = useState<string>('')
  const [efectivoContado, setEfectivoContado] = useState<string>('')
  const [currentShiftId, setCurrentShiftId] = useState<string | null>(null)

  type PaidSession = { id: string; paymentMethod: string | null; total: number; impuestos: number; propina: number; descuento: number; createdAt: string }
  const [paidSessionsFromDB, setPaidSessionsFromDB] = useState<PaidSession[]>([])

  type TopItem = { menu_item_id: string; nombre: string; total_cantidad: number; total_revenue: number }
  type KpiFromDB = {
    fecha: string; ticket_promedio: number; total_sesiones: number; total_ventas: number
    total_ordenes: number; canceladas: number; tasa_cancelacion: number
    tiempo_atencion_min: number; ocupacion_rate: number; top_items: TopItem[]
  }
  const [kpiFromDB, setKpiFromDB] = useState<KpiFromDB | null>(null)
  const [kpiLoading, setKpiLoading] = useState(false)
  const [kpiError, setKpiError] = useState(false)

  useEffect(() => {
    supabase.from('shifts').select('*').eq('activo', true)
      .order('opened_at', { ascending: false }).limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const s = data[0]
          setCurrentShiftId(s.id)
          setShiftOpen(true)
          setShiftStart(new Date(s.opened_at))
          setShiftNote(s.notas || '')
        }
      })
  }, [])

  useEffect(() => {
    const from = `${selectedDate}T00:00:00.000Z`
    const to = `${selectedDate}T23:59:59.999Z`
    supabase.from('table_sessions')
      .select('id, payment_method, total, impuestos, propina, descuento, created_at')
      .eq('payment_status', 'pagado').gte('created_at', from).lte('created_at', to)
      .then(({ data }) => {
        if (data) setPaidSessionsFromDB(data.map(r => ({
          id: r.id, paymentMethod: r.payment_method, total: r.total ?? 0,
          impuestos: r.impuestos ?? 0, propina: r.propina ?? 0,
          descuento: r.descuento ?? 0, createdAt: r.created_at,
        })))
      })
  }, [selectedDate])

  const fetchKpis = useCallback(() => {
    setKpiLoading(true); setKpiError(false); setKpiFromDB(null)
    supabase.rpc('get_daily_kpis', { p_fecha: selectedDate }).then(({ data, error }) => {
      if (error) { console.error('[get_daily_kpis]', error.message); setKpiError(true) }
      else if (data) setKpiFromDB(data as KpiFromDB)
      setKpiLoading(false)
    })
  }, [selectedDate])

  useEffect(() => { fetchKpis() }, [fetchKpis])

  const handleOpenShift = async () => {
    const newId = crypto.randomUUID()
    const now = new Date()
    setShiftStart(now); setShiftEnd(null); setShiftOpen(true)
    setShowCloseConfirm(false); setEfectivoContado(''); setCurrentShiftId(newId)
    await supabase.from('shifts').insert({
      id: newId,
      nombre: `Turno ${now.toLocaleDateString('es-MX')} ${now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
      opened_at: now.toISOString(), activo: true,
    })
  }

  const dayOrders = useMemo(() =>
    orders.filter(o => new Date(o.createdAt).toISOString().split('T')[0] === selectedDate),
    [orders, selectedDate]
  )
  const dayRefunds = useMemo(() =>
    refunds.filter(r => new Date(r.createdAt).toISOString().split('T')[0] === selectedDate),
    [refunds, selectedDate]
  )
  const dayPayments = useMemo(() => getPaymentsForDate(new Date(selectedDate)), [getPaymentsForDate, selectedDate])
  const daySessions = paidSessionsFromDB
  const completedOrders = dayOrders.filter(o => o.status === 'entregado')
  const cancelledOrders = dayOrders.filter(o => o.status === 'cancelado')

  const salesByPayment: Record<string, number> = [
    ...dayPayments.filter(s => s.paymentMethod),
    ...daySessions.filter(s => s.paymentMethod),
  ].reduce((acc, s) => ({ ...acc, [s.paymentMethod!]: (acc[s.paymentMethod!] || 0) + s.total }), {} as Record<string, number>)

  const itemSalesMap = completedOrders.reduce((acc, order) => {
    order.items.forEach(item => {
      const key = item.menuItem.id
      const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
      const prev = acc[key] ?? { name: item.menuItem.nombre, quantity: 0, revenue: 0 }
      acc[key] = { name: prev.name, quantity: prev.quantity + item.cantidad, revenue: prev.revenue + (item.menuItem.precio + extrasTotal) * item.cantidad }
    })
    return acc
  }, {} as Record<string, { name: string; quantity: number; revenue: number }>)
  const topItems = Object.values(itemSalesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  const grossSales = completedOrders.reduce((sum, o) => sum + calculateOrderTotal(o.items), 0)
  const totalTax = dayPayments.reduce((sum, p) => sum + p.impuestos, 0) + daySessions.reduce((sum, s) => sum + s.impuestos, 0)
  const totalTips = dayPayments.reduce((sum, p) => sum + p.propina, 0) + daySessions.reduce((sum, s) => sum + s.propina, 0)
  const totalDiscounts = daySessions.reduce((sum, s) => sum + s.descuento, 0)
  const totalRefunds = dayRefunds.reduce((sum, r) => sum + r.monto, 0)
  const netSales = grossSales - totalDiscounts - totalRefunds

  const stats = useMemo(() => ({
    completedOrders: completedOrders.length,
    cancelledOrders: cancelledOrders.length,
    grossSales, netSales, totalTax, totalTips, totalDiscounts, totalRefunds,
    salesByPayment, topItems,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [dayOrders, dayRefunds, dayPayments, paidSessionsFromDB])

  const handleCloseShift = async () => {
    const now = new Date()
    setShiftEnd(now); setShiftOpen(false); setShowCloseConfirm(false)
    if (currentShiftId) {
      await supabase.from('shifts').update({
        activo: false, closed_at: now.toISOString(), notas: shiftNote || null,
        total_ventas: stats.netSales, total_ordenes: stats.completedOrders,
        efectivo: stats.salesByPayment['efectivo'] ?? 0,
        tarjeta: (stats.salesByPayment['tarjeta'] ?? 0) + (stats.salesByPayment['apple_pay'] ?? 0) + (stats.salesByPayment['transferencia'] ?? 0),
        propinas: stats.totalTips, descuentos: stats.totalDiscounts, reembolsos: stats.totalRefunds,
      }).eq('id', currentShiftId)
    }
    supabase.rpc('get_daily_kpis', { p_fecha: selectedDate }).then(({ data, error }) => {
      if (!error && data) setKpiFromDB(data as KpiFromDB)
    })
  }

  const exportCSV = () => {
    const rows = [
      ['Metrica', 'Valor'],
      ['Fecha', selectedDate],
      ['Ventas Netas', formatPrice(stats.netSales)],
      ['Propinas', formatPrice(stats.totalTips)],
      ['Cancelados', stats.cancelledOrders.toString()],
      ...Object.entries(stats.salesByPayment).map(([m, amt]) => [`Pago — ${m}`, formatPrice(amt)]),
    ]
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `turno-${selectedDate}.csv`
    link.click()
  }

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) return
    const shiftInfo = shiftStart
      ? `<div style="text-align:center;color:#666;font-size:11px">Turno: ${shiftStart.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}${shiftEnd ? ` → ${shiftEnd.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}` : ' (activo)'}</div>`
      : ''
    const paymentRows = Object.entries(stats.salesByPayment).map(
      ([m, amt]) => `<tr><td>${paymentLabel(m)}</td><td style="text-align:right">$${(amt as number).toFixed(2)}</td></tr>`
    ).join('')
    const topItemRows = stats.topItems.map(
      (item, i) => `<tr><td>${i + 1}. ${item.name} (x${item.quantity})</td><td style="text-align:right">$${item.revenue.toFixed(2)}</td></tr>`
    ).join('')
    const noteRow = shiftNote ? `<div style="margin-top:12px;padding:8px;background:#f2f2f2;border-radius:4px;font-size:11px;color:#444"><strong>Observaciones:</strong> ${shiftNote}</div>` : ''
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Turno — ${selectedDate}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;padding:24px;max-width:700px;margin:0 auto;color:#1a1a1a}h1{font-size:22px;font-weight:900;text-align:center;letter-spacing:-0.5px}.sep{border-top:2px solid #000;margin:12px 0}table{width:100%;border-collapse:collapse}td{padding:4px 0}.section-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:16px 0 8px}@media print{body{padding:0}}</style></head><body><h1>${config.restaurantName ?? ''}</h1>${shiftInfo}<div class="sep"></div><div class="section-title">Ventas por método de pago</div><table>${paymentRows || '<tr><td colspan="2" style="color:#999;text-align:center">Sin pagos</td></tr>'}</table><div class="section-title">Más vendidos</div><table>${topItemRows || '<tr><td colspan="2" style="color:#999;text-align:center">Sin ventas</td></tr>'}</table>${noteRow}<div class="sep"></div><div style="text-align:center;font-size:10px;color:#999;margin-top:8px">Generado ${new Date().toLocaleString('es-MX')} · ${config.restaurantName ?? ''}</div></body></html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 300)
  }, [selectedDate, stats, shiftStart, shiftEnd, shiftNote, config.restaurantName])

  const shiftElapsed = shiftStart && shiftOpen ? (() => {
    const mins = Math.floor((Date.now() - shiftStart.getTime()) / 60000)
    const h = Math.floor(mins / 60), m = mins % 60
    return h > 0 ? `${h}h ${m}m corriendo` : `${m}m corriendo`
  })() : null

  const cashSales = stats.salesByPayment['efectivo'] || 0
  const fondoNum = parseFloat(fondoCajaApertura) || 0
  const contadoNum = parseFloat(efectivoContado) || 0
  const esperado = fondoNum + cashSales
  const diferencia = contadoNum - esperado
  const hasDif = efectivoContado !== '' && !isNaN(contadoNum)

  const inp: React.CSSProperties = {
    height: 36, padding: '0 12px', border: '1px solid #E5E5E5', borderRadius: 10,
    fontSize: 13.5, letterSpacing: '-0.01em', fontFamily: FONT, outline: 'none',
    background: '#fff', width: '100%', boxSizing: 'border-box',
  }

  const displayTopItems = kpiFromDB?.top_items
    ? kpiFromDB.top_items.map(t => ({ nombre: t.nombre, qty: t.total_cantidad, revenue: t.total_revenue }))
    : stats.topItems.map(t => ({ nombre: t.name, qty: t.quantity, revenue: t.revenue }))
  const maxQty = displayTopItems[0]?.qty || 1

  return (
    <div style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`.adm-dc-row:hover{background:#FAFAFA!important}`}</style>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingBottom: 16, borderBottom: '1px solid #E5E5E5' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
            Cierre de turno{shiftOpen ? ' · activo' : shiftEnd ? ' · cerrado' : ''}
          </div>
          <div style={{ fontSize: 12, fontFamily: MONO, color: 'rgba(0,0,0,0.5)', marginTop: 4 }}>
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }).toUpperCase()}
            {shiftStart ? ` · iniciado ${shiftStart.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {shiftElapsed && (
            <span style={{ height: 28, padding: '0 12px', background: '#BEEBBE', color: '#0a3a0a', borderRadius: 999, fontSize: 11.5, fontFamily: MONO, fontWeight: 700, display: 'flex', alignItems: 'center' }}>
              {shiftElapsed}
            </span>
          )}
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} max={new Date().toISOString().split('T')[0]}
            style={{ ...inp, width: 140, height: 32, fontSize: 12 }} />
          <button onClick={exportCSV} style={{ height: 32, padding: '0 14px', border: '1px solid #E5E5E5', borderRadius: 10, fontSize: 12, fontFamily: FONT, fontWeight: 600, background: '#fff', cursor: 'pointer' }}>CSV</button>
          <button onClick={handlePrint} style={{ height: 32, padding: '0 14px', border: 'none', borderRadius: 10, fontSize: 12, fontFamily: FONT, fontWeight: 600, background: '#000', color: '#fff', cursor: 'pointer' }}>Imprimir</button>
        </div>
      </header>

      {/* Shift control */}
      <div style={{ border: '1px solid #E5E5E5', borderRadius: 14, padding: '14px 16px', background: shiftOpen ? 'rgba(190,235,190,0.15)' : '#FAFAFA' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: shiftOpen ? '#BEEBBE' : '#E5E5E5', flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {shiftOpen ? 'Turno activo' : shiftEnd ? 'Turno cerrado' : 'Sin turno abierto'}
            </span>
            {shiftStart && shiftOpen && (
              <span style={{ fontSize: 12, fontFamily: MONO, color: 'rgba(0,0,0,0.45)' }}>
                desde {shiftStart.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {shiftOpen ? (
              showCloseConfirm ? (
                <>
                  <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', fontFamily: MONO }}>¿Confirmar?</span>
                  <button onClick={() => setShowCloseConfirm(false)} style={{ height: 30, padding: '0 12px', border: '1px solid #E5E5E5', borderRadius: 8, fontSize: 12, fontFamily: FONT, background: '#fff', cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={handleCloseShift} style={{ height: 30, padding: '0 12px', border: 'none', borderRadius: 8, fontSize: 12, fontFamily: FONT, fontWeight: 700, background: '#000', color: '#fff', cursor: 'pointer' }}>Cerrar turno</button>
                </>
              ) : (
                <button onClick={() => setShowCloseConfirm(true)} style={{ height: 30, padding: '0 12px', border: 'none', borderRadius: 8, fontSize: 12, fontFamily: FONT, fontWeight: 700, background: '#000', color: '#fff', cursor: 'pointer' }}>Cerrar turno</button>
              )
            ) : (
              <button onClick={handleOpenShift} style={{ height: 30, padding: '0 12px', border: '1px solid #BEEBBE', borderRadius: 8, fontSize: 12, fontFamily: FONT, fontWeight: 700, background: '#BEEBBE', color: '#0a3a0a', cursor: 'pointer' }}>Abrir turno</button>
            )}
          </div>
        </div>
        {(shiftOpen || shiftEnd) && (
          <textarea value={shiftNote} onChange={e => setShiftNote(e.target.value)}
            placeholder="Observaciones del turno (opcional)..."
            rows={2} disabled={!!shiftEnd && !shiftOpen}
            style={{ marginTop: 10, width: '100%', padding: '8px 12px', border: '1px solid #E5E5E5', borderRadius: 8, fontSize: 12.5, fontFamily: FONT, outline: 'none', resize: 'vertical', boxSizing: 'border-box', background: '#fff' }} />
        )}
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        {[
          { label: 'Ventas totales', val: formatPrice(stats.netSales), delta: `${stats.completedOrders} tickets`, mint: false },
          { label: 'Efectivo', val: formatPrice(stats.salesByPayment['efectivo'] ?? 0), delta: stats.netSales > 0 ? `${Math.round(((stats.salesByPayment['efectivo'] ?? 0) / stats.netSales) * 100)}%` : '—', mint: false },
          { label: 'Tarjeta', val: formatPrice(stats.salesByPayment['tarjeta'] ?? 0), delta: stats.netSales > 0 ? `${Math.round(((stats.salesByPayment['tarjeta'] ?? 0) / stats.netSales) * 100)}%` : '—', mint: false },
          { label: 'QR · transfer.', val: formatPrice((stats.salesByPayment['transferencia'] ?? 0) + (stats.salesByPayment['apple_pay'] ?? 0)), delta: stats.netSales > 0 ? `${Math.round((((stats.salesByPayment['transferencia'] ?? 0) + (stats.salesByPayment['apple_pay'] ?? 0)) / stats.netSales) * 100)}%` : '—', mint: false },
          { label: 'Propinas', val: formatPrice(stats.totalTips), delta: '100% al equipo', mint: true },
        ].map(kpi => (
          <div key={kpi.label} style={{ border: `1px solid ${kpi.mint ? '#BEEBBE' : '#E5E5E5'}`, borderRadius: 14, padding: '14px 16px', background: kpi.mint ? '#BEEBBE' : '#fff' }}>
            <div style={{ fontSize: 10.5, fontFamily: MONO, color: kpi.mint ? 'rgba(10,58,10,0.6)' : 'rgba(0,0,0,0.45)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{kpi.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.04em', fontFamily: MONO, color: kpi.mint ? '#0a3a0a' : '#000', lineHeight: 1 }}>{kpi.val}</div>
            <div style={{ fontSize: 11.5, fontFamily: MONO, color: kpi.mint ? 'rgba(10,58,10,0.7)' : 'rgba(0,0,0,0.45)', marginTop: 6 }}>{kpi.delta}</div>
          </div>
        ))}
      </div>

      {/* 2-col: sesiones + arqueo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Sesiones cerradas */}
        <div style={{ border: '1px solid #E5E5E5', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E5E5' }}>
            <span style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase' }}>
              SESIONES CERRADAS · {daySessions.length}
            </span>
          </div>
          {daySessions.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F5F5F5' }}>
                  {['#', 'Horario', 'Método', 'Total'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10.5, fontFamily: MONO, fontWeight: 600, color: 'rgba(0,0,0,0.4)', letterSpacing: '0.03em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {daySessions.slice(0, 8).map((s, i) => {
                  const pm = s.paymentMethod ?? 'efectivo'
                  const chipBg = pm === 'tarjeta' ? '#000' : pm === 'efectivo' ? 'rgba(0,0,0,0.07)' : '#BEEBBE'
                  const chipColor = pm === 'tarjeta' ? '#fff' : pm === 'efectivo' ? 'rgba(0,0,0,0.6)' : '#0a3a0a'
                  return (
                    <tr key={s.id} className="adm-dc-row" style={{ borderBottom: i < daySessions.length - 1 ? '1px solid #F5F5F5' : 'none' }}>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, fontFamily: MONO }}>#{i + 1}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, fontFamily: MONO, color: 'rgba(0,0,0,0.6)' }}>
                        {new Date(s.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: chipBg, color: chipColor, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontFamily: MONO, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {paymentLabel(pm)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 13.5, fontWeight: 800, fontFamily: MONO, letterSpacing: '-0.02em' }}>{formatPrice(s.total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 12.5, fontFamily: MONO, color: 'rgba(0,0,0,0.35)' }}>
              Sin sesiones cerradas en este día
            </div>
          )}
        </div>

        {/* Arqueo de caja */}
        <div style={{ border: '1px solid #E5E5E5', borderRadius: 14, padding: 18, background: '#fff', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase' }}>CAJA · arqueo</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontFamily: MONO, paddingBottom: 8, borderBottom: '1px solid #F5F5F5' }}>
            <span style={{ color: 'rgba(0,0,0,0.65)' }}>Esperado en caja</span>
            <span style={{ fontWeight: 700 }}>{formatPrice(cashSales)}</span>
          </div>
          <div>
            <label style={{ fontSize: 11, fontFamily: MONO, color: 'rgba(0,0,0,0.5)', display: 'block', marginBottom: 4 }}>Fondo apertura</label>
            <input type="number" min="0" step="0.01" value={fondoCajaApertura} onChange={e => setFondoCajaApertura(e.target.value)}
              placeholder="0.00" disabled={!!shiftEnd && !shiftOpen}
              style={{ height: 36, padding: '0 12px', border: '1px solid #E5E5E5', borderRadius: 10, fontSize: 13.5, fontFamily: MONO, outline: 'none', background: '#fff', width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontFamily: MONO, color: 'rgba(0,0,0,0.5)', display: 'block', marginBottom: 4 }}>Contado físico</label>
            <input type="number" min="0" step="0.01" value={efectivoContado} onChange={e => setEfectivoContado(e.target.value)}
              placeholder="0.00"
              style={{ height: 36, padding: '0 12px', border: '1px solid #E5E5E5', borderRadius: 10, fontSize: 13.5, fontFamily: MONO, outline: 'none', background: '#fff', width: '100%', boxSizing: 'border-box' }} />
          </div>
          {hasDif && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0 6px', borderTop: '1px dashed rgba(0,0,0,0.2)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em' }}>Diferencia</span>
              <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.04em', fontFamily: MONO, color: diferencia >= 0 ? '#0a3a0a' : '#DC2626' }}>
                {diferencia > 0 ? '+' : ''}{formatPrice(diferencia)}
              </span>
            </div>
          )}
          <button onClick={() => setShowCloseConfirm(true)} disabled={!shiftOpen}
            style={{ height: 44, width: '100%', border: 'none', borderRadius: 10, fontSize: 14, fontFamily: FONT, fontWeight: 700, letterSpacing: '-0.02em', background: shiftOpen ? '#000' : '#E5E5E5', color: shiftOpen ? '#fff' : 'rgba(0,0,0,0.3)', cursor: shiftOpen ? 'pointer' : 'not-allowed', marginTop: 4 }}>
            Cerrar turno →
          </button>
          <div style={{ textAlign: 'center', fontSize: 10.5, fontFamily: MONO, color: 'rgba(0,0,0,0.35)' }}>
            Requiere confirmación del encargado
          </div>
        </div>
      </div>

      {/* Top items */}
      {displayTopItems.length > 0 && (
        <div style={{ border: '1px solid #E5E5E5', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E5E5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase' }}>TOP 5 · más vendidos</span>
            {kpiLoading && <span style={{ fontSize: 11, fontFamily: MONO, color: 'rgba(0,0,0,0.35)' }}>Cargando…</span>}
            {kpiError && <button onClick={fetchKpis} style={{ fontSize: 11, fontFamily: MONO, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Error — Reintentar</button>}
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {displayTopItems.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 48px', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, fontFamily: MONO, color: 'rgba(0,0,0,0.4)', fontWeight: 700, textAlign: 'right' }}>0{i + 1}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>{item.nombre}</div>
                  <div style={{ height: 4, borderRadius: 999, background: '#F0F0F0', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 999, width: `${Math.round((item.qty / maxQty) * 100)}%`, background: i === 2 ? '#BEEBBE' : '#000' }} />
                  </div>
                </div>
                <span style={{ fontSize: 13, fontFamily: MONO, fontWeight: 700, textAlign: 'right', letterSpacing: '-0.02em' }}>{item.qty}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incidencias */}
      {(stats.cancelledOrders > 0 || stats.totalRefunds > 0) && (
        <div style={{ border: '1px solid #FEE2E2', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #FEE2E2' }}>
            <span style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, letterSpacing: '0.04em', color: '#991B1B', textTransform: 'uppercase' }}>INCIDENCIAS</span>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.cancelledOrders > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'rgba(0,0,0,0.6)' }}>Pedidos cancelados</span>
                <span style={{ fontWeight: 700, color: '#DC2626' }}>{stats.cancelledOrders}</span>
              </div>
            )}
            {stats.totalRefunds > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'rgba(0,0,0,0.6)' }}>Total reembolsado</span>
                <span style={{ fontWeight: 700, color: '#DC2626' }}>-{formatPrice(stats.totalRefunds)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

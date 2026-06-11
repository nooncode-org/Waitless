'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid,
} from 'recharts'
import { useApp } from '@/lib/context'
import { formatPrice, calculateOrderTotal } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { PaymentBreakdownWidget } from './payment-breakdown-widget'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

interface TrendRow {
  fecha: string
  total_ventas: number
  total_sesiones: number
  total_ordenes: number
  avg_ticket: number
}

interface FeedbackSummary {
  total: number
  avg_rating: number
  dist: Record<string, number>
}

type DateRange = 'hoy' | '7d' | '30d'
const RANGE_LABELS: Record<DateRange, string> = { hoy: 'Hoy', '7d': '7 días', '30d': '30 días' }

export function ReportsManager() {
  const { orders, tableSessions, waiterCalls, tables } = useApp()
  const [dateRange, setDateRange] = useState<DateRange>('hoy')
  const [closedSessionsDB, setClosedSessionsDB] = useState<{ total: number }[]>([])
  const [revenueTrend, setRevenueTrend] = useState<TrendRow[]>([])
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary | null>(null)

  const rangeStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    if (dateRange === '7d') d.setDate(d.getDate() - 6)
    else if (dateRange === '30d') d.setDate(d.getDate() - 29)
    return d
  }, [dateRange])

  useEffect(() => {
    supabase.from('table_sessions').select('total').eq('activa', false).eq('bill_status', 'cerrada')
      .gte('created_at', rangeStart.toISOString())
      .then(({ data }) => setClosedSessionsDB((data ?? []) as { total: number }[]))
  }, [rangeStart])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setting state from async Supabase fetch inside effect, intentional data-loading pattern
    if (dateRange === 'hoy') { setRevenueTrend([]); return }
    const days = dateRange === '7d' ? 7 : 30
    supabase.rpc('get_revenue_trend', { p_days: days }).then(({ data }) => {
      if (data) {
        setRevenueTrend(
          (data as TrendRow[]).map(row => ({
            ...row,
            fechaLabel: new Date(row.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
          })) as TrendRow[]
        )
      }
    })
  }, [dateRange])

  useEffect(() => {
    const days = dateRange === 'hoy' ? 1 : dateRange === '7d' ? 7 : 30
    supabase.rpc('get_feedback_summary', { p_days: days }).then(({ data }) => {
      if (data) setFeedbackSummary(data as FeedbackSummary)
    })
  }, [dateRange])

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    void Promise.resolve(supabase.rpc('get_daily_kpis', { p_fecha: today }))
  }, [])

  const prevRangeStart = useMemo(() => {
    const d = new Date(rangeStart)
    if (dateRange === 'hoy') d.setDate(d.getDate() - 1)
    else if (dateRange === '7d') d.setDate(d.getDate() - 7)
    else d.setDate(d.getDate() - 30)
    return d
  }, [rangeStart, dateRange])

  const todayOrders = useMemo(() => orders.filter(o => new Date(o.createdAt) >= rangeStart), [orders, rangeStart])
  const prevOrders = useMemo(() => orders.filter(o => { const t = new Date(o.createdAt); return t >= prevRangeStart && t < rangeStart }), [orders, prevRangeStart, rangeStart])
  const completedOrders = useMemo(() => todayOrders.filter(o => o.status === 'entregado'), [todayOrders])
  const prevCompleted = useMemo(() => prevOrders.filter(o => o.status === 'entregado'), [prevOrders])
  const cancelledOrders = useMemo(() => todayOrders.filter(o => o.status === 'cancelado'), [todayOrders])

  const closedSessionsLocal = useMemo(() => tableSessions.filter(s => { const t = new Date(s.createdAt); return t >= rangeStart && !s.activa && s.billStatus === 'cerrada' }), [tableSessions, rangeStart])
  const closedSessions = closedSessionsDB.length > 0 ? closedSessionsDB : closedSessionsLocal

  const adoptionRate = useMemo(() => {
    if (!todayOrders.length) return 0
    return Math.round((todayOrders.filter(o => o.isQrOrder).length / todayOrders.length) * 100)
  }, [todayOrders])

  const avgOrderTime = useMemo(() => {
    const withTimes = todayOrders.filter(o => o.confirmedAt && o.createdAt)
    if (!withTimes.length) return 0
    return withTimes.reduce((sum, o) => sum + (new Date(o.confirmedAt!).getTime() - new Date(o.createdAt).getTime()) / 60000, 0) / withTimes.length
  }, [todayOrders])

  const errorRate = useMemo(() => {
    if (!todayOrders.length) return 0
    return Math.round((cancelledOrders.length / todayOrders.length) * 100)
  }, [cancelledOrders, todayOrders])

  const totalRevenue = useMemo(() => completedOrders.reduce((sum, o) => sum + calculateOrderTotal(o.items), 0), [completedOrders])
  const prevRevenue = useMemo(() => prevCompleted.reduce((sum, o) => sum + calculateOrderTotal(o.items), 0), [prevCompleted])
  const revenueDiff = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : null

  const closedCount = closedSessions.length
  const avgTicket = closedCount > 0 ? totalRevenue / closedCount : 0
  const activeTableCount = useMemo(() => tables.filter(t => t.activa).length || 1, [tables])
  const avgRotation = closedCount / activeTableCount

  const avgPrepTime = useMemo(() => {
    const withTimes = completedOrders.filter(o => o.tiempoInicioPreparacion && o.tiempoFinPreparacion)
    if (!withTimes.length) return 0
    return withTimes.reduce((sum, o) => sum + (new Date(o.tiempoFinPreparacion!).getTime() - new Date(o.tiempoInicioPreparacion!).getTime()) / 60000, 0) / withTimes.length
  }, [completedOrders])

  const slaCompliance = useMemo(() => {
    const withTimes = completedOrders.filter(o => o.tiempoInicioPreparacion && o.tiempoFinPreparacion)
    if (!withTimes.length) return 100
    const ok = withTimes.filter(o => (new Date(o.tiempoFinPreparacion!).getTime() - new Date(o.tiempoInicioPreparacion!).getTime()) / 60000 <= 15).length
    return Math.round((ok / withTimes.length) * 100)
  }, [completedOrders])

  const activeTables = tableSessions.filter(s => s.activa).length
  const totalTableCount = tableSessions.length > 0 ? Math.max(...tableSessions.map(s => s.mesa)) : 1
  const occupancy = totalTableCount > 0 ? Math.round((activeTables / Math.max(totalTableCount, 1)) * 100) : 0

  const hourlyData = useMemo(() => {
    const buckets: Record<number, number> = {}
    for (let h = 8; h <= 23; h++) buckets[h] = 0
    completedOrders.forEach(o => {
      const h = new Date(o.createdAt).getHours()
      if (h >= 8 && h <= 23) buckets[h] = (buckets[h] || 0) + calculateOrderTotal(o.items)
    })
    return Object.entries(buckets).map(([hour, revenue]) => ({ hour: `${hour}h`, revenue }))
  }, [completedOrders])
  const maxHourRevenue = Math.max(...hourlyData.map(d => d.revenue), 1)

  const trendData = useMemo(() => {
    if (revenueTrend.length > 0) {
      return revenueTrend.map(r => ({
        label: (r as TrendRow & { fechaLabel?: string }).fechaLabel ?? r.fecha,
        ventas: Number(r.total_ventas),
        sesiones: Number(r.total_sesiones),
      }))
    }
    if (dateRange === 'hoy') return []
    const days = dateRange === '7d' ? 7 : 30
    const buckets: Record<string, { ventas: number; sesiones: number }> = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      buckets[d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })] = { ventas: 0, sesiones: 0 }
    }
    completedOrders.forEach(o => {
      const key = new Date(o.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
      if (buckets[key]) buckets[key].ventas += calculateOrderTotal(o.items)
    })
    tableSessions.forEach(s => {
      if (!s.activa && s.billStatus === 'cerrada') {
        const key = new Date(s.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
        if (buckets[key]) buckets[key].sesiones += 1
      }
    })
    return Object.entries(buckets).map(([label, v]) => ({ label, ...v }))
  }, [revenueTrend, dateRange, completedOrders, tableSessions])

  const byChannel = useMemo(() => {
    const map: Record<string, number> = { mesa: 0, mesero: 0, para_llevar: 0, delivery: 0 }
    todayOrders.forEach(o => { map[o.canal] = (map[o.canal] || 0) + 1 })
    const total = todayOrders.length || 1
    return [
      { label: 'Mesa', count: map.mesa + map.mesero, pct: Math.round(((map.mesa + map.mesero) / total) * 100) },
      { label: 'Para llevar', count: map.para_llevar, pct: Math.round((map.para_llevar / total) * 100) },
      { label: 'Delivery', count: map.delivery, pct: Math.round((map.delivery / total) * 100) },
    ]
  }, [todayOrders])

  const topItems = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {}
    completedOrders.forEach(o => o.items.forEach(item => {
      if (!map[item.menuItem.id]) map[item.menuItem.id] = { name: item.menuItem.nombre, qty: 0, revenue: 0 }
      map[item.menuItem.id].qty += item.cantidad
      map[item.menuItem.id].revenue += (item.menuItem.precio + (item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0)) * item.cantidad
    }))
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5)
  }, [completedOrders])

  const pendingCalls = waiterCalls.filter(c => !c.atendido).length

  const handleExportCSV = () => {
    const rows = [
      ['Fecha', 'Mesa', 'Pedido #', 'Item', 'Cantidad', 'Precio Unit', 'Total', 'Estado', 'Canal'],
      ...completedOrders.flatMap(o => o.items.map(item => {
        const extras = item.extras?.reduce((e: number, ex: { precio: number }) => e + ex.precio, 0) || 0
        const unitPrice = item.menuItem.precio + extras
        return [new Date(o.createdAt).toLocaleDateString('es-MX'), o.mesa, o.numero, item.menuItem.nombre, item.cantidad, unitPrice.toFixed(2), (unitPrice * item.cantidad).toFixed(2), o.status, o.canal]
      })),
    ]
    const blob = new Blob([rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `waitless_ventas_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const kpis = [
    { label: dateRange === 'hoy' ? 'Ventas Hoy' : `Ventas (${RANGE_LABELS[dateRange]})`, value: formatPrice(totalRevenue), sub: `${completedOrders.length} pedidos completados`, diff: revenueDiff, mint: false },
    { label: 'Ticket Promedio', value: formatPrice(avgTicket), sub: `${closedCount} sesiones cerradas`, diff: null, mint: false },
    { label: 'Tiempo orden→cocina', value: avgOrderTime > 0 ? `${avgOrderTime.toFixed(1)} min` : '— min', sub: `SLA ${slaCompliance}% ≤15 min`, diff: null, mint: false },
    { label: 'Ocupación', value: `${activeTables} mesas`, sub: `${occupancy}% de capacidad`, diff: null, mint: false },
    { label: 'Adopción QR', value: `${adoptionRate}%`, sub: `${todayOrders.filter(o => o.isQrOrder).length} pedidos QR`, diff: null, mint: false },
    { label: 'Rotación/mesa', value: avgRotation.toFixed(1), sub: `${closedCount} sesiones / ${activeTableCount} mesas`, diff: null, mint: false },
    { label: 'Tasa de error', value: `${errorRate}%`, sub: `${cancelledOrders.length} cancelados`, diff: null, mint: errorRate === 0 },
  ]

  const card: React.CSSProperties = { border: '1px solid #E5E5E5', borderRadius: 14, overflow: 'hidden', background: '#fff' }
  const cardHead: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid #E5E5E5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
  const swiss: React.CSSProperties = { fontSize: 10.5, fontFamily: MONO, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase' as const }

  return (
    <div style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 16, borderBottom: '1px solid #E5E5E5' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2 }}>Reportes · dashboard</div>
          <div style={{ fontSize: 12, fontFamily: MONO, color: 'rgba(0,0,0,0.5)', marginTop: 4 }}>
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={handleExportCSV} style={{ height: 32, padding: '0 14px', border: '1px solid #E5E5E5', borderRadius: 10, fontSize: 12, fontFamily: FONT, fontWeight: 600, background: '#fff', cursor: 'pointer' }}>CSV</button>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.05)', borderRadius: 10, padding: 3 }}>
            {(Object.keys(RANGE_LABELS) as DateRange[]).map(r => (
              <button key={r} onClick={() => setDateRange(r)}
                style={{ height: 28, padding: '0 12px', border: 'none', borderRadius: 7, fontSize: 12.5, fontFamily: FONT, fontWeight: dateRange === r ? 700 : 500, background: dateRange === r ? '#000' : 'transparent', color: dateRange === r ? '#fff' : 'rgba(0,0,0,0.55)', cursor: 'pointer', transition: 'all 0.15s' }}>
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Pending calls alert */}
      {pendingCalls > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: '#DC2626', flexShrink: 0, display: 'inline-block' }} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#991B1B', letterSpacing: '-0.02em' }}>
            {pendingCalls} llamada{pendingCalls !== 1 ? 's' : ''} de mesero sin atender
          </span>
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 10 }}>
        {kpis.map((kpi, i) => (
          <div key={kpi.label} style={{ border: `1px solid ${kpi.mint ? '#BEEBBE' : '#E5E5E5'}`, borderRadius: 14, padding: '14px 14px 12px', background: kpi.mint ? '#BEEBBE' : '#fff' }}>
            <div style={{ fontSize: 10, fontFamily: MONO, color: kpi.mint ? 'rgba(10,58,10,0.6)' : 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.3, marginBottom: 10, minHeight: 28 }}>{kpi.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: kpi.mint ? '#0a3a0a' : '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kpi.value}</div>
            {kpi.diff !== null && kpi.diff !== undefined ? (
              <div style={{ fontSize: 11.5, fontFamily: MONO, marginTop: 6, fontWeight: 600, color: kpi.diff > 0 ? '#0a3a0a' : kpi.diff < 0 ? '#DC2626' : 'rgba(0,0,0,0.4)' }}>
                {kpi.diff > 0 ? '↑' : kpi.diff < 0 ? '↓' : '='} {Math.abs(kpi.diff)}%
              </div>
            ) : (
              <div style={{ fontSize: 10.5, fontFamily: MONO, marginTop: 6, color: kpi.mint ? 'rgba(10,58,10,0.6)' : 'rgba(0,0,0,0.4)', lineHeight: 1.3 }}>{kpi.sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* Ventas por hora */}
      <div style={card}>
        <div style={cardHead}>
          <span style={swiss}>VENTAS POR HORA · {RANGE_LABELS[dateRange]}</span>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', fontFamily: MONO }}>{formatPrice(totalRevenue)}</span>
        </div>
        <div style={{ padding: '16px 16px 12px' }}>
          {totalRevenue > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={hourlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#9CA3AF', fontFamily: MONO }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF', fontFamily: MONO }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '' : `$${v}`} />
                <Tooltip
                  formatter={(value: number) => [formatPrice(value), 'Ventas']}
                  contentStyle={{ border: '1px solid #E5E5E5', borderRadius: 10, fontSize: 12, color: '#111', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontFamily: FONT }}
                  cursor={{ fill: '#F9FAFB' }}
                />
                <Bar dataKey="revenue" radius={[5, 5, 0, 0]}>
                  {hourlyData.map(entry => (
                    <Cell key={entry.hour} fill={entry.revenue === maxHourRevenue && entry.revenue > 0 ? '#BEEBBE' : '#E5E5E5'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontFamily: MONO, color: 'rgba(0,0,0,0.35)' }}>Sin ventas en el período seleccionado</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', fontFamily: MONO, fontSize: 10, color: 'rgba(0,0,0,0.4)', marginTop: 4 }}>
            {['12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'].map(h => <span key={h}>{h}</span>)}
          </div>
        </div>
      </div>

      {/* Tendencia */}
      {dateRange !== 'hoy' && (
        <div style={card}>
          <div style={cardHead}>
            <span style={swiss}>TENDENCIA · {RANGE_LABELS[dateRange]}</span>
          </div>
          <div style={{ padding: '16px' }}>
            {trendData.some(d => d.ventas > 0) ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#9CA3AF', fontFamily: MONO }} axisLine={false} tickLine={false} interval={dateRange === '30d' ? 4 : 0} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF', fontFamily: MONO }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '' : `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [formatPrice(value), 'Ventas']}
                    contentStyle={{ border: '1px solid #E5E5E5', borderRadius: 10, fontSize: 12, color: '#111', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontFamily: FONT }}
                  />
                  <Line type="monotone" dataKey="ventas" stroke="#000" strokeWidth={2} dot={{ r: 3, fill: '#000', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontFamily: MONO, color: 'rgba(0,0,0,0.35)' }}>Sin datos en el período</div>
            )}
          </div>
        </div>
      )}

      {/* 2-col: canal + top items */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Canal + Eficiencia */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={card}>
            <div style={cardHead}>
              <span style={swiss}>VENTAS POR CANAL</span>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {byChannel.map(ch => (
                <div key={ch.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.02em' }}>{ch.label}</span>
                    <span style={{ fontSize: 13, fontFamily: MONO, color: 'rgba(0,0,0,0.5)' }}>{ch.count} <span style={{ fontSize: 11 }}>({ch.pct}%)</span></span>
                  </div>
                  <div style={{ height: 6, background: '#F0F0F0', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#000', borderRadius: 999, width: `${ch.pct}%`, transition: 'width 0.4s' }} />
                  </div>
                </div>
              ))}
              {todayOrders.length === 0 && <div style={{ textAlign: 'center', fontSize: 12.5, fontFamily: MONO, color: 'rgba(0,0,0,0.35)' }}>Sin pedidos</div>}
            </div>
          </div>
          <div style={card}>
            <div style={cardHead}>
              <span style={swiss}>EFICIENCIA</span>
              <span style={{ fontSize: 14, fontWeight: 800, fontFamily: MONO, letterSpacing: '-0.03em', color: slaCompliance >= 90 ? '#0a3a0a' : slaCompliance >= 70 ? '#92400E' : '#DC2626' }}>
                SLA {slaCompliance}%
              </span>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ height: 8, background: '#F0F0F0', borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ height: '100%', borderRadius: 999, width: `${slaCompliance}%`, background: slaCompliance >= 90 ? '#BEEBBE' : slaCompliance >= 70 ? '#FBBF24' : '#DC2626', transition: 'width 0.4s' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 10, textAlign: 'center' }}>
                {[
                  { label: 'Completados', value: completedOrders.length, color: '#0a3a0a' },
                  { label: 'En proceso', value: todayOrders.filter(o => !['entregado', 'cancelado'].includes(o.status)).length, color: '#92400E' },
                  { label: 'Cancelados', value: cancelledOrders.length, color: '#DC2626' },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.04em', color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, fontFamily: MONO, color: 'rgba(0,0,0,0.45)', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #E5E5E5', display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontFamily: MONO }}>
                <span style={{ color: 'rgba(0,0,0,0.5)' }}>Prep. promedio</span>
                <span style={{ fontWeight: 700 }}>{avgPrepTime > 0 ? `${avgPrepTime.toFixed(1)} min` : '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top items */}
        <div style={card}>
          <div style={cardHead}>
            <span style={swiss}>TOP 5 · más vendidos</span>
            <span style={{ fontSize: 11.5, fontFamily: MONO, color: 'rgba(0,0,0,0.4)' }}>{RANGE_LABELS[dateRange]}</span>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {topItems.length > 0 ? topItems.map((item, i) => (
              <div key={item.name} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 40px', gap: 10, alignItems: 'center' }}>
                <span style={{ width: 24, height: 24, borderRadius: 8, background: i === 0 ? '#000' : '#F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i === 0 ? 12 : 11.5, fontWeight: 800, fontFamily: MONO, color: i === 0 ? '#fff' : 'rgba(0,0,0,0.45)' }}>
                  {i === 0 ? '★' : i + 1}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                  <div style={{ height: 4, background: '#F0F0F0', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 999, width: `${Math.round((item.qty / (topItems[0]?.qty || 1)) * 100)}%`, background: i === 2 ? '#BEEBBE' : '#000' }} />
                  </div>
                </div>
                <span style={{ fontSize: 12.5, fontFamily: MONO, fontWeight: 700, textAlign: 'right', letterSpacing: '-0.02em' }}>×{item.qty}</span>
              </div>
            )) : (
              <div style={{ textAlign: 'center', fontSize: 12.5, fontFamily: MONO, color: 'rgba(0,0,0,0.35)', paddingTop: 24 }}>Sin ventas en el período</div>
            )}
          </div>
        </div>
      </div>

      {/* Desglose por método de pago */}
      <PaymentBreakdownWidget />

      {/* Feedback */}
      {feedbackSummary && feedbackSummary.total > 0 && (
        <div style={card}>
          <div style={cardHead}>
            <span style={swiss}>SATISFACCIÓN</span>
            <span style={{ fontSize: 11.5, fontFamily: MONO, color: 'rgba(0,0,0,0.4)' }}>{feedbackSummary.total} reseña{feedbackSummary.total !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ padding: '16px', display: 'flex', alignItems: 'flex-start', gap: 24 }}>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>{feedbackSummary.avg_rating?.toFixed(1) ?? '—'}</div>
              <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginTop: 8 }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <span key={s} style={{ fontSize: 14, color: s <= Math.round(feedbackSummary.avg_rating ?? 0) ? '#FBBF24' : '#E5E5E5' }}>★</span>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[5, 4, 3, 2, 1].map(star => {
                const count = feedbackSummary.dist?.[String(star)] ?? 0
                const pct = feedbackSummary.total > 0 ? Math.round((count / feedbackSummary.total) * 100) : 0
                return (
                  <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontFamily: MONO, color: 'rgba(0,0,0,0.4)', width: 12, flexShrink: 0, fontWeight: 700 }}>{star}</span>
                    <span style={{ fontSize: 12, color: '#FBBF24' }}>★</span>
                    <div style={{ flex: 1, height: 6, background: '#F0F0F0', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#FBBF24', borderRadius: 999, width: `${pct}%` }} />
                    </div>
                    <span style={{ fontSize: 11, fontFamily: MONO, color: 'rgba(0,0,0,0.4)', width: 20, textAlign: 'right', flexShrink: 0, fontWeight: 600 }}>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

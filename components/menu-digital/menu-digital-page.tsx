'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ReviewSection } from '@/components/consumidor/review-section'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuExtra {
  id: string
  nombre: string
  precio: number
}

interface MenuItem {
  id: string
  nombre: string
  descripcion: string
  precio: number
  imagen: string | null
  imagenes: string[]
  colorFondo: string | null
  colorBorde: string | null
  categoriaId: string | null
  extras: MenuExtra[]
}

interface Category {
  id: string
  nombre: string
  orden: number
}

interface MenuData {
  restaurantName: string
  logoUrl: string | null
  primaryColor: string
  accentColor: string
  whatsappNumero: string | null
  poweredByWaitless: boolean
  coverUrl: string | null
  descripcion: string | null
  metodosPago: { efectivo: boolean; tarjeta: boolean; transferencia: boolean }
  categories: Category[]
  items: MenuItem[]
  tenantId: string | null
  tiendaAbierta?: boolean
  impuestoPorcentaje: number
  propinaSugeridaPorcentaje: number
  zonasReparto: string[]
  deliveryHabilitado: boolean
  costoEnvio: number
}

interface CartEntry {
  item: MenuItem
  cantidad: number
  selectedExtras: MenuExtra[]
}

interface OrderResult {
  orderId: string
  numero: number
  canal: 'para_llevar' | 'delivery'
  subtotal: number
  impuestos: number
  propina: number
  costoEnvio: number
  total: number
}

type Screen = 'menu' | 'cart' | 'checkout' | 'success' | 'mensaje'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return '$' + n.toFixed(2)
}

/** Pick a deterministic plate palette index (0–5) from item id */
function palIdx(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h % 6
}

/** True when the category name suggests beverages — use compact list style */
function isBeverageCategory(name: string): boolean {
  const n = name.toLowerCase()
  return n.includes('bebida') || n.includes('drink') || n.includes('coctel') || n.includes('cóctel') || n.includes('beber')
}

// ─── Barcode decoration ───────────────────────────────────────────────────────
const BARCODE_HEIGHTS = [28, 20, 32, 16, 28, 24, 32, 20, 28, 16, 32, 24, 20, 28, 16, 32, 24, 28, 20, 16]

// ─── Main Component ───────────────────────────────────────────────────────────

export function MenuDigitalPage({ slug }: { slug: string }) {
  const [data, setData] = useState<MenuData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>('menu')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartEntry[]>([])
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null)
  const [cartBump, setCartBump] = useState(false)
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const stickyRef = useRef<HTMLDivElement>(null)

  // Checkout state
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [metodoPago, setMetodoPago] = useState<string>('')
  const [notas, setNotas] = useState('')
  const [incluirPropina, setIncluirPropina] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [modoEntrega, setModoEntrega] = useState<'para_llevar' | 'delivery'>('para_llevar')
  const [direccion, setDireccion] = useState('')
  const [zonaReparto, setZonaReparto] = useState('')
  const [copiedTracking, setCopiedTracking] = useState(false)

  // Mensaje state
  const [msgNombre, setMsgNombre] = useState('')
  const [msgTelefono, setMsgTelefono] = useState('')
  const [msgTexto, setMsgTexto] = useState('')
  const [msgSent, setMsgSent] = useState(false)
  const [msgSubmitting, setMsgSubmitting] = useState(false)

  // Auth gate
  const [consumerReady, setConsumerReady] = useState<boolean | null>(null)
  const [showAuthGate, setShowAuthGate] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setConsumerReady(!!session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setConsumerReady(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const requireAuth = (then: () => void) => {
    if (consumerReady) { then(); return }
    setShowAuthGate(true)
  }

  // ─── Fetch menu ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchMenu = (isInitial = false) => {
      fetch(`/api/public/${slug}/menu`, { cache: 'no-store' })
        .then(r => r.json())
        .then(d => {
          if (d.error) { if (isInitial) setError(d.error); return }
          setData(d)
          if (isInitial && d.categories.length > 0) setActiveCategory(d.categories[0].id)
          if (isInitial) {
            const m = d.metodosPago
            if (m.efectivo) setMetodoPago('efectivo')
            else if (m.tarjeta) setMetodoPago('tarjeta')
            else if (m.transferencia) setMetodoPago('transferencia')
          }
        })
        .catch(() => { if (isInitial) setError('No se pudo cargar el menú') })
        .finally(() => { if (isInitial) setLoading(false) })
    }
    fetchMenu(true)
    const interval = setInterval(() => fetchMenu(false), 30_000)
    return () => clearInterval(interval)
  }, [slug])

  // ─── IntersectionObserver: activa el tab según sección visible ────────────
  useEffect(() => {
    if (!data?.categories.length) return
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible) return
        const catId = Object.keys(categoryRefs.current).find(
          id => categoryRefs.current[id] === visible.target
        )
        if (catId) setActiveCategory(catId)
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    )
    Object.values(categoryRefs.current).forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [data])

  // ─── Cart helpers ────────────────────────────────────────────────────────────
  const cartSubtotal = cart.reduce((sum, e) =>
    sum + (e.item.precio + e.selectedExtras.reduce((s, ex) => s + ex.precio, 0)) * e.cantidad, 0)
  const cartCount = cart.reduce((sum, e) => sum + e.cantidad, 0)

  const addToCart = useCallback((item: MenuItem, extras: MenuExtra[] = []) => {
    setCart(prev => {
      const key = extras.map(e => e.id).sort().join(',')
      const existing = prev.find(e =>
        e.item.id === item.id && e.selectedExtras.map(x => x.id).sort().join(',') === key
      )
      if (existing) return prev.map(e => e === existing ? { ...e, cantidad: e.cantidad + 1 } : e)
      return [...prev, { item, cantidad: 1, selectedExtras: extras }]
    })
    setExpandedItem(null)
    setCartBump(true)
    setTimeout(() => setCartBump(false), 400)
  }, [])

  const changeQty = (index: number, delta: number) => {
    setCart(prev =>
      prev.map((e, i) => i === index ? { ...e, cantidad: e.cantidad + delta } : e)
        .filter(e => e.cantidad > 0)
    )
  }

  // ─── Scroll a categoría respetando header sticky ──────────────────────────
  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId)
    const el = categoryRefs.current[catId]
    if (!el) return
    const stickyH = stickyRef.current?.offsetHeight ?? 48
    const y = el.getBoundingClientRect().top + window.scrollY - stickyH - 8
    window.scrollTo({ top: y, behavior: 'smooth' })
  }

  // ─── Order ──────────────────────────────────────────────────────────────────
  const handleOrder = async () => {
    if (!metodoPago) return
    if (modoEntrega === 'delivery' && !direccion.trim()) return
    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setShowAuthGate(true); setSubmitting(false); return }

      const res = await fetch(`/api/public/${slug}/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          items: cart.map(e => ({ itemId: e.item.id, cantidad: e.cantidad, extras: e.selectedExtras })),
          canal: modoEntrega,
          nombreCliente: nombre.trim() || undefined,
          telefono: telefono.trim() || undefined,
          email: email.trim() || undefined,
          direccion: modoEntrega === 'delivery' ? direccion.trim() : undefined,
          zonaReparto: modoEntrega === 'delivery' && zonaReparto ? zonaReparto : undefined,
          metodoPago,
          notas: notas.trim() || undefined,
          incluirPropina,
        }),
      })
      const json = await res.json()
      if (json.error) { alert(json.error); return }
      setOrderResult({ orderId: json.orderId, numero: json.numero, canal: json.canal, subtotal: json.subtotal, impuestos: json.impuestos, propina: json.propina, costoEnvio: json.costoEnvio ?? 0, total: json.total })
      setCart([])
      setScreen('success')
    } catch {
      alert('Error al enviar el pedido. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Mensaje ─────────────────────────────────────────────────────────────────
  const handleMensaje = async () => {
    if (!msgTexto.trim()) return
    setMsgSubmitting(true)
    try {
      const res = await fetch(`/api/public/${slug}/mensaje`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: msgTexto, nombre: msgNombre, telefono: msgTelefono }),
      })
      const json = await res.json()
      if (json.error) { alert(json.error); return }
      setMsgSent(true)
    } catch {
      alert('Error al enviar. Intentá de nuevo.')
    } finally {
      setMsgSubmitting(false)
    }
  }

  // ─── Loading / Error ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mnu-loading">
        <div className="mnu-spinner" />
        <p className="mnu-loading-label">Cargando menú</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mnu-error">
        <div className="mnu-error-icon">W</div>
        <p className="mnu-error-title">Menú no disponible</p>
        <p className="mnu-error-sub">{error ?? 'No se encontró este restaurante.'}</p>
      </div>
    )
  }

  const impuestoPct = data.impuestoPorcentaje ?? 0
  const propinaPct  = data.propinaSugeridaPorcentaje ?? 0
  const itemsByCategory = (catId: string) => data.items.filter(i => i.categoriaId === catId)
  const uncategorized = data.items.filter(i => !data.categories.some(c => c.id === i.categoriaId))

  // Totales preview en checkout
  const checkoutImpuestos = impuestoPct > 0 ? Math.round(cartSubtotal * (impuestoPct / 100) * 100) / 100 : 0
  const checkoutPropina   = (propinaPct > 0 && incluirPropina) ? Math.round(cartSubtotal * (propinaPct / 100) * 100) / 100 : 0
  const checkoutEnvio     = modoEntrega === 'delivery' ? (data.costoEnvio ?? 0) : 0
  const checkoutTotal     = cartSubtotal + checkoutImpuestos + checkoutPropina + checkoutEnvio

  // ─── SUCCESS / Receipt ────────────────────────────────────────────────────────
  if (screen === 'success' && orderResult) {
    const isDelivery = orderResult.canal === 'delivery'
    const trackingUrl = typeof window !== 'undefined' ? `${window.location.origin}/tracking/${orderResult.orderId}` : ''

    const copyTracking = () => {
      navigator.clipboard.writeText(trackingUrl)
      setCopiedTracking(true)
      setTimeout(() => setCopiedTracking(false), 2000)
    }

    return (
      <div className="mnu-receipt-wrap">
        {/* Seal */}
        <div className="mnu-receipt-seal">
          <div className="mnu-receipt-seal-inner">
            <span style={{ fontSize: 24, color: '#0a3a0a', fontWeight: 900 }}>✓</span>
          </div>
        </div>

        <p className="mnu-receipt-label" style={{ marginTop: 0 }}>Pedido recibido</p>
        <div className="mnu-receipt-num">#{orderResult.numero}</div>
        <p className="mnu-receipt-sub">
          {isDelivery ? 'Tu pedido está en preparación. Te avisamos cuando salga.' : 'Tu pedido está en camino a la cocina.'}
        </p>

        {/* Receipt card */}
        <div className="mnu-receipt-card">
          <div className="mnu-receipt-card-title">Resumen</div>
          <div className="mnu-receipt-row mnu-leader">
            <span className="mnu-receipt-row-label">Subtotal</span>
            <span style={{ flex: 1, margin: '0 8px' }} />
            <span className="mnu-receipt-row-val">{fmt(orderResult.subtotal)}</span>
          </div>
          {orderResult.impuestos > 0 && (
            <div className="mnu-receipt-row mnu-leader">
              <span className="mnu-receipt-row-label">Impuesto ({impuestoPct}%)</span>
              <span style={{ flex: 1, margin: '0 8px' }} />
              <span className="mnu-receipt-row-val">{fmt(orderResult.impuestos)}</span>
            </div>
          )}
          {orderResult.propina > 0 && (
            <div className="mnu-receipt-row mnu-leader">
              <span className="mnu-receipt-row-label">Propina ({propinaPct}%)</span>
              <span style={{ flex: 1, margin: '0 8px' }} />
              <span className="mnu-receipt-row-val">{fmt(orderResult.propina)}</span>
            </div>
          )}
          {isDelivery && (
            <div className="mnu-receipt-row mnu-leader">
              <span className="mnu-receipt-row-label">Envío</span>
              <span style={{ flex: 1, margin: '0 8px' }} />
              <span className="mnu-receipt-row-val">{orderResult.costoEnvio > 0 ? fmt(orderResult.costoEnvio) : 'Gratis'}</span>
            </div>
          )}
          <div className="mnu-receipt-total-row">
            <span className="mnu-receipt-total-label">Total</span>
            <span className="mnu-receipt-total-val">{fmt(orderResult.total)}</span>
          </div>
        </div>

        {/* Barcode decoration */}
        <div className="mnu-barcode">
          {BARCODE_HEIGHTS.map((h, i) => (
            <span key={i} style={{ height: `${h}px` }} />
          ))}
        </div>

        {/* Actions */}
        <div className="mnu-receipt-actions">
          {isDelivery && (
            <button
              onClick={copyTracking}
              className={`mnu-receipt-btn ${copiedTracking ? 'mnu-receipt-btn-copied' : ''}`}
            >
              {copiedTracking
                ? <>✓ Link copiado</>
                : <>⧉ Copiar link de seguimiento</>
              }
            </button>
          )}
          {data.whatsappNumero && (
            <a
              href={`https://wa.me/${data.whatsappNumero.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mnu-receipt-btn"
              style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}
            >
              📱 Contactar por WhatsApp
            </a>
          )}
          <button
            onClick={() => {
              setScreen('menu')
              setNombre('')
              setTelefono('')
              setEmail('')
              setNotas('')
              setDireccion('')
              setZonaReparto('')
              setModoEntrega('para_llevar')
            }}
            className="mnu-receipt-btn"
          >
            Seguir explorando el menú
          </button>
        </div>

        {data.poweredByWaitless && (
          <p className="mnu-powered">Powered by WAITLESS</p>
        )}
      </div>
    )
  }

  // ─── MENSAJE ─────────────────────────────────────────────────────────────────
  if (screen === 'mensaje') {
    return (
      <div className="mnu-root" style={{ display: 'flex', flexDirection: 'column' }}>
        <header className="mnu-screen-header">
          <button className="mnu-screen-header-back" onClick={() => setScreen('menu')}>
            ←
          </button>
          <h1>Enviar mensaje</h1>
        </header>

        <div style={{ flex: 1, padding: '20px', maxWidth: 520, margin: '0 auto', width: '100%' }}>
          {msgSent ? (
            <div className="mnu-msg-sent">
              <div className="mnu-msg-sent-icon">
                <span style={{ fontSize: 20, color: '#0a3a0a', fontWeight: 900 }}>✓</span>
              </div>
              <div>
                <p className="mnu-msg-sent-title">Mensaje enviado</p>
                <p className="mnu-msg-sent-sub">El restaurante lo recibirá pronto.</p>
              </div>
              <button
                onClick={() => setScreen('menu')}
                className="mnu-receipt-btn"
                style={{ maxWidth: 200, border: '1px solid var(--mnu-line)', color: '#000', marginTop: 8 }}
              >
                Volver al menú
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="mnu-field-label">Nombre</label>
                  <input
                    value={msgNombre}
                    onChange={e => setMsgNombre(e.target.value)}
                    placeholder="Tu nombre"
                    className="mnu-field-input"
                  />
                </div>
                <div>
                  <label className="mnu-field-label">Teléfono</label>
                  <input
                    value={msgTelefono}
                    onChange={e => setMsgTelefono(e.target.value)}
                    placeholder="+52 55..."
                    className="mnu-field-input"
                  />
                </div>
              </div>
              <div>
                <label className="mnu-field-label">Mensaje *</label>
                <textarea
                  value={msgTexto}
                  onChange={e => setMsgTexto(e.target.value)}
                  placeholder="Escribe tu mensaje al restaurante..."
                  rows={5}
                  maxLength={1000}
                  className="mnu-field-textarea"
                />
                <p style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', textAlign: 'right', marginTop: 2 }}>
                  {msgTexto.length}/1000
                </p>
              </div>
              <button
                className="mnu-cta-btn"
                style={{ justifyContent: 'center' }}
                disabled={!msgTexto.trim() || msgSubmitting}
                onClick={handleMensaje}
              >
                {msgSubmitting ? 'Enviando...' : 'Enviar mensaje'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── CHECKOUT ────────────────────────────────────────────────────────────────
  if (screen === 'checkout') {
    const metodos = Object.entries(data.metodosPago).filter(([, v]) => v).map(([k]) => k)
    const metodoLabels: Record<string, string> = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' }
    const isDeliveryMode = modoEntrega === 'delivery'
    const canSubmit = !!metodoPago && (!isDeliveryMode || !!direccion.trim())

    return (
      <div className="mnu-root" style={{ display: 'flex', flexDirection: 'column' }}>
        <header className="mnu-screen-header">
          <button className="mnu-screen-header-back" onClick={() => setScreen('cart')}>
            ←
          </button>
          <h1>Confirmar pedido</h1>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 96, maxWidth: 520, margin: '0 auto', width: '100%' }}>

          {/* Modo de entrega */}
          {data.deliveryHabilitado && (
            <div style={{ padding: '20px 20px 0' }}>
              <p className="mnu-section-label">Tipo de entrega</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={`mnu-entrega-btn ${!isDeliveryMode ? 'mnu-entrega-btn-on' : ''}`}
                  onClick={() => setModoEntrega('para_llevar')}
                >
                  <span style={{ fontSize: 14 }}>⊞</span> Para llevar
                </button>
                <button
                  className={`mnu-entrega-btn ${isDeliveryMode ? 'mnu-entrega-btn-on' : ''}`}
                  onClick={() => setModoEntrega('delivery')}
                >
                  <span style={{ fontSize: 14 }}>→</span> Delivery
                </button>
              </div>
            </div>
          )}

          {/* Campos de delivery */}
          {isDeliveryMode && (
            <div style={{ padding: '20px 20px 0' }}>
              <p className="mnu-section-label">
                Dirección de entrega{' '}
                <span style={{ textTransform: 'none', fontWeight: 400, color: '#f87171' }}>*</span>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,0,0,0.25)', pointerEvents: 'none', fontSize: 14 }}>◈</span>
                  <input
                    value={direccion}
                    onChange={e => setDireccion(e.target.value)}
                    placeholder="Calle, número, colonia..."
                    className="mnu-field-input"
                    style={{ paddingLeft: 36 }}
                  />
                </div>
                {data.zonasReparto.length > 0 && (
                  <select
                    value={zonaReparto}
                    onChange={e => setZonaReparto(e.target.value)}
                    className="mnu-field-select"
                  >
                    <option value="">Zona (opcional)</option>
                    {data.zonasReparto.map(z => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                )}
                <p style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11 }}>→</span> El costo de envío será confirmado por el restaurante.
                </p>
              </div>
            </div>
          )}

          {/* Resumen del pedido */}
          <div style={{ padding: '20px 20px 0' }}>
            <p className="mnu-section-label">Tu pedido</p>
            <div className="mnu-order-card">
              {cart.map((entry, i) => {
                const ext = entry.selectedExtras.reduce((s, e) => s + e.precio, 0)
                return (
                  <div key={i} className="mnu-order-row">
                    <div style={{ flex: 1, marginRight: 12, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#000' }}>
                        {entry.cantidad}× {entry.item.nombre}
                      </p>
                      {entry.selectedExtras.length > 0 && (
                        <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>
                          {entry.selectedExtras.map(e => e.nombre).join(' · ')}
                        </p>
                      )}
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#000', flexShrink: 0 }}>
                      {fmt((entry.item.precio + ext) * entry.cantidad)}
                    </p>
                  </div>
                )
              })}

              {/* Desglose */}
              <div className="mnu-order-tally">
                <div className="mnu-tally-row">
                  <span>Subtotal</span><span>{fmt(cartSubtotal)}</span>
                </div>
                {checkoutImpuestos > 0 && (
                  <div className="mnu-tally-row">
                    <span>Impuesto ({impuestoPct}%)</span><span>{fmt(checkoutImpuestos)}</span>
                  </div>
                )}
                {propinaPct > 0 && (
                  <div className="mnu-tally-row" style={{ alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={incluirPropina}
                        onChange={e => setIncluirPropina(e.target.checked)}
                        style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#000' }}
                      />
                      Propina sugerida ({propinaPct}%)
                    </label>
                    <span style={incluirPropina ? {} : { textDecoration: 'line-through', opacity: 0.4 }}>
                      {fmt(Math.round(cartSubtotal * (propinaPct / 100) * 100) / 100)}
                    </span>
                  </div>
                )}
                {modoEntrega === 'delivery' && (
                  <div className="mnu-tally-row">
                    <span>Envío</span><span>{checkoutEnvio > 0 ? fmt(checkoutEnvio) : 'Gratis'}</span>
                  </div>
                )}
                <div className="mnu-tally-total">
                  <span>Total</span><span>{fmt(checkoutTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Datos opcionales */}
          <div style={{ padding: '20px 20px 0' }}>
            <p className="mnu-section-label">
              Tus datos{' '}
              <span style={{ textTransform: 'none', fontWeight: 400, fontSize: 10, color: 'rgba(0,0,0,0.3)' }}>(opcional)</span>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre" className="mnu-field-input" />
              <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Teléfono" type="tel" className="mnu-field-input" />
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo electrónico" type="email" className="mnu-field-input" />
            </div>
          </div>

          {/* Método de pago */}
          <div style={{ padding: '20px 20px 0' }}>
            <p className="mnu-section-label">Método de pago</p>
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: `repeat(${metodos.length}, 1fr)` }}>
              {metodos.map(m => (
                <button
                  key={m}
                  className={`mnu-pay-btn ${metodoPago === m ? 'mnu-pay-btn-on' : ''}`}
                  onClick={() => setMetodoPago(m)}
                >
                  {metodoLabels[m] ?? m}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div style={{ padding: '20px 20px 0' }}>
            <p className="mnu-section-label">
              Notas{' '}
              <span style={{ textTransform: 'none', fontWeight: 400, fontSize: 10, color: 'rgba(0,0,0,0.3)' }}>(opcional)</span>
            </p>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Alergias, instrucciones especiales..."
              rows={3}
              maxLength={500}
              className="mnu-field-textarea"
            />
          </div>
        </div>

        {/* CTA footer */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid var(--mnu-line-2)', padding: 16 }}>
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <button
              className="mnu-cta-btn"
              disabled={!canSubmit || submitting}
              onClick={handleOrder}
            >
              <span>{submitting ? 'Enviando...' : 'Hacer pedido'}</span>
              <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>{fmt(checkoutTotal)}</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── CART ────────────────────────────────────────────────────────────────────
  if (screen === 'cart') {
    return (
      <div className="mnu-root" style={{ display: 'flex', flexDirection: 'column' }}>
        <header className="mnu-screen-header">
          <button className="mnu-screen-header-back" onClick={() => setScreen('menu')}>
            ←
          </button>
          <h1>Tu carrito</h1>
          {cartCount > 0 && (
            <span className="mnu-screen-header-count">{cartCount} {cartCount === 1 ? 'ítem' : 'ítems'}</span>
          )}
        </header>

        {cart.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32, textAlign: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,0.4)' }}>Tu carrito está vacío</p>
            <button
              onClick={() => setScreen('menu')}
              className="mnu-receipt-btn"
              style={{ maxWidth: 160, border: '1px solid var(--mnu-line)', color: '#000', marginTop: 8 }}
            >
              Ver menú
            </button>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 200, maxWidth: 520, margin: '0 auto', width: '100%' }}>
              {cart.map((entry, i) => {
                const ext = entry.selectedExtras.reduce((s, e) => s + e.precio, 0)
                const foto = entry.item.imagenes[0] ?? entry.item.imagen
                return (
                  <div key={i} className="mnu-cart-item">
                    {foto && (
                      <div
                        className={`mnu-cart-item-thumb mnu-plate mnu-pal-${palIdx(entry.item.id)}`}
                        style={entry.item.colorFondo ? { background: entry.item.colorFondo } : {}}
                      >
                        <img src={foto} alt={entry.item.nombre} />
                      </div>
                    )}
                    {!foto && (
                      <div className={`mnu-cart-item-thumb mnu-plate mnu-pal-${palIdx(entry.item.id)}`} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="mnu-cart-item-name">{entry.item.nombre}</p>
                      {entry.selectedExtras.length > 0 && (
                        <p className="mnu-cart-item-extras">{entry.selectedExtras.map(e => e.nombre).join(' · ')}</p>
                      )}
                      <p className="mnu-cart-item-price">{fmt((entry.item.precio + ext) * entry.cantidad)}</p>
                    </div>
                    <div className="mnu-cart-stepper">
                      <button className="mnu-cart-stepper-btn" onClick={() => changeQty(i, -1)}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8" stroke="#000" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      </button>
                      <span className="mnu-cart-stepper-num">{entry.cantidad}</span>
                      <button
                        className="mnu-cart-stepper-btn"
                        onClick={() => changeQty(i, 1)}
                        style={{ background: '#000', borderColor: '#000' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M7 3v8M3 7h8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mnu-cart-footer">
              <div style={{ maxWidth: 520, margin: '0 auto' }}>
                {/* Delivery / Recoger selector */}
                {data.deliveryHabilitado && (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.4)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
                      ¿Cómo querés recibirlo?
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className={`mnu-entrega-btn ${modoEntrega === 'para_llevar' ? 'mnu-entrega-btn-on' : ''}`}
                        onClick={() => setModoEntrega('para_llevar')}
                        style={{ flexDirection: 'column', gap: 2, height: 52 }}
                      >
                        <span style={{ fontSize: 14 }}>⊞</span>
                        <span style={{ fontSize: 11 }}>Recoger en tienda</span>
                      </button>
                      <button
                        className={`mnu-entrega-btn ${modoEntrega === 'delivery' ? 'mnu-entrega-btn-on' : ''}`}
                        onClick={() => setModoEntrega('delivery')}
                        style={{ flexDirection: 'column', gap: 2, height: 52 }}
                      >
                        <span style={{ fontSize: 14 }}>→</span>
                        <span style={{ fontSize: 11 }}>Envío a domicilio</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="mnu-subtotal-row">
                  <p className="mnu-subtotal-label">Subtotal</p>
                  <p className="mnu-subtotal-val">{fmt(cartSubtotal)}</p>
                </div>
                <button className="mnu-cta-btn" onClick={() => setScreen('checkout')}>
                  <span>{modoEntrega === 'delivery' ? 'Continuar — Ingresar dirección' : 'Continuar al pago'}</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // ─── ITEM CARD ───────────────────────────────────────────────────────────────
  const ItemCard = ({ item, compact = false }: { item: MenuItem; compact?: boolean }) => {
    const isExpanded = expandedItem === item.id
    const [selectedExtras, setSelectedExtras] = useState<MenuExtra[]>([])
    const foto = item.imagenes[0] ?? item.imagen
    const extrasPrice = selectedExtras.reduce((s, e) => s + e.precio, 0)
    const pal = palIdx(item.id)

    const toggleExtra = (extra: MenuExtra) =>
      setSelectedExtras(prev =>
        prev.some(e => e.id === extra.id) ? prev.filter(e => e.id !== extra.id) : [...prev, extra]
      )

    if (compact) {
      // Beverage-style compact row
      return (
        <li className="mnu-drink-row mnu-leader">
          <div>
            <div className={`mnu-drink-name mnu-font-display`}>{item.nombre}</div>
            {item.descripcion && (
              <div className="mnu-drink-sub">{item.descripcion}</div>
            )}
          </div>
          <span style={{ flex: 1, margin: '0 8px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div className={`mnu-font-display mnu-drink-name mnu-num`}>{fmt(item.precio + extrasPrice)}</div>
            <button
              className="mnu-add-btn mnu-add-btn-sm"
              onClick={() => addToCart(item, [])}
            >+</button>
          </div>
        </li>
      )
    }

    // Standard dish row
    return (
      <li className="mnu-dish">
        <div className="mnu-dish-info">
          <div className={`mnu-dish-name mnu-font-display`}>{item.nombre}</div>
          {item.descripcion && (
            <div className="mnu-dish-desc">{item.descripcion}</div>
          )}

          {/* Extras expansion */}
          {isExpanded && item.extras.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {item.extras.map(extra => {
                  const checked = selectedExtras.some(e => e.id === extra.id)
                  return (
                    <div key={extra.id} className="mnu-leader" style={{ paddingBottom: 4, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          className={`mnu-check ${checked ? 'mnu-check-on' : ''}`}
                          onClick={() => toggleExtra(extra)}
                          style={{ cursor: 'pointer' }}
                        >
                          {checked ? '✓' : ''}
                        </span>
                        <button
                          onClick={() => toggleExtra(extra)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#000', padding: 0 }}
                        >
                          {extra.nombre} {extra.precio > 0 ? `(+${fmt(extra.precio)})` : ''}
                        </button>
                      </span>
                      <span className="mnu-mono" style={{ fontWeight: 700, flexShrink: 0 }}>
                        {extra.precio > 0 ? `+${fmt(extra.precio)}` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className={`mnu-font-display mnu-dish-price mnu-num`}>{fmt(item.precio + extrasPrice)}</div>
            {isExpanded && item.extras.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  className="mnu-add-btn"
                  onClick={() => addToCart(item, selectedExtras)}
                >+</button>
                <button
                  onClick={() => setExpandedItem(null)}
                  style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <button
                className="mnu-add-btn"
                onClick={() => {
                  if (item.extras.length > 0) {
                    setExpandedItem(isExpanded ? null : item.id)
                  } else {
                    addToCart(item, [])
                  }
                }}
              >+</button>
            )}
          </div>
        </div>

        {/* Plate thumbnail */}
        {!compact && (
          <div className={`mnu-plate mnu-plate-lg mnu-pal-${pal}`}>
            {foto && <img src={foto} alt={item.nombre} />}
          </div>
        )}
      </li>
    )
  }

  // ─── MAIN MENU ───────────────────────────────────────────────────────────────
  const allCategories = data.categories
  const cerrada = data.tiendaAbierta === false

  return (
    <div className="mnu-frame-outer">
      {/* LEFT marginalia (desktop only) */}
      <aside className="mnu-aside mnu-aside-left">
        <div style={{ maxWidth: 260, textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginBottom: 12 }}>
            <span className="mnu-live-dot" style={{ width: 7, height: 7 }} />
            <span className="mnu-eyebrow">Sesión activa</span>
          </div>
          <div className={`mnu-font-display`} style={{ fontSize: 34 }}>{data.restaurantName}</div>
          {data.descripcion && (
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)', letterSpacing: '-0.01em', marginTop: 8 }}>
              {data.descripcion}
            </p>
          )}
          <div style={{ marginTop: 24 }} className="mnu-mono" />
          <div style={{ marginTop: 24, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(0,0,0,0.45)' }}>
            ↑ Fig. A · vista comensal
          </div>
        </div>
      </aside>

      {/* PHONE / MENU FRAME */}
      <main className="mnu-frame">

        {/* ─── BANNER ─── */}
        <div className="mnu-banner" style={data.coverUrl ? {} : {}}>
          {data.coverUrl && (
            <img
              src={data.coverUrl}
              alt=""
              className={`mnu-banner-cover ${cerrada ? 'mnu-closed' : ''}`}
            />
          )}

          {/* Back button */}
          <button className="mnu-banner-btn mnu-banner-btn-back" onClick={() => history.back()}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M8.5 3L4 7l4.5 4" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {/* Info button */}
          <button className="mnu-banner-btn mnu-banner-btn-info">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="#000" strokeWidth="1.3" />
              <path d="M7 6v4M7 4v.2" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {/* Live pill */}
          <div className="mnu-live-pill">
            <span className="mnu-live-dot" style={{ width: 6, height: 6 }} />
            {cerrada ? 'Cerrado' : 'En vivo'}
          </div>

          {/* Closed badge (replaces info when closed) */}
          {cerrada && (
            <div className="mnu-closed-badge" style={{ top: 16, right: 16, position: 'absolute' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
              </svg>
              Cerrada
            </div>
          )}

          {/* Bottom info */}
          <div className="mnu-banner-info">
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <div className={`mnu-font-display mnu-restaurant-name`}>{data.restaurantName}</div>
                {data.descripcion && (
                  <div className="mnu-restaurant-tagline">{data.descripcion}</div>
                )}
              </div>
              <div className="mnu-logo-sq">
                {data.logoUrl ? (
                  <img src={data.logoUrl} alt={data.restaurantName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span className={`mnu-font-display`} style={{ fontSize: 18, color: '#000' }}>
                    {data.restaurantName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── SESSION BAR ─── */}
        <div className="mnu-session-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="mnu-eyebrow">Pide en mesa</span>
            <span style={{ color: 'rgba(0,0,0,0.3)' }}>·</span>
            <span className="mnu-mono" style={{ fontSize: 11.5, color: 'rgba(0,0,0,0.65)' }}>comparte con tu grupo</span>
          </div>
          {data.whatsappNumero && (
            <a
              href={`https://wa.me/${data.whatsappNumero.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mnu-wa-btn"
            >
              📱 WhatsApp
            </a>
          )}
        </div>

        {/* Closed bar */}
        {cerrada && (
          <div className="mnu-closed-bar">
            <div className="mnu-closed-dot" />
            <p className="mnu-closed-text">Tienda cerrada — no aceptamos pedidos ahora</p>
          </div>
        )}

        {/* ─── CATEGORY TABS ─── */}
        {allCategories.length > 0 && (
          <div ref={stickyRef} className="mnu-tabs-wrap">
            <div className="mnu-tabs">
              {allCategories.map(cat => (
                <button
                  key={cat.id}
                  className={`mnu-tab ${activeCategory === cat.id ? 'mnu-tab-active' : ''}`}
                  onClick={() => scrollToCategory(cat.id)}
                >
                  {cat.nombre}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── SECTIONS ─── */}
        <div style={{ paddingBottom: cartCount > 0 && !cerrada ? 0 : 80 }}>
          {allCategories.map((cat, idx) => {
            const catItems = itemsByCategory(cat.id)
            if (catItems.length === 0) return null
            const isBev = isBeverageCategory(cat.nombre)

            return (
              <div key={cat.id}>
                {idx > 0 && (
                  <div className="mnu-section-divider">
                    <div className="mnu-section-divider-line" />
                  </div>
                )}
                <section
                  id={`cat-${cat.id}`}
                  ref={el => { categoryRefs.current[cat.id] = el as HTMLDivElement | null }}
                  className="mnu-section"
                  style={isBev ? { paddingBottom: 112 } : {}}
                >
                  <div className="mnu-section-header">
                    <span className="mnu-swiss-num">§ {String(idx + 1).padStart(2, '0')}</span>
                    <span className="mnu-section-hr" />
                    <h2 className={`mnu-font-display mnu-section-title`}>{cat.nombre}</h2>
                  </div>

                  {isBev ? (
                    <ul className="mnu-drink-list">
                      {catItems.map(item => <ItemCard key={item.id} item={item} compact />)}
                    </ul>
                  ) : (
                    <ul className="mnu-dish-list">
                      {catItems.map(item => <ItemCard key={item.id} item={item} />)}
                    </ul>
                  )}
                </section>
              </div>
            )
          })}

          {uncategorized.length > 0 && (
            <div>
              {allCategories.length > 0 && (
                <div className="mnu-section-divider">
                  <div className="mnu-section-divider-line" />
                </div>
              )}
              <section className="mnu-section">
                <div className="mnu-section-header">
                  <span className="mnu-swiss-num">§ {String(allCategories.length + 1).padStart(2, '0')}</span>
                  <span className="mnu-section-hr" />
                  <h2 className={`mnu-font-display mnu-section-title`}>Otros</h2>
                </div>
                <ul className="mnu-dish-list">
                  {uncategorized.map(item => <ItemCard key={item.id} item={item} />)}
                </ul>
              </section>
            </div>
          )}

          {data.poweredByWaitless && (
            <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(0,0,0,0.2)', letterSpacing: '0.18em', textTransform: 'uppercase', padding: '16px 0 8px' }}>
              Powered by WAITLESS
            </p>
          )}

          <ReviewSection slug={slug} />
        </div>

        {/* ─── CART STICKY FAB ─── */}
        {cartCount > 0 && !cerrada && (
          <div className="mnu-cart-fab-wrap">
            <button
              className={`mnu-cart-fab ${cartBump ? 'mnu-bump' : ''}`}
              onClick={() => requireAuth(() => setScreen('cart'))}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="mnu-cart-count mnu-font-display mnu-num">{cartCount}</span>
                <div>
                  <div className="mnu-cart-label-main">Ver carrito y pagar</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mnu-cart-subtotal-sub">Subtotal</div>
                <div className={`mnu-cart-subtotal-val mnu-font-display mnu-num`}>{fmt(cartSubtotal)}</div>
              </div>
            </button>
            <div className="mnu-cart-split-hint">
              Paga ahora <strong>o</strong> al final · divide entre tu grupo en segundos
            </div>
          </div>
        )}

      </main>

      {/* RIGHT marginalia (desktop only) */}
      <aside className="mnu-aside mnu-aside-right">
        <div style={{ maxWidth: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span className="mnu-eyebrow">→ Cómo funciona</span>
          </div>
          <ol className="mnu-mono" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12 }}>
            <li style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: 'rgba(0,0,0,0.45)', flexShrink: 0 }}>01</span>
              <span>Escaneas el QR de tu mesa.</span>
            </li>
            <li style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: 'rgba(0,0,0,0.45)', flexShrink: 0 }}>02</span>
              <span>Agregas lo tuyo. Cada quien al suyo.</span>
            </li>
            <li style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: 'rgba(0,0,0,0.45)', flexShrink: 0 }}>03</span>
              <span>Cocina recibe al instante.</span>
            </li>
            <li style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: 'rgba(0,0,0,0.45)', flexShrink: 0 }}>04</span>
              <span>Pagan dividido, sin esperar la cuenta.</span>
            </li>
          </ol>
          <div style={{ marginTop: 28, borderTop: '1px solid var(--mnu-line)', paddingTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className="mnu-live-dot" style={{ width: 6, height: 6 }} />
              <span className="mnu-eyebrow">Cocina · en vivo</span>
            </div>
          </div>
          <div style={{ marginTop: 28, fontSize: 10, fontFamily: 'var(--mnu-mono)', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(0,0,0,0.45)' }}>
            Powered by <strong style={{ color: '#000' }}>WAITLESS</strong>
          </div>
        </div>
      </aside>

      {/* ─── AUTH GATE MODAL ─── */}
      {showAuthGate && (
        <div className="mnu-auth-overlay" onClick={() => setShowAuthGate(false)}>
          <div className="mnu-auth-card" onClick={e => e.stopPropagation()}>
            <div className="mnu-auth-icon">
              <span style={{ fontSize: 22, color: '#fff' }}>◎</span>
            </div>
            <p className="mnu-auth-title">Iniciá sesión para pedir</p>
            <p className="mnu-auth-sub">
              Necesitás una cuenta de Waitless para realizar pedidos en cualquier restaurante.
            </p>
            <a
              href={`/consumidor?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : `/menu/${slug}`)}`}
              className="mnu-auth-login-btn"
            >
              Iniciar sesión / Registrarme
            </a>
            <button className="mnu-auth-cancel-btn" onClick={() => setShowAuthGate(false)}>
              Seguir explorando el menú
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

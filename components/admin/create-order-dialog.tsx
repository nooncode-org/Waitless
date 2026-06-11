'use client'

import { useState, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { formatPrice, type Channel, type MenuItem } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

const inputStyle: React.CSSProperties = {
  width: '100%', height: 34, padding: '0 10px', borderRadius: 8,
  border: '1px solid #E5E5E5', fontSize: 13, fontFamily: FONT,
  outline: 'none', boxSizing: 'border-box', background: '#fff',
}
const inputErrStyle: React.CSSProperties = { ...inputStyle, borderColor: '#FCA5A5' }

interface CreateOrderDialogProps {
  channel: Channel
  onClose: () => void
}

interface CartItem {
  item: MenuItem
  cantidad: number
}

interface FormErrors {
  nombre?: string
  telefono?: string
  direccion?: string
  zona?: string
}

export function CreateOrderDialog({ channel, onClose }: CreateOrderDialogProps) {
  const { menuItems, addToCart, createOrder, getDeliveryZones, calculateDeliveryCost } = useApp()

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [zona, setZona] = useState('')
  const [referencias, setReferencias] = useState('')
  const [search, setSearch] = useState('')
  const [localCart, setLocalCart] = useState<CartItem[]>([])
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const deliveryZones = getDeliveryZones()
  const isDelivery = channel === 'delivery'

  const filteredItems = menuItems.filter(m => m.disponible && m.nombre.toLowerCase().includes(search.toLowerCase()))

  const addItem = (item: MenuItem) => {
    setLocalCart(prev => {
      const existing = prev.find(c => c.item.id === item.id)
      if (existing) return prev.map(c => c.item.id === item.id ? { ...c, cantidad: c.cantidad + 1 } : c)
      return [...prev, { item, cantidad: 1 }]
    })
  }

  const removeItem = (itemId: string) => {
    setLocalCart(prev => {
      const existing = prev.find(c => c.item.id === itemId)
      if (existing && existing.cantidad > 1) return prev.map(c => c.item.id === itemId ? { ...c, cantidad: c.cantidad - 1 } : c)
      return prev.filter(c => c.item.id !== itemId)
    })
  }

  const getItemQuantity = (itemId: string) => localCart.find(c => c.item.id === itemId)?.cantidad || 0

  const subtotal = localCart.reduce((sum, c) => sum + c.item.precio * c.cantidad, 0)
  const costoEnvio = isDelivery && zona ? calculateDeliveryCost(zona) : 0
  const total = subtotal + costoEnvio
  const selectedZone = deliveryZones.find(z => z.nombre === zona)

  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case 'nombre':
        if (isDelivery && !value.trim()) return 'El nombre es requerido'
        if (value && value.length < 2) return 'Nombre muy corto'
        return undefined
      case 'telefono':
        if (isDelivery && !value.trim()) return 'El teléfono es requerido'
        if (value && !/^\d{10}$/.test(value.replace(/\D/g, ''))) return 'Teléfono inválido (10 dígitos)'
        return undefined
      case 'direccion':
        if (isDelivery && !value.trim()) return 'La dirección es requerida'
        if (isDelivery && value.length < 10) return 'Dirección muy corta'
        return undefined
      case 'zona':
        if (isDelivery && !value) return 'Selecciona una zona de reparto'
        return undefined
      default: return undefined
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    const ne = validateField('nombre', nombre); if (ne) newErrors.nombre = ne
    const te = validateField('telefono', telefono); if (te) newErrors.telefono = te
    const de = validateField('direccion', direccion); if (de) newErrors.direccion = de
    const ze = validateField('zona', zona); if (ze) newErrors.zona = ze
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleBlur = (field: string, value: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const error = validateField(field, value)
    setErrors(prev => ({ ...prev, [field]: error }))
  }

  const handleSubmit = () => {
    if (!validateForm() || localCart.length === 0) return
    localCart.forEach(({ item, cantidad }) => { addToCart(item, cantidad) })
    createOrder(channel, undefined, {
      nombre: nombre || undefined,
      telefono: telefono.replace(/\D/g, '') || undefined,
      direccion: isDelivery ? `${direccion}${referencias ? ` (Ref: ${referencias})` : ''}` : undefined,
      zonaReparto: zona || undefined,
      costoEnvio: costoEnvio || undefined,
    })
    onClose()
  }

  const canSubmit = useMemo(() => {
    if (localCart.length === 0) return false
    if (channel === 'para_llevar') return true
    if (isDelivery) return !!(nombre.trim() && telefono.trim() && direccion.trim() && zona)
    return true
  }, [localCart.length, channel, isDelivery, nombre, telefono, direccion, zona])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: FONT }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 14px', borderBottom: '1px solid #F5F5F5', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isDelivery && <span style={{ fontSize: 16 }}>↑</span>}
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
              Nuevo pedido {isDelivery ? 'delivery' : 'para llevar'}
            </h2>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E5E5E5', background: '#FAFAFA', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Customer info */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F5F5F5' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#333', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              ◎ Datos del cliente
              {isDelivery && <span style={{ fontSize: 10, background: '#FEE2E2', color: '#991B1B', padding: '2px 7px', borderRadius: 999, fontWeight: 700 }}>Requerido</span>}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>
                  Nombre {isDelivery && <span style={{ color: '#DC2626' }}>*</span>}
                </label>
                <input value={nombre} onChange={e => setNombre(e.target.value)} onBlur={() => handleBlur('nombre', nombre)} placeholder="Nombre del cliente" style={errors.nombre && touched.nombre ? inputErrStyle : inputStyle} />
                {errors.nombre && touched.nombre && <p style={{ fontSize: 10, color: '#DC2626', marginTop: 2 }}>⚠ {errors.nombre}</p>}
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>
                  Teléfono {isDelivery && <span style={{ color: '#DC2626' }}>*</span>}
                </label>
                <input value={telefono} onChange={e => setTelefono(e.target.value)} onBlur={() => handleBlur('telefono', telefono)} placeholder="55 1234 5678" type="tel" style={errors.telefono && touched.telefono ? inputErrStyle : inputStyle} />
                {errors.telefono && touched.telefono && <p style={{ fontSize: 10, color: '#DC2626', marginTop: 2 }}>⚠ {errors.telefono}</p>}
              </div>
            </div>

            {isDelivery && (
              <>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>
                    Zona de reparto <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <select value={zona} onChange={e => { setZona(e.target.value); handleBlur('zona', e.target.value) }} style={{ ...inputStyle, appearance: 'none' }}>
                    <option value="">Selecciona zona...</option>
                    {deliveryZones.map(z => (
                      <option key={z.nombre} value={z.nombre}>{z.nombre} - {formatPrice(z.costoEnvio)} ({z.tiempoEstimado} min)</option>
                    ))}
                  </select>
                  {errors.zona && touched.zona && <p style={{ fontSize: 10, color: '#DC2626', marginTop: 2 }}>⚠ {errors.zona}</p>}
                  {selectedZone && (
                    <div style={{ marginTop: 6, padding: '8px 10px', background: '#F5F5F5', borderRadius: 8, fontSize: 11 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#999' }}>Costo de envío:</span>
                        <span style={{ fontWeight: 700 }}>{formatPrice(selectedZone.costoEnvio)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#999' }}>Tiempo estimado:</span>
                        <span>{selectedZone.tiempoEstimado} minutos</span>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>
                    Dirección completa <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <textarea value={direccion} onChange={e => setDireccion(e.target.value)} onBlur={() => handleBlur('direccion', direccion)} placeholder="Calle, número exterior e interior, colonia..." rows={2} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${errors.direccion && touched.direccion ? '#FCA5A5' : '#E5E5E5'}`, fontSize: 13, fontFamily: FONT, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                  {errors.direccion && touched.direccion && <p style={{ fontSize: 10, color: '#DC2626', marginTop: 2 }}>⚠ {errors.direccion}</p>}
                </div>

                <div>
                  <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>Referencias (opcional)</label>
                  <input value={referencias} onChange={e => setReferencias(e.target.value)} placeholder="Entre calles, color de casa, etc." style={inputStyle} />
                </div>
              </>
            )}
          </div>

          {/* Menu items */}
          <div style={{ padding: '14px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#333', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Agregar productos</p>
            <input type="search" placeholder="Buscar platillo..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredItems.map(item => {
                const qty = getItemQuantity(item.id)
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#F5F5F5', borderRadius: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</p>
                      <p style={{ fontSize: 11, color: '#666', margin: 0, fontFamily: MONO }}>{formatPrice(item.precio)}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {qty > 0 && (
                        <>
                          <button onClick={() => removeItem(item.id)} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid #DDD', background: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                          <span style={{ fontSize: 12, fontWeight: 700, width: 18, textAlign: 'center', fontFamily: MONO }}>{qty}</span>
                        </>
                      )}
                      <button onClick={() => addItem(item)} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${qty > 0 ? '#DDD' : '#000'}`, background: qty > 0 ? '#fff' : '#000', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: qty > 0 ? '#333' : '#fff' }}>+</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {localCart.length > 0 && (
          <div style={{ borderTop: '1px solid #F5F5F5', padding: '14px 20px', flexShrink: 0 }}>
            <div style={{ fontSize: 12, marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#999' }}>
                <span>Subtotal ({localCart.reduce((s, c) => s + c.cantidad, 0)} items)</span>
                <span style={{ color: '#333', fontFamily: MONO }}>{formatPrice(subtotal)}</span>
              </div>
              {isDelivery && costoEnvio > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#999' }}>
                  <span>Envío ({zona})</span>
                  <span style={{ color: '#333', fontFamily: MONO }}>{formatPrice(costoEnvio)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, paddingTop: 6, borderTop: '1px solid #F5F5F5' }}>
                <span>Total</span>
                <span style={{ fontFamily: MONO }}>{formatPrice(total)}</span>
              </div>
            </div>
            <button onClick={handleSubmit} disabled={!canSubmit} style={{ width: '100%', height: 42, borderRadius: 10, border: 'none', background: !canSubmit ? '#CCC' : '#000', color: '#fff', fontSize: 13, fontWeight: 700, cursor: !canSubmit ? 'default' : 'pointer', fontFamily: FONT }}>
              {isDelivery ? 'Crear pedido de delivery' : 'Crear pedido para llevar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

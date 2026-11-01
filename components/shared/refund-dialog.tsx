'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'
import { canDo } from '@/lib/permissions'
import type { Order } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

interface RefundDialogProps {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RefundDialog({ order, open, onOpenChange }: RefundDialogProps) {
  const { createRefund, currentUser } = useApp()
  const [tipo, setTipo] = useState<'total' | 'parcial'>('total')
  const [motivo, setMotivo] = useState('')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [customAmount, setCustomAmount] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState(false)

  const formatPrice = (price: number) => `$${price.toFixed(2)}`

  const calculateTotal = () => {
    if (tipo === 'total') {
      return order.items.reduce((sum, item) => sum + item.menuItem.precio * item.cantidad, 0)
    }
    if (selectedItems.length > 0) {
      return order.items
        .filter(item => selectedItems.includes(item.id))
        .reduce((sum, item) => sum + item.menuItem.precio * item.cantidad, 0)
    }
    return customAmount
  }

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    )
  }

  const handleSubmit = () => {
    if (!motivo.trim()) return
    if (!canDo(currentUser?.role, 'hacer_refund')) return
    setIsProcessing(true)
    const refundAmount = calculateTotal()
    const itemIds = tipo === 'parcial' && selectedItems.length > 0 ? selectedItems : undefined
    createRefund(order.id, refundAmount, motivo, tipo, itemIds, currentUser?.id)
    setTimeout(() => {
      setIsProcessing(false)
      onOpenChange(false)
      setTipo('total'); setMotivo(''); setSelectedItems([]); setCustomAmount(0)
    }, 500)
  }

  const refundAmount = calculateTotal()
  const canSubmit = motivo.trim() && refundAmount > 0 && canDo(currentUser?.role, 'hacer_refund')

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', fontFamily: FONT }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '92vh', overflow: 'auto', padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Procesar Reembolso</h2>
            <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Pedido #{order.numero} — el inventario se revertirá automáticamente</p>
          </div>
          <button onClick={() => onOpenChange(false)} style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid #E5E5E5', background: '#FAFAFA', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', flexShrink: 0 }}>×</button>
        </div>

        {/* Tipo */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#333', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Tipo de reembolso</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['total', 'parcial'] as const).map(t => (
              <button key={t} onClick={() => setTipo(t)} style={{ flex: 1, height: 38, borderRadius: 10, border: `1px solid ${tipo === t ? '#000' : '#E5E5E5'}`, background: tipo === t ? '#000' : '#FAFAFA', color: tipo === t ? '#fff' : '#333', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, textTransform: 'capitalize' }}>
                {t === 'total' ? 'Total' : 'Parcial'}
              </button>
            ))}
          </div>
        </div>

        {/* Items para reembolso parcial */}
        {tipo === 'parcial' && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#333', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Selecciona items a reembolsar</p>
            <div style={{ border: '1px solid #E5E5E5', borderRadius: 12, overflow: 'hidden', maxHeight: 200, overflowY: 'auto' }}>
              {order.items.map((item, i) => (
                <label key={item.id} onClick={() => handleItemToggle(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: i === 0 ? 'none' : '1px solid #E5E5E5', cursor: 'pointer', background: selectedItems.includes(item.id) ? '#F0FFF0' : '#fff' }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${selectedItems.includes(item.id) ? '#000' : '#CCC'}`, background: selectedItems.includes(item.id) ? '#000' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {selectedItems.includes(item.id) && <span style={{ color: '#fff', fontSize: 11 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.menuItem.nombre}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>Cantidad: {item.cantidad}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{formatPrice(item.menuItem.precio * item.cantidad)}</span>
                </label>
              ))}
            </div>

            {selectedItems.length === 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#333', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>O ingresa un monto personalizado</p>
                <input
                  type="number" min="0" step="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(Number(e.target.value))}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E5E5', fontSize: 14, fontFamily: MONO, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            )}
          </div>
        )}

        {/* Motivo */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#333', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Motivo del reembolso *</p>
          <textarea
            placeholder="Describe el motivo del reembolso..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E5E5', fontSize: 13, fontFamily: FONT, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Resumen */}
        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: 14, marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 8 }}>⚠ Resumen del Reembolso</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: '#666' }}>Tipo:</span>
            <span style={{ fontWeight: 600 }}>{tipo === 'total' ? 'Total' : 'Parcial'}</span>
          </div>
          {tipo === 'parcial' && selectedItems.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span style={{ color: '#666' }}>Items:</span>
              <span style={{ fontWeight: 600 }}>{selectedItems.length} seleccionados</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, paddingTop: 8, borderTop: '1px solid #FED7AA', marginTop: 4 }}>
            <span style={{ color: '#666' }}>Monto a reembolsar:</span>
            <span style={{ fontWeight: 700, color: '#92400E' }}>{formatPrice(refundAmount)}</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => onOpenChange(false)} style={{ flex: 1, height: 44, borderRadius: 10, border: '1px solid #E5E5E5', background: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, color: '#333' }}>
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isProcessing}
            style={{ flex: 2, height: 44, borderRadius: 10, border: 'none', background: !canSubmit || isProcessing ? '#CCC' : '#B45309', color: '#fff', fontSize: 14, fontWeight: 700, cursor: !canSubmit || isProcessing ? 'default' : 'pointer', fontFamily: FONT }}
          >
            {isProcessing ? 'Procesando...' : 'Procesar Reembolso'}
          </button>
        </div>
      </div>
    </div>
  )
}

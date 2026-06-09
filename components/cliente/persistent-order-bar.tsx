'use client'

import { formatPrice } from '@/lib/store'
import type { TableSession } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MINT = '#BEEBBE'

interface PersistentOrderBarProps {
  cartCount: number
  cartSubtotal: number
  activeOrderCount: number
  session: TableSession | null | undefined
  canOrder: boolean
  onViewCart: () => void
  onViewStatus: () => void
  onViewBill: () => void
}

export function PersistentOrderBar({
  cartCount,
  cartSubtotal,
  activeOrderCount,
  session,
  canOrder,
  onViewCart,
  onViewStatus,
  onViewBill,
}: PersistentOrderBarProps) {
  const barStyle: React.CSSProperties = {
    position: 'fixed', left: 0, right: 0,
    bottom: 'calc(52px + env(safe-area-inset-bottom))',
    padding: '0 16px 12px', zIndex: 40, pointerEvents: 'none',
  }

  const billStatus = session?.billStatus
  const isPaid = billStatus === 'pagada'
  // La cuenta está "solicitada" cuando el cliente pidió pagar (billStatus 'en_pago').
  // NO usar paymentStatus === 'pendiente': ese es el valor por defecto de toda sesión
  // nueva, lo que hacía aparecer "Cuenta solicitada" (y ocultaba el carrito) sin motivo.
  const isBillRequested = session?.billStatus === 'en_pago'

  if (isPaid) {
    return (
      <div style={barStyle}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '12px 16px', background: '#f0fdf0', border: '1px solid #bbf7b0',
          borderRadius: 20, pointerEvents: 'auto', fontFamily: FONT,
        }}>
          <span style={{ fontSize: 16, color: '#166534' }}>✓</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>Cuenta pagada — ¡Gracias!</span>
        </div>
      </div>
    )
  }

  if (isBillRequested) {
    return (
      <div style={barStyle}>
        <button
          onClick={onViewBill}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', background: '#fff8e1', border: '1px solid #ffe082',
            borderRadius: 20, cursor: 'pointer', pointerEvents: 'auto', fontFamily: FONT,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, color: '#b45309' }}>$</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#b45309' }}>Cuenta solicitada</span>
          </div>
          <span style={{ fontSize: 12, color: '#b45309', opacity: 0.7 }}>El mesero viene a cobrarte →</span>
        </button>
      </div>
    )
  }

  if (cartCount > 0 && canOrder) {
    return (
      <div style={barStyle}>
        <button
          onClick={onViewCart}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px', background: '#000', color: '#fff',
            borderRadius: 20, cursor: 'pointer', pointerEvents: 'auto',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)', border: 'none', fontFamily: FONT,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⊞</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>
              {cartCount} item{cartCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{formatPrice(cartSubtotal)}</span>
            <span style={{ fontSize: 12, opacity: 0.65 }}>Ver pedido →</span>
          </div>
        </button>
      </div>
    )
  }

  if (activeOrderCount > 0) {
    return (
      <div style={barStyle}>
        <button
          onClick={onViewStatus}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px', background: '#111', color: '#fff',
            borderRadius: 20, cursor: 'pointer', pointerEvents: 'auto',
            boxShadow: '0 2px 10px rgba(0,0,0,0.12)', border: 'none', fontFamily: FONT,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>≡</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>
              {activeOrderCount} pedido{activeOrderCount !== 1 ? 's' : ''} activo{activeOrderCount !== 1 ? 's' : ''}
            </span>
          </div>
          <span style={{ fontSize: 12, opacity: 0.65 }}>Ver estado →</span>
        </button>
      </div>
    )
  }

  return null
}

'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'

import { MenuView } from './menu-view'
import { CartView } from './cart-view'
import { OrderStatusView } from './order-status-view'
import { ItemDetailView } from './item-detail-view'
import { BillView } from './bill-view'
import { PaymentSubmitView } from './payment-submit-view'
import { ClienteBottomNav } from './cliente-bottom-nav'
import { TableSessionBar } from './table-session-bar'
import { PersistentOrderBar } from './persistent-order-bar'
import { WaiterCallDialog } from './waiter-call-dialog'
import { RewardsSheet } from './rewards-sheet'

import type { MenuItem } from '@/lib/store'
import type { ClienteUser } from '@/lib/cliente-auth'
import { WaitlessLogo } from '@/components/ui/waitless-logo'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const GOOGLE_REVIEW_URL_FALLBACK = 'https://g.page/r/review/write'

type ClienteScreen = 'menu' | 'item' | 'cart' | 'status' | 'bill' | 'payment' | 'feedback'

interface ClienteViewProps {
  mesa: number
  onBack: () => void
  clienteUser?: ClienteUser | null
}

/* =======================
   FEEDBACK SCREEN
======================= */
function FeedbackScreen({ onFinish, sessionId, mesa }: { onFinish: () => void; sessionId: string; mesa: number }) {
  const { config, addFeedback } = useApp()
  const googleReviewUrl = config.googleReviewUrl || GOOGLE_REVIEW_URL_FALLBACK
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const labels: Record<number, string> = {
    1: 'Muy malo',
    2: 'Malo',
    3: 'Regular',
    4: 'Bueno',
    5: 'Excelente',
  }

  const handleSubmit = async () => {
    if (isSubmitting || rating === 0) return
    setIsSubmitting(true)
    try {
      await addFeedback(mesa, rating, comment, sessionId)
    } finally {
      setSubmitted(true)
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div style={{
        minHeight: '100svh',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
        fontFamily: FONT,
      }}>
        <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
          <WaitlessLogo size={48} color="dark" imageUrl={config.logoUrl} imageAlt={config.restaurantName ?? 'Logo'} />
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#000', margin: 0 }}>¡Gracias!</h2>
            <p style={{ fontSize: 14, color: '#666', marginTop: 6 }}>Tu opinión nos ayuda a mejorar cada día.</p>
          </div>
          {rating >= 4 && (
            <div style={{ marginTop: 24 }}>
              <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>¿Te animás a dejarnos una reseña en Google?</p>
              <button
                style={{
                  width: '100%', height: 52, background: '#000', color: '#fff',
                  border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8, fontFamily: FONT,
                }}
                onClick={() => window.open(googleReviewUrl, '_blank')}
              >
                <span>↗</span> Reseñar en Google
              </button>
            </div>
          )}
          <button
            style={{
              marginTop: 16, width: '100%', background: 'none', border: 'none',
              color: '#888', fontSize: 14, cursor: 'pointer', padding: '8px 0', fontFamily: FONT,
            }}
            onClick={onFinish}
          >
            Finalizar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100svh',
      background: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 24px',
      fontFamily: FONT,
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <WaitlessLogo size={48} color="dark" imageUrl={config.logoUrl} imageAlt={config.restaurantName ?? 'Logo'} />
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#000', marginTop: 16, marginBottom: 4 }}>
            ¿Cómo estuvo tu experiencia?
          </h2>
          <p style={{ fontSize: 14, color: '#666' }}>Tu opinión es muy importante para nosotros</p>
        </div>

        {/* Stars */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 36, lineHeight: 1, padding: 4,
                color: (hovered || rating) >= star ? '#000' : '#ddd',
                transition: 'color 0.15s, transform 0.1s',
                transform: (hovered || rating) >= star ? 'scale(1.1)' : 'scale(1)',
              }}
              aria-label={`${star} estrella${star !== 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
        </div>

        <div style={{ textAlign: 'center', height: 20, marginBottom: 20 }}>
          {(hovered || rating) > 0 && (
            <p style={{ fontSize: 13, fontWeight: 600, color: '#000' }}>
              {labels[hovered || rating]}
            </p>
          )}
        </div>

        {rating > 0 && (
          <div style={{ marginBottom: 20 }}>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={rating >= 4 ? '¿Qué fue lo que más te gustó?' : '¿Qué podríamos mejorar?'}
              rows={3}
              style={{
                width: '100%', border: '1.5px solid #e5e5e5', borderRadius: 12,
                padding: '12px', fontSize: 14, fontFamily: FONT, resize: 'none',
                outline: 'none', boxSizing: 'border-box', color: '#000',
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            disabled={rating === 0 || isSubmitting}
            style={{
              width: '100%', height: 52, background: rating === 0 || isSubmitting ? '#ccc' : '#000',
              color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700,
              cursor: rating === 0 || isSubmitting ? 'not-allowed' : 'pointer', fontFamily: FONT,
            }}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar opinión'}
          </button>
          <button
            style={{
              background: 'none', border: 'none', color: '#888', fontSize: 14,
              cursor: 'pointer', padding: '8px 0', fontFamily: FONT,
            }}
            onClick={onFinish}
          >
            Omitir
          </button>
        </div>
      </div>
    </div>
  )
}

/* =======================
   COMPONENT
======================= */
export function ClienteView({ mesa, onBack, clienteUser }: ClienteViewProps) {
  const {
    orders,
    cart,
    tableSessions,
    createTableSession,
    getTableSession,
    clearCart,
    waiterCalls,
    addLoyaltyPoints,
    config,
    tenantId,
  } = useApp()

  const [screen, setScreen] = useState<ClienteScreen>('menu')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [showWaiterCall, setShowWaiterCall] = useState(false)
  const [showRewards, setShowRewards] = useState(false)
  const [loyaltyPhone, setLoyaltyPhone] = useState('')

  useEffect(() => {
    const existingSession = getTableSession(mesa)
    if (!existingSession) {
      // Sesión nueva (QR recién escaneado / mesa distinta): arrancar limpio.
      // Vaciar el carrito que pudiera haber quedado de una sesión/mesa anterior
      // en el localStorage de este dispositivo. En un refresh con sesión activa
      // no entra acá, así que no se pierde un carrito en curso.
      createTableSession(mesa)
      clearCart()
    }
  }, [mesa, getTableSession, createTableSession, clearCart])

  const session = tableSessions.find(s => s.mesa === mesa && s.activa)
  const sessionId = session?.id ?? ''

  useEffect(() => {
    if (!session && screen !== 'feedback') {
      const closedSession = tableSessions.find(
        s => s.mesa === mesa && !s.activa && s.billStatus === 'cerrada'
      )
      if (closedSession) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setScreen('feedback')
      }
    }
  }, [session, mesa, tableSessions, screen])

  useEffect(() => {
    if (session?.billStatus === 'pagada') {
      const activeOrders = (session.orders || []).filter(
        o => o.status !== 'entregado' && o.status !== 'cancelado'
      )
      if (activeOrders.length === 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setScreen('feedback')
      }
    }
  }, [session])

  const tableOrders = orders.filter(
    o => o.mesa === mesa && o.status !== 'entregado' && o.status !== 'cancelado'
  )

  const cartSubtotal = cart.reduce((sum, item) => {
    const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
    return sum + (item.menuItem.precio + extrasTotal) * item.cantidad
  }, 0)

  const canOrder = !session || session.billStatus === 'abierta'

  const hasActiveWaiterCall = waiterCalls.some(
    c => c.mesa === mesa && !c.atendido
  )

  const showChrome = ['menu', 'status', 'bill'].includes(screen)
  const showBottomNav = ['menu', 'status'].includes(screen)

  const goMenu = () => setScreen('menu')

  const handleSelectItem = (item: MenuItem) => {
    if (!canOrder) return
    setSelectedItem(item)
    setScreen('item')
  }

  const handleFinishFeedback = () => {
    onBack()
  }

  const renderScreen = () => {
    switch (screen) {
      case 'feedback':
        return <FeedbackScreen onFinish={handleFinishFeedback} sessionId={sessionId} mesa={mesa} />

      case 'item':
        return selectedItem ? (
          <ItemDetailView
            item={selectedItem}
            onBack={goMenu}
            onAddToCart={goMenu}
            cartItemCount={cart.length}
            canOrder={canOrder}
          />
        ) : null

      case 'cart':
        return (
          <CartView
            mesa={mesa}
            onBack={goMenu}
            onOrderConfirmed={(subtotal) => {
              if (loyaltyPhone) {
                addLoyaltyPoints(loyaltyPhone, subtotal, session?.id)
              }
              setScreen('status')
            }}
            loyaltyPhone={loyaltyPhone}
            onSetLoyaltyPhone={setLoyaltyPhone}
          />
        )

      case 'status':
        return (
          <OrderStatusView
            orders={tableOrders}
            mesa={mesa}
            onBack={goMenu}
          />
        )

      case 'bill':
        return session ? (
          <BillView
            sessionId={sessionId}
            mesa={mesa}
            onBack={goMenu}
            onShowRewards={() => setShowRewards(true)}
            onPayNow={tenantId ? () => setScreen('payment') : undefined}
          />
        ) : null

      case 'payment':
        return session && tenantId ? (
          <PaymentSubmitView
            sessionId={sessionId}
            tenantId={tenantId}
            totalMonto={session.total ?? 0}
            onBack={() => setScreen('bill')}
            onSubmitted={goMenu}
          />
        ) : null

      default:
        return (
          <MenuView
            mesa={mesa}
            onSelectItem={handleSelectItem}
            onGoToCart={() => setScreen('cart')}
            cartItemCount={cart.length}
            hasActiveOrders={tableOrders.length > 0}
            onViewStatus={() => setScreen('status')}
            onExit={onBack}
            canOrder={canOrder}
          />
        )
    }
  }

  return (
    <div style={{ minHeight: '100svh', background: '#fff', display: 'flex', flexDirection: 'column', fontFamily: FONT }}>
      {showChrome && (
        <TableSessionBar
          mesa={mesa}
          restaurantName={config.restaurantName}
          logoUrl={config.logoUrl}
          session={session}
          activeOrderCount={tableOrders.length}
          cartCount={cart.length}
          onViewBill={session ? () => setScreen('bill') : undefined}
        />
      )}

      {clienteUser && showChrome && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 16px', background: '#f5f5f5', borderBottom: '1px solid #eee',
        }}>
          <span style={{ fontSize: 12, color: '#666' }}>
            Hola, <strong style={{ color: '#000' }}>{clienteUser.nombre}</strong>
          </span>
        </div>
      )}

      <div style={{ paddingBottom: showBottomNav ? 124 : 0 }}>
        {renderScreen()}
      </div>

      {showBottomNav && (
        <PersistentOrderBar
          cartCount={cart.length}
          cartSubtotal={cartSubtotal}
          activeOrderCount={tableOrders.length}
          session={session}
          canOrder={canOrder}
          onViewCart={() => setScreen('cart')}
          onViewStatus={() => setScreen('status')}
          onViewBill={() => setScreen('bill')}
        />
      )}

      {showBottomNav && (
        <ClienteBottomNav
          activeScreen={screen}
          onMenuClick={() => setScreen('menu')}
          onStatusClick={() => setScreen('status')}
          onBillClick={() => setScreen('bill')}
          onCallWaiter={() => setShowWaiterCall(true)}
          hasActiveOrders={tableOrders.length > 0}
          cartCount={cart.length}
          hasActiveWaiterCall={hasActiveWaiterCall}
          hasSession={!!session}
        />
      )}

      {showWaiterCall && (
        <WaiterCallDialog
          mesa={mesa}
          onClose={() => setShowWaiterCall(false)}
        />
      )}

      {showRewards && (
        <RewardsSheet
          sessionId={sessionId}
          onClose={() => setShowRewards(false)}
        />
      )}

      {config.poweredByWaitless === true && (
        <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 10, color: '#bbb', fontFamily: FONT }}>
          Powered by WAITLESS
        </div>
      )}
    </div>
  )
}

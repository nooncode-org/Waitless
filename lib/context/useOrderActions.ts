'use client'

import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { AppState } from './types'
import type {
  Order,
  OrderItem,
  Channel,
  OrderStatus,
  KitchenStatus,
  IngredientUnit,
  CancelReason,
} from '../store'
import {
  generateId,
  generateOrderNumber,
  generateDeviceId,
  calculateOrderTotal,
  deductIngredients,
  restoreIngredients,
  canPrepareItem,
} from '../store'
import { supabase } from '../supabase'
import { executeOrQueue } from '../offline-queue'
import { pushTriggers } from '../push-triggers'
import { syncOrderToSupabase, syncSessionToSupabase, syncQrSession, syncQrOrder } from './sync'
import { logAction } from './log-action'

type SetState = Dispatch<SetStateAction<AppState>>

export function useOrderActions(state: AppState, setState: SetState) {
  const createOrder = useCallback(async (
    canal: Channel,
    mesa?: number,
    clienteInfo?: { nombre?: string; telefono?: string; email?: string; notas?: string; direccion?: string; zonaReparto?: string; costoEnvio?: number },
    seatNumber?: number
  ): Promise<Order | null> => {
    if (state.cart.length === 0) return null

    // Task 2.7: construir lista de deducciones para RPC atómica
    const deductions: Array<{ ingredient_id: string; cantidad: number; motivo: string; user_id: string }> = []
    for (const cartItem of state.cart) {
      if (cartItem.menuItem.receta) {
        for (const ri of cartItem.menuItem.receta) {
          deductions.push({
            ingredient_id: ri.ingredientId,
            cantidad: ri.cantidad * cartItem.cantidad,
            motivo: `Pedido automático (${canal})`,
            user_id: state.currentUser?.id ?? 'system',
          })
        }
      }
      // Extras con receta
      if (cartItem.extras) {
        for (const extra of cartItem.extras) {
          if (extra.receta) {
            for (const ri of extra.receta) {
              deductions.push({
                ingredient_id: ri.ingredientId,
                cantidad: ri.cantidad * cartItem.cantidad,
                motivo: `Extra: ${extra.nombre} (${canal})`,
                user_id: state.currentUser?.id ?? 'system',
              })
            }
          }
        }
      }
    }

    // Si hay ingredientes a descontar, llamar RPC atómica PRIMERO
    // Esto garantiza que dos cocinas no consuman el mismo stock simultáneamente
    if (deductions.length > 0) {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('deduct_ingredients_for_order', { deductions })
      if (rpcError || !rpcResult?.success) {
        const failedName = (rpcResult as { failed_ingredient?: string } | null)?.failed_ingredient ?? 'ingrediente'
        const { toast } = await import('sonner')
        toast.error(`Sin stock suficiente de "${failedName}". Actualizando inventario...`)
        // Reconciliar: recargar stock real desde Supabase
        const { data: freshRows } = await supabase.from('ingredients').select('*').eq('activo', true)
        if (freshRows) {
          const fresh = freshRows.map(row => ({
            id: row.id as string,
            nombre: row.nombre as string,
            categoria: row.categoria as string,
            unidad: row.unidad as IngredientUnit,
            stockActual: Number(row.stock_actual) || 0,
            stockMinimo: Number(row.stock_minimo) || 0,
            cantidadMaxima: Number(row.cantidad_maxima) || 0,
            costoUnitario: Number(row.costo_unitario) || 0,
            activo: (row.activo ?? true) as boolean,
          }))
          setState(prev => ({
            ...prev,
            ingredients: fresh,
            menuItems: prev.menuItems.map(item => {
              const { canPrepare } = canPrepareItem(item, fresh)
              return { ...item, disponible: canPrepare }
            }),
          }))
        }
        return null
      }
      // RPC exitosa — la DB ya tiene los valores correctos; realtime los entregará al state
      // Actualizar estado local optimistamente para respuesta inmediata
    }

    // Check inventory locally (para compatibilidad con items sin receta)
    let newIngredients = [...state.ingredients]
    for (const cartItem of state.cart) {
      const { canPrepare } = canPrepareItem(cartItem.menuItem, newIngredients)
      if (!canPrepare && deductions.length === 0) {
        return null // solo bloquear si no hubo RPC (items sin receta)
      }
      newIngredients = deductIngredients(cartItem.menuItem, cartItem.cantidad, newIngredients, cartItem.extras)
    }

    // For table orders, number relative to session; for others, use global counter
    let orderNumero: number
    if (mesa) {
      const session = state.tableSessions.find(s => s.mesa === mesa && s.activa)
      orderNumero = (session?.orders?.length || 0) + 1
    } else {
      orderNumero = generateOrderNumber()
    }

    const order: Order = {
      id: generateId(),
      numero: orderNumero,
      canal,
      mesa,
      seatNumber,
      items: state.cart.map(item => ({ ...item })),
      status: 'recibido',
      cocinaStatus: 'en_cola',
      confirmedAt: new Date(),
      isQrOrder: canal === 'mesa' && !state.currentUser, // QR order = mesa channel with no logged user
      createdAt: new Date(),
      updatedAt: new Date(),
      nombreCliente: clienteInfo?.nombre,
      telefono: clienteInfo?.telefono,
      email: clienteInfo?.email,
      notas: clienteInfo?.notas,
      direccion: clienteInfo?.direccion,
      zonaReparto: clienteInfo?.zonaReparto,
    }

    // Determine session before setState to use for Supabase sync
    const existingSession = mesa ? state.tableSessions.find(s => s.mesa === mesa && s.activa) : undefined
    const newSessionId = generateId()
    const usedSessionId = existingSession?.id ?? (mesa ? newSessionId : undefined)
    const expiresAt = new Date(Date.now() + state.config.tiempoExpiracionSesionMinutos * 60 * 1000)

    setState(prev => {
      // Update table session if applicable
      let tableSessions = prev.tableSessions
      if (mesa) {
        const sessionIndex = tableSessions.findIndex(s => s.mesa === mesa && s.activa)
        if (sessionIndex >= 0) {
  const session = tableSessions[sessionIndex]

  const newOrders = [...session.orders, order]
  const subtotal = newOrders.reduce(
    (sum, o) => sum + calculateOrderTotal(o.items),
    0
  )
  const impuestos = subtotal * (prev.config.impuestoPorcentaje / 100)

  tableSessions = [...tableSessions]
  tableSessions[sessionIndex] = {
    ...session,
    orders: newOrders,
    subtotal,
    impuestos,
    total: subtotal + impuestos + session.propina - session.descuento,
    billStatus: 'abierta',
    paymentStatus: 'pendiente',
    paidAt: undefined,
    receiptId: undefined,
  }
}
 else {
          // Create new session
          const subtotal = calculateOrderTotal(order.items)
          const impuestos = subtotal * (prev.config.impuestoPorcentaje / 100)

          tableSessions = [
            ...tableSessions,
            {
              id: newSessionId,
              mesa,
              activa: true,
              orders: [order],
              createdAt: new Date(),
              expiresAt,
              deviceId: generateDeviceId(),
              billStatus: 'abierta',
              subtotal,
              impuestos,
              propina: 0,
              descuento: 0,
              total: subtotal + impuestos,
              montoAbonado: 0,
              paymentStatus: 'pendiente',
            },
          ]
        }
      }

      // Update menu item availability based on new inventory
      const menuItems = prev.menuItems.map(item => {
        const { canPrepare } = canPrepareItem(item, newIngredients)
        return { ...item, disponible: canPrepare }
      })

      return {
        ...prev,
        orders: [...prev.orders, order],
        tableSessions,
        ingredients: newIngredients,
        menuItems,
        cart: [],
      }
    })

    // Task 2.7: si hubo RPC atómica, la DB ya tiene las deducciones y los ajustes de inventario.
    // Solo usar executeOrQueue para items SIN receta (compatibilidad hacia atrás).
    if (deductions.length === 0) {
      const deductedIngredients = newIngredients.filter(ing => {
        const original = state.ingredients.find(i => i.id === ing.id)
        return original && original.stockActual !== ing.stockActual
      })
      for (const ing of deductedIngredients) {
        const original = state.ingredients.find(i => i.id === ing.id)!
        const deducted = Math.round((original.stockActual - ing.stockActual) * 100) / 100
        executeOrQueue({ table: 'ingredients', type: 'update', data: { stock_actual: ing.stockActual }, match: { column: 'id', value: ing.id } })
        executeOrQueue({ table: 'inventory_adjustments', type: 'insert', data: {
          id: generateId(),
          ingredient_id: ing.id,
          tipo: 'salida',
          cantidad: deducted,
          motivo: `Pedido #${order.numero} (${canal})`,
          user_id: 'system',
          created_at: new Date().toISOString(),
        } })
      }
    }

    if (order.isQrOrder && mesa && usedSessionId) {
      // Cliente QR anónimo: persistir sesión + pedido server-side (service_role).
      // El anónimo no puede crear sesión ni estampar tenant_id bajo RLS; el server
      // resuelve el tenant_id desde el token y recalcula los totales de la sesión.
      syncQrSession({ mesa, sessionId: usedSessionId, expiresAt: expiresAt.toISOString() })
      syncQrOrder({ mesa, sessionId: usedSessionId, order })
    } else {
      // Sync order to Supabase (fire-and-forget)
      syncOrderToSupabase(order, usedSessionId)
      // Sync session to Supabase
      if (mesa) {
        if (existingSession) {
          const subtotal = existingSession.subtotal + calculateOrderTotal(order.items)
          const impuestos = subtotal * (state.config.impuestoPorcentaje / 100)
          syncSessionToSupabase({
            ...existingSession,
            subtotal,
            impuestos,
            total: subtotal + impuestos + existingSession.propina - existingSession.descuento,
            billStatus: 'abierta',
            paymentStatus: 'pendiente',
          }, order.isQrOrder ? existingSession.id : undefined)
        } else {
          const subtotal = calculateOrderTotal(order.items)
          const impuestos = subtotal * (state.config.impuestoPorcentaje / 100)
          syncSessionToSupabase({
            id: newSessionId,
            mesa,
            activa: true,
            createdAt: new Date(),
            expiresAt,
            deviceId: '',
            billStatus: 'abierta',
            subtotal,
            impuestos,
            propina: 0,
            descuento: 0,
            total: subtotal + impuestos,
            paymentStatus: 'pendiente',
            montoAbonado: 0,
            feedbackDone: false,
          }, order.isQrOrder ? newSessionId : undefined)
        }
      }
    }

    // Notify staff of new QR order (fire-and-forget, never blocks checkout)
    if (order.isQrOrder && mesa) {
      pushTriggers.newQrOrder(mesa)
    }

    return order
  }, [state.cart, state.ingredients, state.tableSessions, state.config.impuestoPorcentaje, state.config.tiempoExpiracionSesionMinutos, state.currentUser, setState])

  const assignRepartidor = useCallback((orderId: string, repartidorId: string) => {
    const existing = state.orders.find(o => o.id === orderId)
    if (!existing) return
    const updatedOrder = { ...existing, repartidorId, updatedAt: new Date() }
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === orderId ? updatedOrder : o),
      tableSessions: prev.tableSessions.map(session => ({
        ...session,
        orders: session.orders.map(o => o.id === orderId ? updatedOrder : o),
      })),
    }))
    syncOrderToSupabase(updatedOrder)
  }, [state.orders, setState])

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    const existing = state.orders.find(o => o.id === orderId)
    if (!existing) return

    const now = new Date()
    const updates: Partial<Order> = { status, updatedAt: now }
    if (status === 'preparando' && !existing.tiempoInicioPreparacion) updates.tiempoInicioPreparacion = now
    if ((status === 'listo' || status === 'entregado') && !existing.tiempoFinPreparacion) updates.tiempoFinPreparacion = now
    const updatedOrder = { ...existing, ...updates }

    // Optimistic update
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === orderId ? updatedOrder : o),
      tableSessions: prev.tableSessions.map(session => ({
        ...session,
        orders: session.orders.map(o => o.id === orderId ? updatedOrder : o),
      })),
    }))

    // Persist via API (supabaseAdmin, bypasses RLS)
    const { data: { session } } = await supabase.auth.getSession()
    const payload: Record<string, unknown> = {
      status,
      updated_at: now.toISOString(),
    }
    if (updates.tiempoInicioPreparacion) payload.tiempo_inicio_preparacion = updates.tiempoInicioPreparacion.toISOString()
    if (updates.tiempoFinPreparacion) payload.tiempo_fin_preparacion = updates.tiempoFinPreparacion.toISOString()

    fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(payload),
    }).catch(() => {/* optimistic already applied */})

    if (status === 'listo') {
      pushTriggers.orderReady(existing.mesa, orderId)
    }
  }, [state.orders, setState])

  const updateKitchenStatus = useCallback((orderId: string, status: KitchenStatus) => {
    setState(prev => {
      const updatedOrders = prev.orders.map(order => {
        if (order.id !== orderId) return order

        const updates: Partial<Order> = {
          updatedAt: new Date(),
          cocinaStatus: status,
        }

        if (status === 'preparando' && !order.tiempoInicioPreparacion) {
          updates.tiempoInicioPreparacion = new Date()
          if (!order.kitchenReceivedAt) updates.kitchenReceivedAt = new Date()
        }

        if (status === 'listo') {
          updates.status = 'listo'
          if (!order.tiempoFinPreparacion) updates.tiempoFinPreparacion = new Date()
        } else if (status === 'preparando') {
          updates.status = 'preparando'
        }

        return { ...order, ...updates }
      })

      // SYNC session.orders with updated orders
      const updatedSessions = prev.tableSessions.map(session => ({
        ...session,
        orders: session.orders.map(o => updatedOrders.find(uo => uo.id === o.id) || o),
      }))

      const finalOrder = updatedOrders.find(o => o.id === orderId)
      if (finalOrder) syncOrderToSupabase(finalOrder)

      return {
        ...prev,
        orders: updatedOrders,
        tableSessions: updatedSessions,
      }
    })
  }, [setState])

  const cancelOrder = useCallback((orderId: string, reason: CancelReason, motivo?: string, userId?: string): boolean => {
    const order = state.orders.find(o => o.id === orderId)
    if (!order) return false

    // Can only cancel if not already delivered or cancelled
    if (order.status === 'entregado' || order.status === 'cancelado') return false

    // RBAC: solo admin, manager o mesero pueden cancelar
    if (!state.currentUser || !['admin', 'manager', 'mesero'].includes(state.currentUser.role)) return false

    // Restore ingredients for any order that was created (ingredients were deducted at creation)
    let newIngredients = [...state.ingredients]
    for (const item of order.items) {
      newIngredients = restoreIngredients(item.menuItem, item.cantidad, newIngredients, item.extras)
    }

    setState(prev => {
      // Completely remove the order from the orders array
      const updatedOrders = prev.orders.filter(o => o.id !== orderId)

      // Remove from session.orders and recalculate totals
      const updatedSessions = prev.tableSessions.map(session => {
        const filteredOrders = session.orders.filter(o => o.id !== orderId)
        if (filteredOrders.length === session.orders.length) return session

        const subtotal = filteredOrders.reduce(
          (sum, o) => sum + calculateOrderTotal(o.items), 0
        )
        const impuestos = subtotal * (prev.config.impuestoPorcentaje / 100)

        return {
          ...session,
          orders: filteredOrders,
          subtotal,
          impuestos,
          total: subtotal + impuestos + session.propina - session.descuento,
        }
      })

      // Update menu availability with restored ingredients
      const menuItems = prev.menuItems.map(item => {
        const { canPrepare } = canPrepareItem(item, newIngredients)
        return { ...item, disponible: canPrepare }
      })

      return {
        ...prev,
        orders: updatedOrders,
        tableSessions: updatedSessions,
        ingredients: newIngredients,
        menuItems,
      }
    })

    // Persist cancellation via API (supabaseAdmin, bypasses RLS)
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          status: 'cancelado',
          cancelado: true,
          cancelado_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      }).catch(() => {/* optimistic already applied */})
    })

    // Audit log
    // Task 2.8: audit corregido — user_id (no usuario_id), detalles como string
    logAction(
      state.currentUser?.id,
      setState,
      'cancelar_orden',
      `Orden ${orderId} cancelada — mesa ${order.mesa}, razón: ${reason}${motivo ? ` (${motivo})` : ''}`,
      'orders',
      orderId,
      {
        razon: motivo ?? reason,
        antes: { status: order.status, items: order.items.length },
        despues: { status: 'cancelado' },
      }
    )

    return true
  }, [state.orders, state.ingredients, state.currentUser, setState])

  const updateOrderItems = useCallback((orderId: string, items: OrderItem[]): boolean => {
    const order = state.orders.find(o => o.id === orderId)
    if (!order) return false

    // Can only edit if status is 'recibido'
    if (order.status !== 'recibido') return false

    setState(prev => {
      const updatedOrders = prev.orders.map(o =>
        o.id === orderId ? { ...o, items, updatedAt: new Date() } : o
      )

      // Sync session.orders with updated orders AND recalculate totals
      const updatedSessions = prev.tableSessions.map(session => {
        const syncedOrders = session.orders.map(o => updatedOrders.find(uo => uo.id === o.id) || o)

        // Check if this session contains the edited order
        const containsOrder = session.orders.some(o => o.id === orderId)
        if (!containsOrder) {
          return { ...session, orders: syncedOrders }
        }

        // Recalculate totals for the session
        const subtotal = syncedOrders.reduce(
          (sum, o) => sum + calculateOrderTotal(o.items),
          0
        )
        const impuestos = subtotal * (prev.config.impuestoPorcentaje / 100)

        return {
          ...session,
          orders: syncedOrders,
          subtotal,
          impuestos,
          total: subtotal + impuestos + session.propina - session.descuento,
        }
      })

      return {
        ...prev,
        orders: updatedOrders,
        tableSessions: updatedSessions,
      }
    })

    // Sync updated items to Supabase
    syncOrderToSupabase({ ...order, items, updatedAt: new Date() })

    return true
  }, [state.orders, setState])

  const markOrderDelivered = useCallback((orderId: string, _meseroId?: string) => {
    const order = state.orders.find(o => o.id === orderId)
    setState(prev => {
      const order = prev.orders.find(o => o.id === orderId)
      if (!order || !order.mesa) return prev

      const updatedOrders = prev.orders.map(o =>
        o.id === orderId
          ? { ...o, status: 'entregado' as OrderStatus, updatedAt: new Date() }
          : o
      )

      // Sync session.orders with updated orders
      const updatedSessions = prev.tableSessions.map(session => {
        if (session.mesa !== order.mesa || !session.activa) return session

        const syncedOrders = session.orders.map(o =>
          updatedOrders.find(uo => uo.id === o.id) || o
        )

        return { ...session, orders: syncedOrders }
      })

      return {
        ...prev,
        orders: updatedOrders,
        tableSessions: updatedSessions,
      }
    })
    // Sync delivered status to Supabase
    if (order) {
      syncOrderToSupabase({ ...order, status: 'entregado', updatedAt: new Date() })
    }
  }, [state.orders, setState])

  const canEditOrder = useCallback((orderId: string): boolean => {
    const order = state.orders.find(o => o.id === orderId)
    if (!order || order.status !== 'recibido') return false
    // Block editing if the session is already paid
    if (order.mesa) {
      const session = state.tableSessions.find(s => s.mesa === order.mesa && s.activa)
      if (session && session.billStatus === 'pagada') return false
    }
    return true
  }, [state.orders, state.tableSessions])

  const canCancelOrder = useCallback((orderId: string): boolean => {
    const order = state.orders.find(o => o.id === orderId)
    if (!order) return false
    if (order.status !== 'recibido') return false
    // Block cancellation if the session is already paid
    if (order.mesa) {
      const session = state.tableSessions.find(s => s.mesa === order.mesa && s.activa)
      if (session && session.billStatus === 'pagada') return false
    }
    return true
  }, [state.orders, state.tableSessions])

  const getOrdersForKitchen = useCallback((): Order[] => {
    return state.orders.filter(order => {
      if (order.status === 'entregado') return false
      return order.cocinaStatus !== 'listo'
    })
  }, [state.orders])

  const getPendingDeliveries = useCallback((): Order[] => {
    return state.orders.filter(
      order => order.status === 'listo'
    )
  }, [state.orders])

  const getTableOrders = useCallback((mesa: number): Order[] => {
    return state.orders.filter(o => o.mesa === mesa)
  }, [state.orders])

  const getAllActiveOrders = useCallback((): Order[] => {
    return state.orders.filter(o => o.status !== 'entregado')
  }, [state.orders])

  return {
    createOrder,
    updateOrderStatus,
    updateKitchenStatus,
    cancelOrder,
    updateOrderItems,
    markOrderDelivered,
    assignRepartidor,
    canEditOrder,
    canCancelOrder,
    getOrdersForKitchen,
    getPendingDeliveries,
    getTableOrders,
    getAllActiveOrders,
  }
}

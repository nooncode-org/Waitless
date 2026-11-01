'use client'

import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { AppState } from './types'
import type {
  User,
  UserRole,
  AppConfig,
  Reward,
  AppliedReward,
  Refund,
  DeliveryZone,
  TableSession,
} from '../store'
import { generateId, restoreIngredients, getDeliveryZoneCost } from '../store'
import { supabase } from '../supabase'
import { executeOrQueue } from '../offline-queue'
import { canDo } from '../permissions'
import { logAction } from './log-action'
import { authLoadUsers } from './auth'

type SetState = Dispatch<SetStateAction<AppState>>

export function useAdminActions(state: AppState, setState: SetState) {
  const addUser = useCallback((user: Omit<User, 'id' | 'createdAt'>) => {
    setState(prev => ({
      ...prev,
      users: [...prev.users, { ...user, id: generateId(), createdAt: new Date() }],
    }))
  }, [setState])

  const updateUser = useCallback((userId: string, updates: Partial<User>) => {
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === userId ? { ...u, ...updates } : u),
    }))
  }, [setState])

  const deleteUser = useCallback((userId: string) => {
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === userId ? { ...u, activo: false } : u),
    }))
    executeOrQueue({
      table: 'audit_logs',
      type: 'insert',
      data: {
        id: generateId(),
        user_id: state.currentUser?.id ?? 'unknown',
        accion: 'eliminar_usuario',
        detalles: `Usuario ${userId} desactivado`,
        entidad: 'profiles',
        entidad_id: userId,
      },
    })
  }, [state.currentUser, setState])

  // ============ CONFIG ============
  const updateConfig = useCallback((updates: Partial<AppConfig>) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, ...updates },
    }))

    // Persistir en Supabase (upsert sobre la fila 'default')
    const dbUpdates: Record<string, unknown> = {}
    if (updates.impuestoPorcentaje !== undefined)           dbUpdates.impuesto_porcentaje = updates.impuestoPorcentaje
    if (updates.propinaSugeridaPorcentaje !== undefined)    dbUpdates.propina_sugerida_porcentaje = updates.propinaSugeridaPorcentaje
    if (updates.tiempoExpiracionSesionMinutos !== undefined) dbUpdates.tiempo_expiracion_sesion_minutos = updates.tiempoExpiracionSesionMinutos
    if (updates.zonasReparto !== undefined)                 dbUpdates.zonas_reparto = updates.zonasReparto
    if (updates.costoEnvio !== undefined)                   dbUpdates.costo_envio = updates.costoEnvio
    if (updates.horariosOperacion !== undefined)            dbUpdates.horarios_operacion = updates.horariosOperacion
    if (updates.metodospagoActivos !== undefined)           dbUpdates.metodos_pago_activos = updates.metodospagoActivos
    if (updates.sonidoNuevosPedidos !== undefined)          dbUpdates.sonido_nuevos_pedidos = updates.sonidoNuevosPedidos
    if (updates.notificacionesStockBajo !== undefined)      dbUpdates.notificaciones_stock_bajo = updates.notificacionesStockBajo
    if (updates.googleReviewUrl !== undefined)              dbUpdates.google_review_url = updates.googleReviewUrl
    if (updates.pacingMaxPreparando !== undefined)          dbUpdates.pacing_max_preparando = updates.pacingMaxPreparando
    if (updates.maxMesas !== undefined)                     dbUpdates.max_mesas = updates.maxMesas
    // Task 4.2 — White-label branding fields
    if (updates.restaurantName !== undefined)               dbUpdates.restaurant_name = updates.restaurantName
    if (updates.logoUrl !== undefined)                      dbUpdates.logo_url = updates.logoUrl
    if (updates.primaryColor !== undefined)                 dbUpdates.primary_color = updates.primaryColor
    if (updates.secondaryColor !== undefined)               dbUpdates.secondary_color = updates.secondaryColor
    if (updates.accentColor !== undefined)                  dbUpdates.accent_color = updates.accentColor
    if (updates.fontFamily !== undefined)                   dbUpdates.font_family = updates.fontFamily
    if (updates.poweredByWaitless !== undefined)            dbUpdates.powered_by_waitless = updates.poweredByWaitless
    if (updates.whatsappNumero !== undefined)               dbUpdates.whatsapp_numero = updates.whatsappNumero
    if (updates.coverUrl !== undefined)                     dbUpdates.cover_url = updates.coverUrl
    if (updates.descripcion !== undefined)                  dbUpdates.descripcion = updates.descripcion
    if (updates.tiendaAbierta !== undefined)                dbUpdates.tienda_abierta = updates.tiendaAbierta
    if (updates.tiendaVisible !== undefined)                dbUpdates.tienda_visible = updates.tiendaVisible
    if (updates.autoHorarioApertura !== undefined)          dbUpdates.auto_horario_apertura = updates.autoHorarioApertura
    if (updates.autoHorarioCierre !== undefined)            dbUpdates.auto_horario_cierre = updates.autoHorarioCierre
    if (updates.deliveryHabilitado !== undefined)           dbUpdates.delivery_habilitado = updates.deliveryHabilitado

    if (Object.keys(dbUpdates).length > 0) {
      // Usar el API route (supabaseAdmin) para bypasear RLS — requiere Bearer token
      supabase.auth.getSession().then(({ data: { session } }) => {
        const token = session?.access_token
        if (!token) return
        fetch('/api/admin/config', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(dbUpdates),
        }).catch(err => console.error('[updateConfig] Error persistiendo config:', err))
      })
    }
  }, [state.currentUser, setState])

  // refreshUsers: recarga la lista de staff vía API (supabaseAdmin, bypasa RLS)
  const refreshUsers = useCallback(async (): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return
    const res = await fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const json = await res.json()
    const data = json.users ?? []
    setState(prev => ({
      ...prev,
      users: data.map((p: Record<string, unknown>) => ({
        id: p.id as string,
        username: p.username as string,
        nombre: p.nombre as string,
        role: p.role as UserRole,
        activo: p.activo as boolean,
        createdAt: new Date(p.created_at as string),
      })),
    }))
  }, [setState])

  // ============ REWARD ACTIONS ============
  const applyReward = useCallback((sessionId: string, rewardId: string): boolean => {
    const reward = state.rewards.find(r => r.id === rewardId && r.activo)
    if (!reward) return false

    const session = state.tableSessions.find(s => s.id === sessionId)
    if (!session || session.billStatus === 'pagada') return false

    // Check if already used
    const alreadyUsed = state.appliedRewards.filter(ar => ar.sessionId === sessionId && ar.rewardId === rewardId).length
    if (reward.usosMaximos && alreadyUsed >= reward.usosMaximos) return false

    let descuento = 0
    if (reward.tipo === 'porcentaje') {
      descuento = session.subtotal * (reward.valor / 100)
    } else {
      descuento = reward.valor
    }

    const applied: AppliedReward = {
      id: generateId(),
      sessionId,
      rewardId,
      descuento,
      createdAt: new Date(),
    }

    setState(prev => ({
      ...prev,
      appliedRewards: [...prev.appliedRewards, applied],
      tableSessions: prev.tableSessions.map(s =>
        s.id === sessionId ? {
          ...s,
          descuento: s.descuento + descuento,
          descuentoMotivo: reward.nombre,
          total: s.subtotal + s.impuestos + s.propina - (s.descuento + descuento),
        } : s
      ),
    }))

    executeOrQueue({
      table: 'applied_rewards',
      type: 'insert',
      data: {
        id: applied.id,
        session_id: sessionId,
        reward_id: rewardId,
        descuento,
        created_at: applied.createdAt.toISOString(),
      },
    })

    return true
  }, [state.rewards, state.tableSessions, state.appliedRewards, setState])

  const getAvailableRewards = useCallback((sessionId: string): Reward[] => {
    return state.rewards.filter(r => {
      if (!r.activo) return false
      const usedCount = state.appliedRewards.filter(ar => ar.sessionId === sessionId && ar.rewardId === r.id).length
      if (r.usosMaximos && usedCount >= r.usosMaximos) return false
      return true
    })
  }, [state.rewards, state.appliedRewards])

  // ============ REFUND ACTIONS ============
  const createRefund = useCallback((
    orderId: string,
    monto: number,
    motivo: string,
    tipo: 'total' | 'parcial',
    itemIds?: string[],
    userId?: string
  ): Refund | null => {
    // RBAC P1.7: solo admin puede hacer reembolsos
    if (!canDo(state.currentUser?.role, 'hacer_refund')) return null
    const order = state.orders.find(o => o.id === orderId)
    if (!order) return null

    // Restore ingredients for refunded items
    let newIngredients = [...state.ingredients]
    const itemsToRestore = tipo === 'total'
      ? order.items
      : order.items.filter(i => itemIds?.includes(i.id))

    for (const item of itemsToRestore) {
      newIngredients = restoreIngredients(item.menuItem, item.cantidad, newIngredients, item.extras)
    }

    const refund: Refund = {
      id: generateId(),
      orderId,
      monto,
      motivo,
      tipo,
      status: 'aprobado',
      itemsReembolsados: itemIds,
      inventarioRevertido: true,
      userId: userId || state.currentUser?.id || 'unknown',
      createdAt: new Date(),
    }

    setState(prev => ({
      ...prev,
      refunds: [...prev.refunds, refund],
      ingredients: newIngredients,
    }))

    // Persistir en Supabase
    executeOrQueue({
      table: 'refunds',
      type: 'insert',
      data: {
        id: refund.id,
        order_id: refund.orderId,
        session_id: refund.sessionId ?? null,
        monto: refund.monto,
        motivo: refund.motivo,
        tipo: refund.tipo,
        items_reembolsados: refund.itemsReembolsados ? JSON.stringify(refund.itemsReembolsados) : null,
        inventario_revertido: refund.inventarioRevertido,
        user_id: refund.userId,
      },
    })

    // Audit log del reembolso
    executeOrQueue({
      table: 'audit_logs',
      type: 'insert',
      data: {
        id: generateId(),
        user_id: refund.userId,
        accion: 'crear_reembolso',
        detalles: `Reembolso ${refund.tipo} $${refund.monto.toFixed(2)} — ${refund.motivo}`,
        entidad: 'orders',
        entidad_id: orderId,
      },
    })

    return refund
  }, [state.orders, state.ingredients, state.currentUser, setState])

  const getOrderRefunds = useCallback((orderId: string): Refund[] => {
    return state.refunds.filter(r => r.orderId === orderId)
  }, [state.refunds])

  // ============ DELIVERY ZONE ACTIONS ============
  const getDeliveryZones = useCallback((): DeliveryZone[] => {
    return state.deliveryZones.filter(z => z.activa)
  }, [state.deliveryZones])

  const updateDeliveryZone = useCallback((zonaNombre: string, updates: Partial<DeliveryZone>) => {
    setState(prev => ({
      ...prev,
      deliveryZones: prev.deliveryZones.map(z =>
        z.nombre === zonaNombre ? { ...z, ...updates } : z
      ),
    }))
  }, [setState])

  const addDeliveryZone = useCallback((zone: DeliveryZone) => {
    setState(prev => ({
      ...prev,
      deliveryZones: [...prev.deliveryZones, zone],
    }))
  }, [setState])

  const calculateDeliveryCost = useCallback((zonaNombre: string): number => {
    return getDeliveryZoneCost(zonaNombre, state.deliveryZones)
  }, [state.deliveryZones])

  return {
    addUser,
    updateUser,
    deleteUser,
    updateConfig,
    refreshUsers,
    applyReward,
    getAvailableRewards,
    createRefund,
    getOrderRefunds,
    getDeliveryZones,
    updateDeliveryZone,
    addDeliveryZone,
    calculateDeliveryCost,
  }
}

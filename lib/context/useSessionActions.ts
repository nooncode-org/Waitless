'use client'

import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { AppState } from './types'
import type {
  TableSession,
  PaymentMethod,
  PaymentStatus,
  BillStatus,
  TableState,
  WaitlistEntry,
} from '../store'
import {
  generateId,
  generateDeviceId,
  calculateOrderTotal,
} from '../store'
import { supabase } from '../supabase'
import { executeOrQueue } from '../offline-queue'
import { syncSessionToSupabase, syncOrderToSupabase, syncQrSession, checkSessionVersion } from './sync'
import { logAction } from './log-action'
import { canDo } from '../permissions'
import {
  supabaseInsertWaitlistEntry,
  supabaseUpdateWaitlistEntry,
  supabaseDeleteWaitlistEntry,
} from './waitlist'

type SetState = Dispatch<SetStateAction<AppState>>

export function useSessionActions(state: AppState, setState: SetState) {
  const setCurrentTable = useCallback((mesa: number | null) => {
    setState(prev => ({ ...prev, currentTable: mesa }))
  }, [setState])

  const getTableSession = useCallback((mesa: number): TableSession | undefined => {
    return state.tableSessions.find(s => s.mesa === mesa && s.activa)
  }, [state.tableSessions])

  const createTableSession = useCallback((mesa: number): TableSession => {
    const existingSession = state.tableSessions.find(s => s.mesa === mesa && s.activa)
    if (existingSession) {
      setState(prev => ({ ...prev, currentTable: mesa, currentSessionId: existingSession.id }))
      return existingSession
    }

    const session: TableSession = {
      id: generateId(),
      mesa,
      activa: true,
      orders: [],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + state.config.tiempoExpiracionSesionMinutos * 60 * 1000),
      deviceId: generateDeviceId(),
      billStatus: 'abierta',
      subtotal: 0,
      impuestos: 0,
      propina: 0,
      descuento: 0,
      total: 0,
      montoAbonado: 0,
      paymentStatus: 'pendiente',
    }

    setState(prev => ({
      ...prev,
      tableSessions: [...prev.tableSessions, session],
      currentTable: mesa,
      currentSessionId: session.id,
    }))

    // Sync new session to Supabase
    const { orders: _orders, ...sessionWithoutOrders } = session
    if (!state.currentUser) {
      // Cliente QR anónimo: la sesión se crea server-side (service_role) porque la RLS
      // (auth_insert_tenant_sessions) no permite que el anónimo inserte en table_sessions.
      syncQrSession({ mesa, sessionId: session.id, expiresAt: session.expiresAt.toISOString() })
    } else {
      syncSessionToSupabase(sessionWithoutOrders)
    }

    return session
  }, [state.tableSessions, state.config.tiempoExpiracionSesionMinutos, state.currentUser, setState])

  const closeTableSession = useCallback((sessionId: string) => {
    const session = state.tableSessions.find(s => s.id === sessionId)
    if (!session) return

    setState(prev => ({
      ...prev,
      orders: prev.orders.filter(o => o.mesa !== session.mesa),
      tableSessions: prev.tableSessions.map(s =>
        s.id === sessionId ? { ...s, activa: false, billStatus: 'cerrada' as BillStatus } : s
      ),
      qrTokens: prev.qrTokens.map(t =>
        t.mesa === session.mesa && t.activo ? { ...t, activo: false } : t
      ),
      currentTable: prev.currentTable === session.mesa ? null : prev.currentTable,
      currentSessionId: prev.currentSessionId === sessionId ? null : prev.currentSessionId,
      cart: prev.currentTable === session.mesa ? [] : prev.cart,
    }))

    const { orders: _orders, ...rest } = session
    syncSessionToSupabase({ ...rest, activa: false, billStatus: 'cerrada' })
    // Task 2.8: audit de cierre manual de sesión
    logAction(
      state.currentUser?.id,
      setState,
      'cerrar_sesion',
      `Mesa ${session.mesa} cerrada manualmente`,
      'table_sessions',
      sessionId,
      {
        antes: { billStatus: session.billStatus, activa: true },
        despues: { billStatus: 'cerrada', activa: false },
      }
    )
  }, [state.tableSessions, state.currentUser?.id, setState])

  const isSessionValid = useCallback((mesa: number): boolean => {
    const session = state.tableSessions.find(s => s.mesa === mesa && s.activa)
    if (!session) return true // No session = can create new

    if (new Date(session.expiresAt) < new Date()) {
      return false // Session expired
    }

    if (session.billStatus === 'cerrada') {
  return false
}


    return true
  }, [state.tableSessions])

  // ============ BILL/PAYMENT ACTIONS ============
  const updateBillTotals = useCallback((sessionId: string) => {
    setState(prev => {
      const session = prev.tableSessions.find(s => s.id === sessionId)
      if (!session) return prev

      const subtotal = session.orders.reduce((sum, o) => sum + calculateOrderTotal(o.items), 0)
      const impuestos = subtotal * (prev.config.impuestoPorcentaje / 100)
      const total = subtotal + impuestos + session.propina - session.descuento

      return {
        ...prev,
        tableSessions: prev.tableSessions.map(s =>
          s.id === sessionId ? { ...s, subtotal, impuestos, total } : s
        ),
      }
    })
  }, [setState])

  const applyDiscount = useCallback(async (sessionId: string, descuento: number, motivo: string) => {
    const session = state.tableSessions.find(s => s.id === sessionId)
    if (!session || session.billStatus === 'pagada') return
    // Solo admin y manager pueden aplicar descuentos (RBAC P1-2)
    if (!state.currentUser || !['admin', 'manager'].includes(state.currentUser.role)) return
    // Task 2.6 / Sprint 4: hard-fail si offline o hay conflicto de versión
    const versionCheck = await checkSessionVersion(sessionId, session.version ?? 0)
    if (versionCheck === 'offline') {
      const { toast } = await import('sonner')
      toast.error('Necesitás conexión para aplicar un descuento.')
      return
    }
    if (versionCheck === 'conflict') {
      const { toast } = await import('sonner')
      toast.error('Esta sesión fue modificada por otro dispositivo. Recargando...')
      const { data } = await supabase.from('table_sessions').select('*').eq('id', sessionId).single()
      if (data) {
        setState(prev => ({
          ...prev,
          tableSessions: prev.tableSessions.map(s =>
            s.id === sessionId ? { ...s, version: data.version ?? 0, billStatus: data.bill_status as BillStatus, total: Number(data.total) || 0, descuento: Number(data.descuento) || 0 } : s
          ),
        }))
      }
      return
    }
    const total = session.subtotal + session.impuestos + session.propina - descuento
    const nextVersion = (session.version ?? 0) + 1
    setState(prev => ({
      ...prev,
      tableSessions: prev.tableSessions.map(s =>
        s.id === sessionId ? { ...s, descuento, descuentoMotivo: motivo, total, version: nextVersion } : s
      ),
    }))
    const { orders: _o, ...rest } = session
    syncSessionToSupabase({ ...rest, descuento, descuentoMotivo: motivo, total, version: nextVersion })
    // Audit log obligatorio por PDF q16
    supabase.from('audit_logs').insert({
      id: generateId(),
      user_id: state.currentUser?.id ?? 'unknown',
      accion: 'aplicar_descuento',
      detalles: `Descuento $${descuento.toFixed(2)} — Razón: ${motivo}`,
      entidad: 'table_sessions',
      entidad_id: sessionId,
      created_at: new Date().toISOString(),
    }).then(() => {})
  }, [state.tableSessions, state.currentUser, setState])

  const setTipAmount = useCallback((sessionId: string, propina: number) => {
    const session = state.tableSessions.find(s => s.id === sessionId)
    if (!session || session.billStatus === 'pagada') return
    const total = session.subtotal + session.impuestos + propina - session.descuento
    setState(prev => ({
      ...prev,
      tableSessions: prev.tableSessions.map(s =>
        s.id === sessionId ? { ...s, propina, total } : s
      ),
    }))
    const { orders: _o, ...rest } = session
    syncSessionToSupabase({ ...rest, propina, total })
  }, [state.tableSessions, setState])

  const requestPayment = useCallback((sessionId: string, method: PaymentMethod) => {
    const session = state.tableSessions.find(s => s.id === sessionId)
    setState(prev => ({
      ...prev,
      tableSessions: prev.tableSessions.map(s =>
        s.id === sessionId
          ? { ...s, paymentMethod: method, paymentStatus: 'pendiente' as PaymentStatus, billStatus: 'en_pago' as BillStatus }
          : s
      ),
    }))
    if (session) {
      const { orders: _o, ...rest } = session
      syncSessionToSupabase({ ...rest, paymentMethod: method, paymentStatus: 'pendiente', billStatus: 'en_pago' })
    }
  }, [state.tableSessions, setState])

  // Abono parcial: registra un pago parcial sin cerrar la sesión
  const addPartialPayment = useCallback(async (sessionId: string, monto: number, method: PaymentMethod) => {
    const session = state.tableSessions.find(s => s.id === sessionId)
    if (!session || session.paymentStatus === 'pagado') return
    // Task 2.6 / Sprint 4: hard-fail si offline o hay conflicto de versión
    const versionCheck = await checkSessionVersion(sessionId, session.version ?? 0)
    if (versionCheck === 'offline') {
      const { toast } = await import('sonner')
      toast.error('Necesitás conexión para registrar un pago parcial.')
      return
    }
    if (versionCheck === 'conflict') {
      const { toast } = await import('sonner')
      toast.error('Esta sesión fue modificada por otro dispositivo. Recargando...')
      const { data } = await supabase.from('table_sessions').select('*').eq('id', sessionId).single()
      if (data) {
        setState(prev => ({
          ...prev,
          tableSessions: prev.tableSessions.map(s =>
            s.id === sessionId ? { ...s, version: data.version ?? 0, montoAbonado: Number(data.monto_abonado) || 0, paymentStatus: data.payment_status as PaymentStatus } : s
          ),
        }))
      }
      return
    }
    const nuevoAbonado = (session.montoAbonado ?? 0) + monto
    const totalPendiente = session.total - nuevoAbonado
    const newStatus: PaymentStatus = totalPendiente <= 0 ? 'pagado' : 'parcial'
    const nextVersion = (session.version ?? 0) + 1
    setState(prev => ({
      ...prev,
      tableSessions: prev.tableSessions.map(s =>
        s.id === sessionId
          ? { ...s, montoAbonado: nuevoAbonado, paymentMethod: method, paymentStatus: newStatus, version: nextVersion }
          : s
      ),
    }))
    const { orders: _o, ...rest } = session
    syncSessionToSupabase({ ...rest, montoAbonado: nuevoAbonado, paymentMethod: method, paymentStatus: newStatus, version: nextVersion })
  }, [state.tableSessions, setState])

  const confirmPayment = useCallback(async (sessionId: string) => {
    const session = state.tableSessions.find(s => s.id === sessionId)
    if (!session) return
    // Idempotency guard: ya fue confirmado
    if (session.billStatus === 'pagada') return
    // Guardrail: no cerrar si queda saldo pendiente (PDF q23)
    const totalAbonado = session.montoAbonado ?? 0
    if (totalAbonado > 0 && totalAbonado < session.total) return // parcial incompleto
    // Task 2.6 / Sprint 4: hard-fail si offline o hay conflicto de versión (mutación más crítica)
    const versionCheck = await checkSessionVersion(sessionId, session.version ?? 0)
    if (versionCheck === 'offline') {
      const { toast } = await import('sonner')
      toast.error('Necesitás conexión para confirmar el pago.')
      return
    }
    if (versionCheck === 'conflict') {
      const { toast } = await import('sonner')
      toast.error('Esta sesión fue modificada por otro dispositivo. Recargando...')
      const { data } = await supabase.from('table_sessions').select('*').eq('id', sessionId).single()
      if (data) {
        setState(prev => ({
          ...prev,
          tableSessions: prev.tableSessions.map(s =>
            s.id === sessionId ? { ...s, version: data.version ?? 0, billStatus: data.bill_status as BillStatus, paymentStatus: data.payment_status as PaymentStatus } : s
          ),
        }))
      }
      return
    }

    const paidAt = new Date()
    const nextVersion = (session.version ?? 0) + 1
    setState(prev => ({
      ...prev,
      // P0-7 FIX: map en lugar de filter — la sesión queda en estado pagada para feedback/auditoría
      tableSessions: prev.tableSessions.map(s =>
        s.id === sessionId
          ? { ...s, activa: false, billStatus: 'pagada' as BillStatus, paymentStatus: 'pagado' as PaymentStatus, paidAt, version: nextVersion }
          : s
      ),
      // Mesa pasa a LIMPIEZA — no a disponible automáticamente (PDF q39)
      tables: prev.tables.map(t =>
        t.numero === session.mesa ? { ...t, estado: 'limpieza' as TableState } : t
      ),
      qrTokens: prev.qrTokens.map(t =>
        t.mesa === session.mesa && t.activo ? { ...t, activo: false } : t
      ),
      currentTable: prev.currentTable === session.mesa ? null : prev.currentTable,
      currentSessionId: prev.currentSessionId === sessionId ? null : prev.currentSessionId,
      cart: prev.currentTable === session.mesa ? [] : prev.cart,
    }))

    // Persist pagada state before removing from local state
    const { orders: _o, ...rest } = session
    syncSessionToSupabase({ ...rest, activa: false, billStatus: 'pagada', paymentStatus: 'pagado', paidAt, version: nextVersion })
    // Update table estado in Supabase
    supabase.from('tables_config').update({ estado: 'limpieza' }).eq('numero', session.mesa).then(() => {})
    // Sprint 2: invalidar tokens QR de esta mesa en Supabase al confirmar pago
    // Columna real: `activo` (boolean) + `used_at` (timestamp). NO existe `usado`.
    supabase.from('qr_tokens').update({ activo: false, used_at: new Date().toISOString() }).eq('mesa', session.mesa).eq('activo', true).then(() => {})
    // Task 2.8: audit de confirmación de pago (mutación más crítica del sistema)
    const auditId = generateId()
    setState(prev => ({
      ...prev,
      auditLogs: [...prev.auditLogs, {
        id: auditId,
        userId: state.currentUser?.id || 'anonymous',
        accion: 'confirmar_pago',
        detalles: `Mesa ${session.mesa} pagada — total $${session.total?.toFixed(2)}`,
        entidad: 'table_sessions',
        entidadId: sessionId,
        createdAt: new Date(),
        razon: session.paymentMethod ?? 'efectivo',
        antes: { billStatus: session.billStatus, paymentStatus: session.paymentStatus, activa: true },
        despues: { billStatus: 'pagada', paymentStatus: 'pagado', activa: false },
      }],
    }))
    executeOrQueue({
      table: 'audit_logs',
      type: 'insert',
      data: {
        id: auditId,
        user_id: state.currentUser?.id || 'anonymous',
        accion: 'confirmar_pago',
        detalles: `Mesa ${session.mesa} pagada — total $${session.total?.toFixed(2)}`,
        entidad: 'table_sessions',
        entidad_id: sessionId,
        razon: session.paymentMethod ?? 'efectivo',
        antes: { billStatus: session.billStatus, paymentStatus: session.paymentStatus, activa: true },
        despues: { billStatus: 'pagada', paymentStatus: 'pagado', activa: false },
      },
    })
  }, [state.tableSessions, state.currentUser, setState])

  // Task 2.4 — Persiste el desglose de cuenta dividida en Supabase
  const persistSplitBill = useCallback(async (
    sessionId: string,
    seats: Array<{ method: PaymentMethod; monto: number }>
  ) => {
    const now = new Date().toISOString()
    for (let index = 0; index < seats.length; index++) {
      const seat = seats[index]
      await executeOrQueue({
        table: 'split_bills',
        type: 'insert',
        data: {
          session_id: sessionId,
          seat_index: index,
          label: `Persona ${index + 1}`,
          monto: seat.monto,
          payment_method: seat.method,
          paid_at: now,
        },
      })
    }
  }, [])

  // Mesa lista tras limpieza — requiere acción humana (PDF q39)
  const markTableClean = useCallback((tableNumero: number) => {
    setState(prev => {
      // Marcar sesión pagada de esta mesa como liberada
      const sessionId = prev.tableSessions.find(
        s => s.mesa === tableNumero && s.billStatus === 'pagada'
      )?.id

      return {
        ...prev,
        tables: prev.tables.map(t =>
          t.numero === tableNumero ? { ...t, estado: 'disponible' as TableState } : t
        ),
        tableSessions: sessionId
          ? prev.tableSessions.map(s =>
              s.id === sessionId ? { ...s, billStatus: 'liberada' as BillStatus } : s
            )
          : prev.tableSessions,
      }
    })
    supabase.from('tables_config').update({ estado: 'disponible' }).eq('numero', tableNumero).then(() => {})
    // Marcar sesión como liberada en Supabase
    supabase
      .from('table_sessions')
      .update({ bill_status: 'liberada' })
      .eq('mesa', tableNumero)
      .eq('bill_status', 'pagada')
      .then(() => {})
  }, [setState])

  // Reabrir sesión cerrada — manager o admin, razón obligatoria (PDF q43)
  const reopenTableSession = useCallback((sessionId: string, razon: string, userId: string) => {
    // RBAC P1.7: solo manager o admin pueden reabrir una sesión
    if (!canDo(state.currentUser?.role, 'reabrir_mesa')) return
    supabase.from('table_sessions').select('*').eq('id', sessionId).single().then(({ data }) => {
      if (!data) return
      const session: Omit<TableSession, 'orders'> = {
        id: data.id, mesa: data.mesa, activa: true,
        createdAt: new Date(data.created_at),
        expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
        deviceId: data.device_id ?? '',
        billStatus: 'abierta' as BillStatus,
        subtotal: Number(data.subtotal) || 0,
        impuestos: Number(data.impuestos) || 0,
        propina: Number(data.propina) || 0,
        descuento: Number(data.descuento) || 0,
        descuentoMotivo: data.descuento_motivo,
        total: Number(data.total) || 0,
        montoAbonado: 0,
        paymentMethod: data.payment_method as PaymentMethod | undefined,
        paymentStatus: 'pendiente' as PaymentStatus,
        feedbackDone: data.feedback_done ?? false,
      }
      setState(prev => ({
        ...prev,
        tableSessions: [...prev.tableSessions, { ...session, orders: [] }],
        tables: prev.tables.map(t =>
          t.numero === data.mesa ? { ...t, estado: 'ocupada' as TableState } : t
        ),
      }))
      syncSessionToSupabase({ ...session, activa: true, paymentStatus: 'pendiente', billStatus: 'abierta' })
      supabase.from('tables_config').update({ estado: 'ocupada' }).eq('numero', data.mesa).then(() => {})
      // Audit log (PDF q43)
      supabase.from('audit_logs').insert({
        id: generateId(),
        user_id: userId,
        accion: 'reabrir_sesion',
        detalles: `Razón: ${razon}`,
        entidad: 'table_sessions',
        entidad_id: sessionId,
        created_at: new Date().toISOString(),
      }).then(() => {})
    })
  }, [state.currentUser?.role, setState])

  const resetSessionPaymentStatus = useCallback((sessionId: string) => {
    setState(prev => ({
      ...prev,
      tableSessions: prev.tableSessions.map(s =>
        s.id === sessionId
          ? {
              ...s,
              paymentStatus: 'pendiente',
              paymentMethod: undefined,
              billStatus: 'abierta',
              montoAbonado: 0,
            }
          : s
      ),
    }))
  }, [setState])

  const markFeedbackDone = useCallback((sessionId: string) => {
    setState(prev => ({
      ...prev,
      tableSessions: prev.tableSessions.map(s =>
        s.id === sessionId ? { ...s, feedbackDone: true } : s
      ),
    }))
    executeOrQueue({
      table: 'table_sessions',
      type: 'update',
      data: { feedback_done: true },
      match: { column: 'id', value: sessionId },
    })
  }, [setState])

  // Task 2.5: acción centralizada para guardar feedback vía offline queue
  const addFeedback = useCallback(async (
    mesa: number,
    rating: number,
    comentario?: string,
    sessionId?: string
  ): Promise<void> => {
    await executeOrQueue({
      table: 'feedback',
      type: 'insert',
      data: {
        id: generateId(),
        session_id: sessionId || null,
        mesa,
        rating,
        comentario: comentario?.trim() || null,
        created_at: new Date().toISOString(),
      },
    })
    if (sessionId) markFeedbackDone(sessionId)
  }, [markFeedbackDone])

  // ============ P2-3: WAITLIST ACTIONS ============
  const addToWaitlist = useCallback(async (
    entry: Omit<WaitlistEntry, 'id' | 'estado' | 'expiresAt' | 'createdAt' | 'updatedAt'>
  ): Promise<WaitlistEntry | null> => {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2h
    const newEntry: WaitlistEntry = {
      id: generateId(),
      nombre: entry.nombre,
      telefono: entry.telefono,
      personas: entry.personas,
      notas: entry.notas,
      estado: 'esperando',
      mesaAsignada: undefined,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    }

    // Persistir en Supabase (optimistic update: state ya se actualizó antes de esta llamada)
    await supabaseInsertWaitlistEntry(newEntry)
    setState(prev => ({ ...prev, waitlist: [...prev.waitlist, newEntry] }))
    return newEntry
  }, [setState])

  const updateWaitlistEntry = useCallback(async (
    id: string,
    updates: Partial<Pick<WaitlistEntry, 'estado' | 'mesaAsignada' | 'notas'>>
  ): Promise<void> => {
    setState(prev => ({
      ...prev,
      waitlist: prev.waitlist.map(w =>
        w.id === id ? { ...w, ...updates, updatedAt: new Date() } : w
      ),
    }))

    await supabaseUpdateWaitlistEntry(id, updates)
  }, [setState])

  const removeWaitlistEntry = useCallback(async (id: string): Promise<void> => {
    setState(prev => ({ ...prev, waitlist: prev.waitlist.filter(w => w.id !== id) }))
    await supabaseDeleteWaitlistEntry(id)
  }, [setState])

  // ============ EMERGENCY ACTIONS ============
  const emergencyCloseAllTables = useCallback(() => {
    setState(prev => {
      // Gather all mesas that have active sessions
      const activeMesas = new Set(prev.tableSessions.filter(s => s.activa).map(s => s.mesa))

      return {
        ...prev,
        // Remove all active sessions (keeps inactive ones for history)
        tableSessions: prev.tableSessions.filter(s => !s.activa),
        // Remove orders associated with active tables
        orders: prev.orders.filter(o => !o.mesa || !activeMesas.has(o.mesa)),
        // Invalidate QR tokens for active tables
        qrTokens: prev.qrTokens.map(t =>
          activeMesas.has(t.mesa) && t.activo ? { ...t, activo: false } : t
        ),
        // Dismiss waiter calls for active tables
        waiterCalls: prev.waiterCalls.filter(c => !activeMesas.has(c.mesa) || c.atendido),
        // Clear current table context
        currentTable: null,
        currentSessionId: null,
        cart: [],
      }
    })
  }, [setState])

  const emergencyCloseTables = useCallback((mesas: number[]) => {
    if (!mesas.length) return
    const mesaSet = new Set(mesas)
    setState(prev => ({
      ...prev,
      tableSessions: prev.tableSessions.filter(s => !mesaSet.has(s.mesa) || !s.activa),
      orders: prev.orders.filter(o => !o.mesa || !mesaSet.has(o.mesa)),
      qrTokens: prev.qrTokens.map(t =>
        mesaSet.has(t.mesa) && t.activo ? { ...t, activo: false } : t
      ),
      waiterCalls: prev.waiterCalls.filter(c => !mesaSet.has(c.mesa) || c.atendido),
      currentTable: prev.currentTable && mesaSet.has(prev.currentTable) ? null : prev.currentTable,
      currentSessionId: prev.currentTable && mesaSet.has(prev.currentTable) ? null : prev.currentSessionId,
      cart: prev.currentTable && mesaSet.has(prev.currentTable) ? [] : prev.cart,
    }))
  }, [setState])

  const moveTableSession = useCallback((sessionId: string, toMesa: number) => {
    const session = state.tableSessions.find(s => s.id === sessionId)
    if (!session) return
    const isTargetFree = !state.tableSessions.some(s => s.mesa === toMesa && s.activa)
    if (!isTargetFree) return
    const fromMesa = session.mesa
    setState(prev => {
      return {
        ...prev,
        tableSessions: prev.tableSessions.map(s =>
          s.id === sessionId ? { ...s, mesa: toMesa } : s
        ),
        orders: prev.orders.map(o =>
          o.mesa === fromMesa ? { ...o, mesa: toMesa } : o
        ),
      }
    })
    const { orders: _o, ...sessionFields } = session
    syncSessionToSupabase({ ...sessionFields, mesa: toMesa })
    state.orders
      .filter(o => o.mesa === fromMesa)
      .forEach(o => syncOrderToSupabase({ ...o, mesa: toMesa }))
  }, [state.tableSessions, state.orders, setState])

  const mergeTableSessions = useCallback((targetSessionId: string, sourceSessionId: string) => {
    if (targetSessionId === sourceSessionId) return
    const targetSession = state.tableSessions.find(s => s.id === targetSessionId)
    const sourceSession = state.tableSessions.find(s => s.id === sourceSessionId)
    if (!targetSession || !sourceSession) return
    setState(prev => {
      return {
        ...prev,
        tableSessions: prev.tableSessions.map(s => {
          if (s.id === targetSessionId) {
            return { ...s, orders: [...s.orders, ...sourceSession.orders] }
          }
          if (s.id === sourceSessionId) {
            return { ...s, activa: false, billStatus: 'cerrada' as BillStatus }
          }
          return s
        }),
        orders: prev.orders.map(o =>
          o.mesa === sourceSession.mesa ? { ...o, mesa: targetSession.mesa } : o
        ),
        qrTokens: prev.qrTokens.map(t =>
          t.mesa === sourceSession.mesa && t.activo ? { ...t, activo: false } : t
        ),
      }
    })
    // Close source session in Supabase
    const { orders: _o, ...sourceFields } = sourceSession
    syncSessionToSupabase({ ...sourceFields, activa: false, billStatus: 'cerrada' as BillStatus })
    // Move source orders to target mesa
    sourceSession.orders.forEach(o => syncOrderToSupabase({ ...o, mesa: targetSession.mesa }))
  }, [state.tableSessions, setState])

  const splitTableSession = useCallback((sessionId: string, orderIds: string[], toMesa: number) => {
    const session = state.tableSessions.find(s => s.id === sessionId)
    if (!session) return
    const isTargetFree = !state.tableSessions.some(s => s.mesa === toMesa && s.activa)
    if (!isTargetFree) return
    const newSessionId = generateId()
    const orderIdSet = new Set(orderIds)
    setState(prev => {
      const session = prev.tableSessions.find(s => s.id === sessionId)
      if (!session) return prev
      const selectedOrders = session.orders.filter(o => orderIdSet.has(o.id))
      const remainingOrders = session.orders.filter(o => !orderIdSet.has(o.id))
      const newSession: TableSession = {
        id: newSessionId,
        mesa: toMesa,
        activa: true,
        orders: selectedOrders,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        deviceId: 'split',
        billStatus: 'abierta' as BillStatus,
        subtotal: 0,
        impuestos: 0,
        propina: 0,
        descuento: 0,
        total: 0,
        paymentStatus: 'pendiente' as PaymentStatus,
        montoAbonado: 0,
        feedbackDone: false,
      }
      return {
        ...prev,
        tableSessions: [
          ...prev.tableSessions.map(s =>
            s.id === sessionId ? { ...s, orders: remainingOrders } : s
          ),
          newSession,
        ],
        orders: prev.orders.map(o =>
          orderIdSet.has(o.id) ? { ...o, mesa: toMesa } : o
        ),
      }
    })
    // Sync new session and moved orders to Supabase
    syncSessionToSupabase({
      id: newSessionId, mesa: toMesa, activa: true, createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), deviceId: 'split',
      billStatus: 'abierta' as BillStatus, subtotal: 0, impuestos: 0, propina: 0,
      descuento: 0, total: 0, paymentStatus: 'pendiente' as PaymentStatus, montoAbonado: 0, feedbackDone: false,
    })
    session.orders
      .filter(o => orderIdSet.has(o.id))
      .forEach(o => syncOrderToSupabase({ ...o, mesa: toMesa }, newSessionId))
  }, [state.tableSessions, setState])

  const getSessionBill = useCallback((sessionId: string): TableSession | undefined => {
    return state.tableSessions.find(s => s.id === sessionId)
  }, [state.tableSessions])

  const getPaymentsForDate = useCallback((date: Date) => {
    const target = date.toISOString().split("T")[0]

    return state.tableSessions.filter(session => {
      if (!session.paidAt) return false

      const paidDate = new Date(session.paidAt).toISOString().split("T")[0]
      return paidDate === target
    })
  }, [state.tableSessions])

  return {
    setCurrentTable,
    getTableSession,
    createTableSession,
    closeTableSession,
    isSessionValid,
    updateBillTotals,
    applyDiscount,
    setTipAmount,
    requestPayment,
    addPartialPayment,
    confirmPayment,
    persistSplitBill,
    markTableClean,
    reopenTableSession,
    resetSessionPaymentStatus,
    markFeedbackDone,
    addFeedback,
    addToWaitlist,
    updateWaitlistEntry,
    removeWaitlistEntry,
    emergencyCloseAllTables,
    emergencyCloseTables,
    moveTableSession,
    mergeTableSessions,
    splitTableSession,
    getSessionBill,
    getPaymentsForDate,
  }
}

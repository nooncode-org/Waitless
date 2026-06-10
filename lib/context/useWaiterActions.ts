'use client'

import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { AppState } from './types'
import type { WaiterCall, TableState } from '../store'
import { generateId } from '../store'
import { supabase } from '../supabase'
import { pushTriggers } from '../push-triggers'
import { syncWaiterCallToSupabase, syncQrWaiterCall } from './sync'

type SetState = Dispatch<SetStateAction<AppState>>

export function useWaiterActions(state: AppState, setState: SetState) {
  const createWaiterCall = useCallback((mesa: number, tipo: 'atencion' | 'cuenta' | 'otro', mensaje?: string) => {
    const sessionId = state.tableSessions.find(s => s.mesa === mesa && s.activa)?.id
    const call: WaiterCall = {
      id: generateId(),
      mesa,
      tipo,
      mensaje,
      sessionId,
      atendido: false,
      createdAt: new Date(),
    }
    setState(prev => {
      const next = { ...prev, waiterCalls: [...prev.waiterCalls, call] }
      // Task 2.5: marcar mesa como 'cuenta_pedida' para visibilidad en grid
      if (tipo === 'cuenta') {
        next.tables = prev.tables.map(t =>
          t.numero === mesa && t.estado === 'ocupada' ? { ...t, estado: 'cuenta_pedida' as TableState } : t
        )
      }
      return next
    })
    if (!state.currentUser && sessionId) {
      // Cliente QR anónimo: persistir la llamada server-side (service_role) con
      // tenant_id. La ruta también refleja "cuenta pedida" en tables_config.
      syncQrWaiterCall({ mesa, sessionId, call })
    } else {
      syncWaiterCallToSupabase(call, !state.currentUser)
      if (tipo === 'cuenta') {
        supabase.from('tables_config').update({ estado: 'cuenta_pedida' }).eq('numero', mesa).then(() => {})
      }
    }
    // Notify all subscribed staff devices
    pushTriggers.waiterCall(mesa, tipo)
  }, [state.tableSessions, state.currentUser, setState])

  const markCallAttended = useCallback((callId: string, userId: string) => {
    const call = state.waiterCalls.find(c => c.id === callId)
    const updatedCall = call ? { ...call, atendido: true, atendidoPor: userId, atendidoAt: new Date() } : null
    setState(prev => {
      const next = {
        ...prev,
        waiterCalls: prev.waiterCalls.map(c =>
          c.id === callId ? { ...c, atendido: true, atendidoPor: userId, atendidoAt: new Date() } : c
        ),
      }
      // Task 2.5: revertir 'cuenta_pedida' → 'ocupada' cuando se atiende la llamada,
      // pero sólo si no hay otra llamada de cuenta pendiente para esa mesa
      if (call?.tipo === 'cuenta') {
        const otherPending = prev.waiterCalls.some(
          c => c.id !== callId && c.mesa === call.mesa && c.tipo === 'cuenta' && !c.atendido
        )
        if (!otherPending) {
          next.tables = prev.tables.map(t =>
            t.numero === call.mesa && t.estado === 'cuenta_pedida'
              ? { ...t, estado: 'ocupada' as TableState }
              : t
          )
        }
      }
      return next
    })
    if (updatedCall) syncWaiterCallToSupabase(updatedCall)
    // Task 2.5: sync table state revert to Supabase
    if (call?.tipo === 'cuenta') {
      const otherPending = state.waiterCalls.some(
        c => c.id !== callId && c.mesa === call.mesa && c.tipo === 'cuenta' && !c.atendido
      )
      if (!otherPending) {
        supabase.from('tables_config').update({ estado: 'ocupada' }).eq('numero', call.mesa).then(() => {})
      }
    }
  }, [state.waiterCalls, setState])

  const getPendingCalls = useCallback((): WaiterCall[] => {
    return state.waiterCalls.filter(c => !c.atendido)
  }, [state.waiterCalls])

  return { createWaiterCall, markCallAttended, getPendingCalls }
}

'use client'

import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { AppState } from './types'
import type { QRToken } from '../store'
import { supabase } from '../supabase'

type SetState = Dispatch<SetStateAction<AppState>>

export function useQRActions(state: AppState, setState: SetState) {
  const generateTableQR = useCallback(async (mesa: number): Promise<QRToken> => {
    const tenantId = state.currentUser?.tenantId ?? null

    // Evita que el botón quede colgado en "Generando…" si la red/Supabase no responde.
    const withTimeout = <T,>(p: PromiseLike<T>, ms = 12000): Promise<T> =>
      Promise.race([
        Promise.resolve(p),
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('La conexión tardó demasiado. Revisá tu red e intentá de nuevo.')), ms)),
      ])

    // 1. Invalidar tokens previos en Supabase (scoped por tenant cuando aplica)
    //    La columna real es `activo` (boolean) + `used_at` (timestamp). NO existe `usado`.
    let invalidateQuery = supabase
      .from('qr_tokens')
      .update({ activo: false, used_at: new Date().toISOString() })
      .eq('mesa', mesa)
      .eq('activo', true)
    if (tenantId) {
      invalidateQuery = invalidateQuery.eq('tenant_id', tenantId)
    }
    await withTimeout(invalidateQuery)

    // 2. Crear nuevo token en Supabase (incluir tenant_id para aislamiento multi-tenant)
    const expiresAt = new Date(Date.now() + state.config.tiempoExpiracionSesionMinutos * 60 * 1000)
    const insertPayload: Record<string, unknown> = { mesa, expires_at: expiresAt.toISOString() }
    if (tenantId) insertPayload.tenant_id = tenantId
    const { data, error } = await withTimeout(
      supabase
        .from('qr_tokens')
        .insert(insertPayload)
        .select()
        .single()
    )

    if (error || !data) {
      // Sin persistencia en DB = sin QR válido. No existe fallback local (Sprint 2 P0).
      console.error('[generateTableQR] Error al persistir token en Supabase:', error)
      // RLS sin policy de escritura (falta migración 000008) → código 42501.
      const isRls = error?.code === '42501' || /row-level security/i.test(error?.message ?? '')
      throw new Error(
        isRls
          ? 'No se pudo generar el QR: falta la policy de escritura en qr_tokens (migración 000008). Corré esa migración en Supabase.'
          : `No se pudo generar el QR: ${error?.message ?? 'error desconocido'}`
      )
    }

    const newToken: QRToken = {
      id: data.id,
      mesa: data.mesa,
      token: data.token,
      createdAt: new Date(data.created_at),
      expiresAt: new Date(data.expires_at),
      activo: data.activo,
    }

    setState(prev => ({
      ...prev,
      qrTokens: [
        ...prev.qrTokens.map(t => t.mesa === mesa && t.activo ? { ...t, activo: false } : t),
        newToken,
      ],
    }))

    return newToken
  }, [state.config.tiempoExpiracionSesionMinutos, state.currentUser?.tenantId, setState])

  const validateTableQR = useCallback(async (token: string): Promise<{ valid: boolean; mesa?: number; token?: QRToken }> => {
    // Validar contra Supabase (fuente de verdad) — scoped por tenant cuando aplica
    const tenantId = state.currentUser?.tenantId ?? null
    let query = supabase
      .from('qr_tokens')
      .select('*')
      .eq('token', token)
      .eq('activo', true)
      .gt('expires_at', new Date().toISOString())
    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }
    const { data, error } = await query.single()

    if (error || !data) {
      return { valid: false }
    }

    const qrToken: QRToken = {
      id: data.id,
      mesa: data.mesa,
      token: data.token,
      createdAt: new Date(data.created_at),
      expiresAt: new Date(data.expires_at),
      activo: true,
    }

    return { valid: true, mesa: data.mesa, token: qrToken }
  }, [state.currentUser?.tenantId])

  const invalidateTableQR = useCallback(async (tokenId: string): Promise<void> => {
    await supabase.from('qr_tokens').update({ activo: false, used_at: new Date().toISOString() }).eq('id', tokenId)
    setState(prev => ({
      ...prev,
      qrTokens: prev.qrTokens.map(t =>
        t.id === tokenId ? { ...t, activo: false } : t
      ),
    }))
  }, [setState])

  const getActiveQRForTable = useCallback((mesa: number): QRToken | undefined => {
    return state.qrTokens.find(t => t.mesa === mesa && t.activo && new Date(t.expiresAt) > new Date())
  }, [state.qrTokens])

  return { generateTableQR, validateTableQR, invalidateTableQR, getActiveQRForTable }
}

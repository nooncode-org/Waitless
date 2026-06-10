/**
 * lib/context/sync.ts
 *
 * Helpers de sincronización con Supabase extraídos de lib/context.tsx.
 * Funciones puras sin dependencias de React — pueden importarse en cualquier contexto.
 */

import { supabase, getSessionClient } from '../supabase'
import { executeOrQueue } from '../offline-queue'
import { logError } from '../handle-error'
import type { Order, TableSession, WaiterCall } from '../store'

export async function uploadMenuImage(file: File): Promise<string | null> {
  const fileName = `${Date.now()}-${file.name}`

  const { error } = await supabase.storage
    .from('menu-images')
    .upload(fileName, file)

  if (error) {
    console.error('Error subiendo imagen:', error)
    return null
  }

  const { data } = supabase.storage
    .from('menu-images')
    .getPublicUrl(fileName)

  return data.publicUrl
}

export async function uploadMenuImages(files: (File | null)[]): Promise<string[]> {
  const results = await Promise.all(
    files.map(f => (f ? uploadMenuImage(f) : Promise.resolve(null)))
  )
  return results.filter((url): url is string => url !== null)
}

/** Token QR de la mesa, leído de la URL (?token=). El cliente QR vive en /restaurante?mesa=&token=. */
function qrUrlToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return new URLSearchParams(window.location.search).get('token')
  } catch {
    return null
  }
}

/**
 * Crea/recupera la sesión de mesa del cliente QR anónimo vía ruta server (service_role).
 * Necesario porque la RLS no permite que el anónimo inserte en `table_sessions`.
 */
export async function syncQrSession(params: { mesa: number; sessionId: string; expiresAt?: string }) {
  const token = qrUrlToken()
  if (!token) return
  try {
    const res = await fetch('/api/qr/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, mesa: params.mesa, sessionId: params.sessionId, expiresAt: params.expiresAt }),
    })
    if (!res.ok) logError('syncQrSession', new Error(`HTTP ${res.status}`))
  } catch (e) {
    logError('syncQrSession', e)
  }
}

/**
 * Persiste un pedido del cliente QR anónimo vía ruta server (service_role),
 * que estampa el `tenant_id` resuelto desde el token.
 */
export async function syncQrOrder(params: { mesa: number; sessionId: string; order: Order }) {
  const token = qrUrlToken()
  if (!token) return
  const o = params.order
  const createdAt = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt)
  try {
    const res = await fetch('/api/qr/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        mesa: params.mesa,
        sessionId: params.sessionId,
        order: {
          id: o.id,
          numero: o.numero,
          items: o.items,
          seatNumber: o.seatNumber ?? null,
          nombreCliente: o.nombreCliente ?? null,
          telefono: o.telefono ?? null,
          email: o.email ?? null,
          notas: o.notas ?? null,
          createdAt: createdAt.toISOString(),
        },
      }),
    })
    if (!res.ok) logError('syncQrOrder', new Error(`HTTP ${res.status}`))
  } catch (e) {
    logError('syncQrOrder', e)
  }
}

/**
 * Persiste una llamada de mesero del cliente QR anónimo vía ruta server
 * (service_role), que estampa el `tenant_id`. Necesario para que el admin reciba
 * el aviso (ej. "Cuenta solicitada") en vivo: la RLS no deja al anónimo cumplir
 * el match de tenant en waiter_calls.
 */
export async function syncQrWaiterCall(params: { mesa: number; sessionId: string; call: WaiterCall }) {
  const token = qrUrlToken()
  if (!token) return
  const c = params.call
  try {
    const res = await fetch('/api/qr/waiter-call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        mesa: params.mesa,
        sessionId: params.sessionId,
        call: { id: c.id, tipo: c.tipo, mensaje: c.mensaje ?? null },
      }),
    })
    if (!res.ok) logError('syncQrWaiterCall', new Error(`HTTP ${res.status}`))
  } catch (e) {
    logError('syncQrWaiterCall', e)
  }
}

export async function syncOrderToSupabase(order: Order, sessionId?: string) {
  const data: Record<string, unknown> = {
    id: order.id,
    numero: order.numero,
    canal: order.canal,
    mesa: order.mesa ?? null,
    seat_number: order.seatNumber ?? null,
    items: order.items as unknown as object,
    status: order.status,
    cocina_a_status: order.cocinaStatus,
    nombre_cliente: order.nombreCliente ?? null,
    telefono: order.telefono ?? null,
    email: order.email ?? null,
    notas: order.notas ?? null,
    direccion: order.direccion ?? null,
    zona_reparto: order.zonaReparto ?? null,
    repartidor_id: order.repartidorId ?? null,
    cancelado: order.cancelado ?? false,
    cancel_reason: order.cancelReason ?? null,
    cancel_motivo: order.cancelMotivo ?? null,
    cancelado_por: order.canceladoPor ?? null,
    session_id: sessionId ?? null,
    tiempo_inicio_preparacion: order.tiempoInicioPreparacion?.toISOString() ?? null,
    tiempo_fin_preparacion: order.tiempoFinPreparacion?.toISOString() ?? null,
    cancelado_at: order.canceladoAt?.toISOString() ?? null,
    confirmed_at: order.confirmedAt?.toISOString() ?? null,
    kitchen_received_at: order.kitchenReceivedAt?.toISOString() ?? null,
    is_qr_order: order.isQrOrder ?? false,
    updated_at: new Date().toISOString(),
  }
  await executeOrQueue({
    table: 'orders',
    type: 'upsert',
    data,
    sessionId: order.isQrOrder ? (sessionId ?? undefined) : undefined,
  })
}

export async function syncSessionToSupabase(
  session: Omit<TableSession, 'orders'>,
  anonSessionId?: string,
) {
  const data: Record<string, unknown> = {
    id: session.id,
    mesa: session.mesa,
    activa: session.activa,
    bill_status: session.billStatus,
    subtotal: session.subtotal,
    impuestos: session.impuestos,
    propina: session.propina,
    descuento: session.descuento,
    descuento_motivo: session.descuentoMotivo ?? null,
    total: session.total,
    monto_abonado: session.montoAbonado ?? 0,
    payment_method: session.paymentMethod ?? null,
    payment_status: session.paymentStatus,
    device_id: session.deviceId,
    feedback_done: session.feedbackDone ?? false,
    paid_at: session.paidAt?.toISOString() ?? null,
    receipt_id: session.receiptId ?? null,
    expires_at: session.expiresAt?.toISOString() ?? null,
    version: session.version ?? 0,
  }
  // NOTA: table_sessions NO tiene columna `updated_at` (a diferencia de `orders`).
  // Enviarla causaba 400 Bad Request en cada upsert de sesión (staff).
  await executeOrQueue({ table: 'table_sessions', type: 'upsert', data, sessionId: anonSessionId })
}

/**
 * Verifica que la versión local coincide con la de Supabase.
 * Retorna:
 *   'ok'       — versión coincide, proceder
 *   'conflict' — otro dispositivo ya mutó la sesión, refrescar y bloquear
 *   'offline'  — no se pudo verificar (sin conexión), hard-fail para operaciones críticas
 */
export async function checkSessionVersion(
  sessionId: string,
  localVersion: number,
): Promise<'ok' | 'conflict' | 'offline'> {
  try {
    const { data } = await supabase
      .from('table_sessions')
      .select('version')
      .eq('id', sessionId)
      .single()
    if (!data) return 'ok' // sesión nueva, no hay conflicto
    return (data.version ?? 0) === localVersion ? 'ok' : 'conflict'
  } catch (e) {
    logError('checkSessionVersion', e)
    return 'offline'
  }
}

export async function syncWaiterCallToSupabase(call: WaiterCall, isAnon?: boolean) {
  // Usa session client (anon key + x-session-id) para flujos QR,
  // supabase normal para staff autenticado (markCallAttended)
  const client = isAnon && call.sessionId ? getSessionClient(call.sessionId) : supabase
  try {
    const { error } = await client.from('waiter_calls').upsert({
      id: call.id,
      mesa: call.mesa,
      tipo: call.tipo,
      mensaje: call.mensaje ?? null,
      session_id: call.sessionId ?? null,
      atendido: call.atendido,
      atendido_por: call.atendidoPor ?? null,
      atendido_at: call.atendidoAt?.toISOString() ?? null,
    })
    if (error) logError('syncWaiterCall', error)
  } catch (e) {
    logError('syncWaiterCall', e)
  }
}

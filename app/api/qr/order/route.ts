/**
 * POST /api/qr/order
 * Persiste un pedido del cliente QR anónimo (service_role → bypassa RLS),
 * estampando el `tenant_id` resuelto desde el token. Garantiza la sesión de forma
 * idempotente y recalcula los totales de la sesión para que el admin los vea en vivo.
 *
 * Body: {
 *   token: string, mesa: number, sessionId: string,
 *   order: { id, numero, items, seatNumber?, nombreCliente?, telefono?, email?, notas?, createdAt? }
 * }
 * Response: { ok: boolean, error?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolveQrToken, ensureQrSession, computeItemsSubtotal, fetchMenuPriceMap } from '@/lib/qr-server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

interface QrOrderInput {
  id?: string
  numero?: number
  items?: unknown
  seatNumber?: number | null
  nombreCliente?: string | null
  telefono?: string | null
  email?: string | null
  notas?: string | null
  createdAt?: string
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(`qr-order:${getClientIp(req)}`, 40, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'Demasiados pedidos, esperá un momento' }, { status: 429 })
  }

  let body: { token?: string; mesa?: number; sessionId?: string; order?: QrOrderInput }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Body JSON inválido' }, { status: 400 })
  }

  const { token, mesa, sessionId, order } = body

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ ok: false, error: 'token requerido' }, { status: 400 })
  }
  if (typeof mesa !== 'number' || !Number.isInteger(mesa) || mesa <= 0) {
    return NextResponse.json({ ok: false, error: 'mesa requerida' }, { status: 400 })
  }
  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ ok: false, error: 'sessionId requerido' }, { status: 400 })
  }
  if (!order || typeof order !== 'object' || !order.id || !Array.isArray(order.items)) {
    return NextResponse.json({ ok: false, error: 'order inválido' }, { status: 400 })
  }

  const r = await resolveQrToken(req, token, mesa)
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.error }, { status: 403 })
  }
  const tenantId = r.tenantId

  // Idempotente: la sesión debe existir antes del pedido.
  try {
    await ensureQrSession({ sessionId, tenantId, mesa })
  } catch {
    return NextResponse.json({ ok: false, error: 'No se pudo crear la sesión' }, { status: 500 })
  }

  // Precios reales desde la DB — no confiar en los que envía el cliente (anti-tampering).
  const itemIds = (order.items as Array<{ menuItem?: { id?: unknown } }>)
    .map(i => (typeof i?.menuItem?.id === 'string' ? i.menuItem.id : ''))
    .filter(Boolean)
  const priceMap = await fetchMenuPriceMap(itemIds)
  const subtotal = computeItemsSubtotal(order.items, priceMap)

  const { error: orderErr } = await supabaseAdmin.from('orders').upsert(
    {
      id: order.id,
      tenant_id: tenantId,
      numero: Number(order.numero) || 1,
      canal: 'mesa',
      mesa,
      session_id: sessionId,
      seat_number: order.seatNumber ?? null,
      items: order.items,
      status: 'recibido',
      cocina_a_status: 'en_cola',
      nombre_cliente: order.nombreCliente ?? null,
      telefono: order.telefono ?? null,
      email: order.email ?? null,
      notas: order.notas ?? null,
      is_qr_order: true,
      subtotal,
      total: subtotal,
      confirmed_at: order.createdAt ?? new Date().toISOString(),
      created_at: order.createdAt ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )

  if (orderErr) {
    return NextResponse.json({ ok: false, error: 'No se pudo guardar el pedido' }, { status: 500 })
  }

  // Recalcular totales de la sesión desde TODOS sus pedidos (no-fatal si falla: el pedido ya se guardó).
  try {
    const { data: sessionOrders } = await supabaseAdmin
      .from('orders')
      .select('subtotal')
      .eq('session_id', sessionId)
      .neq('status', 'cancelado')

    // Suma de los subtotales ya endurecidos por pedido (cada uno recalculado desde la DB).
    const sessSubtotal = (sessionOrders ?? []).reduce(
      (s, row) => s + (Number((row as { subtotal?: unknown }).subtotal) || 0),
      0,
    )

    let taxPct = 0
    if (tenantId) {
      const { data: cfg } = await supabaseAdmin
        .from('app_config')
        .select('impuesto_porcentaje')
        .eq('tenant_id', tenantId)
        .single()
      taxPct = Number((cfg as { impuesto_porcentaje?: unknown } | null)?.impuesto_porcentaje) || 0
    }

    const impuestos = Math.round(sessSubtotal * taxPct) / 100
    const total = Math.round((sessSubtotal + impuestos) * 100) / 100
    await supabaseAdmin
      .from('table_sessions')
      .update({ subtotal: sessSubtotal, impuestos, total })
      .eq('id', sessionId)
  } catch {
    /* no-fatal */
  }

  return NextResponse.json({ ok: true })
}

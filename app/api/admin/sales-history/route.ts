/**
 * GET /api/admin/sales-history
 * Historial de ventas basado en los códigos QR de mesa.
 * Cada QR representa una sesión de mesa: se devuelve su estado y la venta
 * asociada (pedidos cuyo `mesa` coincide y cuyo `created_at` cae dentro de la
 * ventana de vida del QR [created_at, used_at ?? expires_at]).
 *
 * Tenant-scoped vía requireRole. Paginado.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface OrderLite {
  id: string
  numero: number
  total: number
  createdAt: string
  status: string
  cancelado: boolean
  items: unknown[]
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['admin', 'manager'])
  if ('error' in auth) return auth.error

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))
  const limit = 20
  const offset = (page - 1) * limit

  // 1. QR tokens (historial completo) del tenant
  let tokensQuery = supabaseAdmin
    .from('qr_tokens')
    .select('id, mesa, token, created_at, expires_at, used_at, activo', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (auth.tenantId) tokensQuery = tokensQuery.eq('tenant_id', auth.tenantId)

  const { data: tokenRows, count, error: tokensError } = await tokensQuery
  if (tokensError) {
    return NextResponse.json({ error: tokensError.message }, { status: 500 })
  }

  const tokens = tokenRows ?? []

  // 2. Pedidos de mesa en el rango temporal cubierto por estos QR
  let orders: OrderLite[] = []
  if (tokens.length > 0) {
    const starts = tokens.map(t => new Date(t.created_at as string).getTime())
    const ends = tokens.map(t => new Date((t.used_at as string | null) ?? (t.expires_at as string)).getTime())
    const minStart = new Date(Math.min(...starts)).toISOString()
    const maxEnd = new Date(Math.max(...ends, Date.now())).toISOString()

    let ordersQuery = supabaseAdmin
      .from('orders')
      .select('id, numero, mesa, total, created_at, status, cancelado, items')
      .not('mesa', 'is', null)
      .gte('created_at', minStart)
      .lte('created_at', maxEnd)
      .order('created_at', { ascending: true })
    if (auth.tenantId) ordersQuery = ordersQuery.eq('tenant_id', auth.tenantId)

    const { data: orderRows } = await ordersQuery
    orders = (orderRows ?? []).map(o => ({
      id: o.id as string,
      numero: o.numero as number,
      total: Number(o.total ?? 0),
      createdAt: o.created_at as string,
      status: o.status as string,
      cancelado: (o.cancelado as boolean) ?? false,
      items: (o.items as unknown[]) ?? [],
      // se conserva mesa internamente para el match
      mesa: o.mesa as number,
    })) as unknown as OrderLite[]
  }

  // 3. Cruzar cada QR con sus pedidos (misma mesa + dentro de la ventana del QR)
  const now = Date.now()
  const entries = tokens.map(t => {
    const start = new Date(t.created_at as string).getTime()
    const endRaw = (t.used_at as string | null) ?? (t.expires_at as string)
    const end = new Date(endRaw).getTime()
    const mesa = t.mesa as number

    const sesionOrders = orders
      .filter(o => {
        const om = (o as unknown as { mesa: number }).mesa
        const oc = new Date(o.createdAt).getTime()
        return om === mesa && oc >= start && oc <= end && !o.cancelado
      })
      .map(({ id, numero, total, createdAt, status, items }) => ({ id, numero, total, createdAt, status, items }))

    const totalVendido = sesionOrders.reduce((s, o) => s + o.total, 0)

    const activo = (t.activo as boolean) === true
    const expired = new Date(t.expires_at as string).getTime() < now
    const estado: 'activo' | 'cerrado' | 'expirado' =
      activo && !expired ? 'activo' : (t.used_at ? 'cerrado' : 'expirado')

    return {
      id: t.id as string,
      mesa,
      token: t.token as string,
      createdAt: t.created_at as string,
      expiresAt: t.expires_at as string,
      usedAt: (t.used_at as string | null) ?? null,
      estado,
      totalVendido,
      pedidos: sesionOrders.length,
      orders: sesionOrders,
    }
  })

  return NextResponse.json({ entries, total: count ?? 0, page, limit })
}

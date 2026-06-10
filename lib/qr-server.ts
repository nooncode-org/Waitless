/**
 * lib/qr-server.ts
 *
 * Helpers server-side para el flujo del cliente QR anónimo.
 * Usan supabaseAdmin (service_role) → bypassan RLS.
 *
 * Motivo: el cliente anónimo NO puede crear `table_sessions` (la política
 * `auth_insert_tenant_sessions` exige staff autenticado) ni estampar `tenant_id`
 * en `orders` (la RLS `anon_insert_orders` exige `orders.tenant_id = session.tenant_id`).
 * Por eso la sesión y el pedido del cliente QR se persisten server-side, resolviendo
 * el `tenant_id` autoritativamente desde el `qr_token` validado.
 */

import type { NextRequest } from 'next/server'
import { supabaseAdmin } from './supabase-admin'

export type QrResolution =
  | { ok: true; tenantId: string | null }
  | { ok: false; error: string }

/**
 * Valida el token QR (activo, no expirado, mesa correcta) y resuelve el tenant.
 * Replica el scoping multi-tenant de /api/qr/validate (x-tenant-slug).
 */
export async function resolveQrToken(
  req: NextRequest,
  token: string,
  mesa: number,
): Promise<QrResolution> {
  const tenantSlug = req.headers.get('x-tenant-slug') ?? 'default'
  let tenantId: string | null = null

  if (tenantSlug !== 'default') {
    const { data: tenantRow } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .eq('activo', true)
      .single()
    tenantId = tenantRow?.id ?? null
    if (!tenantId) return { ok: false, error: 'Tenant no encontrado' }
  }

  let query = supabaseAdmin
    .from('qr_tokens')
    .select('id, mesa, tenant_id')
    .eq('token', token)
    .eq('activo', true)
    .gt('expires_at', new Date().toISOString())
  if (tenantId) query = query.eq('tenant_id', tenantId)

  const { data, error } = await query.single()
  if (error || !data) return { ok: false, error: 'QR inválido o expirado' }
  if (data.mesa !== mesa) return { ok: false, error: 'Token no corresponde a esta mesa' }

  return { ok: true, tenantId: (data.tenant_id as string | null) ?? tenantId }
}

/**
 * Subtotal de un pedido a partir de sus items (mirror de calculateOrderTotal del cliente).
 * Si se pasa `priceMap` (id de menu_item → precio real de la DB), el precio base se
 * toma de la DB en vez de confiar en el que envía el cliente (endurecimiento anti-tampering).
 */
export function computeItemsSubtotal(items: unknown, priceMap?: Record<string, number>): number {
  if (!Array.isArray(items)) return 0
  let total = 0
  for (const raw of items) {
    const it = raw as { menuItem?: { id?: unknown; precio?: unknown }; cantidad?: unknown; extras?: unknown }
    const id = it?.menuItem?.id
    const dbPrice = priceMap && typeof id === 'string' ? priceMap[id] : undefined
    const precio = dbPrice ?? (Number(it?.menuItem?.precio) || 0)
    const cantidad = Number(it?.cantidad) || 0
    const extras = Array.isArray(it?.extras) ? it.extras : []
    const extrasTotal = extras.reduce((s: number, ex) => {
      const e = ex as { precio?: unknown }
      return s + (Number(e?.precio) || 0)
    }, 0)
    total += (precio + extrasTotal) * cantidad
  }
  return Math.round(total * 100) / 100
}

/** Mapa id→precio real desde menu_items, para recalcular totales server-side. */
export async function fetchMenuPriceMap(itemIds: string[]): Promise<Record<string, number>> {
  const ids = [...new Set(itemIds.filter(Boolean))]
  if (ids.length === 0) return {}
  const { data } = await supabaseAdmin.from('menu_items').select('id, price').in('id', ids)
  const map: Record<string, number> = {}
  for (const row of data ?? []) {
    const r = row as { id?: unknown; price?: unknown }
    if (typeof r.id === 'string') map[r.id] = Number(r.price) || 0
  }
  return map
}

/**
 * Crea (o recupera) la sesión de mesa de forma idempotente.
 * Usa el mismo UUID que generó el cliente para que el estado optimista y los
 * eventos de Realtime coincidan por id. `ignoreDuplicates` evita pisar una sesión existente.
 */
export async function ensureQrSession(opts: {
  sessionId: string
  tenantId: string | null
  mesa: number
  expiresAt?: string
}): Promise<void> {
  await supabaseAdmin.from('table_sessions').upsert(
    {
      id: opts.sessionId,
      tenant_id: opts.tenantId,
      mesa: opts.mesa,
      activa: true,
      bill_status: 'abierta',
      expires_at: opts.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: 'id', ignoreDuplicates: true },
  )
}

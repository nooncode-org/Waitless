/**
 * GET /api/admin/export
 * Genera un snapshot JSON de las tablas de configuración críticas
 * (menú, categorías, config del restaurante, mesas) para backup manual.
 *
 * Protegido: requiere rol admin activo.
 * Responde con Content-Disposition: attachment para descarga directa.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireRole } from '@/lib/api-auth'
import { getTenantByIdAdmin, checkPlanFeature } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const auth = await requireRole(req, ['admin'])
  if ('error' in auth) return auth.error

  // ── Plan guard: analytics/export requiere pro o enterprise ─────────────────
  if (auth.tenantId) {
    const tenant = await getTenantByIdAdmin(auth.tenantId)
    if (!checkPlanFeature(tenant, 'analytics')) {
      return NextResponse.json(
        { error: 'Tu plan no incluye exportación de datos. Actualizá a Pro o Enterprise.' },
        { status: 403 },
      )
    }
  }

  // ── Snapshot via direct tenant-scoped queries ────────────────────────────────
  // Using direct queries instead of the legacy export_snapshot() RPC so that
  // each tenant only gets their own data.
  const tenantFilter = auth.tenantId

  const [menuRes, categoriesRes, configRes, tablesRes] = await Promise.all([
    tenantFilter
      ? supabaseAdmin.from('menu_items').select('*').eq('tenant_id', tenantFilter).order('orden')
      : supabaseAdmin.from('menu_items').select('*').order('orden'),
    tenantFilter
      ? supabaseAdmin.from('categories').select('*').eq('tenant_id', tenantFilter).order('orden')
      : supabaseAdmin.from('categories').select('*').order('orden'),
    tenantFilter
      ? supabaseAdmin.from('app_config').select('*').eq('tenant_id', tenantFilter).single()
      : supabaseAdmin.from('app_config').select('*').eq('id', 'default').single(),
    tenantFilter
      ? supabaseAdmin.from('tables_config').select('*').eq('tenant_id', tenantFilter).order('numero')
      : supabaseAdmin.from('tables_config').select('*').order('numero'),
  ])

  const error = menuRes.error ?? categoriesRes.error ?? configRes.error ?? tablesRes.error
  if (error) {
    console.error('[/api/admin/export]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const data = {
    version: 4,
    exported_at: new Date().toISOString(),
    tenant_id: tenantFilter ?? null,
    menu_items: menuRes.data ?? [],
    categories: categoriesRes.data ?? [],
    app_config: configRes.data ?? {},
    tables: tablesRes.data ?? [],
  }

  // ── Serializar y responder como archivo descargable ─────────────────────────
  const filename = `waitless-backup-${new Date().toISOString().slice(0, 10)}.json`
  const body = JSON.stringify(data, null, 2)

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

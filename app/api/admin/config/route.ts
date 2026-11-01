/**
 * PUT /api/admin/config
 * Actualiza la configuración general y/o el branding del restaurante.
 * Solo admin puede modificar la configuración crítica y el branding.
 *
 * Sprint 3 — invariantes server-side completados:
 * - Rol admin validado contra DB (requireRole)
 * - Solo se permiten campos de la lista blanca (no inyección de columnas)
 * - Registra en audit_logs con antes/después
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Campos permitidos para actualización — lista blanca explícita
const ALLOWED_FIELDS = new Set([
  // Operación
  'impuesto_porcentaje',
  'propina_sugerida_porcentaje',
  'tiempo_expiracion_sesion_minutos',
  'zonas_reparto',
  'delivery_habilitado',
  'costo_envio',
  'horarios_operacion',
  'metodos_pago_activos',
  'sonido_nuevos_pedidos',
  'notificaciones_stock_bajo',
  'pacing_max_preparando',
  'google_review_url',
  'max_mesas',
  // Branding
  'restaurant_name',
  'logo_url',
  'primary_color',
  'secondary_color',
  'accent_color',
  'font_family',
  'powered_by_waitless',
  // Contacto
  'whatsapp_numero',
  // Menú digital
  'cover_url',
  'descripcion',
  // Estado de la tienda
  'tienda_abierta',
  'tienda_visible',
  'auto_horario_apertura',
  'auto_horario_cierre',
])

export async function PUT(req: NextRequest) {
  // Solo admin puede tocar configuración crítica y branding
  const auth = await requireRole(req, ['admin'])
  if ('error' in auth) return auth.error

  let updates: Record<string, unknown>
  try {
    updates = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Se requiere al menos un campo para actualizar' }, { status: 400 })
  }

  // Filtrar solo campos permitidos (previene inyección de columnas)
  const safeUpdates: Record<string, unknown> = {}
  const rejected: string[] = []
  for (const [key, value] of Object.entries(updates)) {
    if (ALLOWED_FIELDS.has(key)) {
      safeUpdates[key] = value
    } else {
      rejected.push(key)
    }
  }

  if (rejected.length > 0) {
    return NextResponse.json(
      { error: `Campos no permitidos: ${rejected.join(', ')}` },
      { status: 400 },
    )
  }

  if (Object.keys(safeUpdates).length === 0) {
    return NextResponse.json({ error: 'Ningún campo válido para actualizar' }, { status: 400 })
  }

  // Scope the config row to the admin's tenant (multi-tenant) or the default row (single-tenant)
  const configFilter: [string, string] = auth.tenantId
    ? ['tenant_id', auth.tenantId]
    : ['id', 'default']

  // Leer estado anterior para audit log
  const { data: before } = await supabaseAdmin
    .from('app_config')
    .select(Object.keys(safeUpdates).join(', '))
    .eq(configFilter[0], configFilter[1])
    .single()

  // Aplicar cambios
  const { data: config, error } = await supabaseAdmin
    .from('app_config')
    .update(safeUpdates)
    .eq(configFilter[0], configFilter[1])
    .select()
    .single()

  if (error) {
    console.error('[/api/admin/config] Error actualizando config:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Trazabilidad: qué campos cambiaron y quién los cambió
  const isBrandingChange = ['restaurant_name', 'logo_url', 'primary_color', 'secondary_color', 'accent_color', 'font_family', 'powered_by_waitless'].some(f => f in safeUpdates)
  const accion = isBrandingChange ? 'cambio_branding' : 'actualizar_config'

  await supabaseAdmin.from('audit_logs').insert({
    id: crypto.randomUUID(),
    user_id: auth.userId,
    accion,
    entidad: 'app_config',
    entidad_id: auth.tenantId ?? 'default',
    detalles: `Campos actualizados: ${Object.keys(safeUpdates).join(', ')}`,
    antes: before ?? {},
    despues: safeUpdates,
  }).then(() => {})

  return NextResponse.json({ config })
}

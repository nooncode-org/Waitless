/**
 * POST /api/admin/reopen-session
 * Reabre una sesión cerrada/pagada. Solo manager y admin pueden ejecutarlo.
 * Razón obligatoria para trazabilidad.
 *
 * Sprint 3 — invariantes server-side:
 * - Rol manager/admin validado contra DB (requireRole)
 * - La sesión debe estar en estado 'pagada' o 'liberada'
 * - Razón obligatoria (queda en audit_logs)
 * - Registra en audit_logs con antes/después
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

const REOPENABLE_STATES = ['pagada', 'liberada']

export async function POST(req: NextRequest) {
  // Solo manager y admin pueden reabrir sesiones
  const auth = await requireRole(req, ['manager', 'admin'])
  if ('error' in auth) return auth.error

  let body: { sessionId: string; razon: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { sessionId, razon } = body

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId requerido' }, { status: 400 })
  }
  if (!razon || razon.trim().length < 5) {
    return NextResponse.json({ error: 'Razón obligatoria (mínimo 5 caracteres)' }, { status: 400 })
  }

  // Verificar que la sesión existe, está en estado reabrile y pertenece al tenant del llamador
  let sessionQuery = supabaseAdmin
    .from('table_sessions')
    .select('id, mesa, bill_status, activa')
    .eq('id', sessionId)
  if (auth.tenantId) sessionQuery = sessionQuery.eq('tenant_id', auth.tenantId)
  const { data: session, error: sessionError } = await sessionQuery.single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
  }

  if (!REOPENABLE_STATES.includes(session.bill_status as string)) {
    return NextResponse.json(
      { error: `Solo se puede reabrir una sesión pagada o liberada. Estado actual: ${session.bill_status}` },
      { status: 409 },
    )
  }

  const estadoAnterior = session.bill_status

  // Reabrir sesión
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('table_sessions')
    .update({ bill_status: 'abierta', activa: true, payment_status: 'pendiente' })
    .eq('id', sessionId)
    .select('id, bill_status, activa')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Devolver la mesa de ESTE tenant a estado ocupada (tables_config aislada por tenant)
  let tableUpdate = supabaseAdmin
    .from('tables_config')
    .update({ estado: 'ocupada' })
    .eq('numero', session.mesa)
  if (auth.tenantId) tableUpdate = tableUpdate.eq('tenant_id', auth.tenantId)
  await tableUpdate

  // Audit log — razón obligatoria para este tipo de operación
  await supabaseAdmin.from('audit_logs').insert({
    id: crypto.randomUUID(),
    user_id: auth.userId,
    accion: 'reabrir_mesa',
    entidad: 'table_sessions',
    entidad_id: sessionId,
    detalles: `Mesa ${session.mesa} reabierta — motivo: ${razon.trim()}`,
    razon: razon.trim(),
    antes: { bill_status: estadoAnterior, activa: false },
    despues: { bill_status: 'abierta', activa: true },
  }).then(() => {})

  return NextResponse.json({ ok: true, session: updated })
}

/**
 * POST /api/admin/close-session
 * Marca una sesión pagada como liberada (mesa queda disponible).
 * Equivale al "cierre de caja" por mesa — mesero, manager y admin pueden ejecutarlo.
 *
 * Sprint 3 — invariantes server-side:
 * - Rol validado contra DB (mesero/manager/admin)
 * - La sesión debe estar en estado 'pagada' para poder liberarse
 * - Registra en audit_logs
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['mesero', 'manager', 'admin'])
  if ('error' in auth) return auth.error

  let body: { sessionId: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { sessionId } = body
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId requerido' }, { status: 400 })
  }

  // Verificar que la sesión existe, está en estado pagada y pertenece al tenant del llamador
  let sessionQuery = supabaseAdmin
    .from('table_sessions')
    .select('id, mesa, bill_status, activa')
    .eq('id', sessionId)
  if (auth.tenantId) sessionQuery = sessionQuery.eq('tenant_id', auth.tenantId)
  const { data: session, error: sessionError } = await sessionQuery.single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
  }

  if (session.bill_status !== 'pagada') {
    return NextResponse.json(
      { error: `Solo se puede liberar una sesión pagada. Estado actual: ${session.bill_status}` },
      { status: 409 },
    )
  }

  // Marcar la mesa de ESTE tenant como disponible (tables_config aislada por tenant)
  let tableUpdate = supabaseAdmin
    .from('tables_config')
    .update({ estado: 'disponible' })
    .eq('numero', session.mesa)
  if (auth.tenantId) tableUpdate = tableUpdate.eq('tenant_id', auth.tenantId)

  // Liberar sesión y marcar mesa como disponible
  const [sessionResult, tableResult] = await Promise.all([
    supabaseAdmin
      .from('table_sessions')
      .update({ bill_status: 'liberada' })
      .eq('id', sessionId)
      .eq('bill_status', 'pagada')
      .select('id, bill_status')
      .single(),
    tableUpdate,
  ])

  if (sessionResult.error) {
    return NextResponse.json({ error: sessionResult.error.message }, { status: 500 })
  }

  // Audit log
  await supabaseAdmin.from('audit_logs').insert({
    id: crypto.randomUUID(),
    user_id: auth.userId,
    accion: 'cerrar_mesa',
    entidad: 'table_sessions',
    entidad_id: sessionId,
    detalles: `Mesa ${session.mesa} liberada — sesión ${sessionId}`,
    antes: { bill_status: 'pagada' },
    despues: { bill_status: 'liberada' },
  }).then(() => {})

  return NextResponse.json({ ok: true, session: sessionResult.data })
}

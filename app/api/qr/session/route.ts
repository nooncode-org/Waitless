/**
 * POST /api/qr/session
 * Crea/recupera la sesión de mesa del cliente QR anónimo (service_role → bypassa RLS).
 * El cliente anónimo no puede insertar en `table_sessions` bajo RLS, por eso se hace acá.
 *
 * Body: { token: string, mesa: number, sessionId: string, expiresAt?: string }
 * Response: { ok: boolean, error?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveQrToken, ensureQrSession } from '@/lib/qr-server'

export async function POST(req: NextRequest) {
  let body: { token?: string; mesa?: number; sessionId?: string; expiresAt?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Body JSON inválido' }, { status: 400 })
  }

  const { token, mesa, sessionId, expiresAt } = body

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ ok: false, error: 'token requerido' }, { status: 400 })
  }
  if (typeof mesa !== 'number' || !Number.isInteger(mesa) || mesa <= 0) {
    return NextResponse.json({ ok: false, error: 'mesa requerida' }, { status: 400 })
  }
  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ ok: false, error: 'sessionId requerido' }, { status: 400 })
  }

  const r = await resolveQrToken(req, token, mesa)
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.error }, { status: 403 })
  }

  try {
    await ensureQrSession({ sessionId, tenantId: r.tenantId, mesa, expiresAt })
  } catch {
    return NextResponse.json({ ok: false, error: 'No se pudo crear la sesión' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

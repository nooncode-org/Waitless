/**
 * POST /api/qr/waiter-call
 * Persiste una llamada de mesero del cliente QR anónimo (service_role → bypassa RLS),
 * estampando el `tenant_id` resuelto desde el token. Garantiza la sesión de forma
 * idempotente para que el admin reciba el aviso (p.ej. "Cuenta solicitada") en vivo.
 *
 * Body: { token, mesa, sessionId, call: { id, tipo, mensaje? } }
 * Response: { ok: boolean, error?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolveQrToken, ensureQrSession } from '@/lib/qr-server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

type WaiterTipo = 'atencion' | 'cuenta' | 'otro'

interface QrCallInput {
  id?: string
  tipo?: WaiterTipo
  mensaje?: string | null
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(`qr-waiter-call:${getClientIp(req)}`, 12, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'Demasiadas llamadas, esperá un momento' }, { status: 429 })
  }

  let body: { token?: string; mesa?: number; sessionId?: string; call?: QrCallInput }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Body JSON inválido' }, { status: 400 })
  }

  const { token, mesa, sessionId, call } = body

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ ok: false, error: 'token requerido' }, { status: 400 })
  }
  if (typeof mesa !== 'number' || !Number.isInteger(mesa) || mesa <= 0) {
    return NextResponse.json({ ok: false, error: 'mesa requerida' }, { status: 400 })
  }
  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ ok: false, error: 'sessionId requerido' }, { status: 400 })
  }
  const tipo: WaiterTipo = call?.tipo === 'cuenta' || call?.tipo === 'otro' ? call.tipo : 'atencion'
  if (!call || typeof call !== 'object' || !call.id) {
    return NextResponse.json({ ok: false, error: 'call inválido' }, { status: 400 })
  }

  const r = await resolveQrToken(req, token, mesa)
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.error }, { status: 403 })
  }
  const tenantId = r.tenantId

  try {
    await ensureQrSession({ sessionId, tenantId, mesa })
  } catch {
    return NextResponse.json({ ok: false, error: 'No se pudo crear la sesión' }, { status: 500 })
  }

  const { error: callErr } = await supabaseAdmin.from('waiter_calls').upsert(
    {
      id: call.id,
      tenant_id: tenantId,
      mesa,
      session_id: sessionId,
      tipo,
      mensaje: call.mensaje ?? null,
      atendido: false,
    },
    { onConflict: 'id' },
  )

  if (callErr) {
    return NextResponse.json({ ok: false, error: 'No se pudo registrar la llamada' }, { status: 500 })
  }

  // Reflejar "cuenta pedida" en el estado de la mesa (no-fatal si falla).
  if (tipo === 'cuenta') {
    try {
      await supabaseAdmin.from('tables_config').update({ estado: 'cuenta_pedida' }).eq('numero', mesa)
    } catch {
      /* no-fatal */
    }
  }

  return NextResponse.json({ ok: true })
}

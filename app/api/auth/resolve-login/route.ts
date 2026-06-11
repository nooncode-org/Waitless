/**
 * POST /api/auth/resolve-login
 * Resuelve un identificador de login (email real o usuario) al email sintético
 * `${username}@pqvv.local` que espera Supabase Auth.
 *
 * Body: { identifier: string }
 * Resp: { email: string }  (200)  |  { error } (404 genérico / 400 / 429)
 *
 * Si el identificador trae '@' se interpreta como email real y se busca en
 * profiles.email; si no, se trata como usuario y se arma el email sintético directo.
 * El 404 es genérico a propósito (no revela si el email existe).
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const { allowed } = await rateLimit(`resolve-login:${getClientIp(req)}`, 20, 60_000)
  if (!allowed) return NextResponse.json({ error: 'Demasiados intentos' }, { status: 429 })

  let body: { identifier?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const identifier = body.identifier?.trim()
  if (!identifier) return NextResponse.json({ error: 'identifier requerido' }, { status: 400 })

  // Buscar el profile por email real (si trae '@') o por usuario.
  const col = identifier.includes('@') ? 'email' : 'username'
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .ilike(col, identifier)
    .maybeSingle()

  // Devolver el email REAL del usuario de Auth (vía getUserById). Es robusto:
  // sirve tanto si el email de Auth es el real (cuentas nuevas) como el sintético
  // `${username}@pqvv.local` (staff y cuentas legacy). NO asumir profiles.email,
  // porque puede no coincidir con el email del Auth user en cuentas viejas.
  if (profile?.id) {
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(profile.id as string)
    if (user?.email) {
      return NextResponse.json({ email: user.email.toLowerCase() })
    }
  }

  // Sin profile / sin email de Auth:
  //  - usuario (sin '@') → fallback al sintético
  //  - email (con '@') → 404 genérico (no revela si existe)
  if (!identifier.includes('@')) {
    return NextResponse.json({ email: `${identifier.toLowerCase()}@pqvv.local` })
  }
  return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
}

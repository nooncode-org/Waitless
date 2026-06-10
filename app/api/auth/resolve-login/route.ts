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

  // Sin '@' → es un usuario. El admin tiene su email REAL como email de Auth;
  // el staff usa el sintético `${username}@pqvv.local`. Resolvemos según el profile.
  if (!identifier.includes('@')) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .ilike('username', identifier)
      .maybeSingle()
    if (profile?.email) {
      return NextResponse.json({ email: (profile.email as string).toLowerCase() })
    }
    // Sin email real (staff) → email sintético por usuario.
    return NextResponse.json({ email: `${identifier.toLowerCase()}@pqvv.local` })
  }

  // Con '@' → email real: el email ES el de Auth si hay un profile que lo posee.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .ilike('email', identifier)
    .maybeSingle()

  if (!profile?.email) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  return NextResponse.json({ email: (profile.email as string).toLowerCase() })
}

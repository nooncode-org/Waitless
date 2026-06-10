/**
 * lib/context/auth.ts
 *
 * Lógica pura de autenticación extraída de lib/context.tsx.
 * Estas funciones manejan las llamadas a Supabase Auth y perfiles.
 * El manejo de estado React (setState) queda en el provider.
 */

import { supabase } from '../supabase'
import type { User, UserRole } from '../store'

/**
 * Resultado del login. Discriminado por `status`:
 *  - 'ok'         → credenciales válidas, perfil activo y (si aplica) email verificado.
 *  - 'invalid'    → credenciales incorrectas, sin perfil, o perfil inactivo.
 *  - 'unverified' → credenciales OK pero la cuenta tiene un email sin verificar.
 *                   `identifier` es lo que el usuario tipeó (para reenviar/verificar).
 */
export type AuthLoginResult =
  | { status: 'ok'; user: User }
  | { status: 'invalid' }
  | { status: 'unverified'; identifier: string }

/**
 * Autentica al usuario contra Supabase Auth y carga su perfil.
 * Devuelve un AuthLoginResult discriminado (ver tipo arriba).
 *
 * Gate de verificación: solo bloquea cuentas con `email` NO NULO y
 * `email_verified = false`. Las cuentas sin email (staff, cuentas viejas) y
 * las verificadas pasan normalmente.
 */
export async function authLogin(identifier: string, password: string): Promise<AuthLoginResult> {
  const id = identifier.trim()

  // Resolver el identificador (email real o usuario) al email de Auth server-side.
  // Admin → email real; staff → sintético `${username}@pqvv.local`. Ver /api/auth/resolve-login.
  let authEmail: string
  {
    const res = await fetch('/api/auth/resolve-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: id }),
    })
    if (!res.ok) return { status: 'invalid' }
    authEmail = (await res.json()).email
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password,
  })
  if (error || !data.user) return { status: 'invalid' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()

  if (!profile || !profile.activo) {
    await supabase.auth.signOut()
    return { status: 'invalid' }
  }

  // Gate de verificación de email (solo cuentas con email real sin verificar).
  if (profile.email && !profile.email_verified) {
    await supabase.auth.signOut()
    return { status: 'unverified', identifier: id }
  }

  return {
    status: 'ok',
    user: {
      id: profile.id as string,
      username: profile.username as string,
      nombre: profile.nombre as string,
      role: profile.role as UserRole,
      activo: profile.activo as boolean,
      tenantId: (profile.tenant_id as string | null) ?? undefined,
      createdAt: new Date(profile.created_at as string),
    },
  }
}

/**
 * Carga la lista de perfiles de staff desde Supabase.
 * Cuando tenantId está presente, filtra solo los perfiles del tenant.
 * Usado después del login para sincronizar la lista de usuarios.
 */
export async function authLoadUsers(tenantId?: string): Promise<User[]> {
  let query = supabase.from('profiles').select('*').order('created_at')
  if (tenantId) query = query.eq('tenant_id', tenantId)
  const { data: profiles } = await query
  if (!profiles) return []
  return profiles.map((p) => ({
    id: p.id as string,
    username: p.username as string,
    nombre: p.nombre as string,
    role: p.role as UserRole,
    activo: p.activo as boolean,
    tenantId: (p.tenant_id as string | null) ?? undefined,
    createdAt: new Date(p.created_at as string),
  }))
}

/**
 * Cierra la sesión en Supabase Auth.
 * El reseteo del estado React queda en el provider.
 */
export async function authLogout(): Promise<void> {
  await supabase.auth.signOut()
}

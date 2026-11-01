/**
 * POST /api/registro
 * Self-service tenant registration.
 * Creates: tenant → app_config (branding) → auth user → profile (admin role).
 * Accepts multipart/form-data so logo can be uploaded in the same request.
 *
 * Fields:
 *   nombre        string  — Business/restaurant name
 *   slug          string  — URL identifier (lowercase, letters/numbers/hyphens)
 *   primaryColor  string  — HEX color e.g. #FF5500
 *   email         string  — Admin email
 *   password      string  — Admin password (min 6 chars)
 *   logo?         File    — Optional logo image (png/jpg/webp, max 2MB)
 */

import { randomInt } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { TRIAL_DAYS } from '@/lib/plans'
import { sendRestaurantWelcome, sendEmailVerificationCode, emailEnabled } from '@/lib/email'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SLUG_RE = /^[a-z0-9-]{3,40}$/
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export async function POST(req: NextRequest) {
  const { allowed } = await rateLimit(`registro:${getClientIp(req)}`, 5, 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiados intentos. Esperá un momento.' }, { status: 429 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Body inválido — se esperaba multipart/form-data' }, { status: 400 })
  }

  const nombre = (formData.get('nombre') as string | null)?.trim()
  const slug = (formData.get('slug') as string | null)?.trim().toLowerCase()
  const primaryColor = (formData.get('primaryColor') as string | null)?.trim() ?? '#000000'
  const email = (formData.get('email') as string | null)?.trim().toLowerCase()
  const password = formData.get('password') as string | null
  const logoFile = formData.get('logo') as File | null
  const planRaw = (formData.get('plan') as string | null)?.trim() ?? 'starter'
  const plan = (['starter', 'pro', 'enterprise'] as const).includes(planRaw as 'starter' | 'pro' | 'enterprise')
    ? (planRaw as 'starter' | 'pro' | 'enterprise')
    : 'starter'

  // ── Validaciones ──────────────────────────────────────────────────────────
  if (!nombre || nombre.length < 2) {
    return NextResponse.json({ error: 'El nombre del negocio debe tener al menos 2 caracteres' }, { status: 400 })
  }
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'El identificador solo puede tener minúsculas, números y guiones (3-40 caracteres)' }, { status: 400 })
  }
  if (!HEX_RE.test(primaryColor)) {
    return NextResponse.json({ error: 'Color primario inválido (debe ser HEX, ej. #FF5500)' }, { status: 400 })
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }
  if (!password || password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return NextResponse.json(
      { error: 'La contraseña debe tener al menos 8 caracteres, con al menos una letra y un número' },
      { status: 400 },
    )
  }
  if (logoFile && logoFile.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'El logo no puede superar 2 MB' }, { status: 400 })
  }

  // ── Verificar slug único ──────────────────────────────────────────────────
  const { data: existingTenant } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existingTenant) {
    return NextResponse.json({ error: 'Ese identificador ya está en uso, elegí otro' }, { status: 409 })
  }

  // El admin usa su EMAIL REAL como email de Auth. Esto permite recuperar la
  // contraseña por Supabase (resetPasswordForEmail manda al email del auth user).
  // El login por usuario (slug) se resuelve al email real vía /api/auth/resolve-login.
  // El staff (creado luego en /api/admin/users) sigue usando `${username}@pqvv.local`.
  const authEmail = email

  // ── Verificar que el email no esté ya tomado en Auth ──────────────────────
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const emailTaken = existingUsers?.users?.some(u => u.email?.toLowerCase() === email)
  if (emailTaken) {
    return NextResponse.json({ error: 'Ese email ya está registrado' }, { status: 409 })
  }

  // ── Verificar email real único (se puede iniciar sesión con él) ───────────
  const { data: emailOwner } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle()

  if (emailOwner) {
    return NextResponse.json({ error: 'Ese email ya está registrado' }, { status: 409 })
  }

  // ── Subir logo a Storage (si se proporcionó) ──────────────────────────────
  let logoUrl: string | null = null

  if (logoFile && logoFile.size > 0) {
    // Ensure bucket exists
    await supabaseAdmin.storage.createBucket('logos', { public: true }).catch(() => {
      // bucket already exists — ignore error
    })

    const ext = logoFile.name.split('.').pop() ?? 'png'
    const path = `${slug}/${Date.now()}.${ext}`
    const buffer = Buffer.from(await logoFile.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from('logos')
      .upload(path, buffer, {
        contentType: logoFile.type,
        upsert: true,
      })

    if (!uploadError) {
      const { data: urlData } = supabaseAdmin.storage.from('logos').getPublicUrl(path)
      logoUrl = urlData.publicUrl
    }
  }

  // ── Crear tenant ──────────────────────────────────────────────────────────
  // Prueba gratuita de 14 días (modelo C2P). Acceso total hasta trial_ends_at.
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString()
  const { data: tenantRow, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .insert({ nombre, slug, plan, activo: true, trial_ends_at: trialEndsAt })
    .select()
    .single()

  if (tenantError || !tenantRow) {
    // 23505 = unique_violation → carrera de slug que esquivó el chequeo previo.
    if ((tenantError as { code?: string } | null)?.code === '23505') {
      return NextResponse.json({ error: 'Ese identificador ya está en uso, elegí otro' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Error creando el negocio' }, { status: 500 })
  }

  const tenantId = tenantRow.id as string

  // ── Crear fila de configuración con branding ──────────────────────────────
  await supabaseAdmin.from('app_config').insert({
    id: tenantId,
    tenant_id: tenantId,
    restaurant_name: nombre,
    primary_color: primaryColor,
    secondary_color: '#FFFFFF',
    accent_color: '#BEBEBE',
    logo_url: logoUrl,
    powered_by_waitless: true,
  })

  // ── Crear usuario admin en Supabase Auth ──────────────────────────────────
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    // Rollback tenant
    await supabaseAdmin.from('tenants').delete().eq('id', tenantId)
    await supabaseAdmin.from('app_config').delete().eq('tenant_id', tenantId)
    return NextResponse.json({ error: authError?.message ?? 'Error creando el usuario admin' }, { status: 500 })
  }

  const userId = authData.user.id

  // ── Verificación de email ─────────────────────────────────────────────────
  // Solo se exige si hay proveedor de email (Resend) configurado. Si no lo hay,
  // la cuenta se marca verificada para no quedar bloqueada (no llegaría el código).
  const requiresVerification = emailEnabled()
  const verifyCode = requiresVerification ? randomInt(0, 1_000_000).toString().padStart(6, '0') : null
  const verifyExpires = requiresVerification ? new Date(Date.now() + 10 * 60_000).toISOString() : null

  // ── Crear profile con rol admin vinculado al tenant ───────────────────────
  const username = slug // slug as username for login
  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: userId,
    username,
    nombre,
    email,
    email_verified: !requiresVerification,
    email_verify_code: verifyCode,
    email_verify_expires: verifyExpires,
    role: 'admin',
    activo: true,
    tenant_id: tenantId,
  })

  if (profileError) {
    // Rollback
    await supabaseAdmin.auth.admin.deleteUser(userId)
    await supabaseAdmin.from('tenants').delete().eq('id', tenantId)
    await supabaseAdmin.from('app_config').delete().eq('tenant_id', tenantId)
    return NextResponse.json({ error: 'Error creando el perfil de administrador' }, { status: 500 })
  }

  if (requiresVerification && verifyCode) {
    // Enviar el código de verificación. La bienvenida se manda recién al verificar.
    sendEmailVerificationCode({ to: email, nombre, code: verifyCode }).catch(() => {})
  } else {
    sendRestaurantWelcome({ to: email, nombreRestaurante: nombre }).catch(() => {})
  }

  return NextResponse.json({
    success: true,
    tenant: { id: tenantId, nombre, slug },
    admin: { email, username },
    requiresVerification,
    message: requiresVerification
      ? `Te enviamos un código de verificación a ${email}.`
      : `Negocio registrado. Ingresá con usuario: ${username} y tu contraseña.`,
  }, { status: 201 })
}

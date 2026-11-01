/**
 * POST /api/registro/completar
 * Called after Google OAuth for new users who don't have a tenant yet.
 * Creates: tenant → app_config → profile (admin role linked to tenant).
 * The auth.users row already exists (created by Google OAuth).
 *
 * Fields (multipart/form-data):
 *   userId       string  — Supabase auth user id (from client session)
 *   nombre       string  — Business name
 *   slug         string  — URL identifier
 *   primaryColor string  — HEX color
 *   logo?        File    — Optional logo
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TRIAL_DAYS } from '@/lib/plans'

const SLUG_RE = /^[a-z0-9-]{3,40}$/
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export async function POST(req: NextRequest) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const userId = (formData.get('userId') as string | null)?.trim()
  const nombre = (formData.get('nombre') as string | null)?.trim()
  const slug = (formData.get('slug') as string | null)?.trim().toLowerCase()
  const primaryColor = (formData.get('primaryColor') as string | null)?.trim() ?? '#000000'
  const logoFile = formData.get('logo') as File | null
  const planRaw = (formData.get('plan') as string | null)?.trim() ?? 'starter'
  const plan = (['starter', 'pro', 'enterprise'] as const).includes(planRaw as 'starter' | 'pro' | 'enterprise')
    ? (planRaw as 'starter' | 'pro' | 'enterprise')
    : 'starter'

  if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
  if (!nombre || nombre.length < 2) return NextResponse.json({ error: 'Nombre muy corto' }, { status: 400 })
  if (!slug || !SLUG_RE.test(slug)) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 })
  if (!HEX_RE.test(primaryColor)) return NextResponse.json({ error: 'Color inválido' }, { status: 400 })

  // Verify user exists in auth
  const { data: authUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (userError || !authUser.user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  const email = authUser.user.email ?? ''
  const normalizedEmail = email ? email.toLowerCase() : null

  // Verify user doesn't already have a profile with a tenant
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .maybeSingle()

  if (existingProfile?.tenant_id) {
    return NextResponse.json({ error: 'Este usuario ya tiene un negocio registrado' }, { status: 409 })
  }

  // Si el email ya pertenece a OTRO perfil (índice único profiles_email_unique),
  // no podemos linkear este usuario sin chocar. Cortamos ANTES de crear el tenant
  // para no dejar negocios huérfanos (causa de "se crean varias cuentas").
  if (normalizedEmail) {
    const { data: emailOwner } = await supabaseAdmin
      .from('profiles')
      .select('id, tenant_id')
      .ilike('email', normalizedEmail)
      .maybeSingle()
    if (emailOwner && emailOwner.id !== userId) {
      return NextResponse.json(
        {
          error: 'Ya existe una cuenta con ese email. Iniciá sesión con tu usuario y contraseña, o usá otra cuenta de Google.',
        },
        { status: 409 },
      )
    }
  }

  // Check slug is unique
  const { data: existingTenant } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single()
  if (existingTenant) {
    return NextResponse.json({ error: 'Ese identificador ya está en uso, elegí otro' }, { status: 409 })
  }

  // Upload logo if provided
  let logoUrl: string | null = null
  if (logoFile && logoFile.size > 0) {
    await supabaseAdmin.storage.createBucket('logos', { public: true }).catch(() => {})
    const ext = logoFile.name.split('.').pop() ?? 'png'
    const path = `${slug}/${Date.now()}.${ext}`
    const buffer = Buffer.from(await logoFile.arrayBuffer())
    const { error: uploadError } = await supabaseAdmin.storage
      .from('logos')
      .upload(path, buffer, { contentType: logoFile.type, upsert: true })
    if (!uploadError) {
      const { data: urlData } = supabaseAdmin.storage.from('logos').getPublicUrl(path)
      logoUrl = urlData.publicUrl
    }
  }

  // Create tenant — con prueba gratuita de 14 días (igual que /api/registro)
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString()
  const { data: tenantRow, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .insert({ nombre, slug, plan, activo: true, trial_ends_at: trialEndsAt })
    .select()
    .single()

  if (tenantError || !tenantRow) {
    return NextResponse.json({ error: 'Error creando el negocio' }, { status: 500 })
  }

  const tenantId = tenantRow.id as string

  // Rollback helper: si algo falla luego de crear el tenant, lo borramos para no
  // dejar negocios huérfanos (que generaban cuentas duplicadas en cada reintento).
  const rollbackTenant = async () => {
    await supabaseAdmin.from('app_config').delete().eq('tenant_id', tenantId)
    await supabaseAdmin.from('tenants').delete().eq('id', tenantId)
  }

  // Create app_config with branding
  const { error: configError } = await supabaseAdmin.from('app_config').insert({
    id: tenantId,
    tenant_id: tenantId,
    restaurant_name: nombre,
    primary_color: primaryColor,
    secondary_color: '#FFFFFF',
    accent_color: '#BEBEBE',
    logo_url: logoUrl,
    powered_by_waitless: false,
  })
  if (configError) {
    await rollbackTenant()
    console.error('[registro/completar] Error creando app_config:', configError.message)
    return NextResponse.json({ error: 'Error creando la configuración del negocio' }, { status: 500 })
  }

  // Create or update profile with admin role + tenant.
  // Google ya verifica el email del usuario → email_verified: true (no requiere código).
  const displayName = authUser.user.user_metadata?.full_name ?? authUser.user.user_metadata?.name ?? nombre

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id: userId,
        username: slug,
        nombre: displayName,
        email: normalizedEmail,
        email_verified: true,
        role: 'admin',
        activo: true,
        tenant_id: tenantId,
      },
      { onConflict: 'id' },
    )

  if (profileError) {
    // No se pudo linkear el perfil → revertimos el tenant para no duplicar cuentas.
    await rollbackTenant()
    console.error('[registro/completar] Error linkeando profile:', profileError.message, profileError.code)
    const isEmailDup = profileError.code === '23505' || /profiles_email_unique/i.test(profileError.message)
    return NextResponse.json(
      {
        error: isEmailDup
          ? 'Ya existe una cuenta con ese email. Iniciá sesión con tu usuario y contraseña.'
          : 'Error al vincular tu perfil. Intentá de nuevo.',
      },
      { status: isEmailDup ? 409 : 500 },
    )
  }

  return NextResponse.json({
    success: true,
    tenant: { id: tenantId, nombre, slug },
  }, { status: 201 })
}

// P2-2: Tenant utilities — context lookup and tenant-scoped query helpers

import { supabase } from './supabase'
import { supabaseAdmin } from './supabase-admin'
import { planHasFeature } from './plans'

export interface Tenant {
  id: string
  nombre: string
  slug: string
  plan: 'starter' | 'pro' | 'enterprise'
  activo: boolean
  config?: Record<string, unknown>
  createdAt: Date
}

function rowToTenant(row: Record<string, unknown>): Tenant {
  return {
    id: row.id as string,
    nombre: row.nombre as string,
    slug: row.slug as string,
    plan: (row.plan as Tenant['plan']) ?? 'starter',
    activo: (row.activo as boolean) ?? true,
    config: (row.config as Record<string, unknown>) ?? undefined,
    createdAt: new Date(row.created_at as string),
  }
}

/** Fetch a tenant by slug */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .eq('activo', true)
    .single()
  if (error || !data) return null
  return rowToTenant(data as Record<string, unknown>)
}

/** Fetch a tenant by id */
export async function getTenantById(id: string): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return rowToTenant(data as Record<string, unknown>)
}

/** List all tenants (admin only) */
export async function listTenants(): Promise<Tenant[]> {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data.map(r => rowToTenant(r as Record<string, unknown>))
}

// Feature matrix vive en lib/plans.ts (fuente única). checkPlanFeature delega ahí.
export function checkPlanFeature(tenant: Tenant | null, feature: string): boolean {
  return planHasFeature(tenant?.plan ?? null, feature)
}

// ── Tenant creation ───────────────────────────────────────────────────────────

export interface CreateTenantInput {
  nombre: string
  slug: string
  plan?: Tenant['plan']
  /** Si se provee, el usuario existente se convierte en admin del nuevo tenant */
  adminUserId?: string
}

/**
 * Crea un nuevo tenant. Requiere service role (uso server-side únicamente).
 * Si se provee adminUserId, actualiza su profile con el tenant_id y role='admin'.
 */
export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const { nombre, slug, plan = 'starter', adminUserId } = input

  // Slug validation
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) {
    throw new Error('slug inválido — solo minúsculas, números y guiones (3-40 caracteres)')
  }

  const { data, error } = await supabaseAdmin
    .from('tenants')
    .insert({ nombre, slug, plan, activo: true })
    .select()
    .single()

  if (error || !data) {
    const msg = error?.message ?? 'Error desconocido'
    throw new Error(msg.includes('duplicate') ? `El slug "${slug}" ya está en uso` : msg)
  }

  const tenant = rowToTenant(data as Record<string, unknown>)

  if (adminUserId) {
    await supabaseAdmin
      .from('profiles')
      .update({ tenant_id: tenant.id, role: 'admin', activo: true })
      .eq('id', adminUserId)
  }

  return tenant
}

/**
 * Server-side: fetch tenant by id using service role (bypasses RLS).
 * Use this inside API route handlers where supabaseAdmin is available.
 */
export async function getTenantByIdAdmin(id: string): Promise<Tenant | null> {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return rowToTenant(data as Record<string, unknown>)
}

// ── Read helpers ──────────────────────────────────────────────────────────────

/**
 * Reads the tenant_id from the current user's profile.
 * Returns null for single-tenant installs.
 */
export async function getCurrentUserTenantId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', session.user.id)
    .single()

  return (profile?.tenant_id as string) ?? null
}

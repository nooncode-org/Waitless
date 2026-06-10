/**
 * DELETE /api/admin/delete-account
 * Elimina la cuenta del restaurante y todos sus datos.
 *
 * Requiere:
 *  - Bearer token válido (admin)
 *  - Body: { password: string } — se re-autentica para confirmar identidad
 *
 * Bloquea si:
 *  - Hay órdenes activas (pendiente / preparando)
 *  - Hay sesiones de mesa abiertas sin pagar
 *  - Hay reembolsos pendientes
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireRole } from '@/lib/api-auth'

export async function DELETE(req: NextRequest) {
  // 1. Verificar que el usuario es admin autenticado
  const auth = await requireRole(req, ['admin'])
  if ('error' in auth) return auth.error

  const { userId, tenantId } = auth

  // 2. Obtener email del usuario para re-autenticación
  const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (!authUser?.email) {
    return NextResponse.json({ error: 'No se pudo obtener el usuario' }, { status: 500 })
  }

  // 3. Verificar contraseña — intentar sign-in temporal
  const { password } = await req.json()
  if (!password) {
    return NextResponse.json({ error: 'Se requiere la contraseña para confirmar' }, { status: 400 })
  }

  // Usamos una instancia client-side del SDK para verificar credenciales
  const { createClient } = await import('@supabase/supabase-js')
  const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { error: signInError } = await supabaseClient.auth.signInWithPassword({
    email: authUser.email,
    password,
  })

  if (signInError) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
  }

  // 4. Verificar condiciones bloqueantes
  if (tenantId) {
    // Órdenes activas
    const { data: activeOrders } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('status', ['pendiente', 'preparando'])
      .limit(1)

    if (activeOrders && activeOrders.length > 0) {
      return NextResponse.json(
        { error: 'Tienes órdenes activas. Cerrá o cancelá todos los pedidos antes de eliminar la cuenta.' },
        { status: 409 }
      )
    }

    // Sesiones abiertas sin pagar
    const { data: openSessions } = await supabaseAdmin
      .from('table_sessions')
      .select('id')
      .eq('tenant_id', tenantId)
      .neq('bill_status', 'pagada')
      .limit(1)

    if (openSessions && openSessions.length > 0) {
      return NextResponse.json(
        { error: 'Hay mesas con cuentas abiertas. Cerrá todas las sesiones antes de eliminar la cuenta.' },
        { status: 409 }
      )
    }

    // Reembolsos pendientes
    const { data: pendingRefunds } = await supabaseAdmin
      .from('refunds')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'pendiente')
      .limit(1)

    if (pendingRefunds && pendingRefunds.length > 0) {
      return NextResponse.json(
        { error: 'Hay reembolsos pendientes de procesar.' },
        { status: 409 }
      )
    }
  }

  // 5. Eliminar datos del tenant (en orden para respetar FK)
  if (tenantId) {
    // Marcar tenant como inactivo primero (protege contra re-acceso)
    await supabaseAdmin.from('tenants').update({ activo: false }).eq('id', tenantId)

    // Eliminar datos relacionados — verificar errores individuales antes de continuar
    const deleteResults = await Promise.allSettled([
      supabaseAdmin.from('app_config').delete().eq('tenant_id', tenantId),
      supabaseAdmin.from('menu_items').delete().eq('tenant_id', tenantId),
      supabaseAdmin.from('categories').delete().eq('tenant_id', tenantId),
      supabaseAdmin.from('orders').delete().eq('tenant_id', tenantId),
      supabaseAdmin.from('table_sessions').delete().eq('tenant_id', tenantId),
      supabaseAdmin.from('tables_config').delete().eq('tenant_id', tenantId),
      supabaseAdmin.from('ingredients').delete().eq('tenant_id', tenantId),
      supabaseAdmin.from('feedback').delete().eq('tenant_id', tenantId),
      supabaseAdmin.from('audit_logs').delete().eq('tenant_id', tenantId),
      supabaseAdmin.from('profiles').delete().eq('tenant_id', tenantId),
    ])

    const failed = deleteResults.filter(
      r => r.status === 'rejected' ||
        (r.status === 'fulfilled' && (r.value as { error?: { message: string } }).error)
    )
    if (failed.length > 0) {
      console.error('[delete-account] Errores en limpieza de datos:', failed.length, 'tablas fallidas')
      return NextResponse.json(
        { error: 'Error eliminando datos del restaurante. Intentá nuevamente o contactá soporte.' },
        { status: 500 }
      )
    }

    // Eliminar el tenant
    await supabaseAdmin.from('tenants').delete().eq('id', tenantId)
  } else {
    // Single-tenant: solo eliminar el perfil
    await supabaseAdmin.from('profiles').delete().eq('id', userId)
  }

  // 6. Eliminar el usuario de Auth (hard delete)
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (deleteError) {
    console.error('[delete-account] Error eliminando auth user:', deleteError.message)
    return NextResponse.json(
      { error: 'Error al eliminar la cuenta de autenticación. Contactá soporte.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}

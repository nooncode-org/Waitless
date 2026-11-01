/**
 * POST /api/public/[slug]/order
 * Crea un pedido desde el menú digital (sin autenticación).
 * Canal: 'para_llevar' o 'delivery'. Total calculado server-side.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { computeStoreOpen } from '@/lib/store-hours'
import { sendOrderConfirmation } from '@/lib/email'

interface CartItem {
  itemId: string
  cantidad: number
  extras?: Array<{ id: string; nombre: string; precio: number }>
  notas?: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Require a valid consumer session
  const token = req.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) {
    return NextResponse.json({ error: 'Debés iniciar sesión para realizar pedidos' }, { status: 401 })
  }
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Sesión inválida. Iniciá sesión nuevamente.' }, { status: 401 })
  }

  let body: {
    items: CartItem[]
    canal?: 'para_llevar' | 'delivery'
    nombreCliente?: string
    telefono?: string
    email?: string
    direccion?: string
    zonaReparto?: string
    metodoPago?: string
    notas?: string
    incluirPropina?: boolean
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!body.items || body.items.length === 0) {
    return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 })
  }

  // Delivery requiere dirección (el cliente también lo valida; esto es el límite de confianza).
  if (body.canal === 'delivery' && !body.direccion?.trim()) {
    return NextResponse.json({ error: 'La dirección es obligatoria para pedidos de delivery' }, { status: 400 })
  }

  // Resolver tenant
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .eq('activo', true)
    .single()

  const tenantId: string | null = tenant?.id ?? null

  // Verificar estado de la tienda + cargar config de impuesto/propina
  let impuestoPct = 0
  let propinaPct = 0
  let costoEnvioConfig = 0
  {
    let cfgQ = supabaseAdmin
      .from('app_config')
      .select('tienda_abierta, auto_horario_apertura, auto_horario_cierre, impuesto_porcentaje, propina_sugerida_porcentaje, costo_envio')
    if (tenantId) cfgQ = cfgQ.eq('tenant_id', tenantId)
    else cfgQ = cfgQ.eq('id', 'default')
    const { data: cfg } = await cfgQ.single()
    const tiendaAbierta = (cfg?.tienda_abierta as boolean | null) ?? true
    const apertura = (cfg?.auto_horario_apertura as string | null) ?? null
    const cierre = (cfg?.auto_horario_cierre as string | null) ?? null
    const storeOpen = computeStoreOpen(tiendaAbierta, apertura, cierre)
    if (!storeOpen) {
      return NextResponse.json({ error: 'La tienda está cerrada en este momento.' }, { status: 503 })
    }
    impuestoPct = Number(cfg?.impuesto_porcentaje ?? 0)
    propinaPct  = Number(cfg?.propina_sugerida_porcentaje ?? 0)
    costoEnvioConfig = Math.max(0, Number(cfg?.costo_envio ?? 0))
  }

  // Obtener ítems del menú para calcular total server-side
  const itemIds = body.items.map(i => i.itemId)
  let menuQuery = supabaseAdmin
    .from('menu_items')
    .select('*')
    .in('id', itemIds)
  if (tenantId) menuQuery = menuQuery.eq('tenant_id', tenantId)

  const { data: menuItems } = await menuQuery
  if (!menuItems || menuItems.length === 0) {
    return NextResponse.json({ error: 'Ítems no encontrados' }, { status: 400 })
  }

  // Construir order items con precios validados
  const orderItems = body.items.map(cartItem => {
    const menuItem = menuItems.find(m => m.id === cartItem.itemId)
    if (!menuItem) return null

    const disponible = (menuItem.available ?? menuItem.disponible ?? true) as boolean
    const conStock = menuItem.stock_habilitado ? (menuItem.stock_cantidad ?? 0) > 0 : true
    if (!disponible || !conStock) return null

    const precioBase = Number(menuItem.price ?? menuItem.precio)
    const extrasValidados = (cartItem.extras ?? []).map(e => {
      const menuExtra = ((menuItem.extras ?? []) as Array<{ id: string; nombre: string; precio: number }>)
        .find(me => me.id === e.id)
      return menuExtra ?? null
    }).filter(Boolean) as Array<{ id: string; nombre: string; precio: number }>

    const precioExtras = extrasValidados.reduce((sum, e) => sum + e.precio, 0)
    const precioUnitario = precioBase + precioExtras

    return {
      id: crypto.randomUUID(),
      menuItem: {
        id: menuItem.id,
        nombre: (menuItem.name ?? menuItem.nombre) as string,
        descripcion: ((menuItem.description ?? menuItem.descripcion) ?? '') as string,
        precio: precioBase,
        imagen: (menuItem.image ?? menuItem.imagen) ?? undefined,
        disponible: true,
        categoria: menuItem.category_id,
      },
      cantidad: cartItem.cantidad,
      extras: extrasValidados,
      notas: cartItem.notas,
      precioUnitario,
    }
  }).filter(Boolean)

  if (orderItems.length === 0) {
    return NextResponse.json({ error: 'Ningún ítem disponible en el carrito' }, { status: 400 })
  }

  // Calcular total con impuesto y propina
  const subtotal = orderItems.reduce((sum, item) => sum + (item!.precioUnitario * item!.cantidad), 0)
  const impuestos = impuestoPct > 0 ? Math.round(subtotal * (impuestoPct / 100) * 100) / 100 : 0
  const propina   = (propinaPct > 0 && body.incluirPropina)
    ? Math.round(subtotal * (propinaPct / 100) * 100) / 100
    : 0
  const costoEnvio = body.canal === 'delivery' ? costoEnvioConfig : 0
  const total = subtotal + impuestos + propina + costoEnvio

  // Obtener número de pedido (max + 1 por tenant)
  let nextNumQuery = supabaseAdmin
    .from('orders')
    .select('numero')
    .order('numero', { ascending: false })
    .limit(1)
  if (tenantId) nextNumQuery = nextNumQuery.eq('tenant_id', tenantId)
  const { data: lastOrder } = await nextNumQuery
  const numero = ((lastOrder?.[0]?.numero as number | null) ?? 0) + 1

  const orderId = crypto.randomUUID()

  const canal = body.canal === 'delivery' ? 'delivery' : 'para_llevar'

  const orderPayload: Record<string, unknown> = {
    id: orderId,
    numero,
    canal,
    mesa: null,
    origin: 'marketplace',
    items: orderItems,
    status: 'recibido',
    cocina_a_status: 'en_cola',
    nombre_cliente: body.nombreCliente?.trim() || null,
    telefono: body.telefono?.trim() || null,
    email: body.email?.trim() || null,
    notas: body.notas?.trim() || null,
    direccion: body.direccion?.trim() || null,
    zona_reparto: body.zonaReparto?.trim() || null,
    cancelado: false,
    payment_status: 'pendiente',
    payment_method: body.metodoPago || null,
    subtotal,
    impuestos,
    propina,
    costo_envio: costoEnvio,
    total,
  }

  if (tenantId) orderPayload.tenant_id = tenantId
  orderPayload.consumer_id = user.id

  const { error } = await supabaseAdmin.from('orders').insert(orderPayload)
  if (error) {
    console.error('[public/order] Error creando pedido:', error.message)
    return NextResponse.json({ error: 'Error al crear el pedido' }, { status: 500 })
  }

  // Email de confirmación al consumidor (fire-and-forget)
  if (body.email?.trim()) {
    sendOrderConfirmation({
      to:            body.email.trim(),
      nombreCliente: body.nombreCliente?.trim() || 'Cliente',
      numeroPedido:  numero,
      restaurante:   tenant ? (await supabaseAdmin.from('tenants').select('nombre').eq('id', tenantId!).single().then(r => r.data?.nombre ?? slug)) : slug,
      items:         orderItems.map(i => ({ nombre: i!.menuItem.nombre, cantidad: i!.cantidad, precio: i!.menuItem.precio })),
      total,
      canal,
    }).catch(() => {})
  }

  // Si hay nota/mensaje, guardarlo en feedback (mesa: 0 = menú digital)
  if (body.notas?.trim()) {
    const feedbackPayload: Record<string, unknown> = {
      id: crypto.randomUUID(),
      mesa: 0,
      rating: 0,
      comentario: `[Menú Digital] ${body.nombreCliente ? body.nombreCliente + ': ' : ''}${body.notas.trim()}`,
    }
    if (tenantId) feedbackPayload.tenant_id = tenantId
    await supabaseAdmin.from('feedback').insert(feedbackPayload).then(() => {})
  }

  return NextResponse.json({ orderId, numero, canal, subtotal, impuestos, propina, costoEnvio, total })
}

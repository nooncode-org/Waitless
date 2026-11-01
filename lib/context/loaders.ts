/**
 * lib/context/loaders.ts
 *
 * Funciones cargar* extraídas de lib/context.tsx.
 * Cada función recibe setState como parámetro para actualizar el estado React
 * sin acoplar este módulo al provider.
 */

import type { Dispatch, SetStateAction } from 'react'
import { supabase } from '../supabase'
import { logError } from '../handle-error'
import type {
  Order,
  OrderItem,
  Channel,
  OrderStatus,
  KitchenStatus,
  TableSession,
  BillStatus,
  PaymentMethod,
  PaymentStatus,
  WaiterCall,
  Ingredient,
  IngredientUnit,
  Refund,
  TableConfig,
  TableState,
  WaitlistEntry,
  WaitlistEstado,
  Extra,
  RecipeIngredient,
  QRToken,
} from '../store'
import type { AppState } from './types'

type SetState = Dispatch<SetStateAction<AppState>>

export async function cargarMenu(setState: SetState, tenantId?: string) {
  try {
    let query = supabase.from('menu_items').select('*').order('orden', { ascending: true })
    if (tenantId) query = query.eq('tenant_id', tenantId)
    const { data, error } = await query

    if (error) return

    // Reflejar la DB siempre: tenant sin ítems → menú vacío (no mostrar semilla).
    if (data) {
      const items = data.map(item => ({
        id: item.id,
        nombre: item.name ?? item.nombre,
        descripcion: item.description ?? item.descripcion ?? '',
        precio: Number(item.price ?? item.precio) || 0,
        categoria: item.category_id,
        disponible: (item.available ?? item.disponible ?? true) as boolean,
        imagen: item.image ?? item.imagen ?? undefined,
        imagenes: (item.imagenes as string[] | null) ?? [],
        identificador: item.identificador ?? undefined,
        colorFondo: item.color_fondo ?? undefined,
        colorBorde: item.color_borde ?? undefined,
        stockHabilitado: item.stock_habilitado ?? false,
        stockCantidad: item.stock_cantidad ?? 0,
        mostrarEnMenuDigital: item.mostrar_en_menu_digital ?? true,
        extras: (item.extras ?? []) as Extra[],
        receta: (item.receta ?? []) as RecipeIngredient[],
        orden: item.orden ?? 0,
      }))

      setState(prev => ({ ...prev, menuItems: items }))
    }
  } catch (e) {
    logError('cargarMenu', e)
  }
}

export async function cargarCategorias(setState: SetState, tenantId?: string) {
  try {
    let query = supabase.from('categories').select('*').order('orden', { ascending: true })
    if (tenantId) query = query.eq('tenant_id', tenantId)
    const { data, error } = await query

    if (error) return

    if (data) {
      const categorias = data.map(c => ({
        id: c.id,
        nombre: c.name,
        activa: c.activa ?? true,
        orden: c.orden ?? 0,
      }))

      setState(prev => ({ ...prev, categories: categorias }))
    }
  } catch (e) {
    logError('cargarCategorias', e)
  }
}

export async function cargarOrdenes(setState: SetState, tenantId?: string) {
  try {
    let query = supabase
      .from('orders')
      .select('*')
      .not('status', 'in', '(entregado,cancelado)')
      .order('created_at', { ascending: true })
    if (tenantId) query = query.eq('tenant_id', tenantId)
    const { data, error } = await query

    if (error || !data) return

    const orders: Order[] = data.map(row => ({
      id: row.id,
      numero: row.numero,
      canal: row.canal as Channel,
      mesa: row.mesa,
      seatNumber: row.seat_number,
      items: (row.items ?? []) as OrderItem[],
      status: row.status as OrderStatus,
      cocinaStatus: (row.cocina_a_status ?? 'en_cola') as KitchenStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      nombreCliente: row.nombre_cliente,
      telefono: row.telefono,
      email: row.email ?? undefined,
      notas: row.notas ?? undefined,
      direccion: row.direccion,
      zonaReparto: row.zona_reparto,
      repartidorId: row.repartidor_id,
      cancelado: row.cancelado ?? false,
      cancelReason: row.cancel_reason,
      cancelMotivo: row.cancel_motivo,
      canceladoPor: row.cancelado_por,
      canceladoAt: row.cancelado_at ? new Date(row.cancelado_at) : undefined,
      tiempoInicioPreparacion: row.tiempo_inicio_preparacion
        ? new Date(row.tiempo_inicio_preparacion)
        : undefined,
      tiempoFinPreparacion: row.tiempo_fin_preparacion
        ? new Date(row.tiempo_fin_preparacion)
        : undefined,
      confirmedAt: row.confirmed_at ? new Date(row.confirmed_at) : undefined,
      kitchenReceivedAt: row.kitchen_received_at ? new Date(row.kitchen_received_at) : undefined,
      isQrOrder: row.is_qr_order ?? false,
      subtotal: row.subtotal != null ? Number(row.subtotal) : undefined,
      impuestos: row.impuestos != null ? Number(row.impuestos) : undefined,
      propina: row.propina != null ? Number(row.propina) : undefined,
      costoEnvio: row.costo_envio != null ? Number(row.costo_envio) : undefined,
      total: row.total != null ? Number(row.total) : undefined,
    }))

    setState(prev => ({ ...prev, orders }))
  } catch (e) {
    logError('cargarOrdenes', e)
  }
}

export async function cargarTables(setState: SetState) {
  try {
    const { data, error } = await supabase
      .from('tables_config')
      .select('*')
      .eq('activa', true)
      .order('numero', { ascending: true })

    if (error) return

    const tables: TableConfig[] = (data ?? []).map(row => ({
      id: row.id,
      numero: row.numero,
      capacidad: row.capacidad ?? 4,
      ubicacion: row.ubicacion,
      activa: row.activa,
      estado: (row.estado ?? 'disponible') as TableState,
      createdAt: new Date(row.created_at),
    }))

    setState(prev => ({ ...prev, tables }))
  } catch (e) {
    logError('cargarTables', e)
  }
}

export async function cargarQRTokens(setState: SetState, tenantId?: string) {
  try {
    // Solo tokens vigentes: activos y sin expirar. Scoped por tenant cuando aplica.
    let query = supabase
      .from('qr_tokens')
      .select('*')
      .eq('activo', true)
      .gt('expires_at', new Date().toISOString())
    if (tenantId) query = query.eq('tenant_id', tenantId)

    const { data, error } = await query
    if (error || !data) return

    const qrTokens: QRToken[] = data.map(row => ({
      id: row.id,
      mesa: row.mesa,
      token: row.token,
      createdAt: new Date(row.created_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : new Date(),
      usedAt: row.used_at ? new Date(row.used_at) : undefined,
      sessionId: row.session_id ?? undefined,
      activo: row.activo,
    }))

    setState(prev => ({ ...prev, qrTokens }))
  } catch (e) {
    logError('cargarQRTokens', e)
  }
}

export async function cargarSesionesActivas(setState: SetState, tenantId?: string) {
  try {
    let sessionsQuery = supabase
      .from('table_sessions')
      .select('*')
      .eq('activa', true)
      .order('created_at', { ascending: true })
    if (tenantId) sessionsQuery = sessionsQuery.eq('tenant_id', tenantId)
    const { data: sessions, error } = await sessionsQuery

    if (error || !sessions?.length) return

    const sessionIds = sessions.map(s => s.id)
    let ordersQuery = supabase
      .from('orders')
      .select('*')
      .in('session_id', sessionIds)
      .not('cancelado', 'eq', true)
      .order('created_at', { ascending: true })
    if (tenantId) ordersQuery = ordersQuery.eq('tenant_id', tenantId)
    const { data: ordersData } = await ordersQuery

    const tableSessions: TableSession[] = sessions.map(row => ({
      id: row.id,
      mesa: row.mesa,
      activa: row.activa,
      createdAt: new Date(row.created_at),
      expiresAt: row.expires_at
        ? new Date(row.expires_at)
        : new Date(Date.now() + 24 * 60 * 60 * 1000),
      deviceId: row.device_id ?? '',
      billStatus: (row.bill_status ?? 'abierta') as BillStatus,
      subtotal: Number(row.subtotal) || 0,
      impuestos: Number(row.impuestos) || 0,
      propina: Number(row.propina) || 0,
      descuento: Number(row.descuento) || 0,
      descuentoMotivo: row.descuento_motivo,
      total: Number(row.total) || 0,
      montoAbonado: Number(row.monto_abonado) || 0,
      paymentMethod: row.payment_method as PaymentMethod | undefined,
      paymentStatus: (row.payment_status ?? 'pendiente') as PaymentStatus,
      paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
      receiptId: row.receipt_id,
      feedbackDone: row.feedback_done ?? false,
      orders: (ordersData ?? [])
        .filter(o => o.session_id === row.id)
        .map(o => ({
          id: o.id,
          numero: o.numero,
          canal: o.canal as Channel,
          mesa: o.mesa,
          seatNumber: o.seat_number,
          items: (o.items ?? []) as OrderItem[],
          status: o.status as OrderStatus,
          cocinaStatus: (o.cocina_a_status ?? 'en_cola') as KitchenStatus,
          createdAt: new Date(o.created_at),
          updatedAt: new Date(o.updated_at),
          nombreCliente: o.nombre_cliente,
          telefono: o.telefono,
          cancelado: o.cancelado ?? false,
          tiempoInicioPreparacion: o.tiempo_inicio_preparacion
            ? new Date(o.tiempo_inicio_preparacion)
            : undefined,
          tiempoFinPreparacion: o.tiempo_fin_preparacion
            ? new Date(o.tiempo_fin_preparacion)
            : undefined,
          confirmedAt: o.confirmed_at ? new Date(o.confirmed_at) : undefined,
          kitchenReceivedAt: o.kitchen_received_at ? new Date(o.kitchen_received_at) : undefined,
          isQrOrder: o.is_qr_order ?? false,
        })),
    }))

    setState(prev => ({ ...prev, tableSessions }))
  } catch (e) {
    logError('cargarSesionesActivas', e)
  }
}

export async function cargarWaiterCalls(setState: SetState, tenantId?: string) {
  try {
    let query = supabase
      .from('waiter_calls')
      .select('*')
      .eq('atendido', false)
      .order('created_at', { ascending: true })
    if (tenantId) query = query.eq('tenant_id', tenantId)
    const { data, error } = await query

    if (error || !data) return

    const waiterCalls: WaiterCall[] = data.map(row => ({
      id: row.id,
      mesa: row.mesa,
      tipo: row.tipo as 'atencion' | 'cuenta' | 'otro',
      mensaje: row.mensaje,
      sessionId: row.session_id as string | undefined,
      atendido: row.atendido,
      atendidoPor: row.atendido_por,
      createdAt: new Date(row.created_at),
      atendidoAt: row.atendido_at ? new Date(row.atendido_at) : undefined,
    }))

    setState(prev => ({ ...prev, waiterCalls }))
  } catch (e) {
    logError('cargarWaiterCalls', e)
  }
}

export async function cargarReembolsos(setState: SetState, tenantId?: string) {
  try {
    let query = supabase
      .from('refunds')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (tenantId) query = query.eq('tenant_id', tenantId)
    const { data, error } = await query

    if (error || !data) return

    const refunds: Refund[] = data.map(row => ({
      id: row.id as string,
      orderId: row.order_id as string,
      sessionId: row.session_id as string | undefined,
      monto: Number(row.monto),
      motivo: row.motivo as string,
      tipo: row.tipo as 'total' | 'parcial',
      status: 'aprobado' as const,
      itemsReembolsados: row.items_reembolsados as string[] | undefined,
      inventarioRevertido: row.inventario_revertido as boolean,
      userId: row.user_id as string,
      createdAt: new Date(row.created_at as string),
    }))

    setState(prev => ({ ...prev, refunds }))
  } catch (e) {
    logError('cargarReembolsos', e)
  }
}

export async function cargarIngredientes(setState: SetState, tenantId?: string) {
  try {
    let query = supabase
      .from('ingredients')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true })
    if (tenantId) query = query.eq('tenant_id', tenantId)
    const { data, error } = await query

    if (error) return

    const ingredients: Ingredient[] = (data ?? []).map(row => ({
      id: row.id as string,
      nombre: row.nombre as string,
      categoria: row.categoria as string,
      unidad: row.unidad as IngredientUnit,
      stockActual: Number(row.stock_actual) || 0,
      stockMinimo: Number(row.stock_minimo) || 0,
      cantidadMaxima: Number(row.cantidad_maxima) || 0,
      costoUnitario: Number(row.costo_unitario) || 0,
      activo: (row.activo ?? true) as boolean,
    }))

    setState(prev => ({ ...prev, ingredients }))
  } catch (e) {
    logError('cargarIngredientes', e)
  }
}

export async function cargarWaitlist(setState: SetState, tenantId?: string) {
  try {
    let query = supabase
      .from('waitlist')
      .select('*')
      .in('estado', ['esperando', 'asignada'])
      .order('created_at', { ascending: true })
    if (tenantId) query = query.eq('tenant_id', tenantId)
    const { data, error } = await query

    if (error || !data) return

    const entries: WaitlistEntry[] = data.map(row => ({
      id: row.id as string,
      nombre: row.nombre as string,
      telefono: (row.telefono as string | undefined) ?? undefined,
      personas: Number(row.personas) || 1,
      notas: (row.notas as string | undefined) ?? undefined,
      estado: row.estado as WaitlistEstado,
      mesaAsignada: row.mesa_asignada as number | undefined,
      expiresAt: new Date(row.expires_at as string),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    }))

    setState(prev => ({ ...prev, waitlist: entries }))
  } catch (e) {
    logError('cargarWaitlist', e)
  }
}

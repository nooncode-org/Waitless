// ============================================================
// POLÍTICA DE SINCRONIZACIÓN (Task 1.5)
// Supabase es source of truth.
// Estado local (React state / localStorage) es caché optimista.
// La offline-queue encola mutaciones cuando el dispositivo está offline.
// Al reconectar: 1) se vacía la cola (flush), 2) se recargan entidades
// críticas desde Supabase. En caso de conflicto, Supabase siempre gana.
// El usuario recibe notificación visible ante fallos irrecuperables.
// ============================================================
'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { toast } from 'sonner'
import { supabase, getSessionClient } from "./supabase"
import { executeOrQueue, initOfflineSync, pendingCount, failedCount, clearFailedOps } from "./offline-queue"
import { canDo } from "./permissions"
import { planHasFeature, isInTrial, isTenantBlocked } from "./plans"
import { pushTriggers } from "./push-triggers"
import { applyBrandingTheme } from './theme'
import {
  uploadMenuImage,
  syncOrderToSupabase,
  syncSessionToSupabase,
  checkSessionVersion,
  syncWaiterCallToSupabase,
} from './context/sync'
import {
  cargarMenu,
  cargarCategorias,
  cargarOrdenes,
  cargarTables,
  cargarQRTokens,
  cargarSesionesActivas,
  cargarWaiterCalls,
  cargarReembolsos,
  cargarIngredientes,
  cargarWaitlist,
} from './context/loaders'
import { logError, handleError } from './handle-error'
import { authLogin, authLoadUsers, authLogout } from './context/auth'
import type { AuthLoginResult } from './context/auth'
import { useLoyalty } from './context/loyalty'
import { supabaseInsertWaitlistEntry, supabaseUpdateWaitlistEntry, supabaseDeleteWaitlistEntry } from './context/waitlist'
import { logAction } from './context/log-action'
import { useCartActions } from './context/useCartActions'
import { useOrderActions } from './context/useOrderActions'
import { useSessionActions } from './context/useSessionActions'
import { useWaiterActions } from './context/useWaiterActions'
import { useMenuActions } from './context/useMenuActions'
import { useInventoryActions } from './context/useInventoryActions'
import { useAdminActions } from './context/useAdminActions'
import { useQRActions } from './context/useQRActions'
import {
  type Order,
  type OrderItem,
  type TableSession,
  type MenuItem,
  type Channel,
  type OrderStatus,
  type KitchenStatus,
  type User,
  type UserRole,
  type Ingredient,
  type IngredientUnit,
  type WaiterCall,
  type Reward,
  type AppliedReward,
  type AppConfig,
  type AuditLog,
  type PaymentMethod,
  type PaymentStatus,
  type BillStatus,
  type InventoryAdjustment,
  type QRToken,
  type Refund,
  type CancelReason,
  type DeliveryZone,
  type MenuCategory,
  type Extra,
  type RecipeIngredient,
  type TableConfig,
  type TableState,
  type LoyaltyCustomer,
  type WaitlistEntry,
  type WaitlistEstado,
  MENU_ITEMS,
  DEFAULT_INGREDIENTS,
  DEFAULT_USERS,
  DEFAULT_REWARDS,
  DEFAULT_CONFIG,
  DEFAULT_DELIVERY_ZONES,
  DEFAULT_CATEGORIES,
  DEFAULT_TABLES,
  generateId,
  generateOrderNumber,
  generateDeviceId,
  calculateOrderTotal,
  deductIngredients,
  restoreIngredients,
  canPrepareItem,
  createQRToken,
  validateQRToken,
  getDeliveryZoneCost,
} from './store'

// ── Tipos de dominio extraídos a lib/context/types.ts ────────────────────────
// AppState y AppContextType viven en su propio módulo para permitir
// importarlos sin cargar el provider completo (tests, SSR, dominio).
import type { AppState, AppContextType } from './context/types'

const AppContext = createContext<AppContextType | null>(null)

const STORAGE_KEY = 'pqvv_app_state_v2'

function loadState(): AppState {
  if (typeof window === 'undefined') {
    return getDefaultState()
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      const result: AppState = {
        orders: parsed.orders?.map((o: Order) => ({
          ...o,
          createdAt: new Date(o.createdAt),
          updatedAt: new Date(o.updatedAt),
          tiempoInicioPreparacion: o.tiempoInicioPreparacion ? new Date(o.tiempoInicioPreparacion) : undefined,
          tiempoFinPreparacion: o.tiempoFinPreparacion ? new Date(o.tiempoFinPreparacion) : undefined,
        })) || [],
        tableSessions: parsed.tableSessions?.map((s: TableSession) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          expiresAt: new Date(s.expiresAt),
          paidAt: s.paidAt ? new Date(s.paidAt) : undefined,
        })) || [],
        menuItems: parsed.menuItems || MENU_ITEMS,
        ingredients: parsed.ingredients || DEFAULT_INGREDIENTS,
        users: (parsed.users && parsed.users.length > 0) 
          ? parsed.users.map((u: User) => ({
              ...u,
              createdAt: new Date(u.createdAt),
            }))
          : DEFAULT_USERS,
        rewards: parsed.rewards || DEFAULT_REWARDS,
        appliedRewards: parsed.appliedRewards || [],
        waiterCalls: parsed.waiterCalls?.map((c: WaiterCall) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          atendidoAt: c.atendidoAt ? new Date(c.atendidoAt) : undefined,
        })) || [],
        config: parsed.config || DEFAULT_CONFIG,
        auditLogs: parsed.auditLogs?.map((l: AuditLog) => ({
          ...l,
          createdAt: new Date(l.createdAt),
        })) || [],
        inventoryAdjustments: parsed.inventoryAdjustments?.map((a: InventoryAdjustment) => ({
          ...a,
          createdAt: new Date(a.createdAt),
        })) || [],
        qrTokens: parsed.qrTokens?.map((t: QRToken) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          expiresAt: new Date(t.expiresAt),
          usedAt: t.usedAt ? new Date(t.usedAt) : undefined,
        })) || [],
        refunds: parsed.refunds?.map((r: Refund) => ({
          ...r,
          status: r.status ?? 'aprobado',
          createdAt: new Date(r.createdAt),
        })) || [],
        deliveryZones: parsed.deliveryZones || DEFAULT_DELIVERY_ZONES,
        categories: parsed.categories || [],
        tables: parsed.tables?.map((t: TableConfig) => ({
          ...t,
          createdAt: new Date(t.createdAt),
        })) || DEFAULT_TABLES,
        cart: parsed.cart || [],
        currentTable: parsed.currentTable ?? null,
        deviceUser: null,  // Siempre null — se restaura desde Supabase Auth session
        currentUser: null, // Siempre null — lo elige el staff en la pantalla de perfil
        currentSessionId: parsed.currentSessionId || null,
        waitlist: [], // Siempre se recarga desde Supabase, no desde localStorage
        tenantPlan: parsed.tenantPlan ?? 'starter',
        tenantSlug: parsed.tenantSlug ?? undefined,
        trialEndsAt: parsed.trialEndsAt ?? null,
        planExpiresAt: parsed.planExpiresAt ?? null,
      }

      // Validate: clear currentTable/currentSessionId if there is no matching active session
      const sessions: TableSession[] = result.tableSessions
      if (result.currentSessionId) {
        const sessionExists = sessions.some(s => s.id === result.currentSessionId && s.activa)
        if (!sessionExists) {
          result.currentSessionId = null
          result.currentTable = null
          result.cart = []
        }
      } else if (result.currentTable !== null) {
        const hasActiveSession = sessions.some(s => s.mesa === result.currentTable && s.activa)
        if (!hasActiveSession) {
          result.currentTable = null
          result.cart = []
        }
      }

      return result
    }
  } catch (e) {
    console.error('Error loading state:', e)
  }
  
  return getDefaultState()
}

function getDefaultState(): AppState {
  return {
    orders: [],
    tableSessions: [],
    menuItems: MENU_ITEMS,
    ingredients: DEFAULT_INGREDIENTS,
    users: DEFAULT_USERS,
    rewards: DEFAULT_REWARDS,
    appliedRewards: [],
    waiterCalls: [],
    config: DEFAULT_CONFIG,
    auditLogs: [],
    inventoryAdjustments: [],
    qrTokens: [],
    refunds: [],
    deliveryZones: DEFAULT_DELIVERY_ZONES,
    categories: [],
    tables: DEFAULT_TABLES,
    cart: [],
    currentTable: null,
    deviceUser: null,
    currentUser: null,
    currentSessionId: null,
    waitlist: [],
    tenantPlan: 'starter',
    tenantSlug: undefined,
    trialEndsAt: null,
    planExpiresAt: null,
  }
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback
  if (Array.isArray(value) || typeof value === 'object') return value as T
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T } catch { return fallback }
  }
  return fallback
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(getDefaultState)
  // Ref siempre-actual de currentUser: permite gatear avisos a staff dentro de
  // callbacks creados una sola vez (p.ej. la cola offline). Los clientes QR
  // anónimos (sin currentUser) no deben ver avisos tipo "Contactá soporte".
  const currentUserRef = useRef(state.currentUser)
  currentUserRef.current = state.currentUser
  const [isHydrated, setIsHydrated] = useState(false)
  const [offlineQueuePending, setOfflineQueuePending] = useState(0)
  const [offlineQueueFailed, setOfflineQueueFailed] = useState(0)
  const isWritingRef = useRef(false)

  // Loyalty subsystem — estado completamente independiente del AppState principal
  const { loyaltyCustomers, getLoyaltyCustomer, identifyCustomer, addLoyaltyPoints, redeemLoyaltyPoints } = useLoyalty(isHydrated)

  // Inicializar sincronización offline (flush al montar + listener online)
  // Task 1.5: Al reconectar, vaciar cola y recargar entidades críticas desde Supabase (Supabase gana)
  // Task 1.6: Callbacks visibles — usuario sabe si algo falló irrecuperablemente
  useEffect(() => {
    const reloadCriticalFromSupabase = async () => {
      try {
        const [menuRes, catRes] = await Promise.all([
          supabase.from('menu_items').select('*').order('orden', { ascending: true }),
          supabase.from('categories').select('*').order('orden', { ascending: true }),
        ])
        if (menuRes.data && menuRes.data.length > 0) {
          setState(prev => ({
            ...prev,
            menuItems: menuRes.data.map(item => ({
              id: item.id,
              nombre: item.name,
              descripcion: item.description ?? '',
              precio: Number(item.price) || 0,
              categoria: item.category_id,
              disponible: item.available ?? true,
              imagen: item.image ?? undefined,
              imagenes: (item.imagenes as string[] | null) ?? [],
              identificador: item.identificador ?? undefined,
              colorFondo: item.color_fondo ?? undefined,
              colorBorde: item.color_borde ?? undefined,
              stockHabilitado: item.stock_habilitado ?? false,
              stockCantidad: item.stock_cantidad ?? 0,
              mostrarEnMenuDigital: item.mostrar_en_menu_digital ?? true,
              extras: (item.extras ?? []) as import('./store').Extra[],
              receta: (item.receta ?? []) as import('./store').RecipeIngredient[],
              orden: item.orden ?? 0,
            })),
          }))
        }
        if (catRes.data && catRes.data.length > 0) {
          setState(prev => ({
            ...prev,
            categories: catRes.data.map(c => ({
              id: c.id,
              nombre: c.name,
              activa: c.activa ?? true,
              orden: c.orden ?? 0,
            })),
          }))
        }
      } catch (e) {
        handleError('reload-after-flush', e, {
          userMessage: 'Reconectado, pero no se pudo recargar los datos. Recargá la página si ves información desactualizada.',
        })
      }
    }

    return initOfflineSync({
      onFlushComplete: async (flushedCount) => {
        setOfflineQueuePending(pendingCount())
        setOfflineQueueFailed(failedCount())
        if (flushedCount > 0) {
          // Supabase gana: recargar entidades críticas post-flush
          await reloadCriticalFromSupabase()
          // Solo staff ve avisos de sincronización; el cliente QR no.
          if (currentUserRef.current) {
            toast.success('Datos sincronizados con el servidor', { duration: 3000 })
          }
        }
      },
      onFlushError: (failedOps) => {
        setOfflineQueueFailed(failedOps.length)
        // Aviso "Contactá soporte" es para staff, no para el comensal anónimo.
        if (currentUserRef.current) {
          toast.error(
            `${failedOps.length} operación(es) no pudieron sincronizarse. Contactá soporte.`,
            { duration: 8000 }
          )
        }
      },
    })
  }, [])

  // Load state from localStorage + initialize Supabase Auth session
  useEffect(() => {
    // 1. Restore non-auth state from localStorage
    const loaded = loadState()
    setState(loaded)

    // 2. Helper: load User from Supabase profile row
    const buildUserFromProfile = (profile: Record<string, unknown>): User => ({
      id: profile.id as string,
      username: profile.username as string,
      nombre: profile.nombre as string,
      role: profile.role as UserRole,
      activo: profile.activo as boolean,
      createdAt: new Date(profile.created_at as string),
      tenantId: (profile.tenant_id as string | undefined) ?? undefined,
    })

    // 4. Restore auth session from Supabase (survives page reload via cookie/localStorage)
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (profile && profile.activo !== false) {
          const user = buildUserFromProfile(profile as Record<string, unknown>)
          setState(prev => ({ ...prev, deviceUser: user }))
          // Cargar lista de usuarios del staff — scoped por tenant cuando aplica
          const profilesTenantId = user.tenantId
          let profilesQuery = supabase.from('profiles').select('*').order('created_at')
          if (profilesTenantId) profilesQuery = profilesQuery.eq('tenant_id', profilesTenantId)
          const { data: allProfiles } = await profilesQuery
          if (allProfiles) {
            const staffUsers = allProfiles.map(p => buildUserFromProfile(p as Record<string, unknown>))
            // Restaurar el perfil activo guardado en localStorage (persiste entre recargas)
            const savedProfileId = typeof window !== 'undefined'
              ? localStorage.getItem('waitless_active_profile_id')
              : null
            const restoredProfile = savedProfileId
              ? staffUsers.find(u => u.id === savedProfileId && u.activo)
              : null
            setState(prev => ({
              ...prev,
              users: staffUsers,
              currentUser: restoredProfile ?? prev.currentUser,
            }))
          }

          // Cargar configuración desde Supabase — scoped por tenant cuando aplica
          let configQuery = supabase.from('app_config').select('*')
          if (user.tenantId) {
            configQuery = configQuery.eq('tenant_id', user.tenantId)
          } else {
            // Single-tenant: compatibilidad con fila legacy id='default'
            configQuery = configQuery.eq('id', 'default')
          }

          // Cargar nombre, slug y plan del tenant
          let tenantNombre: string | undefined
          let tenantSlug: string | undefined
          let tenantPlan: 'starter' | 'pro' | 'enterprise' = 'starter'
          let trialEndsAt: string | null = null
          let planExpiresAt: string | null = null
          if (user.tenantId) {
            const { data: tenantRow } = await supabase
              .from('tenants')
              .select('nombre, slug, plan, trial_ends_at, plan_expires_at')
              .eq('id', user.tenantId)
              .single()
            tenantNombre = (tenantRow?.nombre as string | undefined) ?? undefined
            tenantSlug = (tenantRow?.slug as string | undefined) ?? undefined
            tenantPlan = (tenantRow?.plan as 'starter' | 'pro' | 'enterprise' | undefined) ?? 'starter'
            trialEndsAt = (tenantRow?.trial_ends_at as string | null) ?? null
            planExpiresAt = (tenantRow?.plan_expires_at as string | null) ?? null
          }
          setState(prev => ({ ...prev, tenantPlan, tenantSlug, trialEndsAt, planExpiresAt }))

          const { data: configRow } = await configQuery.single()
          if (configRow) {
            setState(prev => ({
              ...prev,
              config: {
                ...prev.config,
                impuestoPorcentaje: Number(configRow.impuesto_porcentaje ?? prev.config.impuestoPorcentaje),
                propinaSugeridaPorcentaje: Number(configRow.propina_sugerida_porcentaje ?? prev.config.propinaSugeridaPorcentaje),
                tiempoExpiracionSesionMinutos: Number(configRow.tiempo_expiracion_sesion_minutos ?? prev.config.tiempoExpiracionSesionMinutos),
                zonasReparto: parseJsonField<string[]>(configRow.zonas_reparto, prev.config.zonasReparto),
                horariosOperacion: parseJsonField<AppConfig['horariosOperacion']>(configRow.horarios_operacion, prev.config.horariosOperacion),
                metodospagoActivos: parseJsonField<AppConfig['metodospagoActivos']>(configRow.metodos_pago_activos, prev.config.metodospagoActivos),
                sonidoNuevosPedidos: configRow.sonido_nuevos_pedidos ?? prev.config.sonidoNuevosPedidos,
                notificacionesStockBajo: configRow.notificaciones_stock_bajo ?? prev.config.notificacionesStockBajo,
                googleReviewUrl: configRow.google_review_url ?? prev.config.googleReviewUrl,
                pacingMaxPreparando: configRow.pacing_max_preparando ?? prev.config.pacingMaxPreparando,
                maxMesas: configRow.max_mesas != null ? Number(configRow.max_mesas) : prev.config.maxMesas,
                costoEnvio: configRow.costo_envio != null ? Number(configRow.costo_envio) : (prev.config.costoEnvio ?? 0),
                // P2-1: White-label branding
                restaurantName: (configRow.restaurant_name as string | undefined) ?? tenantNombre ?? prev.config.restaurantName,
                logoUrl: (configRow.logo_url as string | undefined) ?? prev.config.logoUrl,
                primaryColor: (configRow.primary_color as string | undefined) ?? prev.config.primaryColor,
                secondaryColor: (configRow.secondary_color as string | undefined) ?? prev.config.secondaryColor,
                accentColor: (configRow.accent_color as string | undefined) ?? prev.config.accentColor,
                fontFamily: (configRow.font_family as string | undefined) ?? prev.config.fontFamily,
                poweredByWaitless: (configRow.powered_by_waitless as boolean | undefined) ?? prev.config.poweredByWaitless,
                whatsappNumero: (configRow.whatsapp_numero as string | undefined) ?? prev.config.whatsappNumero,
                coverUrl: (configRow.cover_url as string | undefined) ?? prev.config.coverUrl,
                descripcion: (configRow.descripcion as string | undefined) ?? prev.config.descripcion,
                tiendaAbierta: (configRow.tienda_abierta as boolean | undefined) ?? prev.config.tiendaAbierta ?? true,
                tiendaVisible: (configRow.tienda_visible as boolean | undefined) ?? prev.config.tiendaVisible ?? true,
                autoHorarioApertura: (configRow.auto_horario_apertura as string | null | undefined) ?? prev.config.autoHorarioApertura ?? null,
                autoHorarioCierre: (configRow.auto_horario_cierre as string | null | undefined) ?? prev.config.autoHorarioCierre ?? null,
                deliveryHabilitado: (configRow.delivery_habilitado as boolean | undefined) ?? prev.config.deliveryHabilitado ?? false,
              },
            }))
          }

          // Cargar audit logs (solo para admin/manager) — scoped por tenant cuando aplica
          if (profile.role === 'admin' || profile.role === 'manager') {
            let logsQuery = supabase
              .from('audit_logs')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(500)
            if (user.tenantId) logsQuery = logsQuery.eq('tenant_id', user.tenantId)
            const { data: logs } = await logsQuery
            if (logs) {
              setState(prev => ({
                ...prev,
                auditLogs: logs.map(l => ({
                  id: l.id as string,
                  userId: l.user_id as string,
                  accion: l.accion as string,
                  detalles: l.detalles as string,
                  entidad: l.entidad as string,
                  entidadId: l.entidad_id as string,
                  createdAt: new Date(l.created_at as string),
                  razon: l.razon as string | undefined,
                  antes: l.antes as Record<string, unknown> | undefined,
                  despues: l.despues as Record<string, unknown> | undefined,
                })),
              }))
            }
          }
        } else if (profile && profile.activo === false) {
          // Solo cerrar sesión si la cuenta fue explícitamente desactivada
          await supabase.auth.signOut()
        }
        // Si el perfil no existe (usuario OAuth nuevo) o activo es null,
        // conservar la sesión para que pueda completar el registro.
      }
      setIsHydrated(true)
    }

    initAuth()

    // 5. Escuchar cambios de sesión (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setState(prev => ({ ...prev, deviceUser: null, currentUser: null, users: [], cart: [] }))
        return
      }
      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (profile && profile.activo !== false) {
          // Actualiza deviceUser (cuenta del dispositivo) pero NO toca currentUser
          setState(prev => ({
            ...prev,
            deviceUser: buildUserFromProfile(profile as Record<string, unknown>),
          }))
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])
  
  useEffect(() => {
    // Usar deviceUser para tenant scope: se conoce apenas el dispositivo se autentica,
    // antes de que el staff elija su perfil. Esto precarga datos para que la vista
    // esté lista al instante cuando el usuario selecciona su perfil.
    const tenantId = state.deviceUser?.tenantId ?? state.currentUser?.tenantId
    cargarMenu(setState, tenantId)
    cargarCategorias(setState, tenantId)
    cargarOrdenes(setState, tenantId)
    cargarSesionesActivas(setState, tenantId)
    cargarTables(setState)
    cargarQRTokens(setState, tenantId)
    cargarWaiterCalls(setState, tenantId)
    cargarReembolsos(setState, tenantId)
    cargarIngredientes(setState, tenantId)
    cargarWaitlist(setState, tenantId)
  }, [state.deviceUser?.tenantId, state.currentUser?.tenantId])

  // P2-1: Apply white-label CSS variables whenever branding config changes
  useEffect(() => {
    if (isHydrated) {
      applyBrandingTheme(state.config)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isHydrated,
    state.config.primaryColor,
    state.config.secondaryColor,
    state.config.accentColor,
    state.config.fontFamily,
  ])

  // Save state to localStorage after hydration
  useEffect(() => {
  if (isHydrated) {
    isWritingRef.current = true

    const stateToSave = {
      ...state,
      menuItems: state.menuItems
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))

    setTimeout(() => {
      isWritingRef.current = false
    }, 0)
  }
}, [state, isHydrated])
  
  // Listen for changes from other tabs only (same device)
  useEffect(() => {
    if (!isHydrated) return

    const handleStorageChange = (e: StorageEvent) => {
      // Skip if we triggered this change ourselves
      if (isWritingRef.current) return
      if (e.key !== STORAGE_KEY || !e.newValue) return

      try {
        const newState = JSON.parse(e.newValue)
        setState(prev => ({
          ...prev,
          orders: newState.orders?.map((o: Order) => ({
            ...o,
            createdAt: new Date(o.createdAt),
            updatedAt: new Date(o.updatedAt),
          })) || prev.orders,
          tableSessions: newState.tableSessions?.map((s: TableSession) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            expiresAt: new Date(s.expiresAt),
          })) || prev.tableSessions,
          waiterCalls: newState.waiterCalls?.map((c: WaiterCall) => ({
            ...c,
            createdAt: new Date(c.createdAt),
          })) || prev.waiterCalls,
          menuItems: newState.menuItems || prev.menuItems,
          ingredients: newState.ingredients || prev.ingredients,
        }))
      } catch (err) {
        console.error('Error syncing state:', err)
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [isHydrated])

  // ── Task 2.11 — Realtime gobernado ───────────────────────────────────────────
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const realtimeRef = useRef<Record<string, ReturnType<typeof supabase.channel>>>({})
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)

  useEffect(() => {
    if (!isHydrated) return
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL') return

    // ── mapOrderRow: helper completo (incluye campos de 008) ──────────────
    const mapOrderRow = (row: Record<string, unknown>): Order => ({
      id: row.id as string,
      numero: row.numero as number,
      canal: row.canal as Channel,
      mesa: row.mesa as number | undefined,
      seatNumber: row.seat_number as number | undefined,
      items: (row.items ?? []) as OrderItem[],
      status: row.status as OrderStatus,
      cocinaStatus: (row.cocina_a_status ?? 'en_cola') as KitchenStatus,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      nombreCliente: row.nombre_cliente as string | undefined,
      telefono: row.telefono as string | undefined,
      direccion: row.direccion as string | undefined,
      zonaReparto: row.zona_reparto as string | undefined,
      cancelado: (row.cancelado ?? false) as boolean,
      cancelReason: row.cancel_reason as CancelReason | undefined,
      tiempoInicioPreparacion: row.tiempo_inicio_preparacion ? new Date(row.tiempo_inicio_preparacion as string) : undefined,
      tiempoFinPreparacion: row.tiempo_fin_preparacion ? new Date(row.tiempo_fin_preparacion as string) : undefined,
      confirmedAt: row.confirmed_at ? new Date(row.confirmed_at as string) : undefined,
      kitchenReceivedAt: row.kitchen_received_at ? new Date(row.kitchen_received_at as string) : undefined,
      isQrOrder: (row.is_qr_order ?? false) as boolean,
      subtotal: row.subtotal != null ? Number(row.subtotal) : undefined,
      impuestos: row.impuestos != null ? Number(row.impuestos) : undefined,
      propina: row.propina != null ? Number(row.propina) : undefined,
      costoEnvio: row.costo_envio != null ? Number(row.costo_envio) : undefined,
      total: row.total != null ? Number(row.total) : undefined,
    })

    // ── Reconciliación post-reconexión ──────────────────────────────────
    const reconcile = async () => {
      try {
        const [
          { data: ordersData },
          { data: sessionsData },
          { data: tablesData },
          { data: callsData },
        ] = await Promise.all([
          supabase.from('orders').select('*').not('status', 'in', '("entregado","cancelado")').order('created_at', { ascending: true }),
          supabase.from('table_sessions').select('*').eq('activa', true).order('created_at', { ascending: true }),
          supabase.from('tables_config').select('*').eq('activa', true).order('numero', { ascending: true }),
          supabase.from('waiter_calls').select('*').eq('atendido', false).order('created_at', { ascending: true }),
        ])
        setState(prev => {
          const next = { ...prev }
          const orders = ordersData ? ordersData.map(r => mapOrderRow(r as Record<string, unknown>)) : prev.orders
          next.orders = orders
          if (tablesData) {
            next.tables = tablesData.map(row => ({
              id: row.id as string,
              numero: Number(row.numero),
              capacidad: Number(row.capacidad) || 4,
              ubicacion: row.ubicacion as string | undefined,
              activa: (row.activa ?? true) as boolean,
              estado: (row.estado ?? 'disponible') as TableConfig['estado'],
              createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
            }))
          }
          if (callsData) {
            next.waiterCalls = callsData.map(row => ({
              id: row.id as string,
              mesa: row.mesa as number,
              tipo: row.tipo as 'atencion' | 'cuenta' | 'otro',
              mensaje: row.mensaje as string | undefined,
              sessionId: row.session_id as string | undefined,
              atendido: (row.atendido ?? false) as boolean,
              atendidoPor: row.atendido_por as string | undefined,
              createdAt: new Date(row.created_at as string),
              atendidoAt: row.atendido_at ? new Date(row.atendido_at as string) : undefined,
            }))
          }
          if (sessionsData) {
            next.tableSessions = sessionsData.map(row => {
              const existing = prev.tableSessions.find(s => s.id === (row.id as string))
              return {
                id: row.id as string,
                mesa: row.mesa as number,
                activa: (row.activa ?? true) as boolean,
                orders: orders.filter(o =>
                  ordersData?.some(od => od.id === o.id && od.session_id === row.id)
                ),
                createdAt: new Date(row.created_at as string),
                expiresAt: row.expires_at ? new Date(row.expires_at as string) : new Date(Date.now() + 86400000),
                deviceId: (row.device_id ?? '') as string,
                billStatus: (row.bill_status ?? 'abierta') as BillStatus,
                subtotal: Number(row.subtotal) || 0,
                impuestos: Number(row.impuestos) || 0,
                propina: Number(row.propina) || 0,
                descuento: Number(row.descuento) || 0,
                descuentoMotivo: row.descuento_motivo as string | undefined,
                total: Number(row.total) || 0,
                montoAbonado: Number(row.monto_abonado) || 0,
                paymentMethod: row.payment_method as PaymentMethod | undefined,
                paymentStatus: (row.payment_status ?? 'pendiente') as PaymentStatus,
                paidAt: row.paid_at ? new Date(row.paid_at as string) : undefined,
                receiptId: row.receipt_id as string | undefined,
                feedbackDone: (row.feedback_done ?? false) as boolean,
                version: Number(row.version) || 0,
              }
            })
          }
          return next
        })
      } catch (e) {
        logError('realtime-reconcile', e)
      }
    }

    // ── Reconexión con backoff exponencial ───────────────────────────────
    const MAX_RECONNECT_ATTEMPTS = 6
    const MAX_DELAY_MS = 30_000

    const teardown = () => {
      Object.values(realtimeRef.current).forEach(ch => supabase.removeChannel(ch))
      realtimeRef.current = {}
    }

    // 'setup' se asigna después — el ref permite que scheduleReconnect lo llame sin problemas de hoisting
    let setup: () => void = () => {}
    let scheduledReconnect = false
    let subscribedCount = 0
    const CHANNEL_COUNT = 9 // orders, sessions, waiter, menu_items, categories, ingredients, tables, waitlist, feedback

    const scheduleReconnect = () => {
      if (scheduledReconnect) return
      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        logError('realtime-max-retries', new Error(`Max ${MAX_RECONNECT_ATTEMPTS} reconnect attempts reached`))
        return
      }
      scheduledReconnect = true
      setRealtimeConnected(false)
      const delay = Math.min(Math.pow(2, reconnectAttemptsRef.current) * 1000, MAX_DELAY_MS)
      reconnectTimerRef.current = setTimeout(() => {
        scheduledReconnect = false
        reconnectAttemptsRef.current++
        setup()
      }, delay)
    }

    const onStatus = (name: string) => (status: string, err?: Error) => {
      if (status === 'SUBSCRIBED') {
        subscribedCount++
        if (subscribedCount >= CHANNEL_COUNT) {
          setRealtimeConnected(true)
          if (reconnectAttemptsRef.current > 0) {
            reconcile()
          }
          reconnectAttemptsRef.current = 0
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        logError(`channel-${name}`, err ?? new Error(status))
        scheduleReconnect()
      }
    }

    // Prefijo de tenant para aislar canales en instalaciones multi-tenant.
    // En single-tenant (tenantId = undefined) se usa 'default'.
    const tenantId = state.currentUser?.tenantId
    const tenantPrefix = tenantId ?? 'default'

    setup = () => {
      teardown()
      subscribedCount = 0

      // ── Canal: orders ────────────────────────────────────────────────
      const ordersChannel = supabase
        .channel(`${tenantPrefix}:db-orders`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', ...(tenantId ? { filter: `tenant_id=eq.${tenantId}` } : {}) }, payload => {
          if (payload.eventType === 'DELETE') {
            setState(prev => ({ ...prev, orders: prev.orders.filter(o => o.id !== (payload.old as {id:string}).id) }))
            return
          }
          const row = payload.new as Record<string, unknown>
          if (tenantId && row.tenant_id !== tenantId) return
          if (row.cancelado && row.status === 'cancelado') {
            setState(prev => ({ ...prev, orders: prev.orders.filter(o => o.id !== row.id) }))
            return
          }
          const order = mapOrderRow(row)
          setState(prev => {
            const exists = prev.orders.some(o => o.id === order.id)
            const orders = exists
              ? prev.orders.map(o => o.id === order.id ? order : o)
              : [...prev.orders, order]
            const tableSessions = prev.tableSessions.map(s => ({
              ...s,
              orders: s.orders.map(o => o.id === order.id ? order : o),
            }))
            return { ...prev, orders, tableSessions }
          })
        })
        .subscribe(onStatus('orders'))

      // ── Canal: table_sessions ────────────────────────────────────────
      const sessionsChannel = supabase
        .channel(`${tenantPrefix}:db-sessions`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions', ...(tenantId ? { filter: `tenant_id=eq.${tenantId}` } : {}) }, payload => {
          if (payload.eventType === 'DELETE') {
            setState(prev => ({ ...prev, tableSessions: prev.tableSessions.filter(s => s.id !== (payload.old as {id:string}).id) }))
            return
          }
          const row = payload.new as Record<string, unknown>
          if (tenantId && row.tenant_id !== tenantId) return
          setState(prev => {
            const exists = prev.tableSessions.some(s => s.id === row.id)
            if (exists) {
              return {
                ...prev,
                tableSessions: prev.tableSessions.map(s =>
                  s.id === row.id
                    ? {
                        ...s,
                        activa: row.activa as boolean,
                        billStatus: (row.bill_status ?? 'abierta') as BillStatus,
                        subtotal: Number(row.subtotal) || 0,
                        impuestos: Number(row.impuestos) || 0,
                        propina: Number(row.propina) || 0,
                        descuento: Number(row.descuento) || 0,
                        descuentoMotivo: row.descuento_motivo as string | undefined,
                        total: Number(row.total) || 0,
                        paymentMethod: row.payment_method as PaymentMethod | undefined,
                        paymentStatus: (row.payment_status ?? 'pendiente') as PaymentStatus,
                        montoAbonado: Number(row.monto_abonado) || 0,
                        paidAt: row.paid_at ? new Date(row.paid_at as string) : undefined,
                        feedbackDone: (row.feedback_done ?? false) as boolean,
                        version: Number(row.version) || 0,
                      }
                    : s
                ),
              }
            }
            return {
              ...prev,
              tableSessions: [
                ...prev.tableSessions,
                {
                  id: row.id as string,
                  mesa: row.mesa as number,
                  activa: (row.activa ?? true) as boolean,
                  orders: [],
                  createdAt: new Date(row.created_at as string),
                  expiresAt: row.expires_at ? new Date(row.expires_at as string) : new Date(Date.now() + 86400000),
                  deviceId: (row.device_id ?? '') as string,
                  billStatus: (row.bill_status ?? 'abierta') as BillStatus,
                  subtotal: 0, impuestos: 0, propina: 0, descuento: 0, total: 0,
                  paymentStatus: 'pendiente' as PaymentStatus,
                  montoAbonado: 0,
                  feedbackDone: false,
                  version: Number(row.version) || 0,
                },
              ],
            }
          })
        })
        .subscribe(onStatus('sessions'))

      // ── Canal: waiter_calls ──────────────────────────────────────────
      const waiterChannel = supabase
        .channel(`${tenantPrefix}:db-waiter-calls`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'waiter_calls', ...(tenantId ? { filter: `tenant_id=eq.${tenantId}` } : {}) }, payload => {
          if (payload.eventType === 'DELETE') {
            setState(prev => ({ ...prev, waiterCalls: prev.waiterCalls.filter(c => c.id !== (payload.old as {id:string}).id) }))
            return
          }
          const row = payload.new as Record<string, unknown>
          if (tenantId && row.tenant_id !== tenantId) return
          const call: WaiterCall = {
            id: row.id as string,
            mesa: row.mesa as number,
            tipo: row.tipo as 'atencion' | 'cuenta' | 'otro',
            mensaje: row.mensaje as string | undefined,
            sessionId: row.session_id as string | undefined,
            atendido: (row.atendido ?? false) as boolean,
            atendidoPor: row.atendido_por as string | undefined,
            createdAt: new Date(row.created_at as string),
            atendidoAt: row.atendido_at ? new Date(row.atendido_at as string) : undefined,
          }
          setState(prev => {
            if (call.atendido) {
              return { ...prev, waiterCalls: prev.waiterCalls.filter(c => c.id !== call.id) }
            }
            const exists = prev.waiterCalls.some(c => c.id === call.id)
            return {
              ...prev,
              waiterCalls: exists
                ? prev.waiterCalls.map(c => c.id === call.id ? call : c)
                : [...prev.waiterCalls, call],
            }
          })
        })
        .subscribe(onStatus('waiter'))

      // ── Canal: menu_items ────────────────────────────────────────────
      const menuItemsChannel = supabase
        .channel(`${tenantPrefix}:db-menu-items`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', ...(tenantId ? { filter: `tenant_id=eq.${tenantId}` } : {}) }, payload => {
          if (payload.eventType === 'DELETE') {
            setState(prev => ({ ...prev, menuItems: prev.menuItems.filter(m => m.id !== (payload.old as {id:string}).id) }))
            return
          }
          const row = payload.new as Record<string, unknown>
          if (tenantId && row.tenant_id !== tenantId) return
          const item: MenuItem = {
            id: row.id as string,
            nombre: (row.name ?? row.nombre) as string,
            descripcion: ((row.description ?? row.descripcion) ?? '') as string,
            precio: Number(row.price ?? row.precio) || 0,
            categoria: (row.category_id ?? row.categoria) as string,
            imagen: (row.image ?? row.imagen) as string | undefined,
            imagenes: (row.imagenes as string[] | null) ?? [],
            identificador: (row.identificador as string | null) ?? undefined,
            colorFondo: (row.color_fondo as string | null) ?? undefined,
            colorBorde: (row.color_borde as string | null) ?? undefined,
            stockHabilitado: (row.stock_habilitado as boolean | null) ?? false,
            stockCantidad: (row.stock_cantidad as number | null) ?? 0,
            mostrarEnMenuDigital: (row.mostrar_en_menu_digital as boolean | null) ?? true,
            disponible: (row.available ?? row.disponible ?? true) as boolean,
            extras: (row.extras as Extra[] | undefined) ?? [],
            receta: (row.receta as RecipeIngredient[] | undefined) ?? [],
            orden: (row.orden as number | null) ?? 0,
          }
          setState(prev => {
            const exists = prev.menuItems.some(m => m.id === item.id)
            return {
              ...prev,
              menuItems: exists
                ? prev.menuItems.map(m => m.id === item.id ? item : m)
                : [...prev.menuItems, item],
            }
          })
        })
        .subscribe(onStatus('menu_items'))

      // ── Canal: categories ────────────────────────────────────────────
      const categoriesChannel = supabase
        .channel(`${tenantPrefix}:db-categories`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', ...(tenantId ? { filter: `tenant_id=eq.${tenantId}` } : {}) }, payload => {
          if (payload.eventType === 'DELETE') {
            setState(prev => ({ ...prev, categories: prev.categories.filter(c => c.id !== (payload.old as {id:string}).id) }))
            return
          }
          const row = payload.new as Record<string, unknown>
          if (tenantId && row.tenant_id !== tenantId) return
          const cat: MenuCategory = {
            id: row.id as string,
            nombre: (row.name ?? row.nombre) as string,
            orden: Number(row.orden) || 0,
            activa: (row.activa ?? true) as boolean,
          }
          setState(prev => {
            const exists = prev.categories.some(c => c.id === cat.id)
            return {
              ...prev,
              categories: exists
                ? prev.categories.map(c => c.id === cat.id ? cat : c)
                : [...prev.categories, cat],
            }
          })
        })
        .subscribe(onStatus('categories'))

      // ── Canal: ingredients ───────────────────────────────────────────
      const ingredientsChannel = supabase
        .channel(`${tenantPrefix}:db-ingredients`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients', ...(tenantId ? { filter: `tenant_id=eq.${tenantId}` } : {}) }, payload => {
          if (payload.eventType === 'DELETE') {
            setState(prev => ({ ...prev, ingredients: prev.ingredients.filter(i => i.id !== (payload.old as {id:string}).id) }))
            return
          }
          const row = payload.new as Record<string, unknown>
          if (tenantId && row.tenant_id !== tenantId) return
          const ingredient: Ingredient = {
            id: row.id as string,
            nombre: row.nombre as string,
            categoria: row.categoria as string,
            unidad: row.unidad as IngredientUnit,
            stockActual: Number(row.stock_actual) || 0,
            stockMinimo: Number(row.stock_minimo) || 0,
            cantidadMaxima: Number(row.cantidad_maxima) || 0,
            costoUnitario: Number(row.costo_unitario) || 0,
            activo: (row.activo ?? true) as boolean,
          }
          setState(prev => {
            const exists = prev.ingredients.some(i => i.id === ingredient.id)
            return {
              ...prev,
              ingredients: exists
                ? prev.ingredients.map(i => i.id === ingredient.id ? ingredient : i)
                : [...prev.ingredients, ingredient],
            }
          })
        })
        .subscribe(onStatus('ingredients'))

      // ── Canal: tables_config ─────────────────────────────────────────
      const tablesChannel = supabase
        .channel(`${tenantPrefix}:db-tables-config`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tables_config' }, payload => {
          if (payload.eventType === 'DELETE') {
            setState(prev => ({ ...prev, tables: prev.tables.filter(t => t.id !== (payload.old as {id:string}).id) }))
            return
          }
          const row = payload.new as Record<string, unknown>
          const table: TableConfig = {
            id: row.id as string,
            numero: Number(row.numero),
            capacidad: Number(row.capacidad) || 4,
            ubicacion: row.ubicacion as string | undefined,
            activa: (row.activa ?? true) as boolean,
            estado: (row.estado ?? 'disponible') as TableConfig['estado'],
            createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
          }
          setState(prev => {
            const exists = prev.tables.some(t => t.id === table.id)
            return {
              ...prev,
              tables: exists
                ? prev.tables.map(t => t.id === table.id ? table : t)
                : [...prev.tables, table],
            }
          })
        })
        .subscribe(onStatus('tables'))

      // ── Canal: waitlist ──────────────────────────────────────────────
      const waitlistChannel = supabase
        .channel(`${tenantPrefix}:db-waitlist`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'waitlist', ...(tenantId ? { filter: `tenant_id=eq.${tenantId}` } : {}) }, payload => {
          if (payload.eventType === 'DELETE') {
            setState(prev => ({ ...prev, waitlist: prev.waitlist.filter(w => w.id !== (payload.old as {id:string}).id) }))
            return
          }
          const row = payload.new as Record<string, unknown>
          if (tenantId && row.tenant_id !== tenantId) return
          const entry: WaitlistEntry = {
            id: row.id as string,
            nombre: row.nombre as string,
            telefono: row.telefono as string | undefined,
            personas: Number(row.personas) || 1,
            notas: row.notas as string | undefined,
            estado: row.estado as WaitlistEstado,
            mesaAsignada: row.mesa_asignada as number | undefined,
            expiresAt: new Date(row.expires_at as string),
            createdAt: new Date(row.created_at as string),
            updatedAt: new Date(row.updated_at as string),
          }
          setState(prev => {
            const exists = prev.waitlist.some(w => w.id === entry.id)
            if (entry.estado === 'cancelada' || entry.estado === 'expirada') {
              return {
                ...prev,
                waitlist: exists ? prev.waitlist.map(w => w.id === entry.id ? entry : w) : prev.waitlist,
              }
            }
            return {
              ...prev,
              waitlist: exists
                ? prev.waitlist.map(w => w.id === entry.id ? entry : w)
                : [...prev.waitlist, entry],
            }
          })
        })
        .subscribe(onStatus('waitlist'))

      // ── Canal: feedback (admin/manager — marca sesión como reseñada) ─
      const feedbackChannel = supabase
        .channel(`${tenantPrefix}:db-feedback`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback' }, payload => {
          const row = payload.new as Record<string, unknown>
          if (!row.session_id) return
          setState(prev => ({
            ...prev,
            tableSessions: prev.tableSessions.map(s =>
              s.id === row.session_id ? { ...s, feedbackDone: true } : s
            ),
          }))
        })
        .subscribe(onStatus('feedback'))

      realtimeRef.current = {
        orders: ordersChannel,
        sessions: sessionsChannel,
        waiter: waiterChannel,
        menuItems: menuItemsChannel,
        categories: categoriesChannel,
        ingredients: ingredientsChannel,
        tables: tablesChannel,
        waitlist: waitlistChannel,
        feedback: feedbackChannel,
      }
    }

    setup()

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      teardown()
    }
  }, [isHydrated, state.deviceUser?.tenantId, state.currentUser?.tenantId])
  
  // ============ AUTH ACTIONS ============
  // Lógica de Supabase Auth extraída a lib/context/auth.ts.
  // El provider solo gestiona el estado React resultante.
  const login = useCallback(async (username: string, password: string): Promise<AuthLoginResult> => {
    const result = await authLogin(username, password)
    if (result.status !== 'ok') return result
    const user = result.user
    // Login completo: establece tanto la cuenta del dispositivo como el perfil activo
    setState(prev => ({ ...prev, deviceUser: user, currentUser: user }))
    localStorage.setItem('waitless_active_profile_id', user.id)
    authLoadUsers(user.tenantId).then(users => {
      setState(prev => ({ ...prev, users }))
    })
    return result
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    localStorage.removeItem('waitless_active_profile_id')
    setState(prev => ({
      ...prev,
      deviceUser: null,
      currentUser: null,
      currentTable: null,
      currentSessionId: null,
      cart: [],
      users: [],
    }))
    await authLogout()
  }, [])

  // Cierra el perfil activo sin cerrar la sesión del dispositivo.
  // El staff verá la pantalla de bloqueo (ProfilePicker) y podrá elegir otro perfil.
  const lockProfile = useCallback((): void => {
    localStorage.removeItem('waitless_active_profile_id')
    setState(prev => ({ ...prev, currentUser: null }))
  }, [])

  // Valida credenciales de un perfil sin cambiar la sesión Supabase del navegador.
  // Llama al API route server-side que valida contra Supabase Auth de forma aislada.
  const switchProfile = useCallback(async (username: string, password: string): Promise<User | null> => {
    const res = await fetch('/api/auth/validate-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) return null
    const json = await res.json()
    if (!json.profile) return null
    const user: User = {
      id: json.profile.id as string,
      username: json.profile.username as string,
      nombre: json.profile.nombre as string,
      role: json.profile.role as UserRole,
      activo: json.profile.activo as boolean,
      tenantId: json.profile.tenantId as string | undefined,
      createdAt: new Date(json.profile.createdAt as string),
    }
    setState(prev => ({ ...prev, currentUser: user }))
    localStorage.setItem('waitless_active_profile_id', user.id)
    return user
  }, [])

  // Reanuda el perfil del PROPIO usuario del dispositivo sin pedir contraseña.
  // Válido porque la sesión del dispositivo (deviceUser) ya prueba la identidad
  // (login con contraseña o con Google). El password solo se exige para cambiar
  // a OTRO perfil (staff). Sin esto, una cuenta de Google —que no tiene
  // contraseña— quedaba trabada para siempre en la pantalla de elegir perfil.
  const resumeDeviceProfile = useCallback((): User | null => {
    const dev = state.deviceUser
    if (!dev) return null
    setState(prev => ({ ...prev, currentUser: dev }))
    localStorage.setItem('waitless_active_profile_id', dev.id)
    return dev
  }, [state.deviceUser])

  // ============ DOMAIN HOOKS ============
  const cartActions = useCartActions(setState)
  const orderActions = useOrderActions(state, setState)
  const sessionActions = useSessionActions(state, setState)
  const waiterActions = useWaiterActions(state, setState)
  const menuActions = useMenuActions(state, setState)
  const inventoryActions = useInventoryActions(state, setState)
  const adminActions = useAdminActions(state, setState)
  const qrActions = useQRActions(state, setState)
  
  const value: AppContextType = {
    ...state,
    login,
    logout,
    lockProfile,
    switchProfile,
    resumeDeviceProfile,
    ...cartActions,
    ...orderActions,
    ...sessionActions,
    ...waiterActions,
    ...menuActions,
    ...inventoryActions,
    ...adminActions,
    ...qrActions,
    logAction: (accion, detalles, entidad, entidadId, opts) =>
      logAction(state.currentUser?.id, setState, accion, detalles, entidad, entidadId, opts),
    loyaltyCustomers,
    getLoyaltyCustomer,
    identifyCustomer,
    addLoyaltyPoints,
    redeemLoyaltyPoints,

    // Task 1.6 — Estado visible de la offline queue
    offlineQueuePending,
    offlineQueueFailed,
    clearOfflineFailedOps: () => {
      clearFailedOps()
      setOfflineQueueFailed(0)
    },

    // Task 2.11 — Estado de conexión Realtime
    realtimeConnected,

    // Task 4.1 — Multi-tenant
    tenantId: state.currentUser?.tenantId ?? state.deviceUser?.tenantId,
    tenantSlug: state.tenantSlug,
    tenantPlan: state.tenantPlan,
    trialEndsAt: state.trialEndsAt,
    planExpiresAt: state.planExpiresAt,
    hasPlanFeature: (feature: string) => {
      const activeTenantId = state.currentUser?.tenantId ?? state.deviceUser?.tenantId
      // Sin tenant (single-tenant mode) → acceso total.
      if (!activeTenantId) return true
      // En prueba gratuita → acceso total a todas las funciones.
      if (isInTrial({ trialEndsAt: state.trialEndsAt })) return true
      // Con tenant y fuera de prueba → gatea por plan.
      return planHasFeature(state.tenantPlan, feature)
    },
    tenantBlocked: (state.currentUser?.tenantId ?? state.deviceUser?.tenantId)
      ? isTenantBlocked({ trialEndsAt: state.trialEndsAt, planExpiresAt: state.planExpiresAt })
      : false,
  }
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

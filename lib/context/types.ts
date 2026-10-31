/**
 * lib/context/types.ts
 *
 * Tipos del contexto global de la app.
 * Extraídos de lib/context.tsx para permitir importarlos sin cargar
 * el provider completo (útil en tests, SSR, y módulos de dominio).
 */

import type {
  Order,
  OrderItem,
  TableSession,
  MenuItem,
  Channel,
  OrderStatus,
  KitchenStatus,
  User,
  Ingredient,
  WaiterCall,
  Reward,
  AppliedReward,
  AppConfig,
  AuditLog,
  PaymentMethod,
  PaymentStatus,
  BillStatus,
  InventoryAdjustment,
  QRToken,
  Refund,
  CancelReason,
  DeliveryZone,
  MenuCategory,
  Extra,
  TableConfig,
  LoyaltyCustomer,
  WaitlistEntry,
} from '../store'
import type { AuthLoginResult } from './auth'

export interface AppState {
  orders: Order[]
  tableSessions: TableSession[]
  menuItems: MenuItem[]
  ingredients: Ingredient[]
  users: User[]
  rewards: Reward[]
  appliedRewards: AppliedReward[]
  waiterCalls: WaiterCall[]
  config: AppConfig
  auditLogs: AuditLog[]
  inventoryAdjustments: InventoryAdjustment[]
  qrTokens: QRToken[]
  refunds: Refund[]
  deliveryZones: DeliveryZone[]
  categories: MenuCategory[]
  tables: TableConfig[]
  cart: OrderItem[]
  currentTable: number | null
  /** Cuenta del restaurante vinculada al dispositivo — persiste con la sesión Supabase */
  deviceUser: User | null
  /** Perfil del staff activo en este momento — null muestra la pantalla de bloqueo */
  currentUser: User | null
  currentSessionId: string | null
  waitlist: WaitlistEntry[]
  tenantPlan: 'starter' | 'pro' | 'enterprise'
  tenantSlug: string | undefined
  /** Fin de la prueba gratuita (ISO) — null en tenants legacy / single-tenant */
  trialEndsAt: string | null
  /** Fin del periodo pago vigente (ISO) — lo setea el operador al confirmar C2P */
  planExpiresAt: string | null
}

export interface AppContextType extends AppState {
  // Auth
  login: (username: string, password: string) => Promise<AuthLoginResult>
  logout: () => Promise<void>
  /** Cierra el perfil activo y muestra la pantalla de bloqueo (no cierra la sesión del restaurante) */
  lockProfile: () => void
  /** Valida credenciales de un perfil y lo activa sin cambiar la sesión Supabase del dispositivo */
  switchProfile: (username: string, password: string) => Promise<User | null>
  /** Reanuda el perfil del propio usuario del dispositivo sin contraseña (ya autenticado). */
  resumeDeviceProfile: () => User | null

  // Cart
  addToCart: (item: MenuItem, cantidad: number, notas?: string, extras?: MenuItem['extras']) => void
  removeFromCart: (itemId: string) => void
  updateCartItem: (itemId: string, cantidad: number) => void
  clearCart: () => void

  // Orders
  createOrder: (
    canal: Channel,
    mesa?: number,
    clienteInfo?: { nombre?: string; telefono?: string; email?: string; notas?: string; direccion?: string; zonaReparto?: string; costoEnvio?: number },
    seatNumber?: number,
  ) => Promise<Order | null>
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>
  updateKitchenStatus: (orderId: string, status: KitchenStatus) => void
  cancelOrder: (orderId: string, reason: CancelReason, motivo?: string, userId?: string) => boolean
  updateOrderItems: (orderId: string, items: OrderItem[]) => boolean
  markOrderDelivered: (orderId: string, meseroId?: string) => void
  assignRepartidor: (orderId: string, repartidorId: string) => void

  // Table Sessions
  setCurrentTable: (mesa: number | null) => void
  getTableSession: (mesa: number) => TableSession | undefined
  createTableSession: (mesa: number) => TableSession
  closeTableSession: (sessionId: string) => void
  moveTableSession: (sessionId: string, toMesa: number) => void
  mergeTableSessions: (targetSessionId: string, sourceSessionId: string) => void
  splitTableSession: (sessionId: string, orderIds: string[], toMesa: number) => void
  isSessionValid: (mesa: number) => boolean

  // Bill / Payments
  updateBillTotals: (sessionId: string) => void
  applyDiscount: (sessionId: string, descuento: number, motivo: string) => Promise<void>
  setTipAmount: (sessionId: string, propina: number) => void
  requestPayment: (sessionId: string, method: PaymentMethod) => void
  addPartialPayment: (sessionId: string, monto: number, method: PaymentMethod) => Promise<void>
  confirmPayment: (sessionId: string) => Promise<void>
  persistSplitBill: (sessionId: string, seats: Array<{ method: PaymentMethod; monto: number }>) => Promise<void>
  getSessionBill: (sessionId: string) => TableSession | undefined
  markTableClean: (tableNumero: number) => void
  reopenTableSession: (sessionId: string, razon: string, userId: string) => void

  // Waiter Calls
  createWaiterCall: (mesa: number, tipo: 'atencion' | 'cuenta' | 'otro', mensaje?: string) => void
  markCallAttended: (callId: string, userId: string) => void
  getPendingCalls: () => WaiterCall[]

  // Rewards
  applyReward: (sessionId: string, rewardId: string) => boolean
  getAvailableRewards: (sessionId: string) => Reward[]

  // Menu
  updateMenuItem: (itemId: string, updates: Partial<MenuItem>, imageFiles?: (File | null)[]) => void
  addMenuItem: (item: Omit<MenuItem, 'id'>, imageFiles?: (File | null)[]) => Promise<void>
  deleteMenuItem: (itemId: string) => void
  getAvailableMenuItems: () => MenuItem[]

  // Categories
  addCategory: (nombre: string) => void
  updateCategory: (categoryId: string, updates: Partial<MenuCategory>) => void
  deleteCategory: (categoryId: string) => void
  reorderCategories: (categoryIds: string[]) => void

  // Tables
  addTable: (numero: number, capacidad?: number, ubicacion?: string) => Promise<{ ok: boolean; error?: string }>
  updateTable: (tableId: string, updates: Partial<TableConfig>) => void
  deleteTable: (tableId: string) => void
  setTablesCount: (count: number) => Promise<{ ok: boolean; error?: string }>
  getActiveTables: () => TableConfig[]

  // Inventory
  updateIngredient: (ingredientId: string, updates: Partial<Ingredient>) => void
  addIngredient: (ingredient: Omit<Ingredient, 'id'>) => void
  deleteIngredient: (ingredientId: string) => void
  adjustInventory: (ingredientId: string, tipo: 'entrada' | 'salida' | 'merma' | 'ajuste', cantidad: number, motivo: string) => Promise<void>
  getLowStockIngredients: () => Ingredient[]

  // Users
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void
  updateUser: (userId: string, updates: Partial<User>) => void
  deleteUser: (userId: string) => void
  refreshUsers: () => Promise<void>

  // Config
  updateConfig: (updates: Partial<AppConfig>) => void

  // Audit
  logAction: (
    accion: string,
    detalles: string,
    entidad: string,
    entidadId: string,
    opts?: { razon?: string; antes?: Record<string, unknown>; despues?: Record<string, unknown> },
  ) => void

  // QR Tokens
  generateTableQR: (mesa: number) => Promise<QRToken>
  validateTableQR: (token: string) => Promise<{ valid: boolean; mesa?: number; token?: QRToken }>
  invalidateTableQR: (tokenId: string) => Promise<void>
  getActiveQRForTable: (mesa: number) => QRToken | undefined

  // Refunds
  createRefund: (orderId: string, monto: number, motivo: string, tipo: 'total' | 'parcial', itemIds?: string[], userId?: string) => Refund | null
  getOrderRefunds: (orderId: string) => Refund[]

  // Delivery zones
  getDeliveryZones: () => DeliveryZone[]
  updateDeliveryZone: (zonaNombre: string, updates: Partial<DeliveryZone>) => void
  addDeliveryZone: (zone: DeliveryZone) => void
  calculateDeliveryCost: (zonaNombre: string) => number

  // Payment utilities
  resetSessionPaymentStatus: (sessionId: string) => void
  markFeedbackDone: (sessionId: string) => void
  addFeedback: (mesa: number, rating: number, comentario?: string, sessionId?: string) => Promise<void>

  // Waitlist
  addToWaitlist: (entry: Omit<WaitlistEntry, 'id' | 'estado' | 'expiresAt' | 'createdAt' | 'updatedAt'>) => Promise<WaitlistEntry | null>
  updateWaitlistEntry: (id: string, updates: Partial<Pick<WaitlistEntry, 'estado' | 'mesaAsignada' | 'notas'>>) => Promise<void>
  removeWaitlistEntry: (id: string) => Promise<void>

  // Emergency
  emergencyCloseAllTables: () => void
  emergencyCloseTables: (mesas: number[]) => void

  // Loyalty
  loyaltyCustomers: LoyaltyCustomer[]
  getLoyaltyCustomer: (telefono: string) => LoyaltyCustomer | undefined
  identifyCustomer: (telefono: string, nombre?: string) => LoyaltyCustomer
  addLoyaltyPoints: (telefono: string, monto: number, sessionId?: string) => void
  redeemLoyaltyPoints: (telefono: string, puntos: number) => boolean

  // Utilities
  getOrdersForKitchen: (kitchen: 'a' | 'b') => Order[]
  getPendingDeliveries: () => Order[]
  getTableOrders: (mesa: number) => Order[]
  getAllActiveOrders: () => Order[]
  getPaymentsForDate: (date: Date) => TableSession[]
  canEditOrder: (orderId: string) => boolean
  canCancelOrder: (orderId: string) => boolean

  // Offline queue state
  offlineQueuePending: number
  offlineQueueFailed: number
  clearOfflineFailedOps: () => void

  // Realtime connection state
  realtimeConnected: boolean

  // Multi-tenant
  tenantId: string | undefined
  tenantSlug: string | undefined
  tenantPlan: 'starter' | 'pro' | 'enterprise'
  hasPlanFeature: (feature: string) => boolean
  /** Prueba vencida y sin plan pago → acceso revocado (bloquea la vista de staff) */
  tenantBlocked: boolean
}

// Re-export store types used in context for convenience
export type {
  Order, OrderItem, TableSession, MenuItem, Channel, OrderStatus,
  KitchenStatus, User, Ingredient, WaiterCall, Reward,
  AppliedReward, AppConfig, AuditLog, PaymentMethod, PaymentStatus,
  BillStatus, InventoryAdjustment, QRToken, Refund, CancelReason,
  DeliveryZone, MenuCategory, Extra, TableConfig, LoyaltyCustomer,
  WaitlistEntry,
}

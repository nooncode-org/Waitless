'use client'

import React from 'react'
import { useState } from 'react'
import '@/app/restaurante/admin.css'
import { MenuManager } from './menu-manager'
import { OrdersManager } from './orders-manager'
import { InventoryManager } from './inventory-manager'
import { UsersManager } from './users-manager'
import { ConfigManager } from './config-manager'
import { ReportsManager } from './reports-manager'
import { QRManager } from './qr-manager'
import { RefundsManager } from './refunds-manager'
import { DailyClosing } from './daily-closing'
import { TableHistory } from './table-history'
import { ExpoView } from './expo-view'
import { TablesManager } from './tables-manager'
import { AuditLogViewer } from './audit-log-viewer'
import { FeedbackManager } from './feedback-manager'
import { HealthPanel } from './health-panel'
import { useApp } from '@/lib/context'
import { canDo } from '@/lib/permissions'
import { WaitlistManager } from './waitlist-manager'
import { BackupManager } from './backup-manager'
import { AnalyticsDashboard } from './analytics-dashboard'
import { PushSubscribeButton } from '@/components/shared/push-subscribe-button'
import { BillingManager } from './billing-manager'
import { PaymentMethodsManager } from './payment-methods-manager'
import { PaymentsReviewManager } from './payments-review-manager'
import { SalesNotesManager } from './sales-notes-manager'
import { ConnectSettings } from './connect-settings'
import { LiquidacionView } from './liquidacion-view'
import { DisputesManager } from './disputes-manager'
import { CalendarEmbed } from './calendar-embed'
import { BillRequestAlerts } from './bill-request-alerts'

type AdminScreen = 'reports' | 'menu' | 'orders' | 'inventory' | 'users' | 'config' | 'qr' | 'refunds' | 'closing' | 'history' | 'expo' | 'tables' | 'audit' | 'feedback' | 'health' | 'waitlist' | 'backup' | 'analytics' | 'billing' | 'payment-methods' | 'payments-review' | 'sales-notes' | 'connect' | 'liquidacion' | 'disputes' | 'calendar'

interface AdminViewProps {
  onBack: () => void
  onLockProfile?: () => void
}

interface NavItem {
  id: AdminScreen
  label: string
  icon: string
  badge?: number
}

interface NavGroup {
  title: string
  items: NavItem[]
}

export function AdminView({ onBack, onLockProfile }: AdminViewProps) {
  const [screen, setScreen] = useState<AdminScreen>('reports')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { orders, refunds, waitlist, currentUser, config, hasPlanFeature } = useApp()
  const role = currentUser?.role

  const pendingOrdersCount = orders.filter(o => o.status !== 'entregado' && o.status !== 'cancelado').length
  const pendingRefundsCount = refunds.filter(r => r.status === 'pendiente').length
  const waitingCount = waitlist.filter(e => e.estado === 'esperando').length

  const allNavGroups: NavGroup[] = [
    {
      title: 'Operación',
      items: [
        { id: 'reports',  label: 'Dashboard',        icon: '↗' },
        { id: 'tables',   label: 'Mesas',             icon: '⊞' },
        { id: 'orders',   label: 'Pedidos',            icon: '◫', badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined },
        { id: 'closing',  label: 'Turno & Caja',       icon: '▤' },
        ...(canDo(role, 'validar_pago') ? [
          { id: 'payments-review' as AdminScreen, label: 'Pagos pendientes', icon: '$' },
          { id: 'sales-notes' as AdminScreen,     label: 'Notas de venta',   icon: '▤' },
        ] : []),
        ...(canDo(role, 'hacer_refund') && hasPlanFeature('refunds') ? [{ id: 'refunds' as AdminScreen, label: 'Reembolsos', icon: '↺', badge: pendingRefundsCount > 0 ? pendingRefundsCount : undefined }] : []),
        ...(hasPlanFeature('waitlist') ? [{ id: 'waitlist' as AdminScreen, label: 'Lista de espera', icon: '≡', badge: waitingCount > 0 ? waitingCount : undefined }] : []),
        { id: 'feedback',  label: 'Feedback',          icon: '◻' },
        ...(hasPlanFeature('analytics') ? [{ id: 'analytics' as AdminScreen, label: 'Analítica', icon: '↗' }] : []),
      ]
    },
    {
      title: 'Catálogo',
      items: [
        { id: 'menu',      label: 'Menú',       icon: '⊠' },
        { id: 'inventory', label: 'Inventario', icon: '◈' },
      ]
    },
    {
      title: 'Sistema',
      items: [
        { id: 'expo',    label: 'Expo / Entrega',        icon: '↑' },
        ...(canDo(role, 'gestionar_usuarios') ? [{ id: 'qr' as AdminScreen, label: 'Configurar Mesas', icon: '⊞' }] : []),
        { id: 'history', label: 'Historial de Mesas',     icon: '⏱' },
        ...(canDo(role, 'editar_config') ? [
          { id: 'payment-methods' as AdminScreen, label: 'Métodos de pago',    icon: '◫' },
          { id: 'backup' as AdminScreen,          label: 'Backup y Recuperación', icon: '◈' },
          { id: 'billing' as AdminScreen,         label: 'Plan & Facturación', icon: '◫' },
          { id: 'connect' as AdminScreen,         label: 'Stripe Connect',     icon: '⊕' },
          { id: 'liquidacion' as AdminScreen,     label: 'Liquidaciones',      icon: '↓' },
          { id: 'disputes' as AdminScreen,        label: 'Reclamos',           icon: '⚠' },
          { id: 'calendar' as AdminScreen,        label: 'Contacto',           icon: '✉' },
        ] : []),
      ]
    },
  ]

  const navGroups = allNavGroups.map(g => ({ ...g, items: g.items.filter(i => i.id) }))

  const getScreenTitle = () => {
    const allItems = navGroups.flatMap(g => g.items)
    const adminItems: NavItem[] = [
      { id: 'users', label: 'Usuarios', icon: '◎' },
      { id: 'audit', label: 'Auditoría', icon: '◉' },
      { id: 'health', label: 'Salud del sistema', icon: '♥' },
      { id: 'config', label: 'Configuración', icon: '⚙' },
    ]
    return [...allItems, ...adminItems].find(i => i.id === screen)?.label ?? 'Admin'
  }

  const navigate = (id: AdminScreen) => {
    setScreen(id)
    setMobileDrawerOpen(false)
  }

  const renderContent = () => (
    <>
      {screen === 'reports'         && <ReportsManager />}
      {screen === 'tables'          && <TablesManager />}
      {screen === 'closing'         && <DailyClosing />}
      {screen === 'orders'          && <OrdersManager />}
      {screen === 'menu'            && <MenuManager />}
      {screen === 'inventory'       && <InventoryManager />}
      {screen === 'refunds'         && <RefundsManager />}
      {screen === 'expo'            && <ExpoView />}
      {screen === 'qr'              && <QRManager />}
      {screen === 'history'         && <TableHistory />}
      {screen === 'audit'           && <AuditLogViewer />}
      {screen === 'users'           && <UsersManager />}
      {screen === 'config'          && <ConfigManager />}
      {screen === 'waitlist'        && <WaitlistManager />}
      {screen === 'feedback'        && <FeedbackManager />}
      {screen === 'analytics'       && <AnalyticsDashboard />}
      {screen === 'health'          && <HealthPanel />}
      {screen === 'backup'          && <BackupManager />}
      {screen === 'billing'         && <BillingManager />}
      {screen === 'payment-methods' && <PaymentMethodsManager />}
      {screen === 'payments-review' && <PaymentsReviewManager />}
      {screen === 'sales-notes'     && <SalesNotesManager />}
      {screen === 'connect'         && <ConnectSettings />}
      {screen === 'liquidacion'     && <LiquidacionView />}
      {screen === 'disputes'        && <DisputesManager />}
      {screen === 'calendar'        && <CalendarEmbed />}
    </>
  )

  const SidebarItem = ({ item }: { item: NavItem }) => {
    const active = screen === item.id
    return (
      <button
        onClick={() => navigate(item.id)}
        title={sidebarCollapsed ? item.label : undefined}
        className={['adm-nav-item', active ? 'active' : '', sidebarCollapsed ? 'justify-center' : ''].filter(Boolean).join(' ')}
        style={sidebarCollapsed ? { padding: '10px', justifyContent: 'center' } : undefined}
      >
        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, fontSize: 15 }}>{item.icon}</span>
        {!sidebarCollapsed && <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>}
        {!sidebarCollapsed && item.badge !== undefined && (
          <span className="adm-nav-badge">{item.badge}</span>
        )}
        {sidebarCollapsed && item.badge !== undefined && (
          <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 14, height: 14, padding: '0 2px', background: '#BEEBBE', color: '#0a3a0a', fontSize: 9, fontWeight: 700, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {item.badge}
          </span>
        )}
      </button>
    )
  }

  const SidebarContent = ({ inDrawer = false }: { inDrawer?: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand */}
      <div className="adm-sidebar-brand">
        <button
          onClick={() => navigate('reports')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 4px', borderRadius: 10 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <div className="adm-sidebar-logo">
            {config.restaurantName ? config.restaurantName.slice(0, 2).toLowerCase() : 'W'}
          </div>
          {(!sidebarCollapsed || inDrawer) && (
            <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
              <div className="adm-sidebar-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {config.restaurantName ?? 'WAITLESS'}
              </div>
              <div className="adm-sidebar-sub">Panel admin</div>
            </div>
          )}
        </button>
      </div>

      {/* Nav groups */}
      <nav className="adm-sidebar-nav">
        {navGroups.map(group => (
          <div key={group.title}>
            {(!sidebarCollapsed || inDrawer) && <div className="adm-nav-section">{group.title}</div>}
            {sidebarCollapsed && !inDrawer && <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '12px 0 8px' }} />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {group.items.map(item => <SidebarItem key={item.id} item={item} />)}
            </div>
          </div>
        ))}

        {/* Admin group */}
        {(canDo(role, 'gestionar_usuarios') || canDo(role, 'editar_config')) && (
          <div>
            {(!sidebarCollapsed || inDrawer) && <div className="adm-nav-section">Administración</div>}
            {sidebarCollapsed && !inDrawer && <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '12px 0 8px' }} />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {canDo(role, 'gestionar_usuarios') && (
                <>
                  <SidebarItem item={{ id: 'users', label: 'Usuarios',   icon: '◎' }} />
                  <SidebarItem item={{ id: 'audit', label: 'Auditoría',  icon: '◉' }} />
                </>
              )}
              <SidebarItem item={{ id: 'health', label: 'Salud del sistema', icon: '♥' }} />
            </div>
          </div>
        )}

        {inDrawer && canDo(role, 'editar_config') && (
          <div style={{ marginTop: 4 }}>
            <div className="adm-nav-section">Configuración</div>
            <SidebarItem item={{ id: 'config', label: 'Configuración', icon: '⚙' }} />
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="adm-sidebar-footer">
        {(!sidebarCollapsed || inDrawer) && (
          <div className="adm-sidebar-status" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="adm-live-dot" style={{ width: 6, height: 6 }} />
              <span className="adm-mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.65)' }}>En línea</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'var(--adm-font)' }}>
              {config.restaurantName ?? 'WAITLESS'}
            </div>
            <div className="adm-mono" style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>Panel activo</div>
          </div>
        )}

        <PushSubscribeButton collapsed={sidebarCollapsed && !inDrawer} />

        {inDrawer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
            {onLockProfile && (
              <button onClick={onLockProfile} className="adm-nav-item">
                <span style={{ fontSize: 15, flexShrink: 0 }}>⊙</span>
                <span>Cerrar perfil</span>
              </button>
            )}
            <button
              onClick={onBack}
              className="adm-nav-item"
              style={{ color: 'rgba(248,113,113,0.85)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgb(248,113,113)'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(248,113,113,0.85)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span style={{ fontSize: 15, flexShrink: 0 }}>←</span>
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}

        {!inDrawer && (
          <button
            onClick={() => setSidebarCollapsed(v => !v)}
            title={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
            className="adm-nav-item"
            style={{ marginTop: 4 }}
          >
            <span style={{ fontSize: 15, flexShrink: 0, display: 'inline-block', transition: 'transform 0.2s', transform: sidebarCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}>›</span>
            {!sidebarCollapsed && <span>Contraer</span>}
          </button>
        )}
      </div>
    </div>
  )

  const userInitial = currentUser?.nombre?.charAt(0).toUpperCase() ?? 'A'

  return (
    <div className="adm-shell" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif" }}>

      {/* Aviso flotante: mesas que pidieron la cuenta (visible en todo el panel) */}
      <BillRequestAlerts />

      {/* ── DESKTOP layout ─────────────────────────────────────────────────── */}
      <div className="hidden md:flex" style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
        <aside className="adm-sidebar" style={{ width: sidebarCollapsed ? 64 : 240 }}>
          <SidebarContent />
        </aside>

        <div className="adm-main">
          <header className="adm-topbar">
            <div>
              <div className="adm-topbar-title">{getScreenTitle()}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 10px 0 6px', border: '1px solid #E5E5E5', borderRadius: 999, background: '#fff', cursor: 'pointer', fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#000')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#E5E5E5')}
                >
                  <div className="adm-avatar">{userInitial}</div>
                  <div style={{ textAlign: 'left', lineHeight: 1.25 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#000', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentUser?.nombre ?? 'Admin'}
                    </div>
                    <div className="adm-mono" style={{ fontSize: 9.5, color: 'rgba(0,0,0,0.55)', textTransform: 'capitalize' }}>
                      {currentUser?.role ?? 'admin'}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', flexShrink: 0 }}>▾</span>
                </button>

                {userMenuOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setUserMenuOpen(false)} />
                    <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, width: 210, background: '#fff', borderRadius: 14, border: '1px solid #E5E5E5', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden', padding: '6px 0' }}>
                      <div style={{ padding: '10px 16px', borderBottom: '1px solid #EFEFEF', marginBottom: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{currentUser?.nombre ?? 'Administrador'}</div>
                        <div className="adm-mono" style={{ fontSize: 10, color: 'rgba(0,0,0,0.45)', textTransform: 'capitalize', marginTop: 1 }}>{currentUser?.role ?? 'admin'}</div>
                      </div>
                      {[
                        canDo(role, 'gestionar_usuarios') && { label: 'Usuarios',          icon: '◎', screen: 'users' as AdminScreen },
                        canDo(role, 'gestionar_usuarios') && { label: 'Auditoría',          icon: '◉', screen: 'audit' as AdminScreen },
                        { label: 'Salud del sistema', icon: '♥', screen: 'health' as AdminScreen },
                        canDo(role, 'editar_config') && { label: 'Configuración', icon: '⚙', screen: 'config' as AdminScreen },
                      ].filter(Boolean).map((item, i) => {
                        if (!item) return null
                        const { label, icon, screen: sc } = item as { label: string; icon: string; screen: AdminScreen }
                        return (
                          <button key={i} onClick={() => { navigate(sc); setUserMenuOpen(false) }}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: '#000', textAlign: 'left' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                          >
                            <span style={{ color: '#909090', fontSize: 14 }}>{icon}</span> {label}
                          </button>
                        )
                      })}
                      <div style={{ borderTop: '1px solid #EFEFEF', margin: '4px 0' }} />
                      {onLockProfile && (
                        <button onClick={() => { onLockProfile(); setUserMenuOpen(false) }}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: '#000', textAlign: 'left' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          <span style={{ color: '#909090', fontSize: 14 }}>⊙</span> Cerrar perfil
                        </button>
                      )}
                      <button onClick={onBack}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', textAlign: 'left' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <span style={{ fontSize: 14 }}>←</span> Cerrar sesión
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          <main style={{ flex: 1, overflow: 'auto', padding: 20, background: '#F7F7F5' }}>
            <div style={{ background: '#fff', borderRadius: 16, minHeight: '100%', padding: 20, border: '1px solid #E5E5E5' }}>
              {renderContent()}
            </div>
          </main>
        </div>
      </div>

      {/* ── MOBILE layout ──────────────────────────────────────────────────── */}
      <div className="md:hidden" style={{ minHeight: '100vh', background: '#F7F7F5', flexDirection: 'column', width: '100%' }}>

        <header style={{ position: 'sticky', top: 0, zIndex: 50, padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#000', flexShrink: 0 }}>
          <button
            onClick={() => navigate('reports')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <div className="adm-sidebar-logo" style={{ width: 28, height: 28, fontSize: 12 }}>
              {config.restaurantName ? config.restaurantName.slice(0, 2).toLowerCase() : 'W'}
            </div>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif" }}>
              {config.restaurantName ?? 'WAITLESS'}
            </span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {pendingOrdersCount > 0 && (
              <button
                onClick={() => navigate('orders')}
                style={{ position: 'relative', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 18 }}
              >
                ◑
                <span style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, background: '#BEEBBE', color: '#0a3a0a', fontSize: 9, fontWeight: 700, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {pendingOrdersCount}
                </span>
              </button>
            )}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 20 }}
            >
              ≡
            </button>
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto', padding: '12px 12px 80px' }}>
          <div style={{ background: '#fff', borderRadius: 14, minHeight: '100%', padding: 12, border: '1px solid #E5E5E5' }}>
            {renderContent()}
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: '#fff', borderTop: '1px solid #E5E5E5', display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {[
            { id: 'reports' as AdminScreen, label: 'Dashboard', icon: '↗' },
            { id: 'tables'  as AdminScreen, label: 'Mesas',     icon: '⊞' },
            { id: 'orders'  as AdminScreen, label: 'Pedidos',   icon: '◫', badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined },
            { id: 'closing' as AdminScreen, label: 'Caja',      icon: '▤' },
            { id: 'menu'    as AdminScreen, label: 'Menú',      icon: '⊠' },
          ].map(item => {
            const active = screen === item.id
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: '10px 0', minHeight: 52, gap: 4,
                  position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
                  color: active ? '#000' : '#909090',
                }}
              >
                {active && <span style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 32, height: 2.5, background: '#000', borderRadius: 999 }} />}
                <div style={{ position: 'relative', fontSize: 20 }}>
                  {item.icon}
                  {item.badge && (
                    <span style={{ position: 'absolute', top: -6, right: -8, minWidth: 16, height: 16, padding: '0 2px', background: '#BEEBBE', color: '#0a3a0a', fontSize: 9, fontWeight: 700, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif" }}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Mobile Drawer */}
        {mobileDrawerOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setMobileDrawerOpen(false)} />
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 280, maxWidth: 'calc(100vw - 48px)', display: 'flex', flexDirection: 'column', background: '#000', boxShadow: '-8px 0 32px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 56, borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="adm-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{userInitial}</div>
                  <div>
                    <div style={{ color: '#fff', fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>{currentUser?.nombre ?? 'Admin'}</div>
                    <div className="adm-mono" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'capitalize' }}>{currentUser?.role ?? 'admin'}</div>
                  </div>
                </div>
                <button onClick={() => setMobileDrawerOpen(false)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', borderRadius: 8, fontSize: 18 }}>
                  ×
                </button>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <SidebarContent inDrawer />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AppProvider, useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { Toaster } from '@/components/ui/sonner'
import { Spinner } from '@/components/ui/spinner'
import { LoginScreen } from '@/components/auth/login-screen'
import { ProfilePicker } from '@/components/auth/profile-picker'
import { LandingPage } from '@/components/landing/landing-page'
import { ClienteView } from '@/components/cliente/cliente-view'
import { ClienteAuthScreen } from '@/components/cliente/cliente-auth-screen'
import { MeseroView } from '@/components/mesero/mesero-view'
import { KDSView } from '@/components/kds/kds-view'
import { AdminView } from '@/components/admin/admin-view'
import { TrialBlocked } from '@/components/admin/trial-blocked'
import { RepartidorView } from '@/components/repartidor/repartidor-view'
import type { UserRole } from '@/lib/store'
import type { TenantBranding } from '@/lib/tenant-server'
import type { ClienteUser } from '@/lib/cliente-auth'

type AppView = 'landing' | 'login' | 'profile-picker' | 'cliente-auth' | 'cliente' | 'admin' | 'mesero' | 'cocina' | 'repartidor'

interface AppContentProps {
  initialBranding: TenantBranding
  startAtLogin?: boolean
}

function AppContent({ initialBranding, startAtLogin }: AppContentProps) {
  const { currentUser, deviceUser, setCurrentTable, logout, lockProfile, validateTableQR, tenantBlocked, config } = useApp()
  const [view, setView] = useState<AppView>(startAtLogin ? 'login' : 'landing')
  const [clienteMesa, setClienteMesa] = useState<number | null>(null)
  const [clienteUser, setClienteUser] = useState<ClienteUser | null>(null)
  const [qrError, setQrError] = useState<string | null>(null)
  // Acceso por QR en curso: mientras se valida el token, mostramos "cargando"
  // (no la pantalla de login), porque /restaurante es también la ruta de staff.
  const [qrPending, setQrPending] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const p = new URLSearchParams(window.location.search)
    return !!p.get('mesa') && !!p.get('token')
  })
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const oauthHandled = useRef(false)

  // Redirect recovery links directly to /reset-password BEFORE first paint.
  // Supabase sends the token as a URL hash; detect it synchronously so the
  // landing page never flickers on screen.
  useLayoutEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      window.location.replace('/reset-password' + window.location.hash)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initializing mounted flag after hydration, standard SSR pattern
    setMounted(true)
  }, [])

  // Handle Google OAuth redirect to root (when /auth/callback isn't in Supabase's Redirect URLs).
  // Supabase processes the hash tokens automatically; we just need to handle the resulting session.
  useEffect(() => {
    if (oauthHandled.current) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Password recovery link lands on root URL — redirect to the reset page
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/reset-password')
        return
      }
      if (event !== 'SIGNED_IN' || !session || oauthHandled.current) return
      // Only act if context hasn't already resolved the user
      if (currentUser) return
      oauthHandled.current = true
      subscription.unsubscribe()

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, tenant_id, role, activo')
        .eq('id', session.user.id)
        .single()

      if (profile?.tenant_id) {
        // Existing registered user — context will set currentUser via initAuth
        // Just force a reload so context picks up the new session
        window.location.reload()
      } else {
        // New user — send to registration
        const nombre = session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? ''
        const email = session.user.email ?? ''
        router.replace(`/registro/completar?${new URLSearchParams({ nombre, email })}`)
      }
    })
    return () => subscription.unsubscribe()
  }, [currentUser, router])

  // Auto-open login when coming from explore page via ?login=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('login') === '1' && view === 'landing') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: open login from URL param on mount
      setView('login')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- only run once on mount

  // Acceso por QR: requiere ?mesa=N&token=XXX — token validado contra Supabase (P0-6)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const mesa = params.get('mesa')
    const token = params.get('token')
    if (!mesa) return

    const mesaNum = parseInt(mesa)
    if (isNaN(mesaNum) || mesaNum <= 0) return

    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- setting error state from async QR validation inside effect, intentional
      setQrError('Acceso denegado: token QR requerido. Escaneá el código QR de tu mesa.')
      setQrPending(false)
      return
    }

    // Safety timeout: que el acceso por QR nunca quede colgado en "cargando".
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      setQrError('No se pudo validar el QR (la conexión tardó demasiado). Reintentá.')
      setQrPending(false)
    }, 12000)

    // Validar token contra Supabase
    validateTableQR(token).then(({ valid, mesa: mesaValidada }) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (!valid || mesaValidada !== mesaNum) {
        setQrError('QR inválido o expirado. Pedí al mozo que genere un nuevo código.')
        setQrPending(false)
        return
      }
      setQrError(null)
      setClienteMesa(mesaNum)
      setCurrentTable(mesaNum)
      setClienteUser(null)
      setView('cliente')
      setQrPending(false)
    }).catch(() => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      setQrError('No se pudo validar el QR. Reintentá.')
      setQrPending(false)
    })

    return () => clearTimeout(timer)
  }, [setCurrentTable, validateTableQR])

  // Mapeo de rol a vista
  const roleToView = (role: UserRole): AppView => {
    if (role === 'admin' || role === 'manager') return 'admin'
    return role as AppView
  }

  // Auto-redirect según estado de auth:
  // - deviceUser sin currentUser → pantalla de bloqueo (perfil picker)
  // - currentUser activo → vista del rol correspondiente
  useEffect(() => {
    if (currentUser && (view === 'login' || view === 'landing' || view === 'profile-picker')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reactive navigation on auth state change
      setView(roleToView(currentUser.role))
    }
  }, [currentUser, view])

  // After Google OAuth, initAuth sets deviceUser but not currentUser (no saved localStorage profile).
  // Transition to profile-picker so the user can select/confirm their active profile.
  useEffect(() => {
    if (deviceUser && !currentUser && (view === 'login' || view === 'landing')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: auto-advance after OAuth session restore
      setView('profile-picker')
    }
  }, [deviceUser, currentUser, view])

  const handleLoginSuccess = (role: UserRole) => {
    setView(roleToView(role))
  }

  const handleLogout = async () => {
    setView(startAtLogin ? 'login' : 'landing')
    setClienteMesa(null)
    window.history.replaceState({}, '', window.location.pathname)
    await logout()
  }

  const handleLockProfile = () => {
    lockProfile()
    setView('profile-picker')
  }

  const handleClienteAuthSuccess = (user: ClienteUser | null) => {
    setClienteUser(user)
    setView('cliente')
  }

  const handleClienteExit = () => {
    setClienteMesa(null)
    setClienteUser(null)
    setCurrentTable(null)
    setView('landing')
    window.history.replaceState({}, '', window.location.pathname)
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="size-8 text-primary" />
      </div>
    )
  }

  // Acceso por QR en curso: spinner directo, sin pasar por login
  if (qrPending && !qrError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Spinner className="size-8 text-primary" />
        <p className="text-xs text-muted-foreground tracking-widest uppercase">Abriendo tu mesa…</p>
      </div>
    )
  }

  // QR inválido o expirado
  if (qrError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-2xl mb-3">⚠️</p>
          <p className="font-semibold text-foreground mb-1">Acceso denegado</p>
          <p className="text-sm text-muted-foreground">{qrError}</p>
        </div>
      </div>
    )
  }

  // Vista cliente (acceso por QR — sin fricción de login)
  if (view === 'cliente' && clienteMesa) {
    return <ClienteView mesa={clienteMesa} onBack={handleClienteExit} clienteUser={clienteUser} />
  }

  // Landing pública
  if (view === 'landing') {
    return <LandingPage />
  }

  // Pantalla de login — recibe branding server-side para renderizar sin flash
  if (view === 'login') {
    return <LoginScreen
      onLoginSuccess={handleLoginSuccess}
      onBack={startAtLogin ? () => router.replace('/') : () => setView('landing')}
      initialBranding={initialBranding}
    />
  }

  // Pantalla de bloqueo: sesión de dispositivo activa pero sin perfil seleccionado
  if (view === 'profile-picker') {
    return <ProfilePicker onLogout={handleLogout} />
  }

  // Estado transitorio: view ya cambió a rol pero currentUser del contexto aún no propagó
  // (race entre setState del provider y setView del componente hijo en React 18)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="size-8 text-primary" />
      </div>
    )
  }

  // Prueba vencida sin plan pago → acceso revocado para todo el staff.
  // (El comensal por QR ya retornó antes, así que no se bloquea.)
  if (tenantBlocked) {
    return <TrialBlocked onLogout={handleLogout} restaurantName={config.restaurantName} />
  }

  // Vistas autenticadas por rol
  switch (view) {
    case 'admin':
      // FIX P0.5: admin Y manager usan la vista admin (manager tiene permisos acotados dentro)
      if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
        setView('profile-picker')
        return null
      }
      return <AdminView onBack={handleLogout} onLockProfile={handleLockProfile} />

    case 'mesero':
      if (currentUser.role !== 'mesero') {
        setView('profile-picker')
        return null
      }
      return <MeseroView onBack={handleLogout} onLockProfile={handleLockProfile} />

    case 'cocina':
      if (currentUser.role !== 'cocina') {
        setView('profile-picker')
        return null
      }
      return <KDSView onBack={handleLogout} onLockProfile={handleLockProfile} />

    case 'repartidor':
      if (currentUser.role !== 'repartidor') {
        setView('profile-picker')
        return null
      }
      return <RepartidorView onBack={handleLogout} />

    default:
    return <LandingPage />
  }
}

interface AppClientRootProps {
  initialBranding: TenantBranding
  startAtLogin?: boolean
}

export function AppClientRoot({ initialBranding, startAtLogin }: AppClientRootProps) {
  return (
    <AppProvider>
      <AppContent initialBranding={initialBranding} startAtLogin={startAtLogin} />
      <Toaster position="top-center" richColors />
    </AppProvider>
  )
}

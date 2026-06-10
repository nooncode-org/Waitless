'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { GoogleAuthButton } from '@/components/ui/google-auth-button'
import { EmailVerification } from '@/components/auth/email-verification'
import type { UserRole } from '@/lib/store'
import type { TenantBranding } from '@/lib/tenant-server'

const FONT = "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace"
const MINT = '#BEEBBE'
const MINT_DEEP = '#0a3a0a'

interface LoginScreenProps {
  onLoginSuccess: (role: UserRole) => void
  onBack?: () => void
  initialBranding?: TenantBranding
}

export function LoginScreen({ onLoginSuccess, onBack }: LoginScreenProps) {
  const { login } = useApp()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  // Cuenta con email sin verificar: se muestra la pantalla de verificación.
  const [unverified, setUnverified] = useState<string | null>(null)
  // Recuperación de contraseña (vía Supabase → email del usuario de Auth).
  const [forgot, setForgot] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoverySent, setRecoverySent] = useState(false)
  const [recoveryError, setRecoveryError] = useState('')
  const [recoveryLoading, setRecoveryLoading] = useState(false)

  const handleRecovery = async () => {
    const mail = recoveryEmail.trim().toLowerCase()
    if (!mail) return
    setRecoveryError('')
    setRecoveryLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(mail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) setRecoveryError('No se pudo enviar el enlace. Verificá el email.')
      else setRecoverySent(true)
    } catch {
      setRecoveryError('Error de conexión. Intentá de nuevo.')
    } finally {
      setRecoveryLoading(false)
    }
  }

  const submitLogin = async (): Promise<'ok' | 'unverified' | 'invalid' | 'error'> => {
    try {
      const result = await login(username.trim(), password)
      if (result.status === 'ok') {
        onLoginSuccess(result.user.role)
        return 'ok'
      }
      if (result.status === 'unverified') {
        setUnverified(result.identifier)
        return 'unverified'
      }
      setError('Usuario o contraseña incorrectos')
      return 'invalid'
    } catch {
      setError('Error de conexión. Verificá tu red e intentá de nuevo.')
      return 'error'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    await submitLogin()
    setIsLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', fontFamily: FONT }}>

      {/* Left panel — black brand */}
      <div style={{
        width: 420,
        flexShrink: 0,
        background: '#000',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        padding: '40px 36px',
        position: 'relative',
        overflow: 'hidden',
      }} className="login-left-panel">
        {/* Decorative W */}
        <span style={{
          position: 'absolute', bottom: -48, right: -32,
          fontFamily: FONT, fontWeight: 700, fontSize: 280,
          color: 'rgba(255,255,255,0.04)', lineHeight: 1,
          pointerEvents: 'none', userSelect: 'none',
        }}>W</span>

        {/* Marca genérica Waitless — el login no muestra branding del restaurante;
            la marca del negocio aparece dentro del panel una vez logueado. */}
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 44, height: 44, background: MINT, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 22, letterSpacing: '-0.04em', color: MINT_DEEP,
            marginBottom: 16,
          }}>
            W
          </div>
          <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-0.045em', lineHeight: 1 }}>WAITLESS</div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(255,255,255,0.45)', marginTop: 4, letterSpacing: '0.04em' }}>Panel de administración</div>
        </div>

        {/* Taglines */}
        <div style={{ marginTop: 'auto', position: 'relative' }}>
          {['Mesa → Pedido → Cocina → Cobro', 'Sin fricciones. Sin errores.', 'Operación impecable primero.'].map((line, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', letterSpacing: '-0.01em' }}>{line}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)', fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.3)', position: 'relative' }}>
          WAITLESS v10.2 · Plataforma operativa
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', position: 'relative' }}>
        {onBack && (
          <button onClick={onBack} style={{
            position: 'absolute', top: 24, left: 24,
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: FONT, fontSize: 12.5, color: 'rgba(0,0,0,0.45)',
            fontWeight: 500,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Inicio
          </button>
        )}

        {unverified ? (
          <EmailVerification
            identifier={unverified}
            onVerified={async () => { setUnverified(null); setError(''); await submitLogin() }}
            onBack={() => { setUnverified(null); setError('') }}
          />
        ) : (
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 34, letterSpacing: '-0.045em', lineHeight: 0.95, marginBottom: 8 }}>
              Iniciar sesión.
            </h1>
            <p style={{ fontSize: 13.5, color: 'rgba(0,0,0,0.55)', fontFamily: FONT }}>
              Ingresá tus credenciales para acceder al panel.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#000' }}>
                Email o usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Email o usuario"
                autoComplete="username"
                required
                disabled={isLoading}
                style={{
                  height: 46, padding: '0 14px',
                  border: '1px solid rgba(0,0,0,0.15)', borderRadius: 10,
                  fontSize: 14.5, fontFamily: FONT, outline: 'none',
                  background: '#FAFAFA', color: '#000',
                  width: '100%', boxSizing: 'border-box' as const,
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#000' }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  style={{
                    height: 46, padding: '0 42px 0 14px',
                    border: '1px solid rgba(0,0,0,0.15)', borderRadius: 10,
                    fontSize: 14.5, fontFamily: FONT, outline: 'none',
                    background: '#FAFAFA', color: '#000',
                    width: '100%', boxSizing: 'border-box' as const,
                  }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center' }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    {showPassword
                      ? <><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></>
                      : <><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/></>
                    }
                  </svg>
                </button>
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#c0392b', background: 'rgba(192,57,43,0.07)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M6.5 3.5v3.5M6.5 8.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !username.trim() || !password}
              style={{
                height: 46, width: '100%',
                background: isLoading || !username.trim() || !password ? 'rgba(0,0,0,0.35)' : '#000',
                color: '#fff', border: 'none', borderRadius: 999,
                fontSize: 14, fontWeight: 700, fontFamily: FONT,
                cursor: isLoading || !username.trim() || !password ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.15s',
              }}
            >
              {isLoading
                ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                : 'Ingresar →'
              }
            </button>
          </form>

          {/* ¿Olvidaste tu contraseña? — recuperación vía Supabase */}
          <div style={{ marginTop: 12 }}>
            {!forgot ? (
              <button
                type="button"
                onClick={() => { setForgot(true); setRecoveryEmail(username.includes('@') ? username : ''); setRecoverySent(false); setRecoveryError('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, fontSize: 12.5, color: 'rgba(0,0,0,0.5)', padding: 0, textDecoration: 'underline' }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            ) : recoverySent ? (
              <div style={{ fontSize: 12.5, color: MINT_DEEP, background: 'rgba(190,235,190,0.18)', border: `1px solid ${MINT}`, borderRadius: 10, padding: '10px 14px', fontFamily: FONT }}>
                Si ese email tiene una cuenta, te enviamos un enlace para restablecer la contraseña. Revisá tu correo (y la carpeta de spam).
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', margin: 0, fontFamily: FONT }}>
                  Ingresá tu email y te mandamos un enlace para restablecerla.
                </p>
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={e => setRecoveryEmail(e.target.value)}
                  placeholder="tu@email.com"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleRecovery() } }}
                  style={{ height: 42, padding: '0 14px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 10, fontSize: 14, fontFamily: FONT, outline: 'none', background: '#FAFAFA', color: '#000', width: '100%', boxSizing: 'border-box' }}
                />
                {recoveryError && (
                  <div style={{ fontSize: 12, color: '#c0392b', fontFamily: FONT }}>{recoveryError}</div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleRecovery}
                    disabled={recoveryLoading || !recoveryEmail.trim()}
                    style={{ flex: 1, height: 42, borderRadius: 999, border: 'none', background: recoveryLoading || !recoveryEmail.trim() ? 'rgba(0,0,0,0.35)' : '#000', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: recoveryLoading || !recoveryEmail.trim() ? 'not-allowed' : 'pointer' }}
                  >
                    {recoveryLoading ? 'Enviando…' : 'Enviar enlace'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setForgot(false); setRecoveryError('') }}
                    style={{ height: 42, padding: '0 14px', borderRadius: 999, border: '1px solid #E5E5E5', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <GoogleAuthButton label="Continuar con Google" />
          </div>

          <p style={{ marginTop: 20, textAlign: 'center', fontSize: 12.5, color: 'rgba(0,0,0,0.45)', fontFamily: FONT }}>
            ¿No tenés cuenta?{' '}
            <Link href="/registro" style={{ color: '#000', fontWeight: 700, textDecoration: 'none' }}>
              Registrá tu negocio
            </Link>
          </p>
        </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(0,0,0,0.3); }
        input:focus { border-color: rgba(0,0,0,0.5) !important; background: #fff !important; }
        @media (max-width: 768px) { .login-left-panel { display: none !important; } }
      `}</style>
    </div>
  )
}

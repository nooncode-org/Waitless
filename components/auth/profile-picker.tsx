'use client'

import React, { useState } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import type { User } from '@/lib/store'

const FONT = "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace"
const MINT = '#BEEBBE'
const MINT_DEEP = '#0a3a0a'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Manager',
  mesero: 'Mesero',
  cocina: 'Cocina',
  repartidor: 'Repartidor',
}

interface ProfilePickerProps {
  onLogout: () => void
}

type Screen = 'picker' | 'password' | 'recovery'

export function ProfilePicker({ onLogout }: ProfilePickerProps) {
  const { users, config, switchProfile, deviceUser, resumeDeviceProfile } = useApp()
  const [screen, setScreen] = useState<Screen>('picker')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoverySent, setRecoverySent] = useState(false)
  const [recoveryError, setRecoveryError] = useState('')

  const activeUsers = users.filter(u => u.activo)

  const logoUrl = config.logoUrl
  const restaurantName = config.restaurantName ?? 'WAITLESS'

  const handleSelectUser = (user: User) => {
    // Tu propio perfil (el del dispositivo, ya autenticado por contraseña o Google):
    // entrar directo, sin pedir contraseña. Las cuentas de Google no tienen
    // contraseña, así que esta es la única forma de que pasen el lock-screen.
    if (deviceUser && user.id === deviceUser.id) {
      resumeDeviceProfile()
      return
    }
    setSelectedUser(user)
    setPassword('')
    setError('')
    setScreen('password')
  }

  const handleBack = () => {
    setSelectedUser(null)
    setPassword('')
    setError('')
    setScreen('picker')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !password.trim()) return
    setError('')
    setIsLoading(true)
    try {
      const user = await switchProfile(selectedUser.username, password.trim())
      if (!user) setError('Contraseña incorrecta')
    } catch {
      setError('Error de conexión. Verificá tu red.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recoveryEmail.trim()) return
    setRecoveryError('')
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) setRecoveryError('No se pudo enviar el correo. Verificá el email.')
      else setRecoverySent(true)
    } catch {
      setRecoveryError('Error de conexión. Intentá de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', fontFamily: FONT }}>

      {/* Left panel */}
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
      }} className="pp-left-panel">
        <span style={{
          position: 'absolute', bottom: -48, right: -32,
          fontFamily: FONT, fontWeight: 700, fontSize: 280,
          color: 'rgba(255,255,255,0.04)', lineHeight: 1,
          pointerEvents: 'none', userSelect: 'none',
        }}>W</span>

        <div style={{ position: 'relative' }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={restaurantName} style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', marginBottom: 16 }} />
          ) : (
            <div style={{
              width: 44, height: 44, background: MINT, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 20, letterSpacing: '-0.04em', color: MINT_DEEP,
              marginBottom: 16,
            }}>
              {restaurantName.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-0.045em', lineHeight: 1 }}>{restaurantName}</div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(255,255,255,0.45)', marginTop: 4, letterSpacing: '0.04em' }}>Panel admin · WAITLESS</div>
        </div>

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

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', position: 'relative' }}>

        {/* Profile grid */}
        {screen === 'picker' && (
          <div style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 34, letterSpacing: '-0.045em', lineHeight: 0.95, marginBottom: 8 }}>
                ¿Quién sos?
              </h1>
              <p style={{ fontSize: 13.5, color: 'rgba(0,0,0,0.55)' }}>
                Seleccioná tu perfil para continuar
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {activeUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                    padding: '20px 12px', borderRadius: 16, border: '1px solid rgba(0,0,0,0.12)',
                    background: '#fff', cursor: 'pointer', textAlign: 'center',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    fontFamily: FONT,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#000'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.12)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: '#000', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 700, flexShrink: 0,
                  }}>
                    {user.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#000', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>{user.nombre}</p>
                    <p style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(0,0,0,0.45)', marginTop: 3 }}>{ROLE_LABELS[user.role] ?? user.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Password form */}
        {screen === 'password' && selectedUser && (
          <div style={{ width: '100%', maxWidth: 360 }}>
            <button
              onClick={handleBack}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 32,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: FONT, fontSize: 12.5, color: 'rgba(0,0,0,0.45)', fontWeight: 500,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Volver
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, border: '1px solid rgba(0,0,0,0.1)', marginBottom: 28, background: '#FAFAFA' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
                {selectedUser.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#000' }}>{selectedUser.nombre}</p>
                <p style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(0,0,0,0.45)', marginTop: 2 }}>{ROLE_LABELS[selectedUser.role] ?? selectedUser.role}</p>
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 34, letterSpacing: '-0.045em', lineHeight: 0.95, marginBottom: 8 }}>
                Ingresá tu clave
              </h1>
              <p style={{ fontSize: 13.5, color: 'rgba(0,0,0,0.55)' }}>Verificá tu identidad para continuar</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Contraseña"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                  disabled={isLoading}
                  required
                  style={{
                    height: 46, padding: '0 42px 0 14px',
                    border: '1px solid rgba(0,0,0,0.15)', borderRadius: 10,
                    fontSize: 14.5, fontFamily: FONT, outline: 'none',
                    background: '#FAFAFA', color: '#000',
                    width: '100%', boxSizing: 'border-box',
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

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#c0392b', background: 'rgba(192,57,43,0.07)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M6.5 3.5v3.5M6.5 8.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !password.trim()}
                style={{
                  height: 46, width: '100%',
                  background: isLoading || !password.trim() ? 'rgba(0,0,0,0.35)' : '#000',
                  color: '#fff', border: 'none', borderRadius: 999,
                  fontSize: 14, fontWeight: 700, fontFamily: FONT,
                  cursor: isLoading || !password.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background 0.15s',
                }}
              >
                {isLoading
                  ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'pp-spin 0.7s linear infinite' }} />
                  : 'Ingresar →'
                }
              </button>

              <button
                type="button"
                onClick={() => { setScreen('recovery'); setRecoveryEmail(''); setRecoverySent(false); setRecoveryError('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, fontSize: 12.5, color: 'rgba(0,0,0,0.45)', textAlign: 'center', paddingTop: 4 }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </form>
          </div>
        )}

        {/* Recovery form */}
        {screen === 'recovery' && (
          <div style={{ width: '100%', maxWidth: 360 }}>
            <button
              onClick={() => setScreen(selectedUser ? 'password' : 'picker')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 32,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: FONT, fontSize: 12.5, color: 'rgba(0,0,0,0.45)', fontWeight: 500,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Volver
            </button>

            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 34, letterSpacing: '-0.045em', lineHeight: 0.95, marginBottom: 8 }}>
                Recuperar acceso
              </h1>
              <p style={{ fontSize: 13.5, color: 'rgba(0,0,0,0.55)', lineHeight: 1.5 }}>
                Ingresá el email con el que te registraste y te enviamos un enlace para crear una nueva contraseña.
              </p>
            </div>

            {recoverySent ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: MINT, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke={MINT_DEEP} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#000', marginBottom: 6 }}>¡Correo enviado!</p>
                <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', lineHeight: 1.5 }}>
                  Revisá tu bandeja en <strong style={{ color: '#000' }}>{recoveryEmail}</strong>.<br/>El enlace expira en 1 hora.
                </p>
                <button
                  onClick={() => setScreen(selectedUser ? 'password' : 'picker')}
                  style={{ marginTop: 20, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, fontSize: 12.5, color: 'rgba(0,0,0,0.45)' }}
                >
                  Volver al inicio
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecovery} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={recoveryEmail}
                  onChange={e => setRecoveryEmail(e.target.value)}
                  autoFocus
                  disabled={isLoading}
                  required
                  style={{
                    height: 46, padding: '0 14px',
                    border: '1px solid rgba(0,0,0,0.15)', borderRadius: 10,
                    fontSize: 14.5, fontFamily: FONT, outline: 'none',
                    background: '#FAFAFA', color: '#000',
                    width: '100%', boxSizing: 'border-box',
                  }}
                />

                {recoveryError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#c0392b', background: 'rgba(192,57,43,0.07)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M6.5 3.5v3.5M6.5 8.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    {recoveryError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !recoveryEmail.trim()}
                  style={{
                    height: 46, width: '100%',
                    background: isLoading || !recoveryEmail.trim() ? 'rgba(0,0,0,0.35)' : '#000',
                    color: '#fff', border: 'none', borderRadius: 999,
                    fontSize: 14, fontWeight: 700, fontFamily: FONT,
                    cursor: isLoading || !recoveryEmail.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'background 0.15s',
                  }}
                >
                  {isLoading
                    ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'pp-spin 0.7s linear infinite' }} />
                    : 'Enviar enlace →'
                  }
                </button>
              </form>
            )}
          </div>
        )}

        {/* Logout */}
        <button
          onClick={onLogout}
          style={{
            position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: FONT, fontSize: 12, color: 'rgba(0,0,0,0.35)',
            whiteSpace: 'nowrap',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h3M9 9l3-3-3-3M12 6H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Cerrar sesión del restaurante
        </button>
      </div>

      <style>{`
        @keyframes pp-spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(0,0,0,0.3); }
        input:focus { border-color: rgba(0,0,0,0.5) !important; background: #fff !important; }
        @media (max-width: 768px) { .pp-left-panel { display: none !important; } }
      `}</style>
    </div>
  )
}

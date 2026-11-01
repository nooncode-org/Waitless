'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleAuthButton } from '@/components/ui/google-auth-button'
import { EmailVerification } from '@/components/auth/email-verification'
import { PLANS, TRIAL_DAYS, type Plan } from '@/lib/plans'

const PLAN_OPTIONS: { key: Plan; desc: string; highlight?: boolean }[] = [
  { key: 'starter', desc: 'Para tu primera sucursal.' },
  { key: 'pro', desc: 'Para restaurantes en crecimiento.', highlight: true },
  { key: 'enterprise', desc: 'Para cadenas y grupos.' },
]

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  padding: '0 14px',
  border: '1px solid #E5E5E5',
  borderRadius: 10,
  fontSize: 14,
  fontFamily: FONT,
  color: '#000',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: 'rgba(0,0,0,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: 6,
  fontFamily: MONO,
}

type Step = 1 | 2 | 3

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export function RegistroForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step
  const [step, setStep] = useState<Step>(1)

  // Step 1 — Business
  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [primaryColor, setPrimaryColor] = useState('#000000')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  // Step 2 — Credentials
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Step 3 — Plan (la prueba gratuita arranca al confirmar)
  const [plan, setPlan] = useState<Plan>('starter')

  // Reglas de contraseña (espejadas en /api/registro): mín 8, ≥1 letra, ≥1 número.
  const pwHasLen = password.length >= 8
  const pwHasLetter = /[a-zA-Z]/.test(password)
  const pwHasNumber = /[0-9]/.test(password)
  const pwValid = pwHasLen && pwHasLetter && pwHasNumber
  const pwMatch = password.length > 0 && password === confirmPassword
  const canSubmit = !!email.trim() && pwValid && pwMatch

  // UI state
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState<{ username: string; email: string; requiresVerification: boolean } | null>(null)
  const [verified, setVerified] = useState(false)

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleNombreChange = (v: string) => {
    setNombre(v)
    if (!slugManual) setSlug(slugify(v))
  }

  const handleSlugChange = (v: string) => {
    setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))
    setSlugManual(true)
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('El logo no puede superar 2 MB')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setError('')
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const validateStep1 = () => {
    if (!nombre.trim() || nombre.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres')
      return false
    }
    if (!slug || !/^[a-z0-9-]{3,40}$/.test(slug)) {
      setError('El identificador debe tener 3-40 caracteres: letras minúsculas, números y guiones')
      return false
    }
    return true
  }

  const handleNext = () => {
    setError('')
    if (validateStep1()) setStep(2)
  }

  // Step 2 → 3: valida credenciales y avanza a elegir plan (no crea la cuenta aún).
  const handleStep2Next = (e: React.FormEvent) => {
    e.preventDefault()
    if (!pwValid) {
      setError('La contraseña debe tener al menos 8 caracteres, con una letra y un número')
      return
    }
    if (!pwMatch) {
      setError('Las contraseñas no coinciden')
      return
    }
    setError('')
    setStep(3)
  }

  // Step 3: crea la cuenta con el plan elegido. La prueba gratuita arranca ahora.
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setError('')
    setIsLoading(true)

    try {
      const fd = new FormData()
      fd.append('nombre', nombre.trim())
      fd.append('slug', slug)
      fd.append('primaryColor', primaryColor)
      fd.append('email', email.trim().toLowerCase())
      fd.append('password', password)
      fd.append('plan', plan)
      if (logoFile) fd.append('logo', logoFile)

      const res = await fetch('/api/registro', { method: 'POST', body: fd })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Error al registrarse')
        return
      }

      setSuccess({
        username: json.admin.username,
        email: json.admin.email,
        requiresVerification: !!json.requiresVerification,
      })
    } catch {
      setError('Error de conexión. Verificá tu red e intentá de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Verificación de email (si el registro la requiere y aún no se hizo) ─────
  if (success && success.requiresVerification && !verified) {
    return (
      <EmailVerification
        identifier={success.email}
        email={success.email}
        accent={primaryColor}
        onVerified={() => setVerified(true)}
      />
    )
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={{ textAlign: 'center', fontFamily: FONT }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(16,185,129,0.1)',
          border: '2px solid rgba(16,185,129,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: 28,
        }}>✓</div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#000', letterSpacing: '-0.02em', margin: 0 }}>
            ¡Todo listo!
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.45)', marginTop: 8 }}>
            Tu negocio fue registrado correctamente.
          </p>
          <p style={{ fontSize: 13, color: '#059669', fontWeight: 600, marginTop: 6 }}>
            Tu prueba gratuita de {TRIAL_DAYS} días ya está activa.
          </p>
        </div>
        <div style={{
          background: '#F5F5F5', border: '1px solid #E5E5E5',
          borderRadius: 12, padding: 16, textAlign: 'left', marginTop: 24,
        }}>
          <p style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12, fontFamily: MONO }}>
            Tus credenciales de acceso
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>Usuario</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#000', fontFamily: MONO }}>{success.username}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>Contraseña</span>
            <span style={{ fontSize: 14, color: '#000' }}>la que elegiste</span>
          </div>
        </div>
        <button
          onClick={() => router.push('/')}
          style={{
            width: '100%', height: 44, marginTop: 20,
            background: '#000', color: '#fff',
            border: 'none', borderRadius: 10,
            fontSize: 15, fontWeight: 700, fontFamily: FONT,
            cursor: 'pointer',
          }}
        >
          Ir al login
        </button>
      </div>
    )
  }

  // ── Step indicators ───────────────────────────────────────────────────────
  const steps = [
    { n: 1, label: 'Tu negocio', icon: '◫' },
    { n: 2, label: 'Tu cuenta',  icon: '◎' },
    { n: 3, label: 'Tu plan',    icon: '◈' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: FONT }}>
      <style>{`@keyframes reg-spin { to { transform: rotate(360deg) } }`}</style>

      {/* Step bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {steps.map((s, i) => (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 12px', borderRadius: 999,
              fontSize: 12, fontWeight: 600,
              background: step === s.n ? '#000'
                : step > s.n ? 'rgba(16,185,129,0.12)'
                : '#F0F0F0',
              color: step === s.n ? '#fff'
                : step > s.n ? '#059669'
                : 'rgba(0,0,0,0.4)',
              transition: 'all 0.2s',
            }}>
              <span>{step > s.n ? '✓' : s.icon}</span>
              <span style={{ display: 'none' }} className="sm-inline">{s.label}</span>
              <span>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 1,
                background: step > s.n ? 'rgba(16,185,129,0.4)' : '#E5E5E5',
                transition: 'background 0.2s',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Negocio ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#000', letterSpacing: '-0.02em', margin: 0 }}>
              Datos de tu negocio
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.45)', marginTop: 6 }}>Así va a aparecer en tu plataforma</p>
          </div>

          {/* Nombre */}
          <div>
            <label style={labelStyle}>Nombre del negocio</label>
            <input
              type="text"
              placeholder="Ej: La Trattoria"
              value={nombre}
              onChange={(e) => handleNombreChange(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label style={labelStyle}>Identificador único</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                fontSize: 13, color: 'rgba(0,0,0,0.4)', pointerEvents: 'none',
                fontFamily: MONO, userSelect: 'none',
              }}>
                waitless.app/
              </span>
              <input
                type="text"
                placeholder="la-trattoria"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 120, fontFamily: MONO }}
              />
            </div>
            <p style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 5, fontFamily: MONO }}>
              Solo minúsculas, números y guiones. No se puede cambiar después.
            </p>
          </div>

          {/* Color */}
          <div>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>◎</span> Color principal de tu marca
            </label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: 12, border: '1px solid #E5E5E5', borderRadius: 10,
            }}>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                style={{ width: 40, height: 40, borderRadius: 8, cursor: 'pointer', border: 'none', padding: 2, background: 'transparent' }}
              />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#000', fontFamily: MONO }}>{primaryColor.toUpperCase()}</p>
                <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>Se aplica en botones, header y acentos</p>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span style={{
                  padding: '4px 12px', borderRadius: 999,
                  fontSize: 12, fontWeight: 700, color: '#fff',
                  backgroundColor: primaryColor,
                }}>
                  Vista previa
                </span>
              </div>
            </div>
          </div>

          {/* Logo upload */}
          <div>
            <label style={labelStyle}>
              Logo <span style={{ textTransform: 'none', fontWeight: 400, color: 'rgba(0,0,0,0.35)' }}>(opcional)</span>
            </label>
            {logoPreview ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: 12, border: '1px solid #E5E5E5', borderRadius: 10,
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoPreview} alt="Logo preview" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8, border: '1px solid #E5E5E5' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{logoFile?.name}</p>
                  <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>{((logoFile?.size ?? 0) / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  onClick={removeLogo}
                  style={{ padding: 6, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: 'rgba(0,0,0,0.4)' }}
                >✕</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  padding: '24px 16px', border: '2px dashed #E5E5E5', borderRadius: 10,
                  background: 'none', cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 24, color: 'rgba(0,0,0,0.3)' }}>↑</span>
                <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.4)' }}>Subir logo</span>
                <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.3)' }}>PNG, JPG, WEBP · máx. 2 MB</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleLogoChange}
              style={{ display: 'none' }}
            />
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              color: '#DC2626', fontSize: 12,
              background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)',
              borderRadius: 8, padding: '10px 12px',
            }}>
              <span style={{ flexShrink: 0 }}>⚠</span>
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleNext}
            style={{
              width: '100%', height: 44,
              background: primaryColor, color: '#fff',
              border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700, fontFamily: FONT,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* ── STEP 2: Cuenta admin ─────────────────────────────────────────────── */}
      {step === 2 && (
        <form onSubmit={handleStep2Next} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#000', letterSpacing: '-0.02em', margin: 0 }}>
              Crear cuenta de administrador
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.45)', marginTop: 6 }}>Con esto vas a entrar a tu plataforma</p>
          </div>

          {/* Google option */}
          <GoogleAuthButton label="Registrarme con Google" />

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: '#E5E5E5' }} />
            <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>o con email y contraseña</span>
            <div style={{ flex: 1, height: 1, background: '#E5E5E5' }} />
          </div>

          {/* Business summary */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: 12, background: '#F5F5F5', border: '1px solid #E5E5E5', borderRadius: 10,
          }}>
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="Logo" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6 }} />
            ) : (
              <div style={{
                width: 32, height: 32, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0,
                backgroundColor: primaryColor,
              }}>
                {nombre.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombre}</p>
              <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', fontFamily: MONO }}>/{slug}</p>
            </div>
            <div style={{ marginLeft: 'auto', width: 16, height: 16, borderRadius: '50%', flexShrink: 0, backgroundColor: primaryColor }} />
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              autoComplete="email"
              required
              disabled={isLoading}
            />
          </div>

          {/* Password */}
          <div>
            <label style={labelStyle}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: 44 }}
                autoComplete="new-password"
                required
                minLength={8}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(0,0,0,0.35)', fontSize: 14, lineHeight: 1, padding: 4,
                }}
              >
                {showPassword ? '○' : '●'}
              </button>
            </div>

            {/* Checklist de requisitos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
              {[
                { ok: pwHasLen, label: 'Al menos 8 caracteres' },
                { ok: pwHasLetter, label: 'Al menos una letra' },
                { ok: pwHasNumber, label: 'Al menos un número' },
              ].map((r) => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: r.ok ? '#059669' : 'rgba(0,0,0,0.4)' }}>
                  <span style={{ fontSize: 11 }}>{r.ok ? '✓' : '○'}</span>
                  {r.label}
                </div>
              ))}
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label style={labelStyle}>Confirmar contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Repetí la contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  ...inputStyle,
                  paddingRight: 44,
                  borderColor: confirmPassword.length > 0 && !pwMatch ? 'rgba(220,38,38,0.5)' : '#E5E5E5',
                }}
                autoComplete="new-password"
                required
                disabled={isLoading}
              />
            </div>
            {confirmPassword.length > 0 && !pwMatch && (
              <p style={{ fontSize: 12, color: '#DC2626', marginTop: 6 }}>Las contraseñas no coinciden</p>
            )}
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              color: '#DC2626', fontSize: 12,
              background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)',
              borderRadius: 8, padding: '10px 12px',
            }}>
              <span style={{ flexShrink: 0 }}>⚠</span>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => { setStep(1); setError('') }}
              disabled={isLoading}
              style={{
                height: 44, padding: '0 16px',
                background: '#fff', color: '#000',
                border: '1px solid #E5E5E5', borderRadius: 10,
                fontSize: 16, cursor: 'pointer', fontFamily: FONT,
              }}
            >
              ←
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                flex: 1, height: 44,
                background: !canSubmit ? '#E5E5E5' : primaryColor,
                color: !canSubmit ? 'rgba(0,0,0,0.35)' : '#fff',
                border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 700, fontFamily: FONT,
                cursor: !canSubmit ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
            >
              Siguiente →
            </button>
          </div>
        </form>
      )}

      {/* ── STEP 3: Elegir plan ──────────────────────────────────────────────── */}
      {step === 3 && (
        <form onSubmit={handleFinalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#000', letterSpacing: '-0.02em', margin: 0 }}>
              Elegí tu plan
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.45)', marginTop: 6 }}>
              Arrancás con una prueba gratuita — elegís el plan que seguirás al terminar.
            </p>
          </div>

          {/* Aviso de prueba gratuita */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: 14, background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10,
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>🎁</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#065F46', margin: 0 }}>
                {TRIAL_DAYS} días de prueba gratuita — empieza ahora
              </p>
              <p style={{ fontSize: 12, color: '#047857', margin: '4px 0 0' }}>
                Acceso total a todas las funciones. No se cobra nada hoy. Al terminar, seguís con
                el plan elegido pagando por Pago Móvil / C2P.
              </p>
            </div>
          </div>

          {/* Selección de plan */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PLAN_OPTIONS.map((o) => {
              const def = PLANS[o.key]
              const selected = plan === o.key
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setPlan(o.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                    padding: 14, borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${selected ? primaryColor : '#E5E5E5'}`,
                    background: selected ? 'rgba(0,0,0,0.02)' : '#fff',
                    fontFamily: FONT, transition: 'border-color 0.15s',
                  }}
                >
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${selected ? primaryColor : '#CBD5E1'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: primaryColor }} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#000' }}>{def.label}</span>
                      {o.highlight && (
                        <span style={{ fontSize: 9, fontWeight: 700, background: '#111', color: '#fff', padding: '1px 8px', borderRadius: 999 }}>
                          Popular
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', margin: '2px 0 0' }}>{o.desc}</p>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#000', flexShrink: 0 }}>{def.price}</span>
                </button>
              )
            })}
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              color: '#DC2626', fontSize: 12,
              background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)',
              borderRadius: 8, padding: '10px 12px',
            }}>
              <span style={{ flexShrink: 0 }}>⚠</span>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => { setStep(2); setError('') }}
              disabled={isLoading}
              style={{
                height: 44, padding: '0 16px',
                background: '#fff', color: '#000',
                border: '1px solid #E5E5E5', borderRadius: 10,
                fontSize: 16, cursor: isLoading ? 'not-allowed' : 'pointer', fontFamily: FONT,
              }}
            >
              ←
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                flex: 1, height: 44,
                background: isLoading ? '#E5E5E5' : primaryColor,
                color: isLoading ? 'rgba(0,0,0,0.35)' : '#fff',
                border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 700, fontFamily: FONT,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
            >
              {isLoading ? (
                <>
                  <span style={{
                    width: 16, height: 16,
                    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                    borderRadius: '50%', display: 'inline-block',
                    animation: 'reg-spin 0.7s linear infinite',
                  }} />
                  Creando tu plataforma...
                </>
              ) : 'Continuar y empezar la prueba'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

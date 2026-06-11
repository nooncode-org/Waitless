'use client'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const SUPPORT_EMAIL = 'soporte@waitless.app'

const REASONS = [
  {
    label: 'Onboarding',
    desc: 'Te acompañamos a configurar tu restaurante por primera vez.',
    subject: 'Onboarding Waitless',
    icon: '◷',
  },
  {
    label: 'Soporte técnico',
    desc: 'Algo no funciona o tenés una duda sobre el panel.',
    subject: 'Soporte técnico Waitless',
    icon: '⚙',
  },
  {
    label: 'Demo personalizada',
    desc: 'Querés ver una funcionalidad específica en detalle.',
    subject: 'Demo personalizada Waitless',
    icon: '◈',
  },
]

function mailto(subject: string) {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`
}

export function CalendarEmbed() {
  return (
    <div style={{ padding: 24, maxWidth: 768, display: 'flex', flexDirection: 'column', gap: 20, fontFamily: FONT }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111' }}>Contacto</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>
          ¿Necesitás ayuda? Escribinos y te respondemos en menos de 4 horas hábiles.
        </p>
      </div>

      {/* Email destacado */}
      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.08em' }}>
          Email de soporte
        </p>
        <a
          href={mailto('Consulta — Waitless')}
          style={{ fontSize: 20, fontWeight: 700, color: '#111', textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#0a3a0a')}
          onMouseLeave={e => (e.currentTarget.style.color = '#111')}
        >
          {SUPPORT_EMAIL}
        </a>
      </div>

      {/* Motivos de contacto */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.08em' }}>
          ¿Sobre qué necesitás escribirnos?
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {REASONS.map(r => (
            <a
              key={r.subject}
              href={mailto(r.subject)}
              style={{
                background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14,
                padding: 16, display: 'flex', flexDirection: 'column', gap: 8,
                textDecoration: 'none', transition: 'border-color .15s, box-shadow .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#111'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E5E5'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <span style={{ fontSize: 22, color: '#0a3a0a' }}>{r.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{r.label}</span>
              <span style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.4 }}>{r.desc}</span>
              <span style={{ marginTop: 'auto', paddingTop: 8, fontSize: 12, fontWeight: 600, color: '#0a3a0a' }}>
                Escribir →
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

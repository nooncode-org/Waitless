'use client'

// Métodos de pago manuales del plan (sin pasarela). El operador confirma el pago
// (Pago Móvil/C2P o USDT) y extiende `plan_expires_at` en el tenant.
// El Pay ID de Binance se configura con NEXT_PUBLIC_BINANCE_PAY_ID (cuenta personal).

const BINANCE_PAY_ID = process.env.NEXT_PUBLIC_BINANCE_PAY_ID
const SUPPORT_EMAIL = 'soporte@waitless.app'

export function PayInstructions({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ fontSize: compact ? 12 : 13, lineHeight: 1.5, textAlign: 'left' }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600 }}>Cómo pagar tu plan:</p>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <li><b>Pago Móvil / C2P</b> — escribinos y te pasamos los datos.</li>
        {BINANCE_PAY_ID
          ? <li><b>USDT (Binance Pay)</b> — enviá a: <b>{BINANCE_PAY_ID}</b></li>
          : <li><b>USDT (Binance Pay)</b> — escribinos y te pasamos el ID.</li>}
      </ul>
      <p style={{ margin: '6px 0 0' }}>
        Enviá el comprobante a <b>{SUPPORT_EMAIL}</b> y activamos tu plan.
      </p>
    </div>
  )
}

'use client'

// Pantalla mostrada cuando la prueba gratuita venció y no hay plan pago vigente.
// El cobro es por Pago Móvil / C2P, confirmado por el operador (no hay pasarela).

export function TrialBlocked({ onLogout, restaurantName }: { onLogout: () => void; restaurantName?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <p className="text-4xl mb-4">🔒</p>
        <p className="font-semibold text-foreground text-lg mb-2">Tu prueba gratuita terminó</p>
        <p className="text-sm text-muted-foreground mb-6">
          Para seguir usando {restaurantName || 'Waitless'} activá un plan. El pago se realiza
          por Pago Móvil / C2P — escribinos y te pasamos los datos.
        </p>
        <a
          href="mailto:soporte@waitless.app?subject=Activar%20plan%20Waitless"
          className="inline-block w-full rounded-lg bg-primary text-primary-foreground text-sm font-semibold py-2.5 mb-3"
        >
          Contactar para pagar
        </a>
        <button
          onClick={onLogout}
          className="w-full text-xs text-muted-foreground py-2"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

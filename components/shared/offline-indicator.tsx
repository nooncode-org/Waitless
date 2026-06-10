'use client'

import { useEffect, useState } from 'react'
import { offlineQueue, pendingCount, failedCount } from '@/lib/offline-queue'
import { supabase } from '@/lib/supabase'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"

export function OfflineIndicator() {
  // Solo staff (con sesión de Supabase Auth) ve este indicador. El cliente QR
  // anónimo no tiene sesión → no debe ver avisos de cola/"no sincronizado".
  const [isStaff, setIsStaff] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [showReconnected, setShowReconnected] = useState(false)
  const [pending, setPending] = useState(0)
  const [failed, setFailed] = useState(0)
  const [retrying, setRetrying] = useState(false)
  const [retrySuccess, setRetrySuccess] = useState(false)

  const refreshCounts = () => {
    setPending(pendingCount())
    setFailed(failedCount())
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsStaff(!!data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setIsStaff(!!session))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowReconnected(true)
      setTimeout(() => setShowReconnected(false), 3000)
      offlineQueue.flush().then(() => refreshCounts())
    }
    const handleOffline = () => {
      setIsOnline(false)
      setShowReconnected(false)
      refreshCounts()
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading navigator.onLine (external API) on mount to initialize online state
    setIsOnline(navigator.onLine)
    refreshCounts()

    if (navigator.onLine && failedCount() > 0) {
      offlineQueue.retryFailedOps().then(() => refreshCounts())
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = async () => {
    setRetrying(true)
    await offlineQueue.retryFailedOps({
      onFlushComplete: (count) => {
        refreshCounts()
        if (count > 0 && failedCount() === 0) {
          setRetrySuccess(true)
          setTimeout(() => setRetrySuccess(false), 3000)
        }
      },
      onFlushError: () => refreshCounts(),
    })
    refreshCounts()
    setRetrying(false)
  }

  if (!isStaff) return null
  if (isOnline && !showReconnected && failed === 0) return null

  const pillStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 16px', borderRadius: 999,
    boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
    fontSize: 13, fontWeight: 600, fontFamily: FONT,
    color: '#fff',
  }

  return (
    <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      {(!isOnline || showReconnected) && (
        <div style={{ ...pillStyle, background: isOnline ? '#16a34a' : '#dc2626' }}>
          <span>{isOnline ? '✓' : '✕'}</span>
          {isOnline ? (
            <span>Reconectado</span>
          ) : (
            <>
              <span>Sin conexión — los cambios se guardarán al reconectar</span>
              {pending > 0 && (
                <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 999, padding: '2px 8px', fontSize: 11 }}>
                  {pending} pendiente{pending !== 1 ? 's' : ''}
                </span>
              )}
            </>
          )}
        </div>
      )}

      {failed > 0 && (
        <div style={{ ...pillStyle, background: '#d97706' }}>
          <span>⚠</span>
          <span>{failed} operación{failed !== 1 ? 'es' : ''} no sincronizada{failed !== 1 ? 's' : ''}</span>
          <button
            onClick={handleRetry}
            disabled={retrying}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'rgba(255,255,255,0.2)', borderRadius: 999,
              padding: '2px 10px', fontSize: 11, fontWeight: 700,
              border: 'none', cursor: retrying ? 'default' : 'pointer', color: '#fff',
              opacity: retrying ? 0.6 : 1, fontFamily: FONT,
            }}
          >
            {retrying ? '↻ Sincronizando...' : '↻ Reintentar'}
          </button>
          <button
            onClick={() => { offlineQueue.clearFailedOps(); setFailed(0) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: FONT, textDecoration: 'underline' }}
          >
            Descartar
          </button>
        </div>
      )}

      {retrySuccess && failed === 0 && (
        <div style={{ ...pillStyle, background: '#16a34a' }}>
          <span>✓</span>
          <span>Operaciones sincronizadas correctamente</span>
        </div>
      )}
    </div>
  )
}

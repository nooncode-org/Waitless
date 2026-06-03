'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'
import { DeleteAccountDialog } from '@/components/admin/delete-account-dialog'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

type ConfigTab = 'general' | 'horarios' | 'pagos' | 'delivery' | 'notificaciones'

const DEFAULT_METODOS_PAGO = { efectivo: true, tarjeta: true, transferencia: true }

function Toggle({ on, onChange }: { on: boolean; onChange?: () => void }) {
  return (
    <button type="button" onClick={e => { e.stopPropagation(); onChange?.() }}
      style={{ width: 30, height: 18, borderRadius: 999, position: 'relative', background: on ? '#BEEBBE' : 'rgba(0,0,0,0.12)', border: 'none', cursor: onChange ? 'pointer' : 'default', padding: 0, flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 14 : 2, width: 14, height: 14, borderRadius: 999, background: '#fff', transition: 'left 0.15s', display: 'block' }} />
    </button>
  )
}

export function ConfigManager() {
  const { config, updateConfig, emergencyCloseTables, tableSessions, orders } = useApp()
  const [activeTab, setActiveTab] = useState<ConfigTab>('general')
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false)
  const [selectedTables, setSelectedTables] = useState<number[]>([])
  const [storeSaving, setStoreSaving] = useState(false)
  const [storeSaved, setStoreSaved] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)

  const safeConfig = {
    ...config,
    metodospagoActivos: config.metodospagoActivos || DEFAULT_METODOS_PAGO,
    sonidoNuevosPedidos: config.sonidoNuevosPedidos ?? true,
    notificacionesStockBajo: config.notificacionesStockBajo ?? true,
    tiendaAbierta: config.tiendaAbierta ?? true,
    tiendaVisible: config.tiendaVisible ?? true,
    autoHorarioApertura: config.autoHorarioApertura ?? null,
    autoHorarioCierre: config.autoHorarioCierre ?? null,
    deliveryHabilitado: config.deliveryHabilitado ?? false,
  }

  const [localConfig, setLocalConfig] = useState({ ...safeConfig })
  const [saved, setSaved] = useState(false)

  const saveStoreStatus = (patch: Partial<typeof safeConfig>) => {
    const next = { ...localConfig, ...patch }
    setLocalConfig(next)
    updateConfig(patch)
    setStoreSaving(true)
    setTimeout(() => { setStoreSaving(false); setStoreSaved(true) }, 600)
    setTimeout(() => setStoreSaved(false), 2200)
  }

  const handleSave = () => {
    updateConfig(localConfig)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const hasChanges = JSON.stringify(localConfig) !== JSON.stringify(safeConfig)

  const activeSessions = tableSessions.filter(s => s.activa)
  const getTableOrderCount = (mesa: number) =>
    orders.filter(o => o.mesa === mesa && o.status !== 'entregado' && o.status !== 'cancelado').length

  const inp: React.CSSProperties = {
    height: 36, padding: '0 12px', border: '1px solid #E5E5E5', borderRadius: 10,
    fontSize: 13.5, letterSpacing: '-0.01em', fontFamily: FONT, outline: 'none',
    background: '#fff', width: '100%', boxSizing: 'border-box',
  }
  const fieldLabel: React.CSSProperties = {
    fontSize: 11.5, fontFamily: MONO, color: 'rgba(0,0,0,0.5)', display: 'block', marginBottom: 5,
  }
  const row: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    padding: '10px 0', borderBottom: '1px solid #F5F5F5',
  }

  const TABS: { id: ConfigTab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'horarios', label: 'Horarios' },
    { id: 'pagos', label: 'Pagos' },
    { id: 'delivery', label: 'Delivery' },
    { id: 'notificaciones', label: 'Notificaciones' },
  ]

  return (
    <div style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`.adm-cfg-tab-item:hover{background:rgba(0,0,0,0.04)!important}`}</style>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 16, borderBottom: '1px solid #E5E5E5' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2 }}>Configuración · {config.restaurantName || 'Restaurante'}</div>
          <div style={{ fontSize: 12, fontFamily: MONO, color: 'rgba(0,0,0,0.5)', marginTop: 4 }}>Ajusta los parámetros del restaurante</div>
        </div>
        <button onClick={handleSave} disabled={!hasChanges && !saved}
          style={{ height: 36, padding: '0 18px', border: 'none', borderRadius: 10, fontSize: 13, fontFamily: FONT, fontWeight: 700, letterSpacing: '-0.01em', background: saved ? '#BEEBBE' : '#000', color: saved ? '#0a3a0a' : '#fff', cursor: hasChanges || saved ? 'pointer' : 'not-allowed', opacity: !hasChanges && !saved ? 0.4 : 1, transition: 'background 0.2s' }}>
          {saved ? 'Guardado ✓' : 'Guardar cambios'}
          {storeSaving && <span style={{ marginLeft: 6, opacity: 0.6 }}>…</span>}
          {storeSaved && !storeSaving && <span style={{ marginLeft: 6 }}>✓</span>}
        </button>
      </header>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E5E5E5', paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="adm-cfg-tab-item"
            style={{ height: 34, padding: '0 14px', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #000' : '2px solid transparent', borderRadius: 0, fontSize: 13, fontFamily: FONT, fontWeight: activeTab === tab.id ? 700 : 500, color: activeTab === tab.id ? '#000' : 'rgba(0,0,0,0.5)', background: 'transparent', cursor: 'pointer', letterSpacing: '-0.01em' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* General */}
      {activeTab === 'general' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ border: '1px solid #E5E5E5', borderRadius: 14, padding: 20, background: '#fff', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase', marginBottom: 2 }}>DATOS DEL RESTAURANTE</div>
            <div>
              <label style={fieldLabel}>Nombre</label>
              <input value={localConfig.restaurantName || ''} onChange={e => setLocalConfig(p => ({ ...p, restaurantName: e.target.value }))} placeholder="Mi Restaurante" style={inp} />
            </div>
            <div>
              <label style={fieldLabel}>Descripción</label>
              <textarea value={localConfig.descripcion || ''} onChange={e => setLocalConfig(p => ({ ...p, descripcion: e.target.value }))} rows={3} maxLength={200} placeholder="Breve descripción..." style={{ ...inp, height: 'auto', padding: '8px 12px', resize: 'vertical' }} />
            </div>
            <div>
              <label style={fieldLabel}>URL del logo</label>
              <input value={localConfig.logoUrl || ''} onChange={e => setLocalConfig(p => ({ ...p, logoUrl: e.target.value }))} placeholder="https://..." style={inp} />
            </div>
            <div>
              <label style={fieldLabel}>URL de portada</label>
              <input value={localConfig.coverUrl || ''} onChange={e => setLocalConfig(p => ({ ...p, coverUrl: e.target.value }))} placeholder="https://..." style={inp} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {([
                { key: 'primaryColor', label: 'Primario', def: '#000000' },
                { key: 'secondaryColor', label: 'Secundario', def: '#FFFFFF' },
                { key: 'accentColor', label: 'Acento', def: '#BEBEBE' },
              ] as const).map(({ key, label, def }) => (
                <div key={key}>
                  <label style={fieldLabel}>{label}</label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="color" value={(localConfig as unknown as Record<string, string>)[key] || def}
                      onChange={e => setLocalConfig(p => ({ ...p, [key]: e.target.value }))}
                      style={{ height: 36, width: 36, border: '1px solid #E5E5E5', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
                    <input value={(localConfig as unknown as Record<string, string>)[key] || def}
                      onChange={e => setLocalConfig(p => ({ ...p, [key]: e.target.value }))}
                      maxLength={7}
                      style={{ ...inp, fontFamily: MONO, fontSize: 12 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ border: '1px solid #E5E5E5', borderRadius: 14, padding: 20, background: '#fff', display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase', marginBottom: 14 }}>ESTADO DE TIENDA</div>
            <div style={row}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.02em' }}>{localConfig.tiendaAbierta ? 'Tienda abierta' : 'Tienda cerrada'}</div>
                <div style={{ fontSize: 11.5, fontFamily: MONO, color: 'rgba(0,0,0,0.5)', marginTop: 2 }}>{localConfig.tiendaAbierta ? 'Los clientes pueden pedir' : 'No se aceptan pedidos'}</div>
              </div>
              <Toggle on={localConfig.tiendaAbierta} onChange={() => saveStoreStatus({ tiendaAbierta: !localConfig.tiendaAbierta })} />
            </div>
            <div style={row}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.02em' }}>{localConfig.tiendaVisible ? 'Visible al público' : 'Oculta al público'}</div>
                <div style={{ fontSize: 11.5, fontFamily: MONO, color: 'rgba(0,0,0,0.5)', marginTop: 2 }}>{localConfig.tiendaVisible ? 'Aparece en el marketplace' : 'No aparece en la lista pública'}</div>
              </div>
              <Toggle on={localConfig.tiendaVisible} onChange={() => saveStoreStatus({ tiendaVisible: !localConfig.tiendaVisible })} />
            </div>
            <div style={{ ...row, borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: 6, paddingTop: 14 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.02em' }}>Badge WAITLESS</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, fontFamily: MONO, color: 'rgba(0,0,0,0.5)' }}>Mostrar &quot;Powered by WAITLESS&quot; al cliente</span>
                <Toggle on={localConfig.poweredByWaitless ?? false} onChange={() => setLocalConfig(p => ({ ...p, poweredByWaitless: !p.poweredByWaitless }))} />
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid #E5E5E5', borderRadius: 14, padding: 20, background: '#fff', display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase', marginBottom: 14 }}>OPERACIÓN</div>
            <div>
              <label style={fieldLabel}>Tiempo expiración sesión (minutos)</label>
              <input type="number" value={localConfig.tiempoExpiracionSesionMinutos} onChange={e => setLocalConfig(p => ({ ...p, tiempoExpiracionSesionMinutos: parseInt(e.target.value) || 60 }))}
                style={{ ...inp, width: 120 }} />
              <div style={{ fontSize: 11.5, fontFamily: MONO, color: 'rgba(0,0,0,0.4)', marginTop: 4 }}>Tiempo que dura una sesión de mesa sin actividad</div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={fieldLabel}>Total de mesas del local</label>
              <input type="number" min={0} value={localConfig.maxMesas ?? ''} placeholder="Sin límite"
                onChange={e => { const v = parseInt(e.target.value); setLocalConfig(p => ({ ...p, maxMesas: Number.isFinite(v) && v > 0 ? v : undefined })) }}
                style={{ ...inp, width: 120 }} />
              <div style={{ fontSize: 11.5, fontFamily: MONO, color: 'rgba(0,0,0,0.4)', marginTop: 4 }}>
                Cantidad máxima de mesas. Ninguna mesa puede superar este número (ej. con 50, no existe la mesa 55). Vacío = sin límite.
              </div>
            </div>
            <div style={{ marginTop: 14, ...row }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.02em' }}>Pacing de cocina</div>
                <div style={{ fontSize: 11.5, fontFamily: MONO, color: 'rgba(0,0,0,0.5)', marginTop: 2 }}>Limitar pedidos simultáneos en preparación</div>
              </div>
              <Toggle on={(localConfig.pacingMaxPreparando ?? 0) > 0} onChange={() => setLocalConfig(p => ({ ...p, pacingMaxPreparando: (p.pacingMaxPreparando ?? 0) > 0 ? 0 : 3 }))} />
            </div>
            {(localConfig.pacingMaxPreparando ?? 0) > 0 && (
              <div style={{ marginTop: 10 }}>
                <label style={fieldLabel}>Máx. pedidos simultáneos</label>
                <input type="number" min={2} max={10} value={localConfig.pacingMaxPreparando ?? 3}
                  onChange={e => setLocalConfig(p => ({ ...p, pacingMaxPreparando: Math.min(10, Math.max(2, parseInt(e.target.value) || 2)) }))}
                  style={{ ...inp, width: 80 }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Horarios */}
      {activeTab === 'horarios' && (
        <div style={{ border: '1px solid #E5E5E5', borderRadius: 14, padding: 20, background: '#fff', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
          <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase' }}>HORARIO AUTOMÁTICO</div>
          <div style={{ fontSize: 12.5, fontFamily: MONO, color: 'rgba(0,0,0,0.5)' }}>Si se configura, la tienda abre y cierra sola. Hora local (UTC-3).</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={fieldLabel}>Apertura</label>
              <input type="time" value={localConfig.autoHorarioApertura ?? ''} onChange={e => setLocalConfig(p => ({ ...p, autoHorarioApertura: e.target.value || null }))} style={inp} />
            </div>
            <div>
              <label style={fieldLabel}>Cierre</label>
              <input type="time" value={localConfig.autoHorarioCierre ?? ''} onChange={e => setLocalConfig(p => ({ ...p, autoHorarioCierre: e.target.value || null }))} style={inp} />
            </div>
          </div>
          {(localConfig.autoHorarioApertura || localConfig.autoHorarioCierre) && (
            <button type="button" onClick={() => setLocalConfig(p => ({ ...p, autoHorarioApertura: null, autoHorarioCierre: null }))}
              style={{ alignSelf: 'flex-start', background: 'none', border: 'none', fontSize: 12, fontFamily: MONO, color: '#DC2626', cursor: 'pointer', textDecoration: 'underline' }}>
              Quitar horario automático
            </button>
          )}
        </div>
      )}

      {/* Pagos */}
      {activeTab === 'pagos' && (
        <div style={{ border: '1px solid #E5E5E5', borderRadius: 14, padding: 20, background: '#fff', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480 }}>
          <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase' }}>IMPUESTOS Y PAGOS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={fieldLabel}>IVA (%)</label>
              <input type="number" value={localConfig.impuestoPorcentaje} onChange={e => setLocalConfig(p => ({ ...p, impuestoPorcentaje: parseFloat(e.target.value) || 0 }))} style={inp} />
            </div>
            <div>
              <label style={fieldLabel}>Propina sugerida (%)</label>
              <input type="number" value={localConfig.propinaSugeridaPorcentaje} onChange={e => setLocalConfig(p => ({ ...p, propinaSugeridaPorcentaje: parseFloat(e.target.value) || 0 }))} style={inp} />
            </div>
          </div>
          <div style={{ borderTop: '1px solid #E5E5E5', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase', marginBottom: 10 }}>MÉTODOS DE PAGO</div>
            {(['efectivo', 'tarjeta', 'transferencia'] as const).map((method, i) => (
              <div key={method} style={{ ...row, borderBottom: i < 2 ? '1px solid #F5F5F5' : 'none' }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em', textTransform: 'capitalize' }}>{method}</span>
                <Toggle on={localConfig.metodospagoActivos[method]}
                  onChange={() => setLocalConfig(p => ({ ...p, metodospagoActivos: { ...p.metodospagoActivos, [method]: !p.metodospagoActivos[method] } }))} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery */}
      {activeTab === 'delivery' && (
        <div style={{ border: '1px solid #E5E5E5', borderRadius: 14, padding: 20, background: '#fff', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480 }}>
          <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase' }}>DELIVERY</div>
          <div style={row}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.02em' }}>Delivery habilitado</div>
              <div style={{ fontSize: 11.5, fontFamily: MONO, color: 'rgba(0,0,0,0.5)', marginTop: 2 }}>Muestra Para llevar / Delivery en el menú digital</div>
            </div>
            <Toggle on={localConfig.deliveryHabilitado} onChange={() => { setLocalConfig(p => ({ ...p, deliveryHabilitado: !p.deliveryHabilitado })); updateConfig({ deliveryHabilitado: !localConfig.deliveryHabilitado }) }} />
          </div>
          <div style={{ borderTop: '1px solid #E5E5E5', paddingTop: 14 }}>
            <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase', marginBottom: 10 }}>ZONAS DE REPARTO</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {localConfig.zonasReparto.map((zona, index) => (
                <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input value={zona} placeholder="Nombre de zona"
                    onChange={e => { const z = [...localConfig.zonasReparto]; z[index] = e.target.value; setLocalConfig(p => ({ ...p, zonasReparto: z })) }}
                    style={{ ...inp, flex: 1 }} />
                  <button onClick={() => setLocalConfig(p => ({ ...p, zonasReparto: p.zonasReparto.filter((_, i) => i !== index) }))}
                    style={{ height: 36, width: 36, border: '1px solid #FEE2E2', borderRadius: 8, background: '#fff', color: '#DC2626', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
                </div>
              ))}
              <button onClick={() => setLocalConfig(p => ({ ...p, zonasReparto: [...p.zonasReparto, ''] }))}
                style={{ height: 36, border: '1px dashed #E5E5E5', borderRadius: 10, fontSize: 13, fontFamily: FONT, background: '#FAFAFA', cursor: 'pointer', color: 'rgba(0,0,0,0.55)', letterSpacing: '-0.01em' }}>
                + Agregar zona
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificaciones */}
      {activeTab === 'notificaciones' && (
        <div style={{ border: '1px solid #E5E5E5', borderRadius: 14, padding: 20, background: '#fff', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480 }}>
          <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase' }}>NOTIFICACIONES</div>
          <div style={row}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.02em' }}>Sonido de nuevos pedidos</div>
              <div style={{ fontSize: 11.5, fontFamily: MONO, color: 'rgba(0,0,0,0.5)', marginTop: 2 }}>Reproduce sonido al recibir pedidos</div>
            </div>
            <Toggle on={localConfig.sonidoNuevosPedidos} onChange={() => setLocalConfig(p => ({ ...p, sonidoNuevosPedidos: !p.sonidoNuevosPedidos }))} />
          </div>
          <div style={{ ...row, borderBottom: '1px solid #F5F5F5' }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.02em' }}>Notificaciones de stock bajo</div>
              <div style={{ fontSize: 11.5, fontFamily: MONO, color: 'rgba(0,0,0,0.5)', marginTop: 2 }}>Alerta cuando un ingrediente está bajo</div>
            </div>
            <Toggle on={localConfig.notificacionesStockBajo} onChange={() => setLocalConfig(p => ({ ...p, notificacionesStockBajo: !p.notificacionesStockBajo }))} />
          </div>
          <div style={{ borderTop: '1px solid #E5E5E5', paddingTop: 14 }}>
            <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase', marginBottom: 10 }}>MARCA Y CONTACTO</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={fieldLabel}>Número de WhatsApp</label>
                <input value={localConfig.whatsappNumero || ''} onChange={e => setLocalConfig(p => ({ ...p, whatsappNumero: e.target.value }))} placeholder="521550000000"
                  style={{ ...inp, fontFamily: MONO }} />
                <div style={{ fontSize: 11.5, fontFamily: MONO, color: 'rgba(0,0,0,0.4)', marginTop: 4 }}>Solo dígitos con código de país. Ej: 521550001234</div>
              </div>
              <div>
                <label style={fieldLabel}>URL Google Reviews</label>
                <input value={localConfig.googleReviewUrl || ''} onChange={e => setLocalConfig(p => ({ ...p, googleReviewUrl: e.target.value }))} placeholder="https://g.page/r/CXxxxx/review" style={inp} />
                <div style={{ fontSize: 11.5, fontFamily: MONO, color: 'rgba(0,0,0,0.4)', marginTop: 4 }}>Aparece tras calificación de 4-5 estrellas</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cierre de emergencia */}
      <div style={{ border: '1px solid #FEE2E2', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #FEE2E2' }}>
          <span style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, letterSpacing: '0.04em', color: '#991B1B', textTransform: 'uppercase' }}>CIERRE DE EMERGENCIA</span>
        </div>
        <div style={{ padding: '14px 16px' }}>
          {activeSessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12.5, fontFamily: MONO, color: 'rgba(0,0,0,0.35)' }}>No hay mesas activas</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontFamily: MONO, color: 'rgba(0,0,0,0.5)' }}>{selectedTables.length} de {activeSessions.length} seleccionadas</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setSelectedTables(activeSessions.map(s => s.mesa))} style={{ height: 26, padding: '0 10px', border: '1px solid #E5E5E5', borderRadius: 6, fontSize: 11.5, fontFamily: MONO, background: '#fff', cursor: 'pointer' }}>Todas</button>
                  <button onClick={() => setSelectedTables([])} disabled={selectedTables.length === 0} style={{ height: 26, padding: '0 10px', border: '1px solid #E5E5E5', borderRadius: 6, fontSize: 11.5, fontFamily: MONO, background: '#fff', cursor: 'pointer', opacity: selectedTables.length === 0 ? 0.4 : 1 }}>Ninguna</button>
                </div>
              </div>
              <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #F5F5F5', borderRadius: 10, marginBottom: 10 }}>
                {[...activeSessions].sort((a, b) => a.mesa - b.mesa).map(session => {
                  const orderCount = getTableOrderCount(session.mesa)
                  const isSelected = selectedTables.includes(session.mesa)
                  return (
                    <div key={session.id} onClick={() => setSelectedTables(prev => prev.includes(session.mesa) ? prev.filter(m => m !== session.mesa) : [...prev, session.mesa])}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', background: isSelected ? '#FEF2F2' : '#fff', borderBottom: '1px solid #F5F5F5' }}>
                      <input type="checkbox" checked={isSelected} readOnly style={{ width: 14, height: 14, accentColor: '#DC2626', cursor: 'pointer' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em' }}>Mesa {session.mesa}</div>
                        <div style={{ fontSize: 11.5, fontFamily: MONO, color: 'rgba(0,0,0,0.45)' }}>{formatPrice(session.total)}</div>
                      </div>
                      {orderCount > 0 && (
                        <span style={{ background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontFamily: MONO, fontWeight: 600 }}>
                          {orderCount} pedido{orderCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
              {!showEmergencyConfirm ? (
                <button onClick={() => setShowEmergencyConfirm(true)} disabled={selectedTables.length === 0}
                  style={{ width: '100%', height: 36, border: '1px solid #FCA5A5', borderRadius: 10, fontSize: 13, fontFamily: FONT, fontWeight: 600, color: '#DC2626', background: '#fff', cursor: selectedTables.length === 0 ? 'not-allowed' : 'pointer', opacity: selectedTables.length === 0 ? 0.4 : 1 }}>
                  Cerrar {selectedTables.length} mesa{selectedTables.length !== 1 ? 's' : ''} seleccionada{selectedTables.length !== 1 ? 's' : ''}
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ padding: '10px 14px', background: '#FEF2F2', borderRadius: 10, border: '1px solid #FCA5A5' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#991B1B', marginBottom: 4 }}>Confirmar cierre de emergencia</div>
                    <div style={{ fontSize: 12, fontFamily: MONO, color: 'rgba(0,0,0,0.6)' }}>Mesas: {selectedTables.sort((a, b) => a - b).join(', ')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowEmergencyConfirm(false)} style={{ flex: 1, height: 36, border: '1px solid #E5E5E5', borderRadius: 10, fontSize: 13, fontFamily: FONT, background: '#fff', cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={() => { emergencyCloseTables(selectedTables); setSelectedTables([]); setShowEmergencyConfirm(false) }}
                      style={{ flex: 1, height: 36, border: 'none', borderRadius: 10, fontSize: 13, fontFamily: FONT, fontWeight: 700, background: '#DC2626', color: '#fff', cursor: 'pointer' }}>
                      Confirmar cierre
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Zona de peligro */}
      <div style={{ border: '1px solid #FEE2E2', borderRadius: 14, overflow: 'hidden', background: '#FFF5F5' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #FEE2E2' }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: '#991B1B', letterSpacing: '-0.02em' }}>Zona de peligro</span>
        </div>
        <div style={{ padding: '16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>Eliminar cuenta</div>
            <div style={{ fontSize: 12.5, fontFamily: MONO, color: 'rgba(0,0,0,0.55)', lineHeight: 1.5 }}>
              Elimina permanentemente tu cuenta, menú, órdenes y todos los datos.<br />
              Solo disponible sin órdenes activas ni mesas abiertas.
            </div>
          </div>
          <button onClick={() => setShowDeleteAccount(true)}
            style={{ height: 36, padding: '0 16px', border: '1px solid #FCA5A5', borderRadius: 10, fontSize: 13, fontFamily: FONT, fontWeight: 600, color: '#991B1B', background: '#fff', cursor: 'pointer', flexShrink: 0 }}>
            Eliminar
          </button>
        </div>
      </div>

      {showDeleteAccount && <DeleteAccountDialog onClose={() => setShowDeleteAccount(false)} />}
    </div>
  )
}

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

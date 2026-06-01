'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MINT = '#BEEBBE'
const MINT_DEEP = '#0a3a0a'

export function QRManager() {
  const {
    qrTokens, generateTableQR, invalidateTableQR, getActiveQRForTable, config,
    tables, addTable, updateTable, deleteTable, setTablesCount, getActiveTables
  } = useApp()
  const [selectedMesa, setSelectedMesa] = useState<number>(1)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [generatingMesa, setGeneratingMesa] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'qr' | 'mesas'>('qr')

  const [showAddTable, setShowAddTable] = useState(false)
  const [editingTable, setEditingTable] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [newTableNumber, setNewTableNumber] = useState('')
  const [newTableCapacity, setNewTableCapacity] = useState('4')
  const [newTableUbicacion, setNewTableUbicacion] = useState('')

  const [showSetCount, setShowSetCount] = useState(false)
  const [countValue, setCountValue] = useState('')
  const [savingCount, setSavingCount] = useState(false)

  const activeTables = getActiveTables()

  const handleGenerateQR = async (mesa: number) => {
    setGeneratingMesa(mesa)
    try {
      await generateTableQR(mesa)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar QR')
    } finally {
      setGeneratingMesa(null)
    }
  }

  const handleCopyUrl = (mesa: number, token: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    navigator.clipboard.writeText(`${baseUrl}/restaurante?mesa=${mesa}&token=${token}`)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const qrImageUrl = (mesa: number, token: string, size = 300) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${baseUrl}/restaurante?mesa=${mesa}&token=${token}`
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`
  }

  const handleDownloadQR = (mesa: number, token: string) => {
    const link = document.createElement('a')
    link.href = qrImageUrl(mesa, token, 300)
    link.download = `mesa-${mesa}-qr.png`
    link.target = '_blank'
    link.click()
  }

  const handleAddTable = async () => {
    const numero = parseInt(newTableNumber)
    if (!numero || tables.some(t => t.numero === numero)) return
    const res = await addTable(numero, parseInt(newTableCapacity) || 4, newTableUbicacion || undefined)
    if (!res.ok) {
      toast.error(res.error?.includes('duplicate') || res.error?.includes('unique')
        ? `La mesa ${numero} ya existe`
        : (res.error || 'No se pudo guardar la mesa'))
      return
    }
    toast.success(`Mesa ${numero} agregada`)
    setNewTableNumber(''); setNewTableCapacity('4'); setNewTableUbicacion('')
    setShowAddTable(false)
  }

  const handleDeleteTable = (tableId: string) => {
    deleteTable(tableId)
    setDeleteConfirm(null)
  }

  const handleSetCount = async () => {
    const n = parseInt(countValue)
    if (!n || n < 1) {
      toast.error('Ingresá un número de mesas válido')
      return
    }
    setSavingCount(true)
    const res = await setTablesCount(n)
    setSavingCount(false)
    if (!res.ok) {
      toast.error(res.error || 'No se pudo configurar la cantidad de mesas')
      return
    }
    toast.success(`El local ahora trabaja con ${n} ${n === 1 ? 'mesa' : 'mesas'}`)
    setShowSetCount(false)
    setCountValue('')
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: FONT,
    fontSize: 13,
    height: 36,
    border: '1px solid #E5E5E5',
    borderRadius: 10,
    padding: '0 10px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    background: '#fff',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: FONT,
    fontSize: 11,
    color: '#6b7280',
    display: 'block',
    marginBottom: 4,
  }

  const btnPrimary: React.CSSProperties = {
    fontFamily: FONT,
    height: 36,
    padding: '0 14px',
    borderRadius: 10,
    background: '#111',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  }

  const btnSecondary: React.CSSProperties = {
    fontFamily: FONT,
    height: 36,
    padding: '0 14px',
    borderRadius: 10,
    background: '#fff',
    color: '#374151',
    fontSize: 12,
    fontWeight: 500,
    border: '1px solid #E5E5E5',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  }

  const btnIcon: React.CSSProperties = {
    fontFamily: FONT,
    height: 32,
    width: 32,
    borderRadius: 10,
    background: '#fff',
    color: '#9ca3af',
    fontSize: 14,
    border: '1px solid #E5E5E5',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const card: React.CSSProperties = {
    border: '1px solid #E5E5E5',
    borderRadius: 14,
    background: '#fff',
    overflow: 'hidden',
  }

  return (
    <div style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontFamily: FONT, fontSize: 13, fontWeight: 900, color: '#111', margin: 0 }}>Gestión de Mesas y QR</h2>
          <p style={{ fontFamily: FONT, fontSize: 10, color: '#9ca3af', margin: '2px 0 0' }}>Administra mesas y genera códigos QR seguros</p>
        </div>
        <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, border: '1px solid #E5E5E5', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
          ◫ {activeTables.length} mesas activas
        </span>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', border: '1px solid #E5E5E5', borderRadius: 10, overflow: 'hidden', fontSize: 12 }}>
        {([['qr', '◈', 'Códigos QR'], ['mesas', '⊞', 'Configurar Mesas']] as const).map(([tab, icon, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 0',
              fontFamily: FONT,
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === tab ? '#111' : '#fff',
              color: activeTab === tab ? '#fff' : '#9ca3af',
              transition: 'background 0.15s',
            }}
          >
            <span>{icon}</span>{label}
          </button>
        ))}
      </div>

      {/* QR Tab */}
      {activeTab === 'qr' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Generate form */}
          <div style={card}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #E5E5E5' }}>
              <p style={{ fontFamily: FONT, fontSize: 12, fontWeight: 900, color: '#111', margin: 0 }}>Generar QR Nuevo</p>
            </div>
            <div style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Número de Mesa</label>
                  <select
                    value={String(selectedMesa)}
                    onChange={(e) => setSelectedMesa(Number(e.target.value))}
                    style={{ ...inputStyle, background: '#fff' }}
                  >
                    {activeTables.map(table => (
                      <option key={table.id} value={String(table.numero)}>
                        Mesa {table.numero} {table.nombre ? `- ${table.nombre}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <button onClick={() => handleGenerateQR(selectedMesa)} style={btnPrimary}>
                  ◈ Generar QR
                </button>
              </div>
            </div>
          </div>

          {/* Active tokens grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {activeTables.map(table => {
              const activeToken = getActiveQRForTable(table.numero)
              const isExpiringSoon = activeToken && (new Date(activeToken.expiresAt).getTime() - Date.now()) < 30 * 60 * 1000

              return (
                <div key={table.id} style={{ ...card, padding: 12, opacity: !activeToken ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: '#111', margin: 0 }}>Mesa {table.numero}</h3>
                      {table.ubicacion && <span style={{ fontFamily: FONT, fontSize: 11, color: '#9ca3af' }}>{table.ubicacion}</span>}
                      {activeToken ? (
                        <span style={{
                          display: 'block',
                          marginTop: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 20,
                          width: 'fit-content',
                          background: isExpiringSoon ? '#fee2e2' : MINT,
                          color: isExpiringSoon ? '#dc2626' : MINT_DEEP,
                        }}>
                          {isExpiringSoon ? '⚠ Expira pronto' : '✓ Activo'}
                        </span>
                      ) : (
                        <span style={{ display: 'block', marginTop: 4, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, width: 'fit-content', background: '#f3f4f6', color: '#9ca3af' }}>
                          Ø Sin QR activo
                        </span>
                      )}
                    </div>
                    {activeToken && (
                      <img
                        src={qrImageUrl(table.numero, activeToken.token, 120)}
                        alt={`QR Mesa ${table.numero}`}
                        width={64}
                        height={64}
                        style={{ width: 64, height: 64, borderRadius: 8, background: '#fff', border: '1px solid #E5E5E5', flexShrink: 0 }}
                      />
                    )}
                  </div>

                  {activeToken ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontFamily: FONT, fontSize: 11, color: '#9ca3af' }}>
                        <div>Creado: {formatDateTime(activeToken.createdAt)}</div>
                        <div>Expira: {formatDateTime(activeToken.expiresAt)}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleCopyUrl(table.numero, activeToken.token)}
                          style={{ ...btnSecondary, flex: 1, height: 32, fontSize: 11 }}
                        >
                          {copiedToken === activeToken.token ? '✓ Copiado' : '⊞ Copiar'}
                        </button>
                        <button onClick={() => handleDownloadQR(table.numero, activeToken.token)} style={{ ...btnIcon, fontSize: 13 }} title="Descargar">↓</button>
                        <button onClick={() => handleGenerateQR(table.numero)} style={{ ...btnIcon, fontSize: 13 }} title="Regenerar">↺</button>
                        <button onClick={() => invalidateTableQR(activeToken.id)} title="Invalidar" style={{ ...btnIcon, color: '#f87171', border: '1px solid #E5E5E5' }}>✕</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleGenerateQR(table.numero)}
                      disabled={generatingMesa === table.numero}
                      style={{ ...btnSecondary, width: '100%', height: 32, justifyContent: 'center', opacity: generatingMesa === table.numero ? 0.4 : 1 }}
                    >
                      ◈ Generar QR
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Security info */}
          <div style={card}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #E5E5E5' }}>
              <p style={{ fontFamily: FONT, fontSize: 12, fontWeight: 900, color: '#111', margin: 0 }}>Seguridad de QR</p>
            </div>
            <div style={{ padding: '12px 16px' }}>
              <p style={{ fontFamily: FONT, fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>Los códigos QR generados incluyen:</p>
              <ul style={{ fontFamily: FONT, fontSize: 12, color: '#9ca3af', paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li>Token único de 32 caracteres aleatorios</li>
                <li>Expiración automática después de {config.tiempoExpiracionSesionMinutos} min</li>
                <li>Vinculación a una mesa específica</li>
                <li>Invalidación al cerrar la cuenta de la mesa</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Mesas Tab */}
      {activeTab === 'mesas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontFamily: FONT, fontSize: 11, color: '#9ca3af', margin: 0 }}>Configura las mesas de tu restaurante</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setCountValue(String(activeTables.length || '')); setShowSetCount(true) }}
                style={btnSecondary}
              >
                ◫ Cantidad de mesas
              </button>
              <button onClick={() => setShowAddTable(true)} style={btnPrimary}>
                + Agregar Mesa
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {[...tables].sort((a, b) => a.numero - b.numero).map(table => (
              <div key={table.id} style={{ ...card, padding: 12, opacity: !table.activa ? 0.6 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: '#111', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#9ca3af' }}>◫</span> Mesa {table.numero}
                    </h3>
                    {table.ubicacion && <span style={{ fontFamily: FONT, fontSize: 11, color: '#9ca3af' }}>{table.ubicacion}</span>}
                    <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, padding: '2px 8px', borderRadius: 20, border: '1px solid #E5E5E5', color: '#6b7280' }}>
                      {table.capacidad} personas
                    </span>
                  </div>
                  {/* Toggle switch */}
                  <button
                    onClick={() => updateTable(table.id, { activa: !table.activa })}
                    style={{
                      width: 36,
                      height: 20,
                      borderRadius: 10,
                      border: 'none',
                      cursor: 'pointer',
                      background: table.activa ? MINT_DEEP : '#d1d5db',
                      position: 'relative',
                      transition: 'background 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: 2,
                      left: table.activa ? 18 : 2,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.2s',
                    }} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #E5E5E5' }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: table.activa ? MINT_DEEP : '#9ca3af' }}>
                    {table.activa ? '✓ Activa' : 'Desactivada'}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => setEditingTable(table.id)} style={{ ...btnIcon, width: 28, height: 28, fontSize: 13 }} title="Editar">✎</button>
                    <button onClick={() => setDeleteConfirm(table.id)} style={{ ...btnIcon, width: 28, height: 28, fontSize: 13, color: '#f87171' }} title="Eliminar">✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {tables.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
              <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 12 }}>◫</div>
              <p style={{ fontFamily: FONT, fontSize: 13, margin: 0 }}>No hay mesas configuradas</p>
              <button onClick={() => setShowAddTable(true)} style={{ ...btnPrimary, marginTop: 16 }}>Agregar primera mesa</button>
            </div>
          )}
        </div>
      )}

      {/* Set Count Modal */}
      {showSetCount && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E5E5' }}>
              <h3 style={{ fontFamily: FONT, fontSize: 13, fontWeight: 900, color: '#111', margin: 0 }}>Cantidad de mesas del local</h3>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>¿Con cuántas mesas trabaja el local?</label>
                <input type="number" value={countValue} onChange={(e) => setCountValue(e.target.value)} placeholder="Ej: 20" min="1" style={inputStyle} />
              </div>
              <p style={{ fontFamily: FONT, fontSize: 11, color: '#9ca3af', margin: 0, lineHeight: 1.5 }}>
                Se crearán las mesas <b>1</b> a <b>{parseInt(countValue) > 0 ? parseInt(countValue) : 'N'}</b> y se activarán
                automáticamente. Las mesas con número mayor se desactivarán (sin perder su historial).
                Esto se refleja en todas las listas, incluyendo los códigos QR.
              </p>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #E5E5E5', display: 'flex', gap: 8 }}>
              <button onClick={() => setShowSetCount(false)} disabled={savingCount} style={{ ...btnSecondary, flex: 1, justifyContent: 'center' }}>Cancelar</button>
              <button
                onClick={handleSetCount}
                disabled={savingCount || !countValue || parseInt(countValue) < 1}
                style={{ ...btnPrimary, flex: 1, justifyContent: 'center', opacity: (savingCount || !countValue || parseInt(countValue) < 1) ? 0.4 : 1 }}
              >
                {savingCount ? 'Guardando…' : 'Aplicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      {showAddTable && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E5E5' }}>
              <h3 style={{ fontFamily: FONT, fontSize: 13, fontWeight: 900, color: '#111', margin: 0 }}>Agregar Nueva Mesa</h3>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Número de Mesa *</label>
                <input type="number" value={newTableNumber} onChange={(e) => setNewTableNumber(e.target.value)} placeholder="Ej: 13" min="1" style={inputStyle} />
                {tables.some(t => t.numero === parseInt(newTableNumber)) && (
                  <p style={{ fontFamily: FONT, fontSize: 11, color: '#ef4444', margin: '4px 0 0' }}>Este número ya existe</p>
                )}
              </div>
              <div>
                <label style={labelStyle}>Capacidad (personas)</label>
                <input type="number" value={newTableCapacity} onChange={(e) => setNewTableCapacity(e.target.value)} placeholder="4" min="1" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Ubicación (opcional)</label>
                <input value={newTableUbicacion} onChange={(e) => setNewTableUbicacion(e.target.value)} placeholder="Ej: Terraza, Interior, Ventana" style={inputStyle} />
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #E5E5E5', display: 'flex', gap: 8 }}>
              <button onClick={() => setShowAddTable(false)} style={{ ...btnSecondary, flex: 1, justifyContent: 'center' }}>Cancelar</button>
              <button
                onClick={handleAddTable}
                disabled={!newTableNumber || tables.some(t => t.numero === parseInt(newTableNumber))}
                style={{ ...btnPrimary, flex: 1, justifyContent: 'center', opacity: (!newTableNumber || tables.some(t => t.numero === parseInt(newTableNumber))) ? 0.4 : 1 }}
              >
                Agregar Mesa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Table Modal */}
      {editingTable && (() => {
        const table = tables.find(t => t.id === editingTable)
        if (!table) return null
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
            <div style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E5E5' }}>
                <h3 style={{ fontFamily: FONT, fontSize: 13, fontWeight: 900, color: '#111', margin: 0 }}>Editar Mesa {table.numero}</h3>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Capacidad (personas)</label>
                  <input type="number" defaultValue={table.capacidad} min="1" onChange={(e) => updateTable(table.id, { capacidad: parseInt(e.target.value) || 4 })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Ubicación (opcional)</label>
                  <input defaultValue={table.ubicacion || ''} placeholder="Ej: Terraza, Interior, Ventana" onChange={(e) => updateTable(table.id, { ubicacion: e.target.value || undefined })} style={inputStyle} />
                </div>
              </div>
              <div style={{ padding: '12px 20px', borderTop: '1px solid #E5E5E5', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setEditingTable(null)} style={btnPrimary}>Cerrar</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E5E5' }}>
              <h3 style={{ fontFamily: FONT, fontSize: 13, fontWeight: 900, color: '#111', margin: 0 }}>Eliminar Mesa</h3>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontFamily: FONT, fontSize: 12, color: '#6b7280', margin: 0 }}>
                Esta acción eliminará la mesa permanentemente. Los datos históricos se conservarán.
                Considerá desactivar la mesa en lugar de eliminarla.
              </p>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #E5E5E5', display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ ...btnSecondary, flex: 1, justifyContent: 'center' }}>Cancelar</button>
              <button onClick={() => handleDeleteTable(deleteConfirm)} style={{ ...btnPrimary, flex: 1, justifyContent: 'center', background: '#ef4444' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

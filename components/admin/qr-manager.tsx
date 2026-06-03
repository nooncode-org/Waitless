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
    generateTableQR, invalidateTableQR, getActiveQRForTable, config,
    tables, addTable, updateTable, deleteTable, getActiveTables
  } = useApp()
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [generatingMesa, setGeneratingMesa] = useState<number | null>(null)

  const [showAddTable, setShowAddTable] = useState(false)
  const [editingTable, setEditingTable] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [newTableNumber, setNewTableNumber] = useState('')
  const [newTableCapacity, setNewTableCapacity] = useState('4')
  const [newTableUbicacion, setNewTableUbicacion] = useState('')

  const activeTables = getActiveTables()
  const sortedTables = [...tables].sort((a, b) => a.numero - b.numero)

  const handleGenerateQR = async (mesa: number) => {
    setGeneratingMesa(mesa)
    try {
      await generateTableQR(mesa)
      toast.success(`QR de la mesa ${mesa} generado`)
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
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=0&data=${encodeURIComponent(url)}`
  }

  const handleDownloadQR = (mesa: number, token: string) => {
    const link = document.createElement('a')
    link.href = qrImageUrl(mesa, token, 600)
    link.download = `mesa-${mesa}-qr.png`
    link.target = '_blank'
    link.click()
  }

  // Solo bloquea si el número ya está ACTIVO. Si existe pero está desactivado,
  // addTable lo reactiva (no es un duplicado real).
  const numeroActivoExiste = (n: number) => tables.some(t => t.numero === n && t.activa)

  const handleAddTable = async () => {
    const numero = parseInt(newTableNumber)
    if (!numero || numero < 1) { toast.error('Ingresá un número de mesa válido'); return }
    if (numeroActivoExiste(numero)) { toast.error(`La mesa ${numero} ya está activa`); return }
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

  // ---------- estilos ----------
  const inputStyle: React.CSSProperties = {
    fontFamily: FONT, fontSize: 13, height: 38, border: '1px solid #E5E5E5',
    borderRadius: 10, padding: '0 12px', outline: 'none', width: '100%',
    boxSizing: 'border-box', background: '#fff',
  }
  const labelStyle: React.CSSProperties = {
    fontFamily: FONT, fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 5,
  }
  const btnPrimary: React.CSSProperties = {
    fontFamily: FONT, height: 38, padding: '0 16px', borderRadius: 999, background: '#111',
    color: '#fff', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  }
  const btnSecondary: React.CSSProperties = {
    fontFamily: FONT, height: 38, padding: '0 16px', borderRadius: 999, background: '#fff',
    color: '#374151', fontSize: 12.5, fontWeight: 600, border: '1px solid #E5E5E5',
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
  }
  const btnIcon: React.CSSProperties = {
    fontFamily: FONT, height: 32, width: 32, borderRadius: 9, background: '#fff',
    color: '#9ca3af', fontSize: 14, border: '1px solid #E5E5E5', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  }
  const card: React.CSSProperties = {
    border: '1px solid #E5E5E5', borderRadius: 16, background: '#fff', overflow: 'hidden',
  }
  const pill = (active?: boolean): React.CSSProperties => ({
    fontFamily: FONT, fontSize: 10.5, fontWeight: 600, padding: '2px 9px', borderRadius: 999,
    border: active ? 'none' : '1px solid #E5E5E5',
    background: active ? MINT : '#fff', color: active ? MINT_DEEP : '#6b7280',
    display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
  })

  return (
    <div style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <style>{`.tbl-card{transition:box-shadow .15s,border-color .15s}.tbl-card:hover{box-shadow:0 8px 28px rgba(0,0,0,.07);border-color:#d8d8d8}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: FONT, fontSize: 16, fontWeight: 900, color: '#111', margin: 0, letterSpacing: '-0.02em' }}>Configurar Mesas</h2>
          <p style={{ fontFamily: FONT, fontSize: 11.5, color: '#9ca3af', margin: '3px 0 0' }}>Cada mesa con su código QR seguro, todo en un solo lugar</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 999, border: '1px solid #E5E5E5', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
            ◫ {activeTables.length} activas
          </span>
          <button onClick={() => setShowAddTable(true)} style={btnPrimary}>
            + Agregar Mesa
          </button>
        </div>
      </div>

      {/* Empty state */}
      {tables.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '56px 20px', color: '#9ca3af' }}>
          <div style={{ fontSize: 44, opacity: 0.25, marginBottom: 12 }}>◫</div>
          <p style={{ fontFamily: FONT, fontSize: 14, margin: 0, color: '#6b7280', fontWeight: 600 }}>No hay mesas configuradas</p>
          <p style={{ fontFamily: FONT, fontSize: 12, margin: '4px 0 0' }}>Definí el total de mesas en <b>Configuración → General</b>, o agregá mesas manualmente.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 18 }}>
            <button onClick={() => setShowAddTable(true)} style={btnPrimary}>+ Agregar mesa</button>
          </div>
        </div>
      ) : (
        /* Grid unificado: mesa + QR */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))', gap: 14 }}>
          {sortedTables.map(table => {
            const activeToken = getActiveQRForTable(table.numero)
            const isExpiringSoon = activeToken && (new Date(activeToken.expiresAt).getTime() - Date.now()) < 30 * 60 * 1000
            const gen = generatingMesa === table.numero

            return (
              <div key={table.id} className="tbl-card" style={{ ...card, display: 'flex', flexDirection: 'column', opacity: table.activa ? 1 : 0.6 }}>
                {/* Header de la mesa */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 14px 12px' }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontFamily: FONT, fontWeight: 800, fontSize: 16, color: '#111', margin: 0, letterSpacing: '-0.02em' }}>Mesa {table.numero}</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
                      <span style={pill()}>{table.capacidad} pers.</span>
                      {table.ubicacion && <span style={pill()}>{table.ubicacion}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => updateTable(table.id, { activa: !table.activa })}
                    title={table.activa ? 'Desactivar mesa' : 'Activar mesa'}
                    style={{ width: 38, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer', background: table.activa ? MINT_DEEP : '#d1d5db', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
                  >
                    <span style={{ position: 'absolute', top: 2, left: table.activa ? 18 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </button>
                </div>

                {/* Zona QR */}
                <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  {activeToken ? (
                    <>
                      <div style={{ padding: 8, border: '1px solid #EFEFEF', borderRadius: 14, background: '#fff' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrImageUrl(table.numero, activeToken.token, 220)} alt={`QR Mesa ${table.numero}`} width={132} height={132} style={{ width: 132, height: 132, display: 'block' }} />
                      </div>
                      <span style={{ ...pill(!isExpiringSoon), background: isExpiringSoon ? '#fee2e2' : MINT, color: isExpiringSoon ? '#dc2626' : MINT_DEEP }}>
                        {isExpiringSoon ? '⚠ Expira pronto' : '✓ QR activo'}
                      </span>
                      <div style={{ fontFamily: FONT, fontSize: 10.5, color: '#9ca3af', textAlign: 'center', lineHeight: 1.5 }}>
                        Expira: {formatDateTime(activeToken.expiresAt)}
                      </div>
                      <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                        <button onClick={() => handleCopyUrl(table.numero, activeToken.token)} style={{ ...btnSecondary, flex: 1, height: 34, fontSize: 11.5, padding: 0, justifyContent: 'center' }}>
                          {copiedToken === activeToken.token ? '✓ Copiado' : '⊞ Copiar'}
                        </button>
                        <button onClick={() => handleDownloadQR(table.numero, activeToken.token)} style={{ ...btnIcon, fontSize: 13 }} title="Descargar PNG">↓</button>
                        <button onClick={() => handleGenerateQR(table.numero)} disabled={gen} style={{ ...btnIcon, fontSize: 13, opacity: gen ? 0.4 : 1 }} title="Regenerar">↺</button>
                        <button onClick={() => invalidateTableQR(activeToken.id)} style={{ ...btnIcon, color: '#f87171' }} title="Invalidar">✕</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ width: 148, height: 148, borderRadius: 14, border: '2px dashed #E5E5E5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#cbd5e1' }}>
                        <span style={{ fontSize: 34 }}>◈</span>
                        <span style={{ fontFamily: FONT, fontSize: 10.5, color: '#9ca3af' }}>Sin QR activo</span>
                      </div>
                      <button onClick={() => handleGenerateQR(table.numero)} disabled={gen} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', opacity: gen ? 0.5 : 1 }}>
                        {gen ? 'Generando…' : '◈ Generar QR'}
                      </button>
                    </>
                  )}
                </div>

                {/* Footer: estado + acciones de mesa */}
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid #F2F2F2' }}>
                  <span style={{ fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: table.activa ? MINT_DEEP : '#9ca3af' }}>
                    {table.activa ? '✓ Activa' : 'Desactivada'}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setEditingTable(table.id)} style={{ ...btnIcon, width: 30, height: 30, fontSize: 13 }} title="Editar mesa">✎</button>
                    <button onClick={() => setDeleteConfirm(table.id)} style={{ ...btnIcon, width: 30, height: 30, fontSize: 13, color: '#f87171' }} title="Eliminar mesa">✕</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Nota de seguridad */}
      {tables.length > 0 && (
        <div style={{ ...card, padding: '12px 16px', background: '#FAFAFA' }}>
          <p style={{ fontFamily: FONT, fontSize: 11.5, color: '#9ca3af', margin: 0, lineHeight: 1.6 }}>
            <b style={{ color: '#6b7280' }}>Seguridad:</b> cada QR usa un token único de 32 caracteres, expira automáticamente a los {config.tiempoExpiracionSesionMinutos} min y queda vinculado a su mesa. Al cerrar la cuenta de una mesa, su QR se invalida.
          </p>
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
                {numeroActivoExiste(parseInt(newTableNumber)) && (
                  <p style={{ fontFamily: FONT, fontSize: 11, color: '#ef4444', margin: '4px 0 0' }}>La mesa {newTableNumber} ya está activa</p>
                )}
                {!!config.maxMesas && config.maxMesas > 0 && parseInt(newTableNumber) > config.maxMesas && (
                  <p style={{ fontFamily: FONT, fontSize: 11, color: '#ef4444', margin: '4px 0 0' }}>
                    El total configurado es {config.maxMesas} mesas. Aumentalo en Configuración para crear más.
                  </p>
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
              <button onClick={handleAddTable} disabled={!newTableNumber || numeroActivoExiste(parseInt(newTableNumber))}
                style={{ ...btnPrimary, flex: 1, justifyContent: 'center', opacity: (!newTableNumber || numeroActivoExiste(parseInt(newTableNumber))) ? 0.4 : 1 }}>
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

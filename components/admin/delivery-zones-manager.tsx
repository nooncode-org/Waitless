'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'
import type { DeliveryZone } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MINT = '#BEEBBE'
const MINT_DEEP = '#0a3a0a'

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price)

interface ZoneForm { nombre: string; costoEnvio: number; tiempoEstimado: number; activa: boolean }
const EMPTY_FORM: ZoneForm = { nombre: '', costoEnvio: 0, tiempoEstimado: 30, activa: true }

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, borderRadius: 8,
  border: '1px solid #E5E5E5',
  padding: '0 10px', fontSize: 13, fontFamily: FONT,
  outline: 'none', boxSizing: 'border-box',
  background: '#fff', color: '#111',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: '#9CA3AF', marginBottom: 4,
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: checked ? MINT_DEEP : '#D1D5DB',
        border: 'none', cursor: 'pointer',
        position: 'relative', transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: 3, left: checked ? 21 : 3,
        width: 16, height: 16,
        borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s',
        display: 'block',
      }} />
    </button>
  )
}

export function DeliveryZonesManager() {
  const { deliveryZones, updateDeliveryZone, addDeliveryZone } = useApp()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null)
  const [formData, setFormData] = useState<ZoneForm>(EMPTY_FORM)

  const resetForm = () => setFormData(EMPTY_FORM)

  const handleAdd = () => {
    if (!formData.nombre.trim()) return
    addDeliveryZone({ nombre: formData.nombre.trim(), costoEnvio: formData.costoEnvio, tiempoEstimado: formData.tiempoEstimado, activa: formData.activa })
    resetForm()
    setShowAddDialog(false)
  }

  const handleEdit = () => {
    if (!editingZone) return
    updateDeliveryZone(editingZone.nombre, { costoEnvio: formData.costoEnvio, tiempoEstimado: formData.tiempoEstimado, activa: formData.activa })
    setEditingZone(null)
    resetForm()
  }

  const openEditDialog = (zone: DeliveryZone) => {
    setEditingZone(zone)
    setFormData({ nombre: zone.nombre, costoEnvio: zone.costoEnvio, tiempoEstimado: zone.tiempoEstimado, activa: zone.activa })
  }

  const activeZones = deliveryZones.filter(z => z.activa).length

  const dialogCard: React.CSSProperties = {
    width: '100%', maxWidth: 360,
    background: '#fff', borderRadius: 20,
    boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
    overflow: 'hidden', fontFamily: FONT,
  }

  const dialogHeader: React.CSSProperties = {
    padding: '18px 20px 14px',
    borderBottom: '1px solid #F3F4F6',
  }

  const dialogFooter: React.CSSProperties = {
    padding: '14px 20px',
    borderTop: '1px solid #F3F4F6',
    display: 'flex', gap: 8,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 900, color: '#111', margin: 0 }}>Zonas de Reparto</h2>
          <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
            {activeZones} de {deliveryZones.length} zonas activas
          </p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          style={{
            height: 36, padding: '0 14px', borderRadius: 10,
            background: '#111', color: '#fff',
            border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 700, fontFamily: FONT,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{ fontSize: 14 }}>+</span> Nueva Zona
        </button>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid #E5E5E5', borderRadius: 14, background: '#fff', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                {['Zona', 'Costo Envío', 'Tiempo Est.', 'Activa', ''].map((h, i) => (
                  <th
                    key={h || i}
                    style={{
                      padding: '10px 16px',
                      fontWeight: 600, color: '#9CA3AF',
                      textAlign: i === 0 ? 'left' : i >= 3 ? 'center' : 'right',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deliveryZones.map((zone, idx) => (
                <tr
                  key={zone.nombre}
                  style={{
                    borderTop: idx > 0 ? '1px solid #F9FAFB' : undefined,
                    opacity: zone.activa ? 1 : 0.45,
                  }}
                >
                  <td style={{ padding: '10px 16px', fontWeight: 600, color: '#111' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#9CA3AF', fontSize: 13 }}>◎</span>
                      {zone.nombre}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: '#374151' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      <span style={{ color: '#9CA3AF', fontSize: 11 }}>$</span>
                      {formatPrice(zone.costoEnvio)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: '#6B7280' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      <span style={{ color: '#9CA3AF', fontSize: 11 }}>⏱</span>
                      {zone.tiempoEstimado} min
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                    <ToggleSwitch
                      checked={zone.activa}
                      onChange={() => updateDeliveryZone(zone.nombre, { activa: !zone.activa })}
                    />
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => openEditDialog(zone)}
                      style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'none', border: '1px solid #E5E5E5',
                        cursor: 'pointer', fontSize: 12, color: '#6B7280',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      ✎
                    </button>
                  </td>
                </tr>
              ))}
              {deliveryZones.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: '#9CA3AF', fontSize: 28 }}>
                    Ø
                    <p style={{ fontSize: 12, marginTop: 8, color: '#9CA3AF' }}>No hay zonas configuradas</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Dialog */}
      {showAddDialog && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', padding: 16, fontFamily: FONT,
        }}>
          <div style={dialogCard}>
            <div style={dialogHeader}>
              <h3 style={{ fontSize: 13, fontWeight: 900, color: '#111', margin: 0 }}>Nueva Zona de Reparto</h3>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Nombre de la Zona</label>
                <input
                  style={inputStyle}
                  placeholder="Ej: Polanco, Roma Norte..."
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Costo de Envío ($)</label>
                  <input
                    style={inputStyle}
                    type="number" min="0" step="5"
                    value={formData.costoEnvio}
                    onChange={(e) => setFormData(prev => ({ ...prev, costoEnvio: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Tiempo Estimado (min)</label>
                  <input
                    style={inputStyle}
                    type="number" min="10" step="5"
                    value={formData.tiempoEstimado}
                    onChange={(e) => setFormData(prev => ({ ...prev, tiempoEstimado: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>Zona Activa</span>
                <ToggleSwitch
                  checked={formData.activa}
                  onChange={(v) => setFormData(prev => ({ ...prev, activa: v }))}
                />
              </div>
            </div>
            <div style={dialogFooter}>
              <button
                onClick={() => { setShowAddDialog(false); resetForm() }}
                style={{
                  flex: 1, height: 36, borderRadius: 10,
                  border: '1px solid #E5E5E5', background: '#fff',
                  color: '#374151', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: FONT,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                disabled={!formData.nombre.trim()}
                style={{
                  flex: 1, height: 36, borderRadius: 10,
                  border: 'none', background: '#111',
                  color: '#fff', fontSize: 12, fontWeight: 700,
                  cursor: formData.nombre.trim() ? 'pointer' : 'not-allowed',
                  opacity: formData.nombre.trim() ? 1 : 0.4, fontFamily: FONT,
                }}
              >
                Agregar Zona
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editingZone && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', padding: 16, fontFamily: FONT,
        }}>
          <div style={dialogCard}>
            <div style={dialogHeader}>
              <h3 style={{ fontSize: 13, fontWeight: 900, color: '#111', margin: 0 }}>
                Editar Zona: {editingZone.nombre}
              </h3>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Costo de Envío ($)</label>
                  <input
                    style={inputStyle}
                    type="number" min="0" step="5"
                    value={formData.costoEnvio}
                    onChange={(e) => setFormData(prev => ({ ...prev, costoEnvio: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Tiempo Estimado (min)</label>
                  <input
                    style={inputStyle}
                    type="number" min="10" step="5"
                    value={formData.tiempoEstimado}
                    onChange={(e) => setFormData(prev => ({ ...prev, tiempoEstimado: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>Zona Activa</span>
                <ToggleSwitch
                  checked={formData.activa}
                  onChange={(v) => setFormData(prev => ({ ...prev, activa: v }))}
                />
              </div>
            </div>
            <div style={dialogFooter}>
              <button
                onClick={() => { setEditingZone(null); resetForm() }}
                style={{
                  flex: 1, height: 36, borderRadius: 10,
                  border: '1px solid #E5E5E5', background: '#fff',
                  color: '#374151', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: FONT,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleEdit}
                style={{
                  flex: 1, height: 36, borderRadius: 10,
                  border: 'none', background: '#111',
                  color: '#fff', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: FONT,
                }}
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

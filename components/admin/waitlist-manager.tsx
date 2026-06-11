'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'
import type { WaitlistEntry } from '@/lib/store'
import { S } from '@/lib/strings'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

const ESTADO_LABELS: Record<WaitlistEntry['estado'], string> = {
  esperando: 'Esperando',
  asignada:  'Asignada',
  cancelada: 'Cancelada',
  expirada:  'Expirada',
}

const ESTADO_COLORS: Record<WaitlistEntry['estado'], { bg: string; color: string }> = {
  esperando: { bg: '#FEF3C7', color: '#92400E' },
  asignada:  { bg: '#BEEBBE', color: '#0a3a0a' },
  cancelada: { bg: '#FEE2E2', color: '#991B1B' },
  expirada:  { bg: '#F5F5F5', color: '#666' },
}

function formatMinutesAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (mins < 1) return 'ahora mismo'
  if (mins === 1) return 'hace 1 min'
  return `hace ${mins} min`
}

interface AddFormState { nombre: string; telefono: string; personas: string; notas: string }
const EMPTY_FORM: AddFormState = { nombre: '', telefono: '', personas: '2', notas: '' }

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, padding: '0 10px', borderRadius: 8,
  border: '1px solid #E5E5E5', fontSize: 13, fontFamily: FONT,
  outline: 'none', boxSizing: 'border-box', background: '#fff',
}

export function WaitlistManager() {
  const { waitlist, addToWaitlist, updateWaitlistEntry, removeWaitlistEntry, tables, updateTable } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<AddFormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const activeEntries = waitlist.filter(e => e.estado === 'esperando' || e.estado === 'asignada')
  const pastEntries   = waitlist.filter(e => e.estado === 'cancelada' || e.estado === 'expirada')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) return
    setSubmitting(true)
    try {
      await addToWaitlist({
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || undefined,
        personas: Math.max(1, parseInt(form.personas, 10) || 1),
        notas: form.notas.trim() || undefined,
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAssign(entry: WaitlistEntry, mesa: number) {
    await updateWaitlistEntry(entry.id, { estado: 'asignada', mesaAsignada: mesa })
    const tableConfig = tables.find(t => t.numero === mesa)
    if (tableConfig && tableConfig.estado === 'disponible') {
      updateTable(tableConfig.id, { estado: 'hold' })
    }
  }

  async function handleCancel(entry: WaitlistEntry) {
    await updateWaitlistEntry(entry.id, { estado: 'cancelada' })
  }

  return (
    <section aria-label={S.waitlistTitle} style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{S.waitlistTitle}</h2>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            height: 32, padding: '0 14px', borderRadius: 10, border: showForm ? '1px solid #E5E5E5' : 'none',
            background: showForm ? '#fff' : '#000', color: showForm ? '#333' : '#fff',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {showForm ? `× ${S.cancel}` : `＋ ${S.waitlistAdd}`}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} style={{ border: '1px solid #E5E5E5', borderRadius: 14, padding: 14, background: '#FAFAFA', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#666' }}>{S.waitlistName} *</span>
              <input required value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: García" style={inputStyle} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#666' }}>{S.waitlistPhone}</span>
              <input value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} type="tel" placeholder="Ej: 11 1234-5678" style={inputStyle} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#666' }}>{S.waitlistGuests}</span>
              <input type="number" min={1} max={20} value={form.personas} onChange={e => setForm(p => ({ ...p, personas: e.target.value }))} style={inputStyle} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#666' }}>{S.waitlistNotes}</span>
              <input value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} placeholder="Ej: cumpleaños, silla de bebé" style={inputStyle} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }} style={{ height: 32, padding: '0 14px', borderRadius: 8, border: '1px solid #E5E5E5', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, color: '#333' }}>
              {S.cancel}
            </button>
            <button type="submit" disabled={submitting} style={{ height: 32, padding: '0 14px', borderRadius: 8, border: 'none', background: submitting ? '#CCC' : '#000', color: '#fff', fontSize: 12, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', fontFamily: FONT }}>
              {submitting ? S.loading : S.add}
            </button>
          </div>
        </form>
      )}

      {activeEntries.length === 0 ? (
        <div style={{ border: '1px dashed #E5E5E5', borderRadius: 12, padding: '32px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 24, margin: '0 0 6px' }}>⏳</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#666', margin: 0 }}>{S.emptyWaitlist}</p>
          <p style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{S.emptyWaitlistDesc}</p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activeEntries.map(entry => (
            <WaitlistCard key={entry.id} entry={entry} onAssign={handleAssign} onCancel={handleCancel} onRemove={removeWaitlistEntry} />
          ))}
        </ul>
      )}

      {pastEntries.length > 0 && (
        <details style={{ fontSize: 12, color: '#999' }}>
          <summary style={{ cursor: 'pointer', userSelect: 'none' }}>{pastEntries.length} entradas anteriores</summary>
          <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {pastEntries.map(entry => {
              const ec = ESTADO_COLORS[entry.estado]
              return (
                <li key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: '#FAFAFA' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: ec.bg, color: ec.color }}>{ESTADO_LABELS[entry.estado]}</span>
                  <span style={{ fontWeight: 600, color: '#333' }}>{entry.nombre}</span>
                  <span style={{ color: '#999' }}>{entry.personas} pers.</span>
                </li>
              )
            })}
          </ul>
        </details>
      )}
    </section>
  )
}

interface WaitlistCardProps {
  entry: WaitlistEntry
  onAssign: (entry: WaitlistEntry, mesa: number) => void
  onCancel: (entry: WaitlistEntry) => void
  onRemove: (id: string) => void
}

function WaitlistCard({ entry, onAssign, onCancel, onRemove }: WaitlistCardProps) {
  const [assigningMesa, setAssigningMesa] = useState(false)
  const [mesaValue, setMesaValue] = useState('')
  const ec = ESTADO_COLORS[entry.estado]

  function submitAssign(e: React.FormEvent) {
    e.preventDefault()
    const n = parseInt(mesaValue, 10)
    if (n > 0) { onAssign(entry, n); setAssigningMesa(false); setMesaValue('') }
  }

  return (
    <li style={{ border: '1px solid #E5E5E5', borderRadius: 14, padding: 12, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.nombre}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: ec.bg, color: ec.color, flexShrink: 0 }}>{ESTADO_LABELS[entry.estado]}</span>
          </div>
          <p style={{ fontSize: 12, color: '#666', margin: 0 }}>
            {entry.personas} {entry.personas === 1 ? 'persona' : 'personas'}
            {entry.telefono && ` · ${entry.telefono}`}
            {entry.mesaAsignada && ` · Mesa ${entry.mesaAsignada}`}
          </p>
          {entry.notas && <p style={{ fontSize: 12, color: '#999', fontStyle: 'italic', margin: '2px 0 0' }}>{entry.notas}</p>}
          <p style={{ fontSize: 10, color: '#999', margin: '2px 0 0', fontFamily: MONO }}>{formatMinutesAgo(entry.createdAt)}</p>
        </div>

        {entry.estado === 'esperando' && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => setAssigningMesa(v => !v)} style={{ height: 30, padding: '0 12px', borderRadius: 8, border: 'none', background: '#000', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>
              Mesa
            </button>
            <button onClick={() => onCancel(entry)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E5E5E5', background: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              ×
            </button>
          </div>
        )}
        {(entry.estado === 'cancelada' || entry.estado === 'expirada') && (
          <button onClick={() => onRemove(entry.id)} style={{ height: 28, padding: '0 10px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: 12, color: '#999', cursor: 'pointer', fontFamily: FONT }}>
            Eliminar
          </button>
        )}
      </div>

      {entry.estado === 'asignada' && entry.telefono && (
        <a
          href={`https://wa.me/${entry.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`¡Hola ${entry.nombre}! Tu mesa está lista. Puedes pasar cuando quieras. 🍽️`)}`}
          target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, height: 30, padding: '0 12px', borderRadius: 8, background: '#25D366', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: FONT }}
        >
          ↗ Notificar por WhatsApp
        </a>
      )}

      {assigningMesa && (
        <form onSubmit={submitAssign} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
          <input type="number" min={1} value={mesaValue} onChange={e => setMesaValue(e.target.value)} placeholder="Nro. de mesa" autoFocus style={{ width: 100, height: 32, padding: '0 10px', borderRadius: 8, border: '1px solid #E5E5E5', fontSize: 13, fontFamily: MONO, outline: 'none' }} />
          <button type="submit" style={{ height: 32, padding: '0 12px', borderRadius: 8, border: 'none', background: '#BEEBBE', color: '#0a3a0a', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>
            Asignar
          </button>
          <button type="button" onClick={() => setAssigningMesa(false)} style={{ height: 32, padding: '0 10px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: 12, color: '#999', cursor: 'pointer', fontFamily: FONT }}>
            {S.cancel}
          </button>
        </form>
      )}
    </li>
  )
}

'use client'

import React, { useState } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { User as UserType, UserRole } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

const ROLE_LABELS: Record<UserRole, string> = {
  admin:      'Admin',
  manager:    'Manager',
  mesero:     'Mesero',
  cocina:     'Cocina',
  repartidor: 'Repartidor',
}

function getRoleChip(role: UserRole): React.CSSProperties {
  if (role === 'admin')   return { background: '#000',              color: '#fff',             border: 'none' }
  if (role === 'manager') return { background: 'rgba(0,0,0,0.07)', color: 'rgba(0,0,0,0.55)', border: 'none' }
  return { background: 'transparent', color: '#000', border: '1px solid #E5E5E5' }
}

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function callUsersApi(
  method: 'POST' | 'PUT' | 'DELETE',
  body: Record<string, unknown>
): Promise<{ ok: boolean; error?: string; profile?: UserType }> {
  const token = await getToken()
  if (!token) return { ok: false, error: 'No hay sesión activa' }

  const res = await fetch('/api/admin/users', {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })

  const json = await res.json()
  if (!res.ok) return { ok: false, error: json.error ?? 'Error desconocido' }
  return { ok: true, profile: json.profile }
}

export function UsersManager() {
  const { users, refreshUsers, currentUser } = useApp()
  const [showAddDialog, setShowAddDialog]   = useState(false)
  const [editingUser, setEditingUser]       = useState<UserType | null>(null)
  const [togglingId, setTogglingId]         = useState<string | null>(null)

  const activeCount = users.filter(u => u.activo).length

  const handleToggleActive = async (user: UserType) => {
    if (user.id === currentUser?.id) return
    setTogglingId(user.id)
    const result = await callUsersApi('PUT', { userId: user.id, updates: { activo: !user.activo } })
    if (result.ok) {
      await refreshUsers()
      toast.success(`Usuario ${user.nombre} ${!user.activo ? 'activado' : 'desactivado'}`)
    } else {
      toast.error(result.error ?? 'No se pudo actualizar el usuario')
    }
    setTogglingId(null)
  }

  const handleSave = async (userData: Partial<UserType> & { password?: string }) => {
    if (editingUser) {
      const updates: Record<string, unknown> = {}
      if (userData.nombre)   updates.nombre   = userData.nombre
      if (userData.role)     updates.role     = userData.role
      if (userData.password) updates.password = userData.password

      const result = await callUsersApi('PUT', { userId: editingUser.id, updates })
      if (!result.ok) throw new Error(result.error ?? 'Error al actualizar')
      await refreshUsers()
      toast.success('Usuario actualizado')
    } else {
      const result = await callUsersApi('POST', {
        username: userData.username,
        password: userData.password,
        nombre:   userData.nombre,
        role:     userData.role,
      })
      if (!result.ok) throw new Error(result.error ?? 'Error al crear usuario')
      await refreshUsers()
      toast.success(`Usuario @${userData.username} creado`)
    }
    setShowAddDialog(false)
    setEditingUser(null)
  }

  const handleDelete = async (userId: string) => {
    const result = await callUsersApi('DELETE', { userId })
    if (result.ok) {
      await refreshUsers()
      toast.success('Usuario eliminado')
      setEditingUser(null)
    } else {
      toast.error(result.error ?? 'Error al eliminar usuario')
    }
  }

  const gridCols = '44px 1fr 120px 130px 60px'

  return (
    <div style={{ fontFamily: FONT }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#909090', fontWeight: 700 }}>
            Equipo
          </div>
          <h2 style={{ fontFamily: FONT, fontWeight: 700, letterSpacing: '-0.04em', fontSize: 24, margin: '4px 0 0' }}>
            {users.length} miembros · {activeCount} activos
          </h2>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            height: 36, padding: '0 16px', borderRadius: 999,
            background: '#000', color: '#fff',
            fontWeight: 700, fontSize: 12.5, border: 'none',
            cursor: 'pointer', fontFamily: FONT,
          }}
        >
          ＋ Invitar usuario
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 18 }}>
        {(Object.keys(ROLE_LABELS) as UserRole[]).map(role => {
          const count = users.filter(u => u.role === role).length
          return (
            <div key={role} style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14, padding: 14 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#909090', fontWeight: 700 }}>
                {ROLE_LABELS[role]}
              </div>
              <div style={{ fontFamily: FONT, fontWeight: 700, letterSpacing: '-0.04em', fontSize: 28, marginTop: 6 }}>
                {count}
              </div>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14, overflowX: 'auto' }}>

        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 14, alignItems: 'center', padding: '10px 16px', background: '#FAFAFA', borderBottom: '1px solid #E5E5E5', minWidth: 520 }}>
          {['', 'Usuario', 'Rol', 'Estado', ''].map((h, i) => (
            <span key={i} style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#909090', fontWeight: 700 }}>
              {h}
            </span>
          ))}
        </div>

        {users.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, letterSpacing: '-0.06em', fontSize: 64, color: 'rgba(0,0,0,0.08)', lineHeight: 1 }}>Ø</div>
            <div style={{ fontWeight: 700, letterSpacing: '-0.04em', fontSize: 20, marginTop: 14 }}>Sin usuarios</div>
          </div>
        ) : (
          users.map((user, i) => {
            const isCurrentUser = user.id === currentUser?.id
            const isToggling    = togglingId === user.id
            const initial       = (user.nombre || user.username || '?')[0].toUpperCase()
            const chipStyle     = getRoleChip(user.role)
            const isLast        = i === users.length - 1

            return (
              <div
                key={user.id}
                style={{
                  display: 'grid', gridTemplateColumns: gridCols, minWidth: 520,
                  gap: 14, alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: isLast ? 'none' : '1px solid #EFEFEF',
                  opacity: user.activo ? 1 : 0.55,
                  outline: isCurrentUser ? '2px solid #000' : 'none',
                  outlineOffset: -2,
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: '#000', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, letterSpacing: '-0.03em', fontSize: 13,
                }}>
                  {initial}
                </div>

                {/* Info */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {user.nombre}
                    {isCurrentUser && (
                      <span style={{ fontFamily: MONO, fontSize: 9.5, border: '1px solid #E5E5E5', borderRadius: 999, padding: '1px 6px', color: '#909090' }}>Tú</span>
                    )}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: '#909090', marginTop: 1 }}>
                    @{user.username}
                  </div>
                </div>

                {/* Role chip */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '3px 8px', borderRadius: 999,
                  fontFamily: MONO, fontSize: 10.5, fontWeight: 700,
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                  ...chipStyle,
                }}>
                  {ROLE_LABELS[user.role]}
                </span>

                {/* Status */}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <style>{`@keyframes umPulse{0%{box-shadow:0 0 0 0 rgba(190,235,190,0.85)}70%{box-shadow:0 0 0 6px rgba(190,235,190,0)}100%{box-shadow:0 0 0 0 rgba(190,235,190,0)}}`}</style>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: user.activo ? '#BEEBBE' : 'rgba(0,0,0,0.2)',
                    display: 'inline-block',
                    animation: user.activo ? 'umPulse 1.8s infinite' : 'none',
                  }} />
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: user.activo ? 700 : 400, color: user.activo ? '#000' : '#909090' }}>
                    {user.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </span>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                  {isToggling ? (
                    <span style={{ fontFamily: MONO, fontSize: 11, color: '#909090' }}>…</span>
                  ) : (
                    <button
                      onClick={() => handleToggleActive(user)}
                      disabled={isCurrentUser}
                      style={{
                        width: 30, height: 18, borderRadius: 999, position: 'relative',
                        background: user.activo ? '#BEEBBE' : 'rgba(0,0,0,0.12)',
                        border: 'none', cursor: isCurrentUser ? 'not-allowed' : 'pointer',
                        padding: 0, opacity: isCurrentUser ? 0.4 : 1,
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: 2, left: user.activo ? 14 : 2,
                        width: 14, height: 14, borderRadius: '50%',
                        background: '#fff', transition: 'left 0.15s', display: 'block',
                      }} />
                    </button>
                  )}
                  <button
                    onClick={() => setEditingUser(user)}
                    style={{ fontFamily: MONO, fontSize: 11, color: '#909090', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Editar
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {(showAddDialog || editingUser) && (
        <UserDialog
          user={editingUser}
          onClose={() => { setShowAddDialog(false); setEditingUser(null) }}
          onSave={handleSave}
          onDelete={editingUser && editingUser.id !== currentUser?.id ? () => handleDelete(editingUser.id) : undefined}
        />
      )}
    </div>
  )
}

interface UserDialogProps {
  user:      UserType | null
  onClose:   () => void
  onSave:    (userData: Partial<UserType> & { password?: string }) => Promise<void>
  onDelete?: () => void
}

function UserDialog({ user, onClose, onSave, onDelete }: UserDialogProps) {
  const [nombre, setNombre]     = useState(user?.nombre   || '')
  const [username, setUsername] = useState(user?.username || '')
  const [password, setPassword] = useState('')
  const [role, setRole]         = useState<UserRole>(user?.role || 'mesero')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!nombre.trim() || !username.trim() || (!user && !password.trim())) return
    setError(null)
    setLoading(true)
    try {
      await onSave({
        nombre:   nombre.trim(),
        username: username.trim(),
        role,
        ...(password.trim() ? { password: password.trim() } : {}),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    height: 42, padding: '0 14px',
    border: '1px solid #E5E5E5', borderRadius: 10,
    fontSize: 14, letterSpacing: '-0.01em',
    fontFamily: FONT, outline: 'none', background: '#fff',
    width: '100%', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: MONO, fontSize: 10.5,
    textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700,
    display: 'block', marginBottom: 6,
  }

  const canSubmit = nombre.trim() && username.trim() && (!!user || password.trim())

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 24px 64px -16px rgba(0,0,0,0.35)', fontFamily: FONT }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E5E5E5' }}>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.03em' }}>
            {user ? 'Editar usuario' : 'Agregar usuario'}
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E5E5E5', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>✕</button>
        </div>

        {/* Fields */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ fontSize: 12.5, color: '#991B1B', background: '#FEE2E2', borderRadius: 10, padding: '10px 14px' }}>
              {error}
            </div>
          )}

          <div>
            <label style={labelStyle}>Nombre completo</label>
            <input style={inputStyle} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Juan Pérez" disabled={loading} />
          </div>

          <div>
            <label style={labelStyle}>Usuario</label>
            <input style={{ ...inputStyle, opacity: (loading || !!user) ? 0.5 : 1 }} value={username} onChange={e => setUsername(e.target.value)} placeholder="juanperez" disabled={loading || !!user} />
          </div>

          <div>
            <label style={labelStyle}>
              Contraseña{user ? ' (vacío = sin cambios)' : ''}
            </label>
            <input type="password" style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" disabled={loading} />
          </div>

          <div>
            <label style={labelStyle}>Rol</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
              disabled={loading}
              style={{ ...inputStyle, cursor: 'pointer', appearance: 'auto' }}
            >
              {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #E5E5E5', display: 'flex', gap: 8 }}>
          {onDelete && (
            <button
              onClick={onDelete}
              disabled={loading}
              style={{ height: 44, padding: '0 14px', borderRadius: 999, border: '1px solid #FCA5A5', background: '#fff', color: '#991B1B', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, opacity: loading ? 0.5 : 1 }}
            >
              Eliminar
            </button>
          )}
          <button
            onClick={onClose}
            disabled={loading}
            style={{ flex: 1, height: 44, borderRadius: 999, border: '1px solid #E5E5E5', background: '#fff', color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            style={{ flex: 1, height: 44, borderRadius: 999, border: 'none', background: '#000', color: '#fff', fontSize: 13, fontWeight: 700, cursor: canSubmit && !loading ? 'pointer' : 'not-allowed', fontFamily: FONT, opacity: (!canSubmit || loading) ? 0.4 : 1 }}
          >
            {loading ? '…' : user ? 'Guardar' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'
import { canDo } from '@/lib/permissions'
import { TablesManager } from './tables-manager'
import { QRManager } from './qr-manager'
import { TableHistory } from './table-history'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"

type MesasTab = 'live' | 'config' | 'history'

export function MesasHub() {
  const { currentUser } = useApp()
  const role = currentUser?.role
  const canConfig = canDo(role, 'gestionar_usuarios')

  const tabs: { id: MesasTab; label: string; icon: string }[] = [
    { id: 'live',    label: 'En vivo',       icon: '⊞' },
    ...(canConfig ? [{ id: 'config' as MesasTab, label: 'Configuración', icon: '◈' }] : []),
    { id: 'history', label: 'Historial',     icon: '⏱' },
  ]

  const [tab, setTab] = useState<MesasTab>('live')
  const activeTab = tabs.some(t => t.id === tab) ? tab : 'live'

  return (
    <div style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Tab bar */}
      <div
        role="tablist"
        style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E5E5E5', marginBottom: 16, flexShrink: 0, overflowX: 'auto' }}
      >
        {tabs.map(t => {
          const active = activeTab === t.id
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              style={{
                fontFamily: FONT,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: active ? 800 : 600,
                color: active ? '#111' : '#9ca3af',
                background: 'none',
                border: 'none',
                borderBottom: active ? '2px solid #111' : '2px solid transparent',
                marginBottom: -1,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.01em',
              }}
            >
              <span style={{ fontSize: 14 }}>{t.icon}</span>
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Panel */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {activeTab === 'live'    && <TablesManager />}
        {activeTab === 'config'  && canConfig && <QRManager />}
        {activeTab === 'history' && <TableHistory />}
      </div>
    </div>
  )
}

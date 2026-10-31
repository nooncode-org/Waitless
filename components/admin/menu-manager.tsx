'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/context'
import { canDo } from '@/lib/permissions'
import { formatPrice, type MenuItem } from '@/lib/store'
import { MenuItemDialog } from './menu-item-dialog'
import { supabase } from '@/lib/supabase'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

const PALETTES = [
  'linear-gradient(135deg,#3a1c0a,#0e0805)',
  'linear-gradient(135deg,#3a2a18,#1a0e08)',
  'linear-gradient(135deg,#2a1810,#1a0e08)',
  'linear-gradient(135deg,#2a1f12,#10080a)',
  'linear-gradient(135deg,#1a2a1a,#081a08)',
  'linear-gradient(135deg,#2a1f2a,#10081a)',
]

function Toggle({ on, onChange }: { on: boolean; onChange?: () => void }) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onChange?.() }}
      style={{
        width: 30, height: 18, borderRadius: 999, position: 'relative',
        background: on ? '#BEEBBE' : 'rgba(0,0,0,0.12)',
        border: 'none', cursor: onChange ? 'pointer' : 'default', padding: 0, flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: on ? 14 : 2,
        width: 14, height: 14, borderRadius: 999,
        background: '#fff', transition: 'left 0.15s', display: 'block',
      }} />
    </button>
  )
}

export function MenuManager() {
  const { menuItems, updateMenuItem, categories, ingredients, currentUser, config, updateConfig, tenantSlug, hasPlanFeature } = useApp()
  const role = currentUser?.role
  const canWhiteLabel = hasPlanFeature('white_label')
  const canEditMenu   = canDo(role, 'editar_menu')
  const canEditConfig = canDo(role, 'editar_config')

  const uploadBrandingImage = async (file: File): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    const fd = new FormData()
    fd.append('file', file)
    fd.append('bucket', 'menu-images')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30_000)
    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
        signal: controller.signal,
      })
      if (!res.ok) return null
      const json = await res.json()
      return json.url ?? null
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  const [copied, setCopied]               = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)
  const [customSaved, setCustomSaved]     = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const logoInputRef  = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [localBranding, setLocalBranding] = useState({
    restaurantName:    config.restaurantName    ?? '',
    logoUrl:           config.logoUrl           ?? '',
    coverUrl:          config.coverUrl          ?? '',
    descripcion:       config.descripcion       ?? '',
    whatsappNumero:    config.whatsappNumero     ?? '',
    primaryColor:      config.primaryColor      ?? '#000000',
    accentColor:       config.accentColor       ?? '#BEBEBE',
    poweredByWaitless: config.poweredByWaitless ?? true,
  })

  useEffect(() => {
    if (showCustomize) {
      setLocalBranding({
        restaurantName:    config.restaurantName    ?? '',
        logoUrl:           config.logoUrl           ?? '',
        coverUrl:          config.coverUrl          ?? '',
        descripcion:       config.descripcion       ?? '',
        whatsappNumero:    config.whatsappNumero     ?? '',
        primaryColor:      config.primaryColor      ?? '#000000',
        accentColor:       config.accentColor       ?? '#BEBEBE',
        poweredByWaitless: config.poweredByWaitless ?? true,
      })
    }
  }, [showCustomize, config])

  const handleSaveBranding = () => {
    updateConfig(localBranding)
    setCustomSaved(true)
    setTimeout(() => setCustomSaved(false), 2000)
  }

  const menuUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/menu/${tenantSlug ?? 'default'}`
    : `/menu/${tenantSlug ?? 'default'}`

  const handleCopyUrl = () => {
    if (!menuUrl) return
    navigator.clipboard.writeText(menuUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const calculateItemCost = (item: MenuItem): number => {
    if (!item.receta || item.receta.length === 0) return 0
    return item.receta.reduce((total, ri) => {
      const ing = ingredients.find(i => i.id === ri.ingredientId)
      return total + (ing ? ing.costoUnitario * ri.cantidad : 0)
    }, 0)
  }

  const [showDialog, setShowDialog]   = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await updateMenuItem(item.id, { disponible: !item.disponible })
    } catch {
      // optimistic revert ya se aplicó en updateMenuItem
    }
  }

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item)
    setShowDialog(true)
  }

  const handleAdd = () => {
    setEditingItem(null)
    setShowDialog(true)
  }

  const handleCloseDialog = () => {
    setShowDialog(false)
    setEditingItem(null)
  }

  const sortedCategories = [...categories]
    .filter(c => c.activa)
    .sort((a, b) => a.orden - b.orden)

  const uncategorized = menuItems.filter(item => !categories.some(c => c.id === item.categoria))

  const effectiveCatId = selectedCatId ?? sortedCategories[0]?.id ?? '__none__'

  const catItems = effectiveCatId === '__none__'
    ? uncategorized
    : menuItems.filter(item => item.categoria === effectiveCatId)

  const activeCategory = effectiveCatId === '__none__'
    ? 'Sin categoría'
    : (sortedCategories.find(c => c.id === effectiveCatId)?.nombre ?? '')

  const inputStyle: React.CSSProperties = {
    height: 42, padding: '0 14px',
    border: '1px solid #E5E5E5', borderRadius: 10,
    fontSize: 14, letterSpacing: '-0.01em',
    fontFamily: FONT, outline: 'none', background: '#fff',
    width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{ fontFamily: FONT }}>
      <style>{`
        .mm-header{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin-bottom:18px;flex-wrap:wrap}
        .mm-title{font-size:24px}
        .mm-layout{display:grid;grid-template-columns:240px 1fr;gap:16px}
        .mm-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        @media(max-width:900px){.mm-layout{grid-template-columns:1fr}.mm-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:560px){.mm-title{font-size:20px}.mm-grid{grid-template-columns:repeat(2,1fr);gap:10px}}
      `}</style>

      {/* Header */}
      <div className="mm-header">
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#909090', fontWeight: 700 }}>
            Catálogo
          </div>
          <h2 className="mm-title" style={{ fontFamily: FONT, fontWeight: 700, letterSpacing: '-0.04em', margin: '4px 0 0' }}>
            {menuItems.length} items · {sortedCategories.length} categorías
          </h2>
        </div>
        {canEditMenu && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleAdd}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                height: 36, padding: '0 16px', borderRadius: 999,
                background: '#fff', color: '#000',
                fontWeight: 700, fontSize: 12.5,
                border: '1px solid #E5E5E5', cursor: 'pointer', fontFamily: FONT,
              }}
            >
              ＋ Categoría
            </button>
            <button
              onClick={handleAdd}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                height: 36, padding: '0 16px', borderRadius: 999,
                background: '#000', color: '#fff',
                fontWeight: 700, fontSize: 12.5,
                border: 'none', cursor: 'pointer', fontFamily: FONT,
              }}
            >
              ＋ Item
            </button>
          </div>
        )}
      </div>

      {/* URL banner */}
      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14, overflow: 'hidden', marginBottom: 18 }}>
        <div style={{ padding: '14px 16px 10px' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#909090', fontWeight: 700, marginBottom: 4 }}>
            Menú digital público
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11.5, color: '#909090', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {menuUrl}
          </div>
        </div>
        <div style={{ display: 'flex', borderTop: '1px solid #E5E5E5' }}>
          <button
            onClick={handleCopyUrl}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              height: 40, fontSize: 12.5, fontWeight: 700, color: copied ? '#0a3a0a' : '#000',
              background: copied ? '#BEEBBE' : '#fff', border: 'none', cursor: 'pointer', fontFamily: FONT,
            }}
          >
            {copied ? '✓ Copiado' : 'Copiar enlace'}
          </button>
          {canEditConfig && (
            <button
              onClick={() => setShowCustomize(true)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                height: 40, fontSize: 12.5, fontWeight: 700, color: '#000',
                background: '#fff', border: 'none', borderLeft: '1px solid #E5E5E5',
                cursor: 'pointer', fontFamily: FONT,
              }}
            >
              Personalizar
            </button>
          )}
          <a
            href={menuUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              height: 40, fontSize: 12.5, fontWeight: 700, color: '#fff',
              background: '#000', borderLeft: '1px solid #E5E5E5',
              textDecoration: 'none', fontFamily: FONT,
            }}
          >
            Ver menú ↗
          </a>
        </div>
      </div>

      {/* Two-column layout (apila en móvil) */}
      <div className="mm-layout">

        {/* Category list */}
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#909090', marginBottom: 10 }}>
            Categorías
          </div>
          <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14, overflow: 'hidden' }}>
            {sortedCategories.map((cat, i) => {
              const count   = menuItems.filter(item => item.categoria === cat.id).length
              const isActive = effectiveCatId === cat.id
              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px',
                    borderBottom: i < sortedCategories.length - 1 ? '1px solid #EFEFEF' : 'none',
                    cursor: 'pointer',
                    background: isActive ? '#000' : '#fff',
                    color: isActive ? '#fff' : '#000',
                  }}
                >
                  <div style={{ flex: 1, fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.02em' }}>
                    {cat.nombre}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: isActive ? 'rgba(255,255,255,0.6)' : '#909090' }}>
                    {count}
                  </div>
                  <div style={{
                    width: 28, height: 16, borderRadius: 999, position: 'relative',
                    background: '#BEEBBE', flexShrink: 0,
                  }}>
                    <span style={{
                      position: 'absolute', top: 2, left: 14,
                      width: 12, height: 12, borderRadius: 999, background: '#fff',
                    }} />
                  </div>
                </div>
              )
            })}
            {uncategorized.length > 0 && (
              <div
                onClick={() => setSelectedCatId('__none__')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', cursor: 'pointer',
                  background: effectiveCatId === '__none__' ? '#000' : '#fff',
                  color: effectiveCatId === '__none__' ? '#fff' : '#000',
                  borderTop: sortedCategories.length > 0 ? '1px solid #EFEFEF' : 'none',
                }}
              >
                <div style={{ flex: 1, fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.02em' }}>Sin categoría</div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: effectiveCatId === '__none__' ? 'rgba(255,255,255,0.6)' : '#909090' }}>
                  {uncategorized.length}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Item grid */}
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#909090', marginBottom: 10 }}>
            Items · {catItems.length} — {activeCategory}
          </div>

          {catItems.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontFamily: FONT, fontWeight: 700, letterSpacing: '-0.06em', fontSize: 64, color: 'rgba(0,0,0,0.08)', lineHeight: 1 }}>Ø</div>
              <div style={{ fontWeight: 700, letterSpacing: '-0.04em', fontSize: 20, marginTop: 14 }}>Sin items</div>
              <div style={{ fontFamily: MONO, fontSize: 11.5, color: '#909090', marginTop: 6 }}>
                Agregá el primer item con el botón de arriba.
              </div>
            </div>
          ) : (
            <div className="mm-grid">
              {catItems.map((item, idx) => {
                const cost   = calculateItemCost(item)
                const margin = cost > 0 ? Math.round(((item.precio - cost) / item.precio) * 100) : null
                const pal    = PALETTES[idx % PALETTES.length]
                return (
                  <div
                    key={item.id}
                    onClick={() => canEditMenu && handleEdit(item)}
                    style={{
                      background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14,
                      overflow: 'hidden', cursor: canEditMenu ? 'pointer' : 'default',
                      display: 'flex', flexDirection: 'column',
                    }}
                  >
                    {/* Photo */}
                    <div style={{ aspectRatio: '5/3', position: 'relative', background: item.imagen ? '#000' : pal }}>
                      {item.imagen && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imagen} alt={item.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      )}
                      {!item.disponible && (
                        <span style={{
                          position: 'absolute', top: 8, left: 8,
                          display: 'inline-flex', alignItems: 'center',
                          padding: '3px 8px', borderRadius: 999,
                          fontFamily: MONO, fontSize: 10.5, fontWeight: 700,
                          letterSpacing: '0.04em', textTransform: 'uppercase',
                          background: '#FEE2E2', color: '#991B1B',
                        }}>
                          Agotado
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em' }}>{item.nombre}</div>
                      <div style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700, marginTop: 2 }}>{formatPrice(item.precio)}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                        <span style={{
                          fontFamily: MONO, fontSize: 10.5,
                          color: margin === null ? '#909090' : margin >= 60 ? '#0a3a0a' : margin >= 40 ? '#92400E' : '#991B1B',
                        }}>
                          {margin !== null ? `${margin}% margen` : '—'}
                        </span>
                        <Toggle on={item.disponible} onChange={() => handleToggleAvailability(item)} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showDialog && (
        <MenuItemDialog item={editingItem} onClose={handleCloseDialog} />
      )}

      {/* Customize modal */}
      {showCustomize && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          className="sm:items-center">
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowCustomize(false)} />
          <div style={{
            position: 'relative', zIndex: 10, width: '100%', maxWidth: 440,
            background: '#fff', borderRadius: '16px 16px 0 0', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', maxHeight: '90vh',
            fontFamily: FONT,
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E5E5E5' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em' }}>Personalizar menú</div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: '#909090', marginTop: 2 }}>Apariencia de la página pública</div>
              </div>
              <button
                onClick={() => setShowCustomize(false)}
                style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E5E5E5', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#000' }}
              >✕</button>
            </div>

            {/* Fields */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Identidad */}
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#909090', fontWeight: 700, marginBottom: 10 }}>Identidad</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700 }}>Nombre del restaurante</label>
                    <input style={inputStyle} value={localBranding.restaurantName} onChange={e => setLocalBranding(p => ({ ...p, restaurantName: e.target.value }))} placeholder="Mi Restaurante" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700 }}>Descripción</label>
                    <textarea
                      style={{ ...inputStyle, height: 'auto', padding: '12px 14px', resize: 'vertical' }}
                      rows={2} maxLength={200}
                      value={localBranding.descripcion}
                      onChange={e => setLocalBranding(p => ({ ...p, descripcion: e.target.value }))}
                      placeholder="Breve descripción de tu restaurante..."
                    />
                    <div style={{ fontFamily: MONO, fontSize: 9.5, color: '#909090', textAlign: 'right' }}>{localBranding.descripcion.length}/200</div>
                  </div>
                </div>
              </div>

              {/* Imágenes */}
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#909090', fontWeight: 700, marginBottom: 10 }}>Imágenes</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Logo */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700 }}>Logo</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {localBranding.logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={localBranding.logoUrl} alt="Logo" style={{ height: 40, width: 40, objectFit: 'cover', borderRadius: 8, border: '1px solid #E5E5E5', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      )}
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        style={{ flex: 1, height: 40, borderRadius: 10, border: '1px dashed rgba(0,0,0,0.2)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12.5, color: '#909090', cursor: 'pointer', fontFamily: FONT, opacity: uploadingLogo ? 0.5 : 1 }}
                      >
                        ↑ {uploadingLogo ? 'Subiendo...' : localBranding.logoUrl ? 'Cambiar logo' : 'Subir logo'}
                      </button>
                      <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setUploadingLogo(true)
                        try {
                          const url = await uploadBrandingImage(file)
                          if (url) setLocalBranding(p => ({ ...p, logoUrl: url }))
                        } finally { setUploadingLogo(false); e.target.value = '' }
                      }} />
                    </div>
                  </div>

                  {/* Portada */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700 }}>Imagen de portada</label>
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadingCover}
                      style={{ borderRadius: 10, border: '1px dashed rgba(0,0,0,0.2)', background: '#fff', overflow: 'hidden', cursor: 'pointer', opacity: uploadingCover ? 0.5 : 1, width: '100%' }}
                    >
                      {localBranding.coverUrl ? (
                        <div style={{ position: 'relative' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={localBranding.coverUrl} alt="Portada" style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} />
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, color: '#fff', fontFamily: FONT, fontWeight: 700 }}>
                            ↑ {uploadingCover ? 'Subiendo...' : 'Cambiar portada'}
                          </div>
                        </div>
                      ) : (
                        <div style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12.5, color: '#909090', fontFamily: FONT }}>
                          ↑ {uploadingCover ? 'Subiendo...' : 'Subir imagen de portada'}
                        </div>
                      )}
                    </button>
                    <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setUploadingCover(true)
                      try {
                        const url = await uploadBrandingImage(file)
                        if (url) setLocalBranding(p => ({ ...p, coverUrl: url }))
                      } finally { setUploadingCover(false); e.target.value = '' }
                    }} />
                  </div>
                </div>
              </div>

              {/* Contacto */}
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#909090', fontWeight: 700, marginBottom: 10 }}>Contacto</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700 }}>Número de WhatsApp</label>
                  <input style={inputStyle} value={localBranding.whatsappNumero} onChange={e => setLocalBranding(p => ({ ...p, whatsappNumero: e.target.value }))} placeholder="+54 11 1234 5678" />
                  <div style={{ fontFamily: MONO, fontSize: 9.5, color: '#909090' }}>Aparece como botón de contacto en el menú</div>
                </div>
              </div>

              {/* Colores */}
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#909090', fontWeight: 700, marginBottom: 10 }}>Colores</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {([
                    { key: 'primaryColor', label: 'Color primario' },
                    { key: 'accentColor',  label: 'Color acento' },
                  ] as const).map(({ key, label }) => (
                    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700 }}>{label}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42, borderRadius: 10, border: '1px solid #E5E5E5', padding: '0 12px', background: '#fff' }}>
                        <input
                          type="color"
                          value={localBranding[key]}
                          onChange={e => setLocalBranding(p => ({ ...p, [key]: e.target.value }))}
                          style={{ width: 24, height: 24, borderRadius: 6, cursor: 'pointer', border: 'none', padding: 0, background: 'transparent' }}
                        />
                        <span style={{ fontFamily: MONO, fontSize: 12, color: '#909090' }}>{localBranding[key]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opciones */}
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#909090', fontWeight: 700, marginBottom: 10 }}>Opciones</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, padding: '0 14px', borderRadius: 10, border: '1px solid #E5E5E5', background: '#fff' }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em' }}>Powered by WAITLESS {!canWhiteLabel && <span style={{ fontFamily: MONO, fontSize: 10, color: '#92400E' }}>· Enterprise</span>}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10.5, color: '#909090', marginTop: 1 }}>{canWhiteLabel ? 'Muestra el badge al pie del menú' : 'Quitar el badge requiere plan Enterprise'}</div>
                  </div>
                  <Toggle on={canWhiteLabel ? localBranding.poweredByWaitless : true} onChange={canWhiteLabel ? () => setLocalBranding(p => ({ ...p, poweredByWaitless: !p.poweredByWaitless })) : undefined} />
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid #E5E5E5' }}>
              <button
                onClick={handleSaveBranding}
                style={{
                  width: '100%', height: 48, borderRadius: 999, border: 'none',
                  background: customSaved ? '#BEEBBE' : '#000',
                  color: customSaved ? '#0a3a0a' : '#fff',
                  fontFamily: FONT, fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', letterSpacing: '-0.01em',
                }}
              >
                {customSaved ? '✓ Guardado' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

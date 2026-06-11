'use client'

import { useState, useMemo } from 'react'
import { useApp } from '@/lib/context'
import type { Ingredient, IngredientCategory, InventoryAdjustment } from '@/lib/store'
import { DEFAULT_INGREDIENT_CATEGORIES } from '@/lib/store'
import { IngredientCategoryManager } from './ingredient-category-manager'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

const inp: React.CSSProperties = {
  height: 36, padding: '0 12px',
  border: '1px solid #E5E5E5', borderRadius: 10,
  fontSize: 13.5, letterSpacing: '-0.01em',
  fontFamily: FONT, outline: 'none', background: '#fff',
  width: '100%', boxSizing: 'border-box',
}

function getStockState(ingredient: Ingredient): 'ok' | 'warn' | 'err' {
  if (ingredient.stockActual <= 0) return 'err'
  if (ingredient.stockActual <= ingredient.stockMinimo) return 'err'
  if (ingredient.cantidadMaxima > 0 && ingredient.stockActual <= ingredient.cantidadMaxima * 0.3) return 'warn'
  return 'ok'
}

export function InventoryManager() {
  const { ingredients, menuItems, getLowStockIngredients, adjustInventory, updateIngredient, addIngredient, inventoryAdjustments, users } = useApp()
  const [showAddDialog, setShowAddDialog]           = useState(false)
  const [showAdjustDialog, setShowAdjustDialog]     = useState<Ingredient | null>(null)
  const [showAdvancedDialog, setShowAdvancedDialog] = useState<Ingredient | null>(null)
  const [showHistoryDialog, setShowHistoryDialog]   = useState(false)
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [activeFilter, setActiveFilter]             = useState<'all' | 'low' | 'agotado'>('all')
  const [showDeleteBlockedDialog, setShowDeleteBlockedDialog] = useState<{ ingredient: Ingredient; reasons: string[] } | null>(null)

  const lowStockItems   = getLowStockIngredients().filter(i => i.activo !== false)
  const activeIngredients = ingredients.filter(i => i.activo !== false)
  const agotados        = activeIngredients.filter(i => i.stockActual <= 0)

  const displayItems =
    activeFilter === 'low'    ? lowStockItems :
    activeFilter === 'agotado' ? agotados :
    activeIngredients

  const getIngredientUsage = (ingredientId: string): string[] => {
    const reasons: string[] = []
    menuItems.forEach(menuItem => {
      if (menuItem.receta?.some(r => r.ingredientId === ingredientId)) reasons.push(`Receta de "${menuItem.nombre}"`)
      menuItem.extras?.forEach(extra => {
        if (extra.receta?.some(r => r.ingredientId === ingredientId)) reasons.push(`Extra "${extra.nombre}" en "${menuItem.nombre}"`)
      })
    })
    return reasons
  }

  const handleDeactivateIngredient = (ingredient: Ingredient) => {
    const usageReasons = getIngredientUsage(ingredient.id)
    if (usageReasons.length > 0) { setShowDeleteBlockedDialog({ ingredient, reasons: usageReasons }); return }
    if (!confirm('¿Seguro que querés eliminar este ingrediente?')) return
    updateIngredient(ingredient.id, { activo: false })
  }

  const gridCols = '1fr 80px 100px 200px 90px'

  return (
    <div style={{ fontFamily: FONT }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#909090', fontWeight: 700 }}>
            Inventario
          </div>
          <h2 style={{ fontFamily: FONT, fontWeight: 700, letterSpacing: '-0.04em', fontSize: 24, margin: '4px 0 0' }}>
            {activeIngredients.length} ingredientes · {lowStockItems.length} críticos
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowCategoryDialog(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 16px', borderRadius: 999, background: '#fff', color: '#000', fontWeight: 700, fontSize: 12.5, border: '1px solid #E5E5E5', cursor: 'pointer', fontFamily: FONT }}
          >
            Categorías
          </button>
          <button
            onClick={() => setShowHistoryDialog(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 16px', borderRadius: 999, background: '#fff', color: '#000', fontWeight: 700, fontSize: 12.5, border: '1px solid #E5E5E5', cursor: 'pointer', fontFamily: FONT }}
          >
            Historial
          </button>
          <button
            onClick={() => setShowAddDialog(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 16px', borderRadius: 999, background: '#000', color: '#fff', fontWeight: 700, fontSize: 12.5, border: 'none', cursor: 'pointer', fontFamily: FONT }}
          >
            ＋ Ingrediente
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {([
          { id: 'all',    label: `Todos · ${activeIngredients.length}`,   bg: activeFilter === 'all' ? '#000' : '#fff',     color: activeFilter === 'all' ? '#fff' : '#000',    border: activeFilter === 'all' ? '#000' : '#E5E5E5' },
          { id: 'low',    label: `Stock bajo · ${lowStockItems.length}`,  bg: activeFilter === 'low' ? '#FEF3C7' : '#fff',  color: activeFilter === 'low' ? '#92400E' : '#000', border: activeFilter === 'low' ? '#FEF3C7' : '#E5E5E5' },
          { id: 'agotado',label: `Agotados · ${agotados.length}`,         bg: activeFilter === 'agotado' ? '#FEE2E2' : '#fff', color: activeFilter === 'agotado' ? '#991B1B' : '#000', border: activeFilter === 'agotado' ? '#FEE2E2' : '#E5E5E5' },
        ] as const).map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 12px', height: 30, borderRadius: 999, fontSize: 12.5, fontWeight: 700, letterSpacing: '-0.01em', background: f.bg, color: f.color, border: `1px solid ${f.border}`, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: FONT }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {displayItems.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, letterSpacing: '-0.06em', fontSize: 64, color: 'rgba(0,0,0,0.08)', lineHeight: 1 }}>Ø</div>
          <div style={{ fontWeight: 700, letterSpacing: '-0.04em', fontSize: 20, marginTop: 14 }}>Sin ingredientes</div>
          <div style={{ fontFamily: MONO, fontSize: 11.5, color: '#909090', marginTop: 6 }}>
            {activeFilter === 'low' ? 'No hay ingredientes con stock bajo.' : activeFilter === 'agotado' ? 'No hay ingredientes agotados.' : 'Agregá el primer ingrediente.'}
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14, overflowX: 'auto' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 14, alignItems: 'center', padding: '10px 16px', background: '#FAFAFA', borderBottom: '1px solid #E5E5E5', minWidth: 600 }}>
            {['Ingrediente', 'Unidad', 'Stock', 'Nivel', ''].map((h, i) => (
              <span key={i} style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#909090', fontWeight: 700 }}>{h}</span>
            ))}
          </div>

          {displayItems.map((ingredient, i) => {
            const state           = getStockState(ingredient)
            const stockPct        = ingredient.cantidadMaxima > 0 ? Math.min(100, (ingredient.stockActual / ingredient.cantidadMaxima) * 100) : 0
            const barColor        = state === 'ok' ? '#BEEBBE' : state === 'warn' ? '#FBBF24' : '#DC2626'
            const stockColor      = state === 'err' ? '#991B1B' : state === 'warn' ? '#92400E' : '#000'
            const isLast          = i === displayItems.length - 1
            const inUse           = getIngredientUsage(ingredient.id).length > 0

            return (
              <div
                key={ingredient.id}
                style={{
                  display: 'grid', gridTemplateColumns: gridCols, minWidth: 600,
                  gap: 14, alignItems: 'center',
                  padding: '14px 16px',
                  borderBottom: isLast ? 'none' : '1px solid #EFEFEF',
                }}
              >
                {/* Ingrediente */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em' }}>{ingredient.nombre}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: '#909090', marginTop: 1 }}>
                    Mín: {ingredient.stockMinimo} · {ingredient.categoria}
                  </div>
                </div>

                {/* Unidad */}
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: '#909090' }}>{ingredient.unidad}</div>

                {/* Stock */}
                <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 13, color: stockColor }}>
                  {parseFloat(ingredient.stockActual.toFixed(2))}
                </div>

                {/* Level bar */}
                <div style={{ height: 6, background: 'rgba(0,0,0,0.07)', borderRadius: 999, overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', width: `${stockPct}%`, background: barColor }} />
                </div>

                {/* Action */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                  {state !== 'ok' ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '3px 8px', borderRadius: 999,
                      fontFamily: MONO, fontSize: 10.5, fontWeight: 700,
                      letterSpacing: '0.04em', textTransform: 'uppercase',
                      background: state === 'err' ? '#FEE2E2' : '#FEF3C7',
                      color: state === 'err' ? '#991B1B' : '#92400E',
                    }}>
                      {ingredient.stockActual <= 0 ? 'Agotado' : state === 'err' ? 'Crítico' : 'Bajo'}
                    </span>
                  ) : (
                    <button
                      onClick={() => setShowAdjustDialog(ingredient)}
                      style={{ fontFamily: MONO, fontSize: 11, color: '#909090', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Ajustar
                    </button>
                  )}
                  {state !== 'ok' && (
                    <button
                      onClick={() => setShowAdjustDialog(ingredient)}
                      style={{ fontFamily: MONO, fontSize: 11, color: '#909090', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Ajustar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Blocked Modal */}
      {showDeleteBlockedDialog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 24px 64px -16px rgba(0,0,0,0.35)', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.03em', color: '#991B1B' }}>No se puede eliminar</div>
            <p style={{ fontSize: 13.5, color: '#000' }}>
              <strong>{showDeleteBlockedDialog.ingredient.nombre}</strong> está en uso:
            </p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto', listStyle: 'none', padding: 0, margin: 0 }}>
              {showDeleteBlockedDialog.reasons.map((r, idx) => (
                <li key={idx} style={{ fontSize: 12.5, background: '#F4F4F2', borderRadius: 8, padding: '6px 10px' }}>{r}</li>
              ))}
            </ul>
            <div style={{ fontFamily: MONO, fontSize: 10.5, color: '#909090' }}>Removelo de todas las recetas antes de eliminarlo.</div>
            <button
              onClick={() => setShowDeleteBlockedDialog(null)}
              style={{ height: 44, borderRadius: 999, background: '#000', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: FONT }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {showAdjustDialog && (
        <AdjustStockDialog
          ingredient={showAdjustDialog}
          onClose={() => setShowAdjustDialog(null)}
          onAdjust={(tipo, cantidad, motivo) => { adjustInventory(showAdjustDialog.id, tipo, cantidad, motivo); setShowAdjustDialog(null) }}
          onUpdateIngredient={updateIngredient}
          onOpenAdvanced={(ingredient) => setShowAdvancedDialog(ingredient)}
        />
      )}

      {showAdvancedDialog && (
        <AdvancedIngredientDialog
          ingredient={showAdvancedDialog}
          onClose={() => setShowAdvancedDialog(null)}
          onSave={(updates, stockChange, reason) => {
            updateIngredient(showAdvancedDialog.id, updates)
            if (stockChange !== 0 && reason) adjustInventory(showAdvancedDialog.id, 'ajuste', Math.abs(stockChange), reason)
            setShowAdvancedDialog(null)
          }}
        />
      )}

      {showHistoryDialog && (
        <InventoryHistoryDialog
          adjustments={inventoryAdjustments}
          ingredients={ingredients}
          users={users}
          onClose={() => setShowHistoryDialog(false)}
        />
      )}

      {showAddDialog && (
        <AddIngredientDialog
          onClose={() => setShowAddDialog(false)}
          onAdd={(ingredient) => { addIngredient(ingredient); setShowAddDialog(false) }}
        />
      )}

      {showCategoryDialog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 440, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px -16px rgba(0,0,0,0.35)', fontFamily: FONT }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #E5E5E5' }}>
              <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.03em' }}>Categorías</span>
              <button onClick={() => setShowCategoryDialog(false)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E5E5E5', background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>✕</button>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 20px' }}>
              <IngredientCategoryManager />
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #E5E5E5' }}>
              <button onClick={() => setShowCategoryDialog(false)} style={{ width: '100%', height: 40, borderRadius: 999, border: '1px solid #E5E5E5', background: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Inventory History Dialog ──────────────────────────────────────────────────

interface InventoryHistoryDialogProps {
  adjustments: InventoryAdjustment[]
  ingredients: Ingredient[]
  users: { id: string; nombre: string }[]
  onClose: () => void
}

function InventoryHistoryDialog({ adjustments, ingredients, users, onClose }: InventoryHistoryDialogProps) {
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [filterType, setFilterType]             = useState<string>('all')
  const [filterIngredient, setFilterIngredient] = useState<string>('all')

  const filteredAdjustments = useMemo(() => {
    return adjustments
      .filter(adj => {
        const adjDate  = new Date(adj.createdAt)
        const adjMonth = `${adjDate.getFullYear()}-${String(adjDate.getMonth() + 1).padStart(2, '0')}`
        if (adjMonth !== filterMonth) return false
        if (filterType !== 'all' && adj.tipo !== filterType) return false
        if (filterIngredient !== 'all' && adj.ingredientId !== filterIngredient) return false
        return true
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [adjustments, filterMonth, filterType, filterIngredient])

  const getIngredientName = (id: string) => ingredients.find(i => i.id === id)?.nombre || 'Desconocido'
  const getUserName       = (id: string) => users.find(u => u.id === id)?.nombre || 'Sistema'
  const getTipoLabel      = (tipo: string) => ({ entrada: 'Entrada', salida: 'Salida', merma: 'Merma', ajuste: 'Ajuste' }[tipo] ?? tipo)

  function getTipoChip(tipo: string): React.CSSProperties {
    if (tipo === 'entrada') return { background: '#BEEBBE', color: '#0a3a0a' }
    if (tipo === 'salida')  return { background: '#FEF3C7', color: '#92400E' }
    if (tipo === 'merma')   return { background: '#FEE2E2', color: '#991B1B' }
    return { background: 'rgba(0,0,0,0.07)', color: 'rgba(0,0,0,0.55)' }
  }

  const monthOptions = useMemo(() => {
    const options = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d     = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
      options.push({ value, label })
    }
    return options
  }, [])

  const selStyle: React.CSSProperties = { ...inp, height: 36, cursor: 'pointer', appearance: 'auto' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px -16px rgba(0,0,0,0.35)', fontFamily: FONT, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #E5E5E5', flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.03em' }}>Historial de ajustes</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E5E5E5', background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>✕</button>
        </div>

        <div style={{ padding: '12px 20px', borderBottom: '1px solid #E5E5E5', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#909090', fontWeight: 700, marginBottom: 6 }}>Mes</div>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={selStyle}>
              {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#909090', fontWeight: 700, marginBottom: 6 }}>Tipo</div>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selStyle}>
              <option value="all">Todos</option>
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="merma">Merma</option>
              <option value="ajuste">Ajuste</option>
            </select>
          </div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#909090', fontWeight: 700, marginBottom: 6 }}>Ingrediente</div>
            <select value={filterIngredient} onChange={e => setFilterIngredient(e.target.value)} style={selStyle}>
              <option value="all">Todos</option>
              {ingredients.filter(i => i.activo).map(ing => <option key={ing.id} value={ing.id}>{ing.nombre}</option>)}
            </select>
          </div>
        </div>

        <div style={{ fontFamily: MONO, fontSize: 10.5, color: '#909090', padding: '8px 20px', borderBottom: '1px solid #E5E5E5', flexShrink: 0 }}>
          {filteredAdjustments.length} ajuste{filteredAdjustments.length !== 1 ? 's' : ''} encontrado{filteredAdjustments.length !== 1 ? 's' : ''}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredAdjustments.map(adj => (
            <div key={adj.id} style={{ border: '1px solid #E5E5E5', borderRadius: 12, padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getIngredientName(adj.ingredientId)}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 999, fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0, ...getTipoChip(adj.tipo) }}>
                      {getTipoLabel(adj.tipo)}
                    </span>
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: '#909090', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adj.motivo}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 13, color: adj.tipo === 'entrada' ? '#0a3a0a' : '#991B1B' }}>
                    {adj.tipo === 'entrada' ? '+' : '-'}{adj.cantidad}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: '#909090', marginTop: 2 }}>
                    {new Date(adj.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#909090', marginTop: 6 }}>
                Por: {getUserName(adj.userId)} — {new Date(adj.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
          {filteredAdjustments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontFamily: FONT, fontWeight: 700, letterSpacing: '-0.06em', fontSize: 48, color: 'rgba(0,0,0,0.08)', lineHeight: 1 }}>Ø</div>
              <div style={{ fontFamily: MONO, fontSize: 11.5, color: '#909090', marginTop: 10 }}>No hay ajustes en este periodo</div>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #E5E5E5', flexShrink: 0 }}>
          <button onClick={onClose} style={{ width: '100%', height: 40, borderRadius: 999, border: '1px solid #E5E5E5', background: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

// ── Advanced Ingredient Dialog ────────────────────────────────────────────────

interface AdvancedIngredientDialogProps {
  ingredient: Ingredient
  onClose: () => void
  onSave: (updates: Partial<Ingredient>, stockChange: number, reason: string) => void
}

function AdvancedIngredientDialog({ ingredient, onClose, onSave }: AdvancedIngredientDialogProps) {
  const { ingredients: allIngredients } = useApp()
  const [stockActual, setStockActual]     = useState(ingredient.stockActual.toString())
  const [stockMinimo, setStockMinimo]     = useState(ingredient.stockMinimo.toString())
  const [cantidadMaxima, setCantidadMaxima] = useState(ingredient.cantidadMaxima.toString())
  const [categoria, setCategoria]         = useState<IngredientCategory>(ingredient.categoria)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [motivo, setMotivo]               = useState('')
  const [motivoError, setMotivoError]     = useState(false)

  const originalStock = ingredient.stockActual
  const newStock      = parseFloat(stockActual) || 0
  const stockChanged  = Math.abs(newStock - originalStock) > 0.001
  const existingCategories = [...new Set([...DEFAULT_INGREDIENT_CATEGORIES, ...allIngredients.map(i => i.categoria)])].sort()

  const handleSave = () => {
    if (stockChanged && !motivo.trim()) { setMotivoError(true); return }
    const finalCategoria = showNewCategory && newCategoryName.trim() ? newCategoryName.trim() : categoria
    onSave({
      stockActual: newStock,
      stockMinimo: parseFloat(stockMinimo) >= 0 ? parseFloat(stockMinimo) : 0,
      cantidadMaxima: parseFloat(cantidadMaxima) > 0 ? parseFloat(cantidadMaxima) : 1,
      categoria: finalCategoria as IngredientCategory,
    }, newStock - originalStock, motivo.trim())
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 440, padding: 24, boxShadow: '0 24px 64px -16px rgba(0,0,0,0.35)', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.03em' }}>Ajustes avanzados — {ingredient.nombre}</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E5E5E5', background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>✕</button>
        </div>

        <div>
          <label style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, display: 'block', marginBottom: 6 }}>Categoría</label>
          {showNewCategory ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={inp} value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nueva categoría..." />
              <button onClick={() => { setShowNewCategory(false); setNewCategoryName('') }} style={{ height: 36, padding: '0 12px', borderRadius: 999, border: '1px solid #E5E5E5', background: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, flexShrink: 0 }}>Cancelar</button>
            </div>
          ) : (
            <select value={categoria} onChange={e => { if (e.target.value === '__new__') setShowNewCategory(true); else setCategoria(e.target.value as IngredientCategory) }} style={{ ...inp, cursor: 'pointer', appearance: 'auto' }}>
              {existingCategories.map((cat, i) => <option key={`${cat}-${i}`} value={cat}>{cat}</option>)}
              <option value="__new__">+ Crear nueva categoría</option>
            </select>
          )}
        </div>

        <div>
          <label style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, display: 'block', marginBottom: 6 }}>Stock actual ({ingredient.unidad})</label>
          <input type="number" step="0.01" style={inp} value={stockActual} onChange={e => setStockActual(e.target.value)} />
          {stockChanged && (
            <div style={{ fontFamily: MONO, fontSize: 10.5, marginTop: 4, color: newStock > originalStock ? '#0a3a0a' : '#92400E' }}>
              Cambio: {newStock > originalStock ? '+' : ''}{(newStock - originalStock).toFixed(2)} {ingredient.unidad}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <div>
            <label style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, display: 'block', marginBottom: 6 }}>Stock mínimo</label>
            <input type="number" step="0.01" style={inp} value={stockMinimo} onChange={e => setStockMinimo(e.target.value)} />
          </div>
          <div>
            <label style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, display: 'block', marginBottom: 6 }}>Stock máximo</label>
            <input type="number" step="0.01" style={inp} value={cantidadMaxima} onChange={e => setCantidadMaxima(e.target.value)} />
          </div>
        </div>

        {stockChanged && (
          <div>
            <label style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, display: 'block', marginBottom: 6, color: motivoError ? '#991B1B' : '#000' }}>
              Motivo del cambio *
            </label>
            <input style={{ ...inp, borderColor: motivoError ? '#FCA5A5' : '#E5E5E5' }} value={motivo} onChange={e => { setMotivo(e.target.value); if (e.target.value.trim()) setMotivoError(false) }} placeholder="Ej: Conteo físico, ajuste por pérdida..." />
            {motivoError && <div style={{ fontFamily: MONO, fontSize: 10.5, color: '#991B1B', marginTop: 4 }}>El motivo es obligatorio para cambios de stock</div>}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ height: 40, padding: '0 16px', borderRadius: 999, border: '1px solid #E5E5E5', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>Cancelar</button>
          <button onClick={handleSave} style={{ height: 40, padding: '0 16px', borderRadius: 999, border: 'none', background: '#000', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>Guardar cambios</button>
        </div>
      </div>
    </div>
  )
}

// ── Adjust Stock Dialog ───────────────────────────────────────────────────────

interface AdjustStockDialogProps {
  ingredient: Ingredient
  onClose: () => void
  onAdjust: (tipo: 'entrada' | 'salida' | 'merma' | 'ajuste', cantidad: number, motivo: string) => void
  onUpdateIngredient: (id: string, updates: Partial<Ingredient>) => void
  onOpenAdvanced: (ingredient: Ingredient) => void
}

function AdjustStockDialog({ ingredient, onClose, onAdjust, onUpdateIngredient, onOpenAdvanced }: AdjustStockDialogProps) {
  const { ingredients: allIngredients }  = useApp()
  const [tipo, setTipo]                  = useState<'entrada' | 'salida' | 'merma' | 'ajuste'>('entrada')
  const [cantidad, setCantidad]          = useState('')
  const [motivo, setMotivo]              = useState('')
  const [editCategoria, setEditCategoria] = useState<IngredientCategory>(ingredient.categoria)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [motivoError, setMotivoError]    = useState(false)

  const existingCategories = [...new Set([...DEFAULT_INGREDIENT_CATEGORIES, ...allIngredients.map(i => i.categoria)])].sort()

  const handleSubmit = () => {
    const cantidadNum = Number.parseFloat(cantidad)
    if (cantidadNum > 0 && !motivo.trim()) { setMotivoError(true); return }
    const finalCategoria = showNewCategory && newCategoryName.trim() ? newCategoryName.trim() : editCategoria
    if (finalCategoria !== ingredient.categoria) onUpdateIngredient(ingredient.id, { categoria: finalCategoria })
    if (cantidadNum > 0 && motivo.trim()) { onAdjust(tipo, cantidadNum, motivo) }
    else if (finalCategoria !== ingredient.categoria) { onClose() }
  }

  const selStyle: React.CSSProperties = { ...inp, cursor: 'pointer', appearance: 'auto' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 400, padding: 24, boxShadow: '0 24px 64px -16px rgba(0,0,0,0.35)', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.03em' }}>Ajustar: {ingredient.nombre}</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E5E5E5', background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>✕</button>
        </div>

        <div>
          <label style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, display: 'block', marginBottom: 6 }}>Categoría</label>
          {showNewCategory ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={inp} value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nueva categoría..." />
              <button onClick={() => { setShowNewCategory(false); setNewCategoryName('') }} style={{ height: 36, padding: '0 12px', borderRadius: 999, border: '1px solid #E5E5E5', background: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, flexShrink: 0 }}>✕</button>
            </div>
          ) : (
            <select value={editCategoria} onChange={e => { if (e.target.value === '__new__') setShowNewCategory(true); else setEditCategoria(e.target.value as IngredientCategory) }} style={selStyle}>
              {existingCategories.map((cat, i) => <option key={`${cat}-${i}`} value={cat}>{cat}</option>)}
              <option value="__new__">+ Nueva categoría</option>
            </select>
          )}
        </div>

        <div>
          <label style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, display: 'block', marginBottom: 6 }}>Tipo de ajuste</label>
          <select value={tipo} onChange={e => setTipo(e.target.value as typeof tipo)} style={selStyle}>
            <option value="entrada">↑ Entrada (compra)</option>
            <option value="salida">↓ Salida (uso)</option>
            <option value="merma">⚠ Merma (pérdida)</option>
            <option value="ajuste">⚙ Ajuste manual</option>
          </select>
        </div>

        <div>
          <label style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, display: 'block', marginBottom: 6 }}>Cantidad ({ingredient.unidad})</label>
          <input type="number" style={inp} value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="0" />
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: '#909090', marginTop: 4 }}>Stock actual: {parseFloat(ingredient.stockActual.toFixed(2))} {ingredient.unidad}</div>
        </div>

        <div>
          <label style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, display: 'block', marginBottom: 6, color: motivoError ? '#991B1B' : '#000' }}>Motivo *</label>
          <input style={{ ...inp, borderColor: motivoError ? '#FCA5A5' : '#E5E5E5' }} value={motivo} onChange={e => { setMotivo(e.target.value); if (e.target.value.trim()) setMotivoError(false) }} placeholder="Motivo del ajuste (obligatorio)..." />
          {motivoError && <div style={{ fontFamily: MONO, fontSize: 10.5, color: '#991B1B', marginTop: 4 }}>El motivo es obligatorio</div>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <button onClick={() => { onOpenAdvanced(ingredient); onClose() }} style={{ height: 40, padding: '0 14px', borderRadius: 999, border: '1px solid #E5E5E5', background: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>Avanzado</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ height: 40, padding: '0 14px', borderRadius: 999, border: '1px solid #E5E5E5', background: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>Cancelar</button>
            <button onClick={handleSubmit} disabled={!cantidad && editCategoria === ingredient.categoria} style={{ height: 40, padding: '0 14px', borderRadius: 999, border: 'none', background: '#000', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, opacity: (!cantidad && editCategoria === ingredient.categoria) ? 0.4 : 1 }}>Aplicar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Add Ingredient Dialog ─────────────────────────────────────────────────────

interface AddIngredientDialogProps {
  onClose: () => void
  onAdd: (ingredient: Omit<Ingredient, 'id'>) => void
}

function AddIngredientDialog({ onClose, onAdd }: AddIngredientDialogProps) {
  const { ingredients: allIngredients } = useApp()
  const [nombre, setNombre]             = useState('')
  const [categoria, setCategoria]       = useState('Carnes')
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [unidad, setUnidad]             = useState('kg')
  const [stockActual, setStockActual]   = useState('')
  const [cantidadMaxima, setCantidadMaxima] = useState('')
  const [stockMinimo, setStockMinimo]   = useState('')
  const [costo, setCosto]               = useState('')

  const existingCategories = [...new Set([...DEFAULT_INGREDIENT_CATEGORIES, ...allIngredients.map(i => i.categoria)])].sort()

  const handleSubmit = () => {
    const finalCategoria = showNewCategory && newCategoryName.trim() ? newCategoryName.trim() : categoria
    if (nombre.trim() && stockActual && cantidadMaxima && stockMinimo) {
      onAdd({
        nombre: nombre.trim(),
        categoria: finalCategoria as IngredientCategory,
        unidad: unidad as Ingredient['unidad'],
        stockActual: Number.parseFloat(stockActual),
        cantidadMaxima: Number.parseFloat(cantidadMaxima) > 0 ? Number.parseFloat(cantidadMaxima) : 1,
        stockMinimo: Number.parseFloat(stockMinimo) >= 0 ? Number.parseFloat(stockMinimo) : 0,
        costoUnitario: Number.parseFloat(costo) || 0,
        activo: true,
      })
    }
  }

  const selStyle: React.CSSProperties = { ...inp, cursor: 'pointer', appearance: 'auto' }
  const canSubmit = nombre.trim() && stockActual && cantidadMaxima && stockMinimo

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto', padding: 24, boxShadow: '0 24px 64px -16px rgba(0,0,0,0.35)', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.03em' }}>Agregar ingrediente</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E5E5E5', background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>✕</button>
        </div>

        <div>
          <label style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, display: 'block', marginBottom: 6 }}>Nombre</label>
          <input style={inp} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del ingrediente" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <div>
            <label style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, display: 'block', marginBottom: 6 }}>Categoría</label>
            {showNewCategory ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input style={{ ...inp, flex: 1 }} value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nueva..." />
                <button onClick={() => { setShowNewCategory(false); setNewCategoryName('') }} style={{ height: 36, width: 36, borderRadius: 8, border: '1px solid #E5E5E5', background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>✕</button>
              </div>
            ) : (
              <select value={categoria} onChange={e => { if (e.target.value === '__new__') setShowNewCategory(true); else setCategoria(e.target.value) }} style={selStyle}>
                {existingCategories.map((cat, i) => <option key={`${cat}-${i}`} value={cat}>{cat}</option>)}
                <option value="__new__">+ Nueva</option>
              </select>
            )}
          </div>
          <div>
            <label style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, display: 'block', marginBottom: 6 }}>Unidad</label>
            <select value={unidad} onChange={e => setUnidad(e.target.value)} style={selStyle}>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="l">l</option>
              <option value="ml">ml</option>
              <option value="unidad">unidad</option>
              <option value="porcion">porción</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
          {[
            { label: 'Stock actual', val: stockActual, set: setStockActual },
            { label: 'Stock mín',    val: stockMinimo,  set: setStockMinimo },
            { label: 'Stock máx',    val: cantidadMaxima, set: setCantidadMaxima },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, display: 'block', marginBottom: 6 }}>{label}</label>
              <input type="number" style={inp} value={val} onChange={e => set(e.target.value)} placeholder="0" />
            </div>
          ))}
        </div>

        <div>
          <label style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, display: 'block', marginBottom: 6 }}>Costo unitario ($)</label>
          <input type="number" step="0.01" style={inp} value={costo} onChange={e => setCosto(e.target.value)} placeholder="0.00" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ height: 40, padding: '0 16px', borderRadius: 999, border: '1px solid #E5E5E5', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={!canSubmit} style={{ height: 40, padding: '0 16px', borderRadius: 999, border: 'none', background: '#000', color: '#fff', fontSize: 13, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed', fontFamily: FONT, opacity: canSubmit ? 1 : 0.4 }}>Agregar</button>
        </div>
      </div>
    </div>
  )
}

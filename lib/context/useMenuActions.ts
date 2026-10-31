'use client'

import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { AppState } from './types'
import type { MenuItem, MenuCategory, TableConfig, TableState, Extra, RecipeIngredient } from '../store'
import { canPrepareItem } from '../store'
import { supabase } from '../supabase'
import { effectiveMaxMesas } from '../plans'
import { uploadMenuImage, uploadMenuImages } from './sync'

type SetState = Dispatch<SetStateAction<AppState>>

export function useMenuActions(state: AppState, setState: SetState) {
  const updateMenuItem = useCallback(
    async (itemId: string, updates: Partial<MenuItem>, imageFiles?: (File | null)[]) => {

      // Optimistic update — reverted on error
      let prevItems: MenuItem[] = []
      setState(prev => {
        prevItems = prev.menuItems
        return {
          ...prev,
          menuItems: prev.menuItems.map(item =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
        }
      })

      let finalImagenes: string[] | undefined = updates.imagenes

      if (imageFiles && imageFiles.some(Boolean)) {
        const existingUrls = (updates.imagenes ?? []).filter(u => !u.startsWith('blob:'))
        const newUrls = await uploadMenuImages(imageFiles)
        finalImagenes = [...existingUrls, ...newUrls].slice(0, 3)
      }

      const primaryImage = finalImagenes?.[0] ?? updates.imagen

      const payload: Record<string, unknown> = {}

      if (updates.nombre !== undefined) payload.name = updates.nombre
      if (updates.descripcion !== undefined) payload.description = updates.descripcion
      if (updates.precio !== undefined) payload.price = updates.precio
      if (updates.disponible !== undefined) payload.available = updates.disponible
      if (updates.categoria !== undefined) payload.category_id = updates.categoria
      if (primaryImage !== undefined) payload.image = primaryImage
      if (finalImagenes !== undefined) payload.imagenes = finalImagenes
      if (updates.extras !== undefined) payload.extras = updates.extras
      if (updates.receta !== undefined) payload.receta = updates.receta
      if (updates.orden !== undefined) payload.orden = updates.orden
      if (updates.identificador !== undefined) payload.identificador = updates.identificador ?? null
      if (updates.colorFondo !== undefined) payload.color_fondo = updates.colorFondo ?? null
      if (updates.colorBorde !== undefined) payload.color_borde = updates.colorBorde ?? null
      if (updates.stockHabilitado !== undefined) payload.stock_habilitado = updates.stockHabilitado
      if (updates.stockCantidad !== undefined) payload.stock_cantidad = updates.stockCantidad
      if (updates.mostrarEnMenuDigital !== undefined) payload.mostrar_en_menu_digital = updates.mostrarEnMenuDigital

      const { data: { session } } = await supabase.auth.getSession()
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      let res: Response
      try {
        res = await fetch(`/api/admin/menu-items/${itemId}`, {
          method: 'PATCH',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify(payload),
        })
      } finally {
        clearTimeout(timeout)
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setState(prev => ({ ...prev, menuItems: prevItems }))
        throw new Error(json.error ?? `Error ${res.status}`)
      }

      // Apply final image values if they changed during upload
      if (finalImagenes !== undefined || primaryImage !== undefined) {
        setState(prev => ({
          ...prev,
          menuItems: prev.menuItems.map(item =>
            item.id === itemId
              ? { ...item, imagen: primaryImage ?? item.imagen, imagenes: finalImagenes ?? item.imagenes }
              : item
          ),
        }))
      }
    },
    [setState]
  )

  const addMenuItem = useCallback(
    async (item: Omit<MenuItem, "id">, imageFiles?: (File | null)[]) => {

      let imagenes: string[] = item.imagenes ?? []

      if (imageFiles && imageFiles.some(Boolean)) {
        const uploaded = await uploadMenuImages(imageFiles)
        imagenes = uploaded.slice(0, 3)
      } else if (item.imagen) {
        imagenes = [item.imagen]
      }

      const primaryImage = imagenes[0] ?? null

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/admin/menu-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: item.nombre,
          description: item.descripcion,
          price: item.precio,
          available: item.disponible ?? true,
          image: primaryImage,
          imagenes,
          identificador: item.identificador ?? null,
          color_fondo: item.colorFondo ?? null,
          color_borde: item.colorBorde ?? null,
          stock_habilitado: item.stockHabilitado ?? false,
          stock_cantidad: item.stockCantidad ?? 0,
          mostrar_en_menu_digital: item.mostrarEnMenuDigital ?? true,
          category_id: item.categoria ?? null,
          extras: item.extras ?? [],
          receta: item.receta ?? [],
          orden: item.orden ?? 0,
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? `Error ${res.status}`)
      }

      const json = await res.json()
      const row = json.item
      if (row) {
        const nuevo: MenuItem = {
          id: row.id,
          nombre: row.name,
          descripcion: row.description ?? '',
          precio: Number(row.price),
          categoria: row.category_id,
          disponible: row.available,
          imagen: row.image ?? undefined,
          imagenes: (row.imagenes as string[] | null) ?? [],
          identificador: row.identificador ?? undefined,
          colorFondo: row.color_fondo ?? undefined,
          colorBorde: row.color_borde ?? undefined,
          stockHabilitado: row.stock_habilitado ?? false,
          stockCantidad: row.stock_cantidad ?? 0,
          mostrarEnMenuDigital: row.mostrar_en_menu_digital ?? true,
          extras: (row.extras ?? []) as Extra[],
          receta: (row.receta ?? []) as RecipeIngredient[],
          orden: row.orden ?? 0,
        }

        setState(prev => ({
          ...prev,
          menuItems: [...prev.menuItems, nuevo]
        }))
      }
    },
    [setState]
  )

  const deleteMenuItem = useCallback(async (itemId: string) => {

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const res = await fetch(`/api/admin/menu-items/${itemId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      console.error("Error eliminando platillo:", json.error ?? res.status)
      return
    }

    setState(prev => ({
      ...prev,
      menuItems: prev.menuItems.filter(item => item.id !== itemId)
    }))

  }, [setState])

  const getAvailableMenuItems = useCallback((): MenuItem[] => {
    return state.menuItems.filter(item => {
      if (!item.disponible) return false
      const { canPrepare } = canPrepareItem(item, state.ingredients)
      return canPrepare
    })
  }, [state.menuItems, state.ingredients])

  // ============ CATEGORY ACTIONS ============
  const addCategory = useCallback(async (nombre: string) => {

    const { data, error } = await supabase
      .from("categories")
      .insert([{ name: nombre }])
      .select()

    if (error) {
      console.error("Error creando categoria:", error)
      return
    }

    if (data) {
      const nueva: MenuCategory = {
        id: data[0].id,
        nombre: data[0].name,
        activa: true,
        orden: state.categories.length + 1
      }

      setState(prev => ({
        ...prev,
        categories: [...prev.categories, nueva]
      }))
    }

  }, [state.categories, setState])

  const updateCategory = useCallback((categoryId: string, updates: Partial<MenuCategory>) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId ? { ...cat, ...updates } : cat
      ),
    }))
    const dbUpdates: Record<string, unknown> = {}
    if (updates.nombre !== undefined) dbUpdates.name = updates.nombre
    if (updates.activa !== undefined) dbUpdates.activa = updates.activa
    if (updates.orden !== undefined) dbUpdates.orden = updates.orden
    if (Object.keys(dbUpdates).length > 0) {
      supabase.from('categories').update(dbUpdates).eq('id', categoryId).then(() => {})
    }
  }, [setState])

  const deleteCategory = useCallback(async (categoryId: string) => {

    // quitar categoria a los platillos
    await supabase
      .from("menu_items")
      .update({ category_id: null })
      .eq("category_id", categoryId)

    // borrar categoria
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId)

    if (error) {
      console.error("Error eliminando categoria:", error)
      return
    }

    setState(prev => ({
      ...prev,
      categories: prev.categories.filter(cat => cat.id !== categoryId),
    }))

  }, [setState])

  const reorderCategories = useCallback((categoryIds: string[]) => {
    setState(prev => ({
      ...prev,
      categories: categoryIds.map((id, index) => {
        const cat = prev.categories.find(c => c.id === id)
        return cat ? { ...cat, orden: index + 1 } : null
      }).filter((c): c is MenuCategory => c !== null),
    }))
    categoryIds.forEach((id, index) => {
      supabase.from('categories').update({ orden: index + 1 }).eq('id', id).then(() => {})
    })
  }, [setState])

  // ============ TABLE ACTIONS ============
  const addTable = useCallback(async (numero: number, capacidad = 4, ubicacion?: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      // Tope de mesas = el menor entre el config del local y el del plan.
      const maxMesas = effectiveMaxMesas(state.config.maxMesas, state.tenantPlan)
      if (maxMesas && numero > maxMesas) {
        return { ok: false, error: `El tope de mesas es ${maxMesas} (plan ${state.tenantPlan}). No se puede crear la mesa ${numero}.` }
      }
      // El número de mesa es único (índice global). Si la mesa ya existe en la DB
      // —aunque haya sido "borrada" (activa=false)— la reactivamos en vez de
      // insertar un duplicado (que fallaría). Así los números se pueden reutilizar.
      const { data: existing, error: selErr } = await supabase
        .from('tables_config')
        .select('id')
        .eq('numero', numero)
        .maybeSingle()
      if (selErr) return { ok: false, error: selErr.message }

      if (existing?.id) {
        const { error: updErr } = await supabase
          .from('tables_config')
          .update({ activa: true, capacidad, ubicacion: ubicacion ?? null, estado: 'disponible' })
          .eq('id', existing.id)
        if (updErr) return { ok: false, error: updErr.message }

        const reactivated: TableConfig = {
          id: existing.id, numero, capacidad, ubicacion,
          activa: true, estado: 'disponible', createdAt: new Date(),
        }
        setState(prev => ({
          ...prev,
          tables: prev.tables.some(t => t.id === existing.id)
            ? prev.tables.map(t => (t.id === existing.id ? { ...t, ...reactivated } : t))
            : [...prev.tables, reactivated],
        }))
        return { ok: true }
      }

      // No existía → insertar nueva
      const newTable: TableConfig = {
        id: crypto.randomUUID(), numero, capacidad, ubicacion,
        activa: true, estado: 'disponible', createdAt: new Date(),
      }
      const { error: insErr } = await supabase.from('tables_config').insert({
        id: newTable.id,
        numero: newTable.numero,
        capacidad: newTable.capacidad,
        ubicacion: newTable.ubicacion ?? null,
        activa: true,
        estado: 'disponible',
        tenant_id: state.currentUser?.tenantId ?? null,
      })
      if (insErr) return { ok: false, error: insErr.message }

      setState(prev => ({ ...prev, tables: [...prev.tables, newTable] }))
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Error al guardar la mesa' }
    }
  }, [setState, state.config.maxMesas, state.currentUser?.tenantId, state.tenantPlan])

  const updateTable = useCallback((tableId: string, updates: Partial<TableConfig>) => {
    setState(prev => ({
      ...prev,
      tables: prev.tables.map(table =>
        table.id === tableId ? { ...table, ...updates } : table
      ),
    }))
    // Persistir en Supabase
    const dbUpdates: Record<string, unknown> = {}
    if (updates.numero !== undefined)    dbUpdates.numero    = updates.numero
    if (updates.capacidad !== undefined) dbUpdates.capacidad = updates.capacidad
    if (updates.ubicacion !== undefined) dbUpdates.ubicacion = updates.ubicacion
    if (updates.activa !== undefined)    dbUpdates.activa    = updates.activa
    if (updates.estado !== undefined)    dbUpdates.estado    = updates.estado
    if (Object.keys(dbUpdates).length > 0) {
      supabase.from('tables_config').update(dbUpdates).eq('id', tableId).then(({ error }) => {
        if (error) console.error('[updateTable] Supabase error:', error.message)
      })
    }
  }, [setState])

  const deleteTable = useCallback((tableId: string) => {
    setState(prev => ({
      ...prev,
      tables: prev.tables.filter(table => table.id !== tableId),
    }))
    // Soft delete en Supabase: marcar como inactiva
    supabase.from('tables_config').update({ activa: false }).eq('id', tableId).then(({ error }) => {
      if (error) console.error('[deleteTable] Supabase error:', error.message)
    })
  }, [setState])

  /**
   * Define cuántas mesas trabaja el local de una sola vez.
   * - Crea/reactiva las mesas 1..count (activa=true).
   * - Desactiva (soft) cualquier mesa activa con número > count.
   * El resultado se refleja en todas las listas (incl. QR) porque todas
   * derivan de getActiveTables()/state.tables.
   */
  const setTablesCount = useCallback(async (count: number): Promise<{ ok: boolean; error?: string }> => {
    const n = Math.max(0, Math.floor(count) || 0)
    const maxMesas = effectiveMaxMesas(state.config.maxMesas, state.tenantPlan)
    if (maxMesas && n > maxMesas) {
      return { ok: false, error: `El tope de mesas es ${maxMesas} (plan ${state.tenantPlan}). No podés activar ${n}.` }
    }
    try {
      const { data: existing, error: selErr } = await supabase
        .from('tables_config')
        .select('id, numero, capacidad, nombre, ubicacion, activa, estado')
      if (selErr) return { ok: false, error: selErr.message }

      const rows = existing ?? []
      const byNumero = new Map<number, (typeof rows)[number]>()
      rows.forEach(r => byNumero.set(r.numero, r))

      const tid = state.currentUser?.tenantId ?? null
      const toInsert: Array<{ id: string; numero: number; capacidad: number; activa: boolean; estado: string; tenant_id: string | null }> = []
      const toReactivate: string[] = []
      for (let numero = 1; numero <= n; numero++) {
        const r = byNumero.get(numero)
        if (r) {
          if (!r.activa) toReactivate.push(r.id)
        } else {
          toInsert.push({ id: crypto.randomUUID(), numero, capacidad: 4, activa: true, estado: 'disponible', tenant_id: tid })
        }
      }
      // No se puede reducir la cantidad si alguna mesa por encima de N está en uso:
      // perderíamos una sesión activa. Se bloquea y se informa cuáles liberar.
      const enUso = rows.filter(
        r => r.numero > n && r.activa && (r.estado === 'ocupada' || r.estado === 'cuenta_pedida')
      )
      if (enUso.length) {
        const nums = enUso.map(r => r.numero).sort((a, b) => a - b).join(', ')
        return {
          ok: false,
          error: `No se puede reducir a ${n} mesas: la(s) mesa(s) ${nums} están en uso. Cerrá esas cuentas primero.`,
        }
      }
      const toDeactivate = rows.filter(r => r.numero > n && r.activa).map(r => r.id)

      if (toInsert.length) {
        const { error } = await supabase.from('tables_config').insert(toInsert)
        if (error) return { ok: false, error: error.message }
      }
      if (toReactivate.length) {
        const { error } = await supabase.from('tables_config').update({ activa: true }).in('id', toReactivate)
        if (error) return { ok: false, error: error.message }
      }
      if (toDeactivate.length) {
        const { error } = await supabase.from('tables_config').update({ activa: false }).in('id', toDeactivate)
        if (error) return { ok: false, error: error.message }
      }

      // Reconstruir el estado local a partir de la verdad en DB + inserts.
      setState(prev => {
        const finalTables: TableConfig[] = rows.map(r => ({
          id: r.id,
          numero: r.numero,
          nombre: r.nombre ?? undefined,
          capacidad: r.capacidad ?? 4,
          ubicacion: r.ubicacion ?? undefined,
          activa: r.numero >= 1 && r.numero <= n ? true : (r.numero > n ? false : r.activa),
          estado: (r.estado as TableState) ?? 'disponible',
          createdAt: prev.tables.find(t => t.id === r.id)?.createdAt ?? new Date(),
        }))
        toInsert.forEach(r => finalTables.push({
          id: r.id, numero: r.numero, capacidad: r.capacidad,
          activa: true, estado: 'disponible', createdAt: new Date(),
        }))
        finalTables.sort((a, b) => a.numero - b.numero)
        return { ...prev, tables: finalTables }
      })

      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Error al configurar las mesas' }
    }
  }, [setState, state.config.maxMesas, state.currentUser?.tenantId, state.tenantPlan])

  const getActiveTables = useCallback((): TableConfig[] => {
    return state.tables.filter(t => t.activa).sort((a, b) => a.numero - b.numero)
  }, [state.tables])

  return {
    updateMenuItem,
    addMenuItem,
    deleteMenuItem,
    getAvailableMenuItems,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    addTable,
    updateTable,
    deleteTable,
    setTablesCount,
    getActiveTables,
  }
}

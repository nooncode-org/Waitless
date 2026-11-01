import { describe, it, expect } from 'vitest'
import { orderTotal } from '../lib/store'

// item: (precio 100 + extra 10) * 2 = 220
const items = [{ menuItem: { precio: 100 }, cantidad: 2, extras: [{ precio: 10 }] }] as never

describe('orderTotal (total real a cobrar)', () => {
  it('usa el total persistido cuando existe (incluye envío/impuestos/propina)', () => {
    expect(orderTotal({ items, total: 250 })).toBe(250)
  })
  it('recalcula de ítems cuando no hay total persistido', () => {
    expect(orderTotal({ items })).toBe(220)
  })
  it('recalcula cuando el total es 0 (pedido in-app sin montos)', () => {
    expect(orderTotal({ items, total: 0 })).toBe(220)
  })
})

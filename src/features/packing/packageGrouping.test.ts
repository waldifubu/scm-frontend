import { describe, expect, it } from 'vite-plus/test'
import { groupByOrder } from './packageGrouping'

describe('groupByOrder', () => {
  it('groups by order number and puts the newest first within an order', () => {
    const items = [
      { id: 1, orderNo: 200, createdAt: '2026-11-01 10:00:00' },
      { id: 2, orderNo: 100, createdAt: '2026-11-01 09:00:00' },
      { id: 3, orderNo: 200, createdAt: '2026-11-03 10:00:00' },
      { id: 4, orderNo: 100, createdAt: '2026-11-02 09:00:00' },
    ]
    expect(groupByOrder(items).map((item) => item.id)).toEqual([4, 2, 3, 1])
  })

  it('compares order numbers as numbers and leaves items without one last', () => {
    const items = [
      { id: 1, orderNo: null, createdAt: '2026-11-01 10:00:00' },
      { id: 2, orderNo: 90000, createdAt: '2026-11-01 10:00:00' },
      { id: 3, orderNo: 100000, createdAt: '2026-11-01 10:00:00' },
    ]
    expect(groupByOrder(items).map((item) => item.id)).toEqual([2, 3, 1])
  })

  it('keeps the given order of equal items and does not change its input', () => {
    const items = [
      { id: 1, orderNo: 5, createdAt: 'x' },
      { id: 2, orderNo: 5, createdAt: 'x' },
    ]
    expect(groupByOrder(items).map((item) => item.id)).toEqual([1, 2])
    expect(items.map((item) => item.id)).toEqual([1, 2])
  })
})

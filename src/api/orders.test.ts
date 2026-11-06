import { describe, expect, it } from 'vitest'
import { DEFAULT_ORDER_STATUS, ORDER_STATUSES, ordersPath } from './orders'

describe('ordersPath', () => {
  it('asks for nothing special by default - the backend lists CREATED', () => {
    expect(ordersPath()).toBe('/orders')
    expect(DEFAULT_ORDER_STATUS).toBe('CREATED')
  })

  it('names the status asked for', () => {
    expect(ordersPath(0, 'APPROVED')).toBe('/orders?status=APPROVED')
  })

  it('adds the page after the status', () => {
    expect(ordersPath(2, 'IN_TRANSIT')).toBe('/orders?status=IN_TRANSIT&page=2')
    expect(ordersPath(1)).toBe('/orders?page=1')
  })
})

describe('ORDER_STATUSES', () => {
  it('holds the statuses of the backend enum, each once', () => {
    expect([...ORDER_STATUSES].sort()).toEqual(
      [
        'ACKNOWLEDGED', 'APPROVED', 'CANCELLED', 'COMPLETED', 'CREATED', 'DELIVERED', 'IN_FULFILLMENT',
        'IN_TRANSIT', 'PARTIALLY_DELIVERED', 'READY_FOR_DISPATCH', 'REJECTED', 'REVIEW', 'WAIT_SUPPLY',
      ].sort(),
    )
    expect(new Set(ORDER_STATUSES).size).toBe(ORDER_STATUSES.length)
  })
})

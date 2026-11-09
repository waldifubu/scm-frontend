import { describe, expect, it } from 'vite-plus/test'
import {
  DEFAULT_ORDER_STATUS,
  defaultOrderFilter,
  ORDER_FILTERS,
  ORDER_STATUSES,
  orderFilterLabel,
  ordersPath,
} from './orders'
import type { UserDto } from '../../shared/api/types'

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
        'ACKNOWLEDGED',
        'APPROVED',
        'CANCELLED',
        'COMPLETED',
        'CREATED',
        'DELIVERED',
        'IN_FULFILLMENT',
        'IN_TRANSIT',
        'PARTIALLY_DELIVERED',
        'READY_FOR_DISPATCH',
        'REJECTED',
        'REVIEW',
        'WAIT_SUPPLY',
      ].sort(),
    )
    expect(new Set(ORDER_STATUSES).size).toBe(ORDER_STATUSES.length)
  })
})

describe('the order filters', () => {
  it('offer the groups first and then every status', () => {
    expect(ORDER_FILTERS.slice(0, 2)).toEqual(['NOT_COMPLETED', 'ALL'])
    expect(ORDER_FILTERS.slice(2)).toEqual([...ORDER_STATUSES])
  })

  it('ask the backend for a group by its word', () => {
    expect(ordersPath(0, 'NOT_COMPLETED')).toBe('/orders?status=NOT_COMPLETED')
    expect(ordersPath(3, 'ALL')).toBe('/orders?status=ALL&page=3')
  })

  it('read as words in the dropdown', () => {
    expect(orderFilterLabel('NOT_COMPLETED')).toBe('ALL BUT COMPLETED')
    expect(orderFilterLabel('ALL')).toBe('ALL')
    expect(orderFilterLabel('WAIT_SUPPLY')).toBe('WAIT SUPPLY')
  })

  it('start a manager on the open orders and everybody else on the new ones', () => {
    const as = (...roles: string[]) => ({ roles }) as unknown as UserDto
    expect(defaultOrderFilter(as('MANAGER'))).toBe('NOT_COMPLETED')
    expect(defaultOrderFilter(as('ROLE_MANAGER', 'WAREHOUSE'))).toBe('NOT_COMPLETED')
    expect(defaultOrderFilter(as('CUSTOMER'))).toBe('CREATED')
    expect(defaultOrderFilter(as('ADMIN'))).toBe('CREATED')
    expect(defaultOrderFilter(undefined)).toBe('CREATED')
  })
})

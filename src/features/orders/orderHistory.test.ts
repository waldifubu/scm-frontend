import { describe, expect, it } from 'vite-plus/test'
import {
  HISTORY_SORT,
  NO_FILTER,
  historyPath,
  mayReadOrderHistory,
  orderNoOf,
} from './orderHistory'
import type { UserDto } from '../../shared/api/types'

const as = (...roles: string[]) => ({ roles }) as unknown as UserDto

describe('historyPath', () => {
  it('asks for nothing special by default - the backend lists newest first', () => {
    expect(historyPath(0)).toBe('/orders/history')
  })

  it('names the order, the status, the sort and the page, and nothing else', () => {
    expect(historyPath(0, { orderNo: '4567', status: '' })).toBe(
      '/orders/history?orderNo=4567&latestOnly=false',
    )
    expect(historyPath(0, { orderNo: '', status: 'REVIEW' })).toBe('/orders/history?status=REVIEW')
    expect(
      historyPath(
        2,
        { orderNo: ' 4567 ', status: 'DELIVERED' },
        { column: 'to', direction: 'desc' },
      ),
    ).toBe(
      '/orders/history?orderNo=4567&latestOnly=false&status=DELIVERED&sort=newStatus&order=DESC&page=2',
    )
  })

  it('leaves out an order number that is not a whole number instead of sending it', () => {
    expect(historyPath(0, { orderNo: 'abc', status: '' })).toBe('/orders/history')
    expect(historyPath(0, { orderNo: '-5', status: '' })).toBe('/orders/history')
    expect(historyPath(0, { orderNo: '12.5', status: '' })).toBe('/orders/history')
  })

  it('sorts the order column through the order the row belongs to', () => {
    expect(HISTORY_SORT.order).toBe('order.orderNo')
    expect(historyPath(0, NO_FILTER, { column: 'order', direction: 'asc' })).toBe(
      '/orders/history?sort=order.orderNo&order=ASC',
    )
  })

  it('does not send a sort for a column the backend does not know', () => {
    expect(historyPath(0, NO_FILTER, { column: 'customer', direction: 'asc' })).toBe(
      '/orders/history',
    )
  })
})

describe('orderNoOf', () => {
  it('reads a whole number and nothing else', () => {
    expect(orderNoOf('90001')).toBe(90001)
    expect(orderNoOf('  7 ')).toBe(7)
    expect(orderNoOf('')).toBeNull()
    expect(orderNoOf('1e3')).toBeNull()
  })
})

describe('mayReadOrderHistory', () => {
  it('is open to the roles that may read any order', () => {
    for (const role of ['ADMIN', 'MANAGER', 'WAREHOUSE', 'LOGISTICS']) {
      expect(mayReadOrderHistory(as(role))).toBe(true)
    }
  })

  it('is closed to everybody else', () => {
    for (const role of ['CUSTOMER', 'SUPPLIER', 'DISTRIBUTOR']) {
      expect(mayReadOrderHistory(as(role))).toBe(false)
    }
    expect(mayReadOrderHistory(undefined)).toBe(false)
  })
})

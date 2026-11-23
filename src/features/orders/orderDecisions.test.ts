import { describe, expect, it } from 'vite-plus/test'
import { decisionsFor } from './orderDecisions'
import type { UserDto } from '../../shared/api/types'

const as = (...roles: string[]) => ({ roles }) as unknown as UserDto

describe('decisionsFor', () => {
  it('offers a new order every answer', () => {
    expect(decisionsFor(as('MANAGER'), 'CREATED')).toEqual(['review', 'accept', 'reject', 'cancel'])
  })

  it('offers an order under review the answers but not another review', () => {
    expect(decisionsFor(as('ADMIN'), 'REVIEW')).toEqual(['accept', 'reject', 'cancel'])
  })

  it('offers a running order only the ways out', () => {
    for (const status of ['ACKNOWLEDGED', 'WAIT_SUPPLY']) {
      expect(decisionsFor(as('MANAGER'), status)).toEqual(['reject', 'cancel'])
    }
  })

  it('offers to release the reservations only while the order is being fulfilled', () => {
    expect(decisionsFor(as('MANAGER'), 'IN_FULFILLMENT')).toEqual(['release', 'reject', 'cancel'])
    expect(decisionsFor(as('MANAGER'), 'CREATED')).not.toContain('release')
  })

  it('offers nothing once the goods are on their way or the order has ended', () => {
    for (const status of [
      'READY_FOR_DISPATCH',
      'IN_TRANSIT',
      'PARTIALLY_DELIVERED',
      'DELIVERED',
      'COMPLETED',
      'REJECTED',
      'CANCELLED',
    ]) {
      expect(decisionsFor(as('ADMIN'), status)).toEqual([])
    }
  })

  it('is for admins and managers only', () => {
    for (const role of ['CUSTOMER', 'WAREHOUSE', 'LOGISTICS', 'SUPPLIER', 'DISTRIBUTOR']) {
      expect(decisionsFor(as(role), 'CREATED')).toEqual([])
    }
    expect(decisionsFor(undefined, 'CREATED')).toEqual([])
  })
})

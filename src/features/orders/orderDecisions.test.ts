import { describe, expect, it } from 'vite-plus/test'
import { decisionsFor } from './orderDecisions'
import type { UserDto } from '../../shared/api/types'
import type { OrderWorkflow } from './workflow'

const as = (...roles: string[]) => ({ roles }) as unknown as UserDto

const step = (
  from: string,
  action: string,
  actors: string[],
  trigger = 'MANUAL',
): { from: string; to: string; action: string; trigger: string; actors: string[] } => ({
  from,
  to: 'X',
  action,
  trigger,
  actors,
})
const MGMT = ['ADMIN', 'MANAGER']
/** The manual steps of the backend's table (`GET /orders/workflow`), as far as the buttons are concerned. */
const WORKFLOW = {
  transitions: [
    step('CREATED', 'REVIEW', MGMT),
    step('CREATED', 'ACCEPT', MGMT),
    step('REVIEW', 'ACCEPT', MGMT),
    ...['CREATED', 'REVIEW', 'ACKNOWLEDGED', 'WAIT_SUPPLY', 'IN_FULFILLMENT'].flatMap((from) => [
      step(from, 'REJECT', MGMT),
      step(from, 'CANCEL', MGMT),
    ]),
    step('IN_FULFILLMENT', 'RELEASE', MGMT),
    step('CREATED', 'RESERVE', ['ADMIN', 'WAREHOUSE']),
    step('IN_FULFILLMENT', 'SHIPMENT_PROGRESS', ['ADMIN', 'WAREHOUSE'], 'COMPUTED'),
    step('DELIVERED', 'COMPLETE', ['ADMIN', 'MANAGER', 'CUSTOMER']),
    step('PARTIALLY_DELIVERED', 'COMPLETE', ['ADMIN', 'MANAGER', 'CUSTOMER']),
  ],
} as unknown as OrderWorkflow

describe('decisionsFor', () => {
  it('offers a new order every answer', () => {
    expect(decisionsFor(as('MANAGER'), 'CREATED', WORKFLOW)).toEqual([
      'review',
      'accept',
      'reject',
      'cancel',
    ])
  })

  it('offers an order under review the answers but not another review', () => {
    expect(decisionsFor(as('ADMIN'), 'REVIEW', WORKFLOW)).toEqual(['accept', 'reject', 'cancel'])
  })

  it('offers a running order only the ways out', () => {
    for (const status of ['ACKNOWLEDGED', 'WAIT_SUPPLY']) {
      expect(decisionsFor(as('MANAGER'), status, WORKFLOW)).toEqual(['reject', 'cancel'])
    }
  })

  it('offers to release the reservations only while the order is being fulfilled', () => {
    expect(decisionsFor(as('MANAGER'), 'IN_FULFILLMENT', WORKFLOW)).toEqual([
      'release',
      'reject',
      'cancel',
    ])
    expect(decisionsFor(as('MANAGER'), 'CREATED', WORKFLOW)).not.toContain('release')
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
      expect(decisionsFor(as('ADMIN'), status, WORKFLOW)).toEqual([])
    }
  })

  it('is for admins and managers only', () => {
    for (const role of ['CUSTOMER', 'WAREHOUSE', 'LOGISTICS', 'SUPPLIER', 'DISTRIBUTOR']) {
      expect(decisionsFor(as(role), 'CREATED', WORKFLOW)).toEqual([])
    }
    expect(decisionsFor(undefined, 'CREATED', WORKFLOW)).toEqual([])
  })
})

describe('decisionsFor without the table', () => {
  it('offers nothing until the backend has answered, and nothing that the table does not list', () => {
    expect(decisionsFor(as('MANAGER'), 'CREATED', undefined)).toEqual([])
    expect(
      decisionsFor(as('MANAGER'), 'CREATED', { transitions: [] } as unknown as OrderWorkflow),
    ).toEqual([])
  })

  it('follows the table: a step it does not list gets no button, one it adds does', () => {
    const only = {
      transitions: [step('DELIVERED', 'CANCEL', ['MANAGER'])],
    } as unknown as OrderWorkflow
    expect(decisionsFor(as('MANAGER'), 'DELIVERED', only)).toEqual(['cancel'])
    expect(decisionsFor(as('MANAGER'), 'CREATED', only)).toEqual([])
  })

  it('never offers a step the system takes itself', () => {
    expect(decisionsFor(as('ADMIN'), 'IN_FULFILLMENT', WORKFLOW)).not.toContain('reserve')
  })
})

import { describe, expect, it } from 'vite-plus/test'
import type { UserDto } from '../../shared/api/types'
import { mayCompleteOrder } from './completeOrder'
import type { OrderWorkflow } from './workflow'

const WORKFLOW = {
  transitions: ['DELIVERED', 'PARTIALLY_DELIVERED'].map((from) => ({
    from,
    to: 'COMPLETED',
    action: 'COMPLETE',
    trigger: 'MANUAL',
    actors: ['ADMIN', 'MANAGER', 'CUSTOMER'],
  })),
} as unknown as OrderWorkflow

const user = (...roles: string[]): UserDto => ({
  id: 1,
  firstName: 'Test',
  lastName: 'User',
  username: 'test',
  userType: 'customer',
  email: 'test@example.invalid',
  color: null,
  isActive: true,
  roles,
})

describe('mayCompleteOrder', () => {
  it.each(['CUSTOMER', 'MANAGER', 'ADMIN'])('offers it to %s for a delivered order', (role) => {
    expect(mayCompleteOrder(user(role), 'DELIVERED', WORKFLOW)).toBe(true)
  })

  it('also with the ROLE_ prefix and next to other roles', () => {
    expect(mayCompleteOrder(user('ROLE_MANAGER', 'WAREHOUSE'), 'DELIVERED', WORKFLOW)).toBe(true)
  })

  it.each(['WAREHOUSE', 'LOGISTICS', 'SUPPLIER', 'DISTRIBUTOR'])('not to %s', (role) => {
    expect(mayCompleteOrder(user(role), 'DELIVERED', WORKFLOW)).toBe(false)
  })

  it('also for a partly delivered order - the table says so, the backend then checks the quantities', () => {
    expect(mayCompleteOrder(user('MANAGER'), 'PARTIALLY_DELIVERED', WORKFLOW)).toBe(true)
  })

  it('nothing until the table has arrived', () => {
    expect(mayCompleteOrder(user('MANAGER'), 'DELIVERED', undefined)).toBe(false)
  })

  it.each(['IN_TRANSIT', 'COMPLETED', 'CANCELLED', 'CREATED', undefined, null])(
    'not for an order that is %s',
    (status) => {
      expect(mayCompleteOrder(user('MANAGER'), status, WORKFLOW)).toBe(false)
    },
  )

  it('not before the user is known', () => {
    expect(mayCompleteOrder(null, 'DELIVERED', WORKFLOW)).toBe(false)
    expect(mayCompleteOrder(undefined, 'DELIVERED', WORKFLOW)).toBe(false)
  })
})

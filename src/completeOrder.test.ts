import { describe, expect, it } from 'vite-plus/test'
import type { UserDto } from './api/types'
import { mayCompleteOrder } from './completeOrder'

const user = (...roles: string[]): UserDto => ({
  id: 1,
  firstName: 'Test',
  lastName: 'User',
  username: 'test',
  email: 'test@example.invalid',
  color: null,
  isActive: true,
  roles,
})

describe('mayCompleteOrder', () => {
  it.each(['CUSTOMER', 'MANAGER', 'ADMIN'])('offers it to %s for a delivered order', (role) => {
    expect(mayCompleteOrder(user(role), 'DELIVERED')).toBe(true)
  })

  it('also with the ROLE_ prefix and next to other roles', () => {
    expect(mayCompleteOrder(user('ROLE_MANAGER', 'WAREHOUSE'), 'DELIVERED')).toBe(true)
  })

  it.each(['WAREHOUSE', 'LOGISTICS', 'SUPPLIER', 'DISTRIBUTOR'])('not to %s', (role) => {
    expect(mayCompleteOrder(user(role), 'DELIVERED')).toBe(false)
  })

  it.each([
    'PARTIALLY_DELIVERED',
    'IN_TRANSIT',
    'COMPLETED',
    'CANCELLED',
    'CREATED',
    undefined,
    null,
  ])('not for an order that is %s', (status) => {
    expect(mayCompleteOrder(user('MANAGER'), status)).toBe(false)
  })

  it('not before the user is known', () => {
    expect(mayCompleteOrder(null, 'DELIVERED')).toBe(false)
    expect(mayCompleteOrder(undefined, 'DELIVERED')).toBe(false)
  })
})

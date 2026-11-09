import { describe, expect, it } from 'vite-plus/test'
import type { UserDto } from '../shared/api/types'
import {
  homePathFor,
  isCarrierOnly,
  isCustomerOnly,
  isSupplierOnly,
  mayOpen,
  sidebarLinks,
} from './navigation'

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

const labels = (...roles: string[]) => sidebarLinks(user(...roles)).map((link) => link.label)

describe('sidebarLinks for a carrier', () => {
  it('shows Shipments and nothing else', () => {
    expect(labels('DISTRIBUTOR')).toEqual(['Shipments'])
  })

  it('also when the backend spells the role with its prefix', () => {
    expect(labels('ROLE_DISTRIBUTOR')).toEqual(['Shipments'])
  })

  it('shows the pages of another role a carrier also holds, not only the shipments', () => {
    expect(labels('DISTRIBUTOR', 'WAREHOUSE')).toContain('Picking orders')
    expect(labels('DISTRIBUTOR', 'WAREHOUSE')).toContain('Shipments')
    expect(labels('DISTRIBUTOR', 'CUSTOMER')).toContain('Create order')
  })
})

describe('sidebarLinks for everybody else is what it was', () => {
  it('a warehouse worker has no Shipments, a logistics user and an admin have', () => {
    expect(labels('WAREHOUSE')).not.toContain('Shipments')
    expect(labels('LOGISTICS')).toContain('Shipments')
    expect(labels('ADMIN')).toContain('Shipments')
  })

  it('a warehouse worker sees the warehouse pages', () => {
    expect(labels('WAREHOUSE')).toEqual([
      'Orders',
      'New orders',
      'Picking orders',
      'Order items',
      'Packable items',
      'Packages',
      'Containers',
      'Storehouses',
      'Products',
      'Components',
      'Stock',
      'Request Components',
    ])
  })

  it('a customer has Create order and Orders and nothing else', () => {
    expect(labels('CUSTOMER')).toEqual(['Create order', 'Orders'])
    expect(labels('ROLE_CUSTOMER')).toEqual(['Create order', 'Orders'])
  })

  it('a customer with another role as well sees the pages of that role too', () => {
    expect(labels('CUSTOMER', 'WAREHOUSE')).toContain('Picking orders')
    expect(labels('CUSTOMER', 'WAREHOUSE')).toContain('Create order')
    expect(labels('CUSTOMER', 'MANAGER')).toContain('New orders')
  })

  it('an admin sees every page but Create order', () => {
    expect(labels('ADMIN')).toEqual([
      'Orders',
      'New orders',
      'Picking orders',
      'Order items',
      'Packable items',
      'Packages',
      'Containers',
      'Shippable Items',
      'Shipments',
      'Storehouses',
      'Products',
      'Components',
      'Stock',
      'Request Components',
    ])
  })

  it('Request Components is the last entry, for the warehouse and the admin only', () => {
    expect(labels('WAREHOUSE').at(-1)).toBe('Request Components')
    expect(labels('ADMIN').at(-1)).toBe('Request Components')
    for (const role of ['MANAGER', 'LOGISTICS', 'SUPPLIER', 'CUSTOMER', 'DISTRIBUTOR']) {
      expect(labels(role)).not.toContain('Request Components')
    }
  })

  it("My Requests is the supplier's own page, last in the list and for nobody else", () => {
    expect(labels('SUPPLIER').at(-1)).toBe('My Requests')
    for (const role of ['ADMIN', 'WAREHOUSE', 'MANAGER', 'LOGISTICS', 'CUSTOMER', 'DISTRIBUTOR']) {
      expect(labels(role)).not.toContain('My Requests')
    }
  })

  it('Shippable Items sits right above Shipments, under Containers', () => {
    const names = labels('LOGISTICS')
    expect(names.indexOf('Shippable Items')).toBe(names.indexOf('Containers') + 1)
    expect(names.indexOf('Shipments')).toBe(names.indexOf('Shippable Items') + 1)
  })

  it('Shippable Items is for logistics and the admin - not for the warehouse, a manager or a carrier', () => {
    expect(labels('LOGISTICS')).toContain('Shippable Items')
    expect(labels('ADMIN')).toContain('Shippable Items')
    for (const role of ['WAREHOUSE', 'MANAGER', 'SUPPLIER', 'CUSTOMER', 'DISTRIBUTOR']) {
      expect(labels(role)).not.toContain('Shippable Items')
    }
  })

  it('a manager sees the pages open to everyone', () => {
    expect(labels('MANAGER')).toEqual(expect.arrayContaining(['Orders', 'Products', 'Components']))
  })

  it('a supplier has My Requests and nothing else', () => {
    expect(labels('SUPPLIER')).toEqual(['My Requests'])
    expect(labels('ROLE_SUPPLIER')).toEqual(['My Requests'])
  })

  it('a supplier with another role as well sees the pages of that role too', () => {
    expect(labels('SUPPLIER', 'WAREHOUSE')).toEqual(
      expect.arrayContaining(['Picking orders', 'My Requests']),
    )
  })

  it('hands out no internal flag with the link', () => {
    expect(Object.keys(sidebarLinks(user('ADMIN'))[0] ?? {}).sort()).toEqual([
      'icon',
      'label',
      'to',
    ])
  })
})

describe('isCarrierOnly', () => {
  it('is true for a carrier alone, whatever the spelling of the role', () => {
    expect(isCarrierOnly(user('DISTRIBUTOR'))).toBe(true)
    expect(isCarrierOnly(user('ROLE_DISTRIBUTOR'))).toBe(true)
    expect(isCarrierOnly(user('distributor'))).toBe(true)
  })

  it('is false with any other role next to it, and for everybody who is no carrier', () => {
    for (const other of ['CUSTOMER', 'MANAGER', 'SUPPLIER', 'WAREHOUSE', 'LOGISTICS', 'ADMIN']) {
      expect(isCarrierOnly(user('DISTRIBUTOR', other))).toBe(false)
      expect(isCarrierOnly(user(other))).toBe(false)
    }
    expect(isCarrierOnly(user())).toBe(false)
  })
})

describe('isCustomerOnly', () => {
  it('is true for a customer alone and false with any other role next to it', () => {
    expect(isCustomerOnly(user('CUSTOMER'))).toBe(true)
    for (const other of ['MANAGER', 'SUPPLIER', 'WAREHOUSE', 'LOGISTICS', 'DISTRIBUTOR', 'ADMIN']) {
      expect(isCustomerOnly(user('CUSTOMER', other))).toBe(false)
      expect(isCustomerOnly(user(other))).toBe(false)
    }
    expect(isCustomerOnly(user())).toBe(false)
  })
})

describe('isSupplierOnly', () => {
  it('is true for a supplier alone and false with any other role next to it', () => {
    expect(isSupplierOnly(user('SUPPLIER'))).toBe(true)
    expect(isSupplierOnly(user('ROLE_SUPPLIER'))).toBe(true)
    for (const other of ['CUSTOMER', 'MANAGER', 'WAREHOUSE', 'LOGISTICS', 'DISTRIBUTOR', 'ADMIN']) {
      expect(isSupplierOnly(user('SUPPLIER', other))).toBe(false)
      expect(isSupplierOnly(user(other))).toBe(false)
    }
    expect(isSupplierOnly(user())).toBe(false)
  })
})

describe('homePathFor', () => {
  it('sends a carrier to their shipments and everybody else to the start page', () => {
    expect(homePathFor(user('DISTRIBUTOR'))).toBe('/shipments')
    expect(homePathFor(user('DISTRIBUTOR', 'WAREHOUSE'))).toBe('/')
    expect(homePathFor(user('ADMIN'))).toBe('/')
    expect(homePathFor(user('CUSTOMER'))).toBe('/')
    expect(homePathFor(user('CUSTOMER', 'MANAGER'))).toBe('/')
  })

  it('sends a supplier to the start page like everybody else', () => {
    expect(homePathFor(user('SUPPLIER'))).toBe('/')
  })
})

describe('mayOpen for a supplier', () => {
  it('lets a supplier alone open the start page and their requests, and nothing else', () => {
    expect(mayOpen(user('SUPPLIER'), '/')).toBe(true)
    expect(mayOpen(user('SUPPLIER'), '/my-requests')).toBe(true)
    expect(mayOpen(user('SUPPLIER'), '/my-requests/')).toBe(true)
    for (const path of ['/orders', '/products', '/components', '/requests']) {
      expect(mayOpen(user('SUPPLIER'), path)).toBe(false)
    }
  })

  it('holds a supplier with another role to nothing', () => {
    expect(mayOpen(user('SUPPLIER', 'WAREHOUSE'), '/orders')).toBe(true)
  })
})

describe('mayOpen', () => {
  it('lets a customer open the start page, their orders, the order form and one order', () => {
    for (const path of ['/', '/orders', '/orders/', '/orders/create', '/orders/1042']) {
      expect(mayOpen(user('CUSTOMER'), path)).toBe(true)
    }
  })

  it('keeps a customer from every other page, new orders included', () => {
    for (const path of [
      '/orders/new',
      '/orders/new/1042',
      '/products',
      '/shipments',
      '/storehouses',
      '/stock/storehouse/1',
    ]) {
      expect(mayOpen(user('CUSTOMER'), path)).toBe(false)
    }
  })

  it('holds nobody else to it', () => {
    for (const roles of [['ADMIN'], ['MANAGER'], ['DISTRIBUTOR'], ['CUSTOMER', 'WAREHOUSE'], []]) {
      expect(mayOpen(user(...roles), '/storehouses')).toBe(true)
    }
  })
})

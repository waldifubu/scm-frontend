import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vite-plus/test'
import { listSort } from '../../shared/lib/serverTable'
import type { UserDto } from '../../shared/api/types'
import { fulfillmentBadge } from './fulfillmentBadge'
import {
  defaultOrderItemFilter,
  ORDER_ITEM_STATUSES,
  orderItemFilterLabel,
  orderItemFiltersFor,
} from './orderItems'
import { ORDER_ITEM_SORT_KEYS, orderItemColumns } from './orderItemColumns'

const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8')
const as = (...roles: string[]) => ({ roles }) as unknown as UserDto

describe('the order item filters', () => {
  it('offers ALL to the administrator alone', () => {
    expect(orderItemFiltersFor(as('ADMIN')).slice(0, 2)).toEqual(['ALL', 'NOT_COMPLETED'])
    for (const user of [as('MANAGER'), as('WAREHOUSE'), undefined]) {
      expect(orderItemFiltersFor(user)).not.toContain('ALL')
      expect(orderItemFiltersFor(user)).toContain('NOT_COMPLETED')
    }
  })

  it('starts an administrator on everything and anybody else on the open lines', () => {
    expect(defaultOrderItemFilter(as('ADMIN'))).toBe('ALL')
    expect(defaultOrderItemFilter(as('WAREHOUSE'))).toBe('NOT_COMPLETED')
    expect(orderItemFilterLabel('NOT_COMPLETED')).toBe('ALL BUT COMPLETED')
  })
})

describe('the order item columns', () => {
  it('sorts by the names the backend knows, the id under its own', () => {
    expect(listSort([{ id: 'orderItemId', desc: true }], ORDER_ITEM_SORT_KEYS)).toEqual({
      sort: 'id',
      order: 'DESC',
    })
    expect(listSort([{ id: 'orderNo', desc: false }], ORDER_ITEM_SORT_KEYS)).toBeUndefined()
  })

  it('cannot sort what is joined in', () => {
    const fixed = orderItemColumns.filter((column) => column.enableSorting === false)
    expect(fixed.map((column) => column.id)).toEqual(['orderNo', 'articleNo'])
  })
})

describe('fulfillmentBadge', () => {
  it('gives every status a colour and a drawing of its own', () => {
    const badges = ORDER_ITEM_STATUSES.map(fulfillmentBadge)
    expect(new Set(badges.map((badge) => badge.className)).size).toBe(ORDER_ITEM_STATUSES.length)
    expect(new Set(badges.map((badge) => badge.icon)).size).toBe(ORDER_ITEM_STATUSES.length)
    for (const { className } of badges) expect(css).toContain(`.badge.${className}`)
  })

  it('falls back to a neutral badge for what is no status', () => {
    for (const odd of [undefined, 7, 'toString', 'SOMETHING_NEW']) {
      expect(fulfillmentBadge(odd).className).toBe('fulfillment-unknown')
    }
  })
})

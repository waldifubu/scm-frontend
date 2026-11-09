import { describe, expect, it } from 'vite-plus/test'
import { nextSort } from '../../shared/lib/tableSort'
import { PACKAGE_SORT_KEYS, sortStateOf, tableSortOf } from './packageSort'

describe('PACKAGE_SORT_KEYS', () => {
  it('has the keys the backend knows, and no others', () => {
    expect(Object.values(PACKAGE_SORT_KEYS).sort()).toEqual([
      'created',
      'id',
      'orderItem.fulfillmentStatus',
      'orderItem.id',
      'orderItem.order.orderNo',
      'orderItem.quantity',
      'quantity',
      'shipmentPackage.id',
    ])
  })

  it('sorts the order number by the number of the order, not by the id of a line', () => {
    expect(PACKAGE_SORT_KEYS.orderNo).toBe('orderItem.order.orderNo')
    expect(PACKAGE_SORT_KEYS.orderItemId).toBe('orderItem.id')
  })

  it('does not offer the siblings, which are worked out per row', () => {
    expect(PACKAGE_SORT_KEYS.siblings).toBeUndefined()
  })
})

describe('tableSortOf', () => {
  it('finds the column a key belongs to, and the direction', () => {
    expect(tableSortOf('orderItem.order.orderNo', 'DESC')).toEqual({
      column: 'orderNo',
      direction: 'desc',
    })
    expect(tableSortOf('created', 'ASC')).toEqual({ column: 'createdAt', direction: 'asc' })
  })

  it('reads no order as ascending, which is what the backend does', () => {
    expect(tableSortOf('id', '')).toEqual({ column: 'id', direction: 'asc' })
  })

  it('has no column for a key it does not know - a typed one, say', () => {
    expect(tableSortOf('runNo', 'ASC')).toBeNull()
  })

  it('marks createdAt while no sort is asked for - that is what the backend sorts by first then', () => {
    expect(tableSortOf('', '')).toEqual({ column: 'createdAt', direction: 'asc' })
    expect(tableSortOf('  ', 'DESC')).toEqual({ column: 'createdAt', direction: 'desc' })
  })

  it('does not mind blanks around a typed key', () => {
    expect(tableSortOf(' quantity ', 'ASC')).toEqual({ column: 'quantity', direction: 'asc' })
  })
})

describe('sortStateOf', () => {
  it('turns a column and a direction into the sort and order to ask for', () => {
    expect(sortStateOf({ column: 'orderNo', direction: 'asc' })).toEqual({
      sort: 'orderItem.order.orderNo',
      order: 'ASC',
    })
    expect(sortStateOf({ column: 'createdAt', direction: 'desc' })).toEqual({
      sort: 'created',
      order: 'DESC',
    })
  })

  it('asks for no sort at all to get the own order of the list - created, then the order number', () => {
    expect(sortStateOf(null)).toEqual({ sort: '', order: '' })
  })

  it('does the same for a column it has no key for', () => {
    expect(sortStateOf({ column: 'siblings', direction: 'asc' })).toEqual({ sort: '', order: '' })
  })
})

describe('the head of a column, clicked', () => {
  it('walks ascending, descending, and back to the default', () => {
    let state = sortStateOf(null)
    const click = (column: string) => {
      state = sortStateOf(nextSort(tableSortOf(state.sort, state.order), column))
      return state
    }

    expect(click('orderNo')).toEqual({ sort: 'orderItem.order.orderNo', order: 'ASC' })
    expect(click('orderNo')).toEqual({ sort: 'orderItem.order.orderNo', order: 'DESC' })
    expect(click('orderNo')).toEqual({ sort: '', order: '' })
  })

  it('turns the default - created ascending - around with the first click on createdAt', () => {
    const state = sortStateOf(null)

    expect(sortStateOf(nextSort(tableSortOf(state.sort, state.order), 'createdAt'))).toEqual({
      sort: 'created',
      order: 'DESC',
    })
  })

  it('starts the new column ascending when another one was sorted', () => {
    const afterOrder = sortStateOf({ column: 'orderNo', direction: 'desc' })

    expect(
      sortStateOf(nextSort(tableSortOf(afterOrder.sort, afterOrder.order), 'quantity')),
    ).toEqual({ sort: 'quantity', order: 'ASC' })
  })
})

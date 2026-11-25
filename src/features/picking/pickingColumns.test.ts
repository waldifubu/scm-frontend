import { describe, expect, it } from 'vite-plus/test'
import { listSort } from '../../shared/lib/serverTable'
import { PICKING_SORT_KEYS, pickingColumns } from './pickingColumns'

describe('the columns of the picking orders', () => {
  it('shows the row of the backend without SKU, product name and storehouse id', () => {
    expect(pickingColumns.map((column) => column.id)).toEqual([
      'reservationId',
      'orderNo',
      'orderItemId',
      'articleNo',
      'quantity',
      'storehouseName',
      'fulfillmentStatus',
      'expiresAt',
    ])
  })

  it('lets only what the backend can sort by be sorted', () => {
    const sortable = pickingColumns
      .filter((column) => column.enableSorting)
      .map((column) => column.id)

    expect(sortable).toEqual(['reservationId', 'quantity', 'expiresAt'])
  })

  it('asks for the reservation id under the name the backend knows', () => {
    expect(listSort([{ id: 'reservationId', desc: true }], PICKING_SORT_KEYS)).toEqual({
      sort: 'id',
      order: 'DESC',
    })
    expect(listSort([{ id: 'orderNo', desc: false }], PICKING_SORT_KEYS)).toBeUndefined()
  })
})

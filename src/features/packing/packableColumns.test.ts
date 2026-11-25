import { describe, expect, it } from 'vite-plus/test'
import { packableColumns, PACKABLE_SORT_KEYS } from './packableColumns'

describe('the columns of the packable items', () => {
  it('shows the row of the backend without product name, storehouse id and reservation id', () => {
    expect(packableColumns.map((column) => column.id)).toEqual([
      'orderItemId',
      'orderNo',
      'articleNo',
      'quantity',
      'packed',
      'remaining',
      'fulfillmentStatus',
      'storehouseName',
      'pickedAt',
    ])
  })

  it('lets only what the backend can sort by be sorted', () => {
    const sortable = packableColumns
      .filter((column) => column.enableSorting)
      .map((column) => column.id)

    expect(sortable).toEqual(['orderItemId', 'quantity', 'fulfillmentStatus'])
    expect(PACKABLE_SORT_KEYS.orderItemId).toBe('id')
  })
})

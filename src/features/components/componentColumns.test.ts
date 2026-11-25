import { describe, expect, it } from 'vite-plus/test'
import { PRODUCT_SORT_KEYS, productColumns } from '../products/productColumns'
import { listSort } from '../../shared/lib/serverTable'
import { COMPONENT_SORT_KEYS, componentColumns } from './componentColumns'
import { componentsPath } from './components'

describe('the tables of products and components', () => {
  it('show these columns, all of them sortable', () => {
    expect(componentColumns.map((column) => column.id)).toEqual([
      'manufacturer',
      'name',
      'externalId',
      'qty',
      'product',
    ])
    expect(productColumns.map((column) => column.id)).toEqual([
      'articleNo',
      'name',
      'unitPrice',
      'weight',
    ])
    for (const column of [...componentColumns, ...productColumns]) {
      expect(column.enableSorting).toBe(true)
    }
    expect(Object.keys(PRODUCT_SORT_KEYS)).toHaveLength(productColumns.length)
  })

  it('sort the product of a component by its name', () => {
    expect(listSort([{ id: 'product', desc: true }], COMPONENT_SORT_KEYS)).toEqual({
      sort: 'product.name',
      order: 'DESC',
    })
  })

  it('ask for size and order before the page', () => {
    expect(componentsPath()).toBe('/components')
    expect(componentsPath(2, { size: 10, sort: 'qty', order: 'ASC' })).toBe(
      '/components?size=10&sort=qty&order=ASC&page=2',
    )
  })
})

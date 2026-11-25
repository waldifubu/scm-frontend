import { describe, expect, it } from 'vite-plus/test'
import { ordersPath } from './orders'
import { orderColumns, sortOf } from './ordersTable'

describe('sortOf', () => {
  it('asks for nothing while the table is unsorted', () => {
    expect(sortOf([])).toBeUndefined()
  })

  it('uses the backend names, which differ for the price', () => {
    expect(sortOf([{ id: 'dueDate', desc: false }])).toEqual({ sort: 'dueDate', order: 'ASC' })
    expect(sortOf([{ id: 'totalPrice', desc: true }])).toEqual({ sort: 'total', order: 'DESC' })
  })

  it('never asks for a column the backend cannot sort by', () => {
    expect(sortOf([{ id: 'amountOfProducts', desc: false }])).toBeUndefined()
  })

  it('marks exactly the columns the backend can sort by as sortable', () => {
    const fixed = orderColumns.filter((column) => column.enableSorting === false).map((c) => c.id)
    expect(fixed).toEqual(['amountOfProducts'])
  })
})

describe('ordersPath with a size and a sort', () => {
  it('puts them after the status, the page last', () => {
    expect(ordersPath(2, 'CREATED', { size: 50, sort: { sort: 'total', order: 'DESC' } })).toBe(
      '/orders?status=CREATED&size=50&sort=total&order=DESC&page=2',
    )
  })

  it('leaves out what is not asked', () => {
    expect(ordersPath(0, 'REVIEW', { sort: undefined })).toBe('/orders?status=REVIEW')
  })
})

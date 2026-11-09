import { describe, expect, it } from 'vite-plus/test'
import { nextSort, sortRows } from './tableSort'

const rows = [
  { id: 10, sku: 'b', updatedAt: '2026-09-16T20:32:16' },
  { id: 2, sku: 'C', updatedAt: '2026-10-25T18:07:59' },
  { id: 1, sku: 'a', updatedAt: '2026-08-10T01:38:35' },
]

const ids = (sorted: { id: number }[]) => sorted.map((row) => row.id)

describe('nextSort', () => {
  it('starts ascending on a column that is not sorted by', () => {
    expect(nextSort(null, 'id')).toEqual({ column: 'id', direction: 'asc' })
    expect(nextSort({ column: 'sku', direction: 'desc' }, 'id')).toEqual({
      column: 'id',
      direction: 'asc',
    })
  })

  it('flips the same column to descending, then takes the sort away', () => {
    const ascending = nextSort(null, 'id')
    const descending = nextSort(ascending, 'id')

    expect(descending).toEqual({ column: 'id', direction: 'desc' })
    expect(nextSort(descending, 'id')).toBeNull()
  })
})

describe('sortRows', () => {
  it('keeps the arrival order without a sort, on a copy', () => {
    const sorted = sortRows(rows, null)

    expect(ids(sorted)).toEqual([10, 2, 1])
    expect(sorted).not.toBe(rows)
  })

  it('orders numbers by size, not as text', () => {
    expect(ids(sortRows(rows, { column: 'id', direction: 'asc' }))).toEqual([1, 2, 10])
    expect(ids(sortRows(rows, { column: 'id', direction: 'desc' }))).toEqual([10, 2, 1])
  })

  it('orders timestamps by when they were', () => {
    expect(ids(sortRows(rows, { column: 'updatedAt', direction: 'asc' }))).toEqual([1, 10, 2])
    expect(ids(sortRows(rows, { column: 'updatedAt', direction: 'desc' }))).toEqual([2, 10, 1])
  })

  it('orders text without regard to case', () => {
    expect(rows.length).toBe(3)
    expect(sortRows(rows, { column: 'sku', direction: 'asc' }).map((row) => row.sku)).toEqual([
      'a',
      'b',
      'C',
    ])
  })

  it('reads digits inside text as numbers', () => {
    const named = [
      { id: 1, name: 'Lager 10' },
      { id: 2, name: 'Lager 9' },
    ]

    expect(sortRows(named, { column: 'name', direction: 'asc' }).map((row) => row.id)).toEqual([
      2, 1,
    ])
  })

  it('puts rows without a value last whichever way it runs', () => {
    const gaps = [{ id: 1, n: 5 }, { id: 2 }, { id: 3, n: 1 }, { id: 4, n: null }]

    expect(ids(sortRows(gaps, { column: 'n', direction: 'asc' }))).toEqual([3, 1, 2, 4])
    expect(ids(sortRows(gaps, { column: 'n', direction: 'desc' }))).toEqual([1, 3, 2, 4])
  })

  it('keeps rows that compare equal in the order they had', () => {
    const ties = [
      { id: 1, g: 'x' },
      { id: 2, g: 'y' },
      { id: 3, g: 'x' },
    ]

    expect(ids(sortRows(ties, { column: 'g', direction: 'asc' }))).toEqual([1, 3, 2])
  })

  it('does not touch the list it was given', () => {
    const before = ids(rows)

    sortRows(rows, { column: 'id', direction: 'asc' })

    expect(ids(rows)).toEqual(before)
  })
})

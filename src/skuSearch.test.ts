import { describe, expect, it } from 'vitest'
import { filterBySku, skuOptions, suggestSkus, type SkuOption } from './skuSearch'

const options: SkuOption[] = [
  { sku: '706a99c3-944b-11f1-9b51-001e064520d8', name: 'Rear right door' },
  { sku: '706a8c12-944b-11f1-9b51-001e064520d8', name: 'Front left door' },
  { sku: '806f287f-944b-11f1-9b51-001e064520d8' },
]

describe('skuOptions', () => {
  it('lists every SKU once, in order, with the name where one is known', () => {
    const items = [{ sku: 'a' }, { sku: 'b' }, { sku: 'a' }, { id: 3 }, { sku: null }]

    expect(skuOptions(items, new Map([['b', 'Bolt']]))).toEqual([{ sku: 'a', name: undefined }, { sku: 'b', name: 'Bolt' }])
  })

  it('is empty without rows', () => {
    expect(skuOptions([])).toEqual([])
  })
})

describe('suggestSkus', () => {
  it('offers the first options when nothing is typed', () => {
    expect(suggestSkus(options, '')).toHaveLength(3)
    expect(suggestSkus(options, '   ', 2)).toEqual(options.slice(0, 2))
  })

  it('matches a part of the SKU, whatever the case', () => {
    expect(suggestSkus(options, '99C3').map((o) => o.sku)).toEqual(['706a99c3-944b-11f1-9b51-001e064520d8'])
  })

  it('puts SKUs that start with the input before the ones that merely contain it', () => {
    // The one that only contains it comes first in the list.
    const found = suggestSkus([{ sku: 'x-abc' }, { sku: 'abc-x' }, { sku: 'zabcz' }], 'abc')

    expect(found.map((o) => o.sku)).toEqual(['abc-x', 'x-abc', 'zabcz'])
  })

  it('finds a product by its name as well', () => {
    expect(suggestSkus(options, 'front').map((o) => o.name)).toEqual(['Front left door'])
  })

  it('offers nothing for what no SKU or name contains', () => {
    expect(suggestSkus(options, 'zzz')).toEqual([])
  })

  it('stops at the limit', () => {
    expect(suggestSkus(options, '706a', 1)).toHaveLength(1)
  })
})

describe('filterBySku', () => {
  const items = [{ id: 1, sku: 'a' }, { id: 2, sku: 'b' }, { id: 3, sku: 'a' }, { id: 4 }]

  it('keeps every row with nothing chosen', () => {
    expect(filterBySku(items, null)).toBe(items)
  })

  it('keeps only the rows of the chosen SKU', () => {
    expect(filterBySku(items, 'b')).toEqual([{ id: 2, sku: 'b' }])
    expect(filterBySku(items, 'a').map((i) => i.id)).toEqual([1, 3])
  })

  it('keeps nothing for a SKU the rows do not hold', () => {
    expect(filterBySku(items, 'zzz')).toEqual([])
  })
})

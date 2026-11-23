import { describe, expect, it } from 'vite-plus/test'
import { DISTRIBUTOR_RULE_SORT, rangeLabel, rulesPath, SUPPLIER_RULE_SORT } from './rules'

describe('rulesPath', () => {
  it('is the bare path for the first page without a sort', () => {
    expect(rulesPath('/supplier-rules', SUPPLIER_RULE_SORT, 0)).toBe('/supplier-rules')
  })

  it('maps a column to the backend key and the direction', () => {
    expect(
      rulesPath('/supplier-rules', SUPPLIER_RULE_SORT, 0, {
        column: 'supplier',
        direction: 'desc',
      }),
    ).toBe('/supplier-rules?sort=supplier.lastName&order=DESC')
  })

  it('names the page and leaves out a column it does not know', () => {
    expect(
      rulesPath('/distributor-rules', DISTRIBUTOR_RULE_SORT, 2, {
        column: 'nope',
        direction: 'asc',
      }),
    ).toBe('/distributor-rules?page=2')
  })
})

describe('rangeLabel', () => {
  it('shows both, one or no bound', () => {
    expect(rangeLabel(10, 50, 'kg')).toBe('10 – 50 kg')
    expect(rangeLabel(10, null, 'kg')).toBe('from 10 kg')
    expect(rangeLabel(null, 50, 'kg')).toBe('up to 50 kg')
    expect(rangeLabel(null, null, 'kg')).toBe('')
  })
})

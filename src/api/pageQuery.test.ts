import { describe, expect, it } from 'vitest'
import { withPage } from './pageQuery'

describe('withPage', () => {
  it('leaves the first page to the backend default', () => {
    expect(withPage('/orders', 0)).toBe('/orders')
  })

  it('asks for a later page', () => {
    expect(withPage('/orders', 2)).toBe('/orders?page=2')
  })

  it('appends to a query that is there already', () => {
    expect(withPage('/stock/storehouse/1?size=500', 1)).toBe('/stock/storehouse/1?size=500&page=1')
  })

  it('does not ask for a page below 0 or one that is no number', () => {
    expect(withPage('/orders', -1)).toBe('/orders')
    expect(withPage('/orders', Number.NaN)).toBe('/orders')
  })
})

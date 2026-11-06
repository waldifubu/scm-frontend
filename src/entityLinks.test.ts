import { describe, expect, it } from 'vitest'
import { entityLinkOf, productLinkOf } from './entityLinks'

describe('entityLinkOf', () => {
  it('turns an order number into a link to the order, as a number or as text', () => {
    expect(entityLinkOf('orderNo', 106324)).toEqual({ kind: 'order', orderNo: '106324' })
    expect(entityLinkOf('orderNo', '90123')).toEqual({ kind: 'order', orderNo: '90123' })
    expect(entityLinkOf('orderNo', ' 90123 ')).toEqual({ kind: 'order', orderNo: '90123' })
  })

  it('turns a SKU into a link to its product', () => {
    expect(entityLinkOf('sku', '706a99c3-944b-11f1-9b51-001e064520d8')).toEqual({
      kind: 'sku',
      sku: '706a99c3-944b-11f1-9b51-001e064520d8',
    })
  })

  it('links nothing for a value that cannot be a target', () => {
    expect(entityLinkOf('orderNo', null)).toBeNull()
    expect(entityLinkOf('orderNo', undefined)).toBeNull()
    expect(entityLinkOf('orderNo', '')).toBeNull()
    expect(entityLinkOf('orderNo', 'abc')).toBeNull()
    expect(entityLinkOf('orderNo', '12/3')).toBeNull()
    expect(entityLinkOf('orderNo', { id: 1 })).toBeNull()
    expect(entityLinkOf('sku', null)).toBeNull()
    expect(entityLinkOf('sku', '   ')).toBeNull()
    expect(entityLinkOf('sku', 42)).toBeNull()
  })

  it('links nothing in any other column, whatever it holds', () => {
    expect(entityLinkOf('id', 5)).toBeNull()
    expect(entityLinkOf('orderItemId', 11)).toBeNull()
    expect(entityLinkOf('runNo', 'abc')).toBeNull()
    expect(entityLinkOf('OrderNo', 5)).toBeNull()
  })
})

describe('productLinkOf', () => {
  it('takes the article number and the SKU of an order line', () => {
    expect(productLinkOf({ id: 1, articleNo: 1004, sku: 'abc-123' })).toEqual({ articleNo: '1004', sku: 'abc-123' })
  })

  it('reads an article number sent as text too', () => {
    expect(productLinkOf({ articleNo: ' 77 ' })).toEqual({ articleNo: '77' })
  })

  it('leaves the SKU out when there is none or it is blank', () => {
    expect(productLinkOf({ articleNo: 5, sku: '  ' })).toEqual({ articleNo: '5' })
    expect(productLinkOf({ articleNo: 5, sku: null })).toEqual({ articleNo: '5' })
  })

  it('is no link for a line without a usable article number', () => {
    expect(productLinkOf({})).toBeNull()
    expect(productLinkOf({ articleNo: null, sku: 'x' })).toBeNull()
    expect(productLinkOf({ articleNo: 'abc' })).toBeNull()
    expect(productLinkOf({ articleNo: '12/../x' })).toBeNull()
  })
})

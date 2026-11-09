import { describe, expect, it } from 'vite-plus/test'
import { MAX_REQUEST_QTY, requestComponentsBody, uncoveredSkus } from './componentRequest'

describe('requestComponentsBody', () => {
  it('makes one line per ticked component, each with its own quantity and the shared comment', () => {
    expect(requestComponentsBody(['a', 'b'], { a: '4', b: '10' }, ' bitte schnell ')).toEqual({
      request: {
        items: [
          { componentId: 'a', qty: 4, comment: 'bitte schnell' },
          { componentId: 'b', qty: 10, comment: 'bitte schnell' },
        ],
      },
    })
  })

  it('starts a component whose quantity was not typed at 1', () => {
    expect(
      requestComponentsBody(['a', 'b'], { b: '3' }, '').request?.items.map((item) => item.qty),
    ).toEqual([1, 3])
  })

  it('leaves a blank comment out', () => {
    expect(requestComponentsBody(['a'], { a: '1' }, '  ')).toEqual({
      request: { items: [{ componentId: 'a', qty: 1 }] },
    })
  })

  it('wants at least one component', () => {
    expect(requestComponentsBody([], {}, '').error).toMatch(/at least one component/)
  })

  it.each(['', ' ', '0', '-2', '1.5', 'abc'])('refuses the quantity %j', (qty) => {
    expect(requestComponentsBody(['a'], { a: qty }, '').error).toMatch(
      /quantity of a has to be a whole number/,
    )
  })

  it('refuses a quantity above the backend limit', () => {
    expect(requestComponentsBody(['a'], { a: String(MAX_REQUEST_QTY + 1) }, '').error).toMatch(
      /exceed/,
    )
    expect(requestComponentsBody(['a'], { a: String(MAX_REQUEST_QTY) }, '').request).toBeDefined()
  })

  it('names the component whose quantity is wrong, though the others are fine', () => {
    expect(requestComponentsBody(['a', 'b'], { a: '2', b: '0' }, '').error).toMatch(/of b /)
  })
})

describe('uncoveredSkus', () => {
  it('names the components without a supplier', () => {
    expect(
      uncoveredSkus([
        { componentId: 'a', supplierId: 315, supplierName: 'Wood', ruleId: 1 },
        { componentId: 'b', supplierId: null, supplierName: null, ruleId: null },
      ]),
    ).toEqual(['b'])
  })

  it('is empty when every component is covered', () => {
    expect(
      uncoveredSkus([{ componentId: 'a', supplierId: 1, supplierName: 'X', ruleId: 1 }]),
    ).toEqual([])
  })
})

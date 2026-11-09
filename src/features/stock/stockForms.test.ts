import { describe, expect, it } from 'vite-plus/test'
import { addStockRequest, transferStockRequest } from './stockForms'

const SKU = '3f2b8c1e-0000-4000-8000-000000000001'

describe('addStockRequest', () => {
  it('turns the input into the request, the numbers as numbers', () => {
    expect(addStockRequest({ sku: SKU, storehouseId: '2', qty: '15' })).toEqual({
      request: { sku: SKU, storehouseId: 2, qty: 15 },
    })
  })

  it('wants a SKU, a storehouse and a quantity', () => {
    expect(addStockRequest({ sku: null, storehouseId: '2', qty: '5' }).error).toMatch(/SKU/)
    expect(addStockRequest({ sku: SKU, storehouseId: '', qty: '5' }).error).toMatch(/storehouse/)
    expect(addStockRequest({ sku: SKU, storehouseId: '2', qty: '' }).error).toMatch(/quantity/)
  })

  it.each(['0', '-3', '1.5', 'abc'])(
    'refuses the quantity %s - the backend would answer 400',
    (qty) => {
      expect(addStockRequest({ sku: SKU, storehouseId: '2', qty }).error).toMatch(/quantity/)
    },
  )
})

describe('transferStockRequest', () => {
  it('turns the input into the request', () => {
    expect(transferStockRequest({ sku: SKU, from: '1', to: '2', qty: '4' })).toEqual({
      request: { sku: SKU, storehouseFrom: 1, storehouseTo: 2, qty: 4 },
    })
  })

  it('wants the two storehouses to differ', () => {
    expect(transferStockRequest({ sku: SKU, from: '2', to: '2', qty: '4' }).error).toMatch(
      /different/,
    )
  })

  it('names what is missing', () => {
    expect(transferStockRequest({ sku: null, from: '1', to: '2', qty: '4' }).error).toMatch(/SKU/)
    expect(transferStockRequest({ sku: SKU, from: '', to: '2', qty: '4' }).error).toMatch(
      /take it from/,
    )
    expect(transferStockRequest({ sku: SKU, from: '1', to: '', qty: '4' }).error).toMatch(
      /move it to/,
    )
    expect(transferStockRequest({ sku: SKU, from: '1', to: '2', qty: '0' }).error).toMatch(
      /quantity/,
    )
  })
})

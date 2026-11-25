import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  categoryIdsOf,
  emptyNewProduct,
  newProductBody,
  newProductProblem,
  updateProduct,
} from './products'

const filled = {
  articleNo: '4711',
  name: ' Tisch ',
  description: '',
  unitPrice: '49.5',
}

describe('newProductProblem', () => {
  it('asks for a whole article number, a name and a price', () => {
    expect(newProductProblem(emptyNewProduct)).toMatch(/article/i)
    expect(newProductProblem({ ...filled, articleNo: '12.5' })).toMatch(/article/i)
    expect(newProductProblem({ ...filled, articleNo: '0' })).toMatch(/article/i)
    expect(newProductProblem({ ...filled, name: ' ' })).toMatch(/name/i)
    expect(newProductProblem({ ...filled, unitPrice: '' })).toMatch(/price/i)
    expect(newProductProblem(filled)).toBeNull()
  })
})

describe('newProductBody', () => {
  it('sends numbers as numbers, trims the name and leaves a blank description out', () => {
    expect(newProductBody(filled)).toEqual({
      articleNo: 4711,
      name: 'Tisch',
      unitPrice: 49.5,
    })
    expect(newProductBody({ ...filled, description: ' stabil ' }).description).toBe('stabil')
  })

  it('names the chosen categories by id, and leaves the key out without one', () => {
    expect(newProductBody(filled, [3, 5]).categoryIds).toEqual([3, 5])
    expect(newProductBody(filled, [])).not.toHaveProperty('categoryIds')
  })
})

describe('changing a product', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('addresses the old article number and sends the new one with the categories', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const update = {
      articleNo: 4712,
      name: 'Tisch',
      description: null,
      unitPrice: 1,
      active: false,
      categoryIds: [],
    }

    await updateProduct('4711', update)

    const [url, init] = fetchMock.mock.calls[0]
    expect([init.method, url]).toEqual(['PUT', '/api/1.0/products/4711'])
    expect(JSON.parse(init.body)).toEqual(update)
  })

  it('reads the ids of the categories a product has', () => {
    expect(categoryIdsOf({ categories: [{ id: 3, name: 'a' }, { id: 5 }] })).toEqual([3, 5])
    expect(categoryIdsOf({})).toEqual([])
  })
})

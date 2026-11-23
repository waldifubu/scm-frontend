import { describe, expect, it } from 'vite-plus/test'
import { emptyNewProduct, newProductBody, newProductProblem } from './products'

const filled = {
  articleNo: '4711',
  name: ' Tisch ',
  description: '',
  unitPrice: '49.5',
  weight: '12',
}

describe('newProductProblem', () => {
  it('asks for a whole article number, a name, a price and a weight', () => {
    expect(newProductProblem(emptyNewProduct)).toMatch(/article/i)
    expect(newProductProblem({ ...filled, articleNo: '12.5' })).toMatch(/article/i)
    expect(newProductProblem({ ...filled, articleNo: '0' })).toMatch(/article/i)
    expect(newProductProblem({ ...filled, name: ' ' })).toMatch(/name/i)
    expect(newProductProblem({ ...filled, unitPrice: '' })).toMatch(/price/i)
    expect(newProductProblem({ ...filled, weight: '-2' })).toMatch(/weight/i)
    expect(newProductProblem(filled)).toBeNull()
  })
})

describe('newProductBody', () => {
  it('sends numbers as numbers, trims the name and leaves a blank description out', () => {
    expect(newProductBody(filled)).toEqual({
      articleNo: 4711,
      name: 'Tisch',
      unitPrice: 49.5,
      weight: 12,
    })
    expect(newProductBody({ ...filled, description: ' stabil ' }).description).toBe('stabil')
  })
})

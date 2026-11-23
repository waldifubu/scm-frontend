import { describe, expect, it } from 'vite-plus/test'
import { emptyNewComponent, newComponentBody, newComponentProblem } from './componentEdit'

const filled = { ...emptyNewComponent, productArticleNo: '4711', name: ' Schraube ' }

describe('newComponentProblem', () => {
  it('wants a product first, then a name and a whole quantity', () => {
    expect(newComponentProblem(emptyNewComponent)).toMatch(/product/i)
    expect(newComponentProblem({ ...filled, name: ' ' })).toMatch(/name/i)
    expect(newComponentProblem({ ...filled, qty: '0' })).toMatch(/qty/i)
    expect(newComponentProblem({ ...filled, qty: '1.5' })).toMatch(/qty/i)
    expect(newComponentProblem({ ...filled, weight: '-1' })).toMatch(/weight/i)
    expect(newComponentProblem(filled)).toBeNull()
  })
})

describe('newComponentBody', () => {
  it('names the product by article number and trims the name', () => {
    expect(newComponentBody(filled)).toEqual({ productArticleNo: 4711, name: 'Schraube', qty: 1 })
  })

  it('leaves blank optional fields out and sends the filled ones', () => {
    expect(
      newComponentBody({
        ...filled,
        manufacturer: ' ACME ',
        description: '',
        externalId: 'X-1',
        weight: '2.5',
        qty: '4',
      }),
    ).toEqual({
      productArticleNo: 4711,
      name: 'Schraube',
      qty: 4,
      manufacturer: 'ACME',
      externalId: 'X-1',
      weight: 2.5,
    })
  })
})

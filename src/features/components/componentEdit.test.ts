import { describe, expect, it } from 'vite-plus/test'
import { formOf, formProblem, patchOf } from './componentEdit'

const component = {
  name: 'Blech',
  manufacturer: 'ACME',
  description: 'ein Blech',
  externalId: 'EXT-1',
  weight: 12.5,
  qty: 2,
  sku: 'abc',
}

describe('formOf', () => {
  it('holds every editable field as text, a missing one as empty', () => {
    expect(formOf(component)).toEqual({
      name: 'Blech',
      manufacturer: 'ACME',
      description: 'ein Blech',
      externalId: 'EXT-1',
      weight: '12.5',
      qty: '2',
    })
    expect(formOf({ name: 'x', qty: 1 }).manufacturer).toBe('')
  })
})

describe('patchOf', () => {
  it('is empty while nothing changed', () => {
    expect(patchOf(component, formOf(component))).toEqual({})
  })

  it('names only the fields that differ', () => {
    const form = { ...formOf(component), name: ' Stahlblech ', qty: '5' }
    expect(patchOf(component, form)).toEqual({ name: 'Stahlblech', qty: 5 })
  })

  it('sends an empty string to clear a text field', () => {
    const form = { ...formOf(component), manufacturer: '', description: '  ', externalId: '' }
    expect(patchOf(component, form)).toEqual({ manufacturer: '', description: '', externalId: '' })
  })

  it('compares the weight as a number, so 12.50 is no change', () => {
    expect(patchOf(component, { ...formOf(component), weight: '12.50' })).toEqual({})
    expect(patchOf(component, { ...formOf(component), weight: '3' })).toEqual({ weight: 3 })
  })
})

describe('formProblem', () => {
  const ok = formOf(component)

  it('accepts a valid form', () => {
    expect(formProblem(ok)).toBeNull()
  })

  it('refuses an empty name, a qty below 1 or not whole, and a negative weight', () => {
    expect(formProblem({ ...ok, name: ' ' })).toMatch(/Name/)
    expect(formProblem({ ...ok, qty: '0' })).toMatch(/Qty/)
    expect(formProblem({ ...ok, qty: '1.5' })).toMatch(/Qty/)
    expect(formProblem({ ...ok, qty: '' })).toMatch(/Qty/)
    expect(formProblem({ ...ok, weight: '-1' })).toMatch(/Weight/)
  })
})

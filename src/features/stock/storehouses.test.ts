import { describe, expect, it } from 'vite-plus/test'
import { isStorehouseComplete, storehouseEditOf } from './storehouses'

describe('storehouseEditOf', () => {
  it('takes the four fields of a row, a missing one as an empty text', () => {
    expect(storehouseEditOf({ id: 1, name: 'Nord', address: null, city: 'Hamburg' })).toEqual({
      name: 'Nord',
      address: '',
      city: 'Hamburg',
      country: '',
    })
  })
})

describe('isStorehouseComplete', () => {
  it('needs a name and nothing else', () => {
    expect(isStorehouseComplete({ name: 'Nord', address: '', city: '', country: '' })).toBe(true)
    expect(isStorehouseComplete({ name: '  ', address: 'x', city: 'y', country: 'z' })).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { containerChoices, containerFits } from './containerChoices'

describe('containerChoices', () => {
  it('reads a container into the figures of the grid', () => {
    const row = {
      id: 7,
      packageNumber: 'PK-1',
      type: 'PALLET',
      packages: 2,
      weight: 12.5,
      volume: 250000,
      items: [{ orderNo: 90123 }, { orderNo: 90123 }],
    }

    expect(containerChoices([row])).toEqual([
      { id: 7, packageNumber: 'PK-1', type: 'PALLET', orderNo: '90123', packages: 2, weight: 12.5, volume: 250000 },
    ])
  })

  it('names an order once, however many of its items the container holds', () => {
    const [choice] = containerChoices([{ id: 1, items: [{ orderNo: 5 }, { orderNo: 6 }, { orderNo: 5 }] }])

    expect(choice?.orderNo).toBe('5, 6')
  })

  it('leaves what a container does not have empty, an empty container included', () => {
    expect(containerChoices([{ id: 9, packageNumber: null, type: null, weight: null, items: [] }])).toEqual([
      { id: 9, packageNumber: '', type: '', orderNo: '', packages: 0, weight: null, volume: null },
    ])
  })

  it('counts the items itself where the backend sends no figure', () => {
    expect(containerChoices([{ id: 2, items: [{ orderNo: 1 }, { orderNo: 1 }, { orderNo: 1 }] }])[0]?.packages).toBe(3)
  })

  it('keeps the order of the answer and drops a row that cannot be addressed', () => {
    const rows = [{ id: 3 }, { id: null }, { packageNumber: 'x' }, { id: 'abc' }, { id: 1 }]
    expect(containerChoices(rows).map((choice) => choice.id)).toEqual([3, 1])
  })
})

describe('containerFits', () => {
  it('leaves every container open while nothing is chosen', () => {
    expect(containerFits({ orderNo: '5' }, [])).toBe(true)
    expect(containerFits({ orderNo: '' }, [])).toBe(true)
  })

  it('takes a container of the same order and an empty one', () => {
    expect(containerFits({ orderNo: '5' }, ['5', '5'])).toBe(true)
    expect(containerFits({ orderNo: '' }, ['5'])).toBe(true)
  })

  it('refuses a container of another order', () => {
    expect(containerFits({ orderNo: '6' }, ['5'])).toBe(false)
  })

  it('fits nothing when the chosen items belong to two orders', () => {
    expect(containerFits({ orderNo: '5' }, ['5', '6'])).toBe(false)
    expect(containerFits({ orderNo: '' }, ['5', '6'])).toBe(false)
  })

  it('ignores items without an order number', () => {
    expect(containerFits({ orderNo: '6' }, [''])).toBe(true)
  })
})

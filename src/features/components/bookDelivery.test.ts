import { describe, expect, it } from 'vite-plus/test'
import { bookDeliveryBody, bookedLines, idsText } from './bookDelivery'
import type { ComponentRequestRow } from './componentRequests'

describe('bookDeliveryBody', () => {
  it('takes the ticked ids and the chosen storehouse', () => {
    expect(bookDeliveryBody([4, 9], '2')).toEqual({
      body: { requestIds: [4, 9], storehouseId: 2 },
    })
  })

  it('wants at least one request', () => {
    expect(bookDeliveryBody([], '2').error).toMatch(/at least one/)
  })

  it.each(['', ' '])('leaves the storehouse out for %j - the backend chooses', (storehouse) => {
    expect(bookDeliveryBody([4, 9], storehouse)).toEqual({ body: { requestIds: [4, 9] } })
  })

  it.each(['0', '-1', 'x', '1.5'])('refuses %j as a storehouse', (storehouse) => {
    expect(bookDeliveryBody([1], storehouse).error).toMatch(/storehouse/)
  })
})

describe('idsText', () => {
  it('lists the ids comma separated', () => {
    expect(idsText([4, 9, 12])).toBe('4, 9, 12')
    expect(idsText([])).toBe('')
  })
})

describe('bookedLines', () => {
  const row = (over: Partial<ComponentRequestRow>): ComponentRequestRow => ({
    id: 1,
    componentDbId: 11,
    componentId: '706f77e1-944b-11f1-9b51-001e064520d8',
    productName: 'Regal',
    componentName: 'Screw',
    qty: 4,
    requestStatus: 'IN_STOCK',
    requestDate: null,
    supplierId: 3,
    storehouseId: 2,
    ...over,
  })

  it('names the part, the quantity and the storehouse of every booked request', () => {
    expect(
      bookedLines([row({}), row({ id: 2, componentName: 'Plank', qty: 1, storehouseId: 5 })]),
    ).toEqual([
      { key: 1, text: 'Screw (706f77e1, Regal), 4 components stored at storehouse with id 2' },
      { key: 2, text: 'Plank (706f77e1, Regal), 1 component stored at storehouse with id 5' },
    ])
  })

  it('leaves the brackets out for a part with neither SKU nor product', () => {
    expect(bookedLines([row({ componentId: null, productName: undefined })])[0].text).toBe(
      'Screw, 4 components stored at storehouse with id 2',
    )
  })

  it('leaves the storehouse out when the answer has none', () => {
    expect(bookedLines([row({ storehouseId: undefined })])[0].text).toBe(
      'Screw (706f77e1, Regal), 4 components stored',
    )
  })
})

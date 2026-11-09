import { describe, expect, it } from 'vite-plus/test'
import { bookDeliveryBody, idsText } from './bookDelivery'

describe('bookDeliveryBody', () => {
  it('takes the ticked ids and the chosen storehouse', () => {
    expect(bookDeliveryBody([4, 9], '2')).toEqual({
      body: { requestIds: [4, 9], storehouseId: 2 },
    })
  })

  it('wants at least one request', () => {
    expect(bookDeliveryBody([], '2').error).toMatch(/at least one/)
  })

  it.each(['', ' ', '0', '-1', 'x', '1.5'])('wants a storehouse, not %j', (storehouse) => {
    expect(bookDeliveryBody([1], storehouse).error).toMatch(/storehouse/)
  })
})

describe('idsText', () => {
  it('lists the ids comma separated', () => {
    expect(idsText([4, 9, 12])).toBe('4, 9, 12')
    expect(idsText([])).toBe('')
  })
})

import { describe, expect, it } from 'vite-plus/test'
import { shipmentFits } from './shipmentChoices'

describe('shipmentFits', () => {
  it('leaves every shipment open while nothing is chosen', () => {
    expect(shipmentFits({ customerId: 3 }, [])).toBe(true)
    expect(shipmentFits({ customerId: 3 }, [null])).toBe(true)
  })

  it('takes a shipment of the same customer', () => {
    expect(shipmentFits({ customerId: 3 }, [3, 3])).toBe(true)
  })

  it('refuses a shipment of another customer', () => {
    expect(shipmentFits({ customerId: 4 }, [3])).toBe(false)
  })

  it('fits nothing when the containers belong to two customers', () => {
    expect(shipmentFits({ customerId: 3 }, [3, 4])).toBe(false)
  })

  it('does not refuse a shipment whose customer is unknown', () => {
    expect(shipmentFits({ customerId: null }, [3])).toBe(true)
  })
})

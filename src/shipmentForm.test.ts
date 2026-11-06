import { describe, expect, it } from 'vitest'
import type { ShipmentDetail } from './api/shipments'
import { formError, formOf, isDirty, newShipmentRequest, requestOf, type ShipmentDataForm } from './shipmentForm'

const shipment = (extra: Partial<ShipmentDetail> = {}): ShipmentDetail => ({
  id: 2,
  status: 'READY',
  createdAt: '2026-10-18T14:02:11',
  packageCount: 0,
  weight: 0,
  packages: [],
  ...extra,
})

const form = (extra: Partial<ShipmentDataForm> = {}): ShipmentDataForm => ({
  shippingAddress: 'Hafenweg 4, Hamburg',
  shippingMethod: 'DHL',
  requestedDeliveryDate: '2026-11-02',
  comment: 'call first',
  ...extra,
})

describe('formOf', () => {
  it('takes the four fields of the shipment', () => {
    expect(
      formOf(shipment({ shippingAddress: 'Hafenweg 4', shippingMethod: 'DHL', requestedDeliveryDate: '2026-11-02', comment: 'x' })),
    ).toEqual({ shippingAddress: 'Hafenweg 4', shippingMethod: 'DHL', requestedDeliveryDate: '2026-11-02', comment: 'x' })
  })

  it('makes an empty input of what the shipment does not have', () => {
    expect(formOf(shipment())).toEqual({ shippingAddress: '', shippingMethod: '', requestedDeliveryDate: '', comment: '' })
    expect(formOf(shipment({ shippingMethod: null, comment: null }))).toMatchObject({ shippingMethod: '', comment: '' })
  })

  it('cuts a date that came with a time back to the date an input can hold', () => {
    expect(formOf(shipment({ requestedDeliveryDate: '2026-11-02T00:00:00' })).requestedDeliveryDate).toBe('2026-11-02')
  })
})

describe('isDirty', () => {
  it('is false for the form as it was saved, and true for any field changed', () => {
    expect(isDirty(form(), form())).toBe(false)
    expect(isDirty(form({ shippingAddress: 'Elsewhere' }), form())).toBe(true)
    expect(isDirty(form({ shippingMethod: '' }), form())).toBe(true)
    expect(isDirty(form({ requestedDeliveryDate: '' }), form())).toBe(true)
    expect(isDirty(form({ comment: 'other' }), form())).toBe(true)
  })

  it('does not count blanks around a text as a change', () => {
    expect(isDirty(form({ shippingMethod: ' DHL ' }), form())).toBe(false)
  })
})

describe('formError', () => {
  it('wants an address', () => {
    expect(formError(form({ shippingAddress: '' }))).toMatch(/address/i)
    expect(formError(form({ shippingAddress: '   ' }))).toMatch(/address/i)
  })

  it('has nothing to say about a form that can be sent, however empty the rest is', () => {
    expect(formError(form())).toBeNull()
    expect(formError(form({ shippingMethod: '', requestedDeliveryDate: '', comment: '' }))).toBeNull()
  })
})

describe('requestOf', () => {
  it('sends all four fields, trimmed', () => {
    expect(requestOf(form({ shippingAddress: ' Hafenweg 4 ', comment: ' call first ' }))).toEqual({
      shippingAddress: 'Hafenweg 4',
      shippingMethod: 'DHL',
      requestedDeliveryDate: '2026-11-02',
      comment: 'call first',
    })
  })

  it('sends an empty input as null, not as an empty text - and still sends the key', () => {
    const request = requestOf(form({ shippingMethod: '  ', requestedDeliveryDate: '', comment: '' }))

    expect(request).toEqual({ shippingAddress: 'Hafenweg 4, Hamburg', shippingMethod: null, requestedDeliveryDate: null, comment: null })
    expect(Object.keys(request)).toEqual(['shippingAddress', 'shippingMethod', 'requestedDeliveryDate', 'comment'])
  })

  it('sends the date of the shipment back when nothing about it was touched, so a save does not wipe it', () => {
    const saved = formOf(shipment({ shippingAddress: 'A', requestedDeliveryDate: '2026-11-02' }))

    expect(requestOf({ ...saved, comment: 'new' }).requestedDeliveryDate).toBe('2026-11-02')
  })
})

describe('newShipmentRequest', () => {
  const form = { shippingAddress: ' Musterstr. 1, Berlin ', shippingMethod: 'DHL', requestedDeliveryDate: '2026-11-03' }

  it('turns the chosen containers and the form into the request, blanks trimmed', () => {
    expect(newShipmentRequest([5, 7], form)).toEqual({
      request: { shipmentPackageIds: [5, 7], shippingAddress: 'Musterstr. 1, Berlin', shippingMethod: 'DHL', requestedDeliveryDate: '2026-11-03' },
    })
  })

  it('sends an empty field as null - the address and the rest are optional here', () => {
    expect(newShipmentRequest([5], { shippingAddress: '  ', shippingMethod: '', requestedDeliveryDate: '' })).toEqual({
      request: { shipmentPackageIds: [5], shippingAddress: null, shippingMethod: null, requestedDeliveryDate: null },
    })
  })

  it('refuses a shipment without a container - the backend never takes an empty one', () => {
    expect(newShipmentRequest([], form).error).toMatch(/at least one container/)
  })
})

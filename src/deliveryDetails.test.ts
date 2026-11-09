import { describe, expect, it } from 'vite-plus/test'
import type { DeliveryRow } from './api/shipments'
import { deliveryFields } from './deliveryDetails'

const row = (extra: Partial<DeliveryRow> = {}): DeliveryRow => ({
  shipmentId: 7,
  status: 'DISPATCH_REQUESTED',
  customerName: 'Cuddy Customer Toyota',
  customerId: 312,
  shippingAddress: 'Wolfsburger Straße 299, Wolfsburg',
  shippingMethod: 'Landweg oder so',
  requestedDeliveryDate: '2026-10-08',
  createdAt: '2026-09-22T15:20:04',
  packageCount: 1,
  weight: 46.9,
  packageNumbers: ['PKG-1'],
  comment: 'Kannst du mal eben schnell nur noch....',
  ...extra,
})

describe('deliveryFields', () => {
  it('lists the eight lines in reading order, the way the page shows them', () => {
    expect(deliveryFields(row())).toEqual([
      ['customer', 'Cuddy Customer Toyota (#312)'],
      ['shippingAddress', 'Wolfsburger Straße 299, Wolfsburg'],
      ['shippingMethod', 'Landweg oder so'],
      ['requestedDeliveryDate', '2026-10-08'],
      ['createdAt', '2026-09-22 15:20:04'],
      ['packageCount', '1'],
      ['weight', '46.9 kg'],
      ['comment', 'Kannst du mal eben schnell nur noch....'],
    ])
  })

  it('leaves out a line with nothing in it', () => {
    const labels = deliveryFields(
      row({ comment: null, shippingMethod: undefined, requestedDeliveryDate: null }),
    ).map(([label]) => label)

    expect(labels).toEqual(['customer', 'shippingAddress', 'createdAt', 'packageCount', 'weight'])
  })

  it('names the customer by name alone when the number is not known, and by number alone without a name', () => {
    expect(deliveryFields(row({ customerId: undefined }))[0]).toEqual([
      'customer',
      'Cuddy Customer Toyota',
    ])
    expect(deliveryFields(row({ customerName: undefined }))[0]).toEqual(['customer', '(#312)'])
  })

  it('shows a weight of zero and a count of zero, which are values', () => {
    const fields = Object.fromEntries(deliveryFields(row({ packageCount: 0, weight: 0 })))

    expect(fields.packageCount).toBe('0')
    expect(fields.weight).toBe('0 kg')
  })

  it('cuts a long weight to what a table shows', () => {
    expect(Object.fromEntries(deliveryFields(row({ weight: 46.912345 }))).weight).toBe('46.91 kg')
  })

  it('shows the note of the carrier below the one of the planner once there is one', () => {
    const fields = deliveryFields(row({ distributorComment: 'no truck free' }))

    expect(fields.at(-2)).toEqual(['comment', 'Kannst du mal eben schnell nur noch....'])
    expect(fields.at(-1)).toEqual(['distributorComment', 'no truck free'])
  })

  it('shows when the shipment last changed and when it left, right after when it was made', () => {
    const labels = deliveryFields(
      row({ updatedAt: '2026-10-25T09:30:00', shippedAt: '2026-10-24T08:00:00' }),
    ).map(([label]) => label)
    const fields = Object.fromEntries(
      deliveryFields(row({ updatedAt: '2026-10-25T09:30:00', shippedAt: '2026-10-24T08:00:00' })),
    )

    expect(labels.slice(labels.indexOf('createdAt'), labels.indexOf('createdAt') + 3)).toEqual([
      'createdAt',
      'updatedAt',
      'shippedAt',
    ])
    expect(fields.updatedAt).toBe('2026-10-25 09:30:00')
    expect(fields.shippedAt).toBe('2026-10-24 08:00:00')
  })

  it('shows the tracking number only once it is set', () => {
    expect(deliveryFields(row()).map(([label]) => label)).not.toContain('trackingNumber')
    expect(deliveryFields(row({ trackingNumber: '' })).map(([label]) => label)).not.toContain(
      'trackingNumber',
    )

    const fields = deliveryFields(row({ trackingNumber: 'DHL-123' }))
    const labels = fields.map(([label]) => label)
    expect(fields).toContainEqual(['trackingNumber', 'DHL-123'])
    expect(labels.indexOf('trackingNumber')).toBe(labels.indexOf('weight') + 1)
  })

  it('leaves the two moments out while the shipment has none - a row from before the column, a shipment that has not left', () => {
    const labels = deliveryFields(row()).map(([label]) => label)

    expect(labels).not.toContain('updatedAt')
    expect(labels).not.toContain('shippedAt')
  })
})

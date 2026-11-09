import { describe, expect, it } from 'vite-plus/test'
import type { ShipmentDetail } from './api/shipments'
import { shipmentFields } from './shipmentFields'

const shipment = (extra: Partial<ShipmentDetail> = {}): ShipmentDetail => ({
  id: 2,
  status: 'DECLINED',
  customerName: 'Cuddy Customer Toyota',
  customerId: 312,
  createdAt: '2026-09-22T15:20:04',
  packageCount: 1,
  weight: 46.9,
  packages: [],
  ...extra,
})

const labels = (s: ShipmentDetail) => shipmentFields(s).map(([label]) => label)

describe('shipmentFields', () => {
  it('lists the note of the carrier right under the one of the planner', () => {
    const fields = shipmentFields(
      shipment({ comment: 'call first', distributorComment: 'no truck free' }),
    )

    const at = fields.findIndex(([label]) => label === 'comment')
    expect(fields[at]).toEqual(['comment', 'call first'])
    expect(fields[at + 1]).toEqual(['distributorComment', 'no truck free'])
    expect(at + 1).toBe(fields.length - 1)
  })

  it('leaves the line out while the carrier has left no note', () => {
    expect(labels(shipment({ comment: 'call first' }))).not.toContain('distributorComment')
    expect(labels(shipment({ comment: 'call first', distributorComment: null }))).not.toContain(
      'distributorComment',
    )
    expect(labels(shipment({ distributorComment: '' }))).not.toContain('distributorComment')
  })

  it('shows the note of the carrier also when the planner left none', () => {
    const fields = shipmentFields(shipment({ distributorComment: 'no truck free' }))

    expect(labels(shipment({ distributorComment: 'no truck free' }))).not.toContain('comment')
    expect(fields.at(-1)).toEqual(['distributorComment', 'no truck free'])
  })

  it('keeps the other lines as they were', () => {
    expect(
      shipmentFields(
        shipment({
          shippingAddress: 'Hafenweg 4',
          distributor: undefined,
        } as Partial<ShipmentDetail>),
      ),
    ).toEqual([
      ['customer', 'Cuddy Customer Toyota (#312)'],
      ['shippingAddress', 'Hafenweg 4'],
      ['createdAt', '2026-09-22 15:20:04'],
      ['packageCount', '1'],
      ['weight', '46.9 kg'],
    ])
  })

  it('adds up the volume of all packages in m³, and leaves it out without packages', () => {
    const pack = (id: number, volume: number | null) => ({
      id,
      status: 'PACKED',
      volume,
      items: [],
    })

    expect(
      shipmentFields(shipment({ packages: [pack(1, 1000000), pack(2, 250000.5), pack(3, null)] })),
    ).toContainEqual(['volume', '1.25 m³'])
    expect(labels(shipment({ packages: [] }))).not.toContain('volume')
  })

  it('names the distributor with the number', () => {
    expect(
      shipmentFields(shipment({ distributorName: 'Carl Carrier', distributorId: 12 })),
    ).toContainEqual(['distributor', 'Carl Carrier (#12)'])
  })

  it('shows when the shipment last changed right after when it was made', () => {
    const fields = shipmentFields(
      shipment({
        updatedAt: '2026-10-25T09:30:00',
        shippedAt: '2026-10-26T08:00:00',
        trackingNumber: 'DHL-123',
      }),
    )
    const names = fields.map(([label]) => label)

    expect(names.slice(names.indexOf('createdAt'), names.indexOf('createdAt') + 3)).toEqual([
      'createdAt',
      'updatedAt',
      'shippedAt',
    ])
    expect(fields).toContainEqual(['updatedAt', '2026-10-25 09:30:00'])
    expect(fields).toContainEqual(['trackingNumber', 'DHL-123'])
  })

  it('leaves the update out while there is none', () => {
    expect(labels(shipment())).not.toContain('updatedAt')
    expect(labels(shipment({ updatedAt: null }))).not.toContain('updatedAt')
  })
})

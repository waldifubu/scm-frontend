import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { orderShipmentsPath, orderShipmentsQueryOptions, showsShipments } from './orderShipments'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('showsShipments', () => {
  it.each(['READY_FOR_DISPATCH', 'IN_TRANSIT', 'PARTIALLY_DELIVERED', 'DELIVERED', 'COMPLETED'])(
    'shows them for %s',
    (status) => {
      expect(showsShipments(status)).toBe(true)
    },
  )

  it.each([
    'CREATED',
    'ACKNOWLEDGED',
    'APPROVED',
    'IN_FULFILLMENT',
    'WAIT_SUPPLY',
    'CANCELLED',
    'REJECTED',
    undefined,
    null,
    4,
  ])('does not for %s', (status) => {
    expect(showsShipments(status)).toBe(false)
  })
})

describe('orderShipmentsQueryOptions', () => {
  it('asks the shipments of the order by its number', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response('[{"id":4,"status":"DELIVERED","packageNumbers":["P1"]}]', { status: 200 }),
      )
    vi.stubGlobal('fetch', fetchMock)

    const options = orderShipmentsQueryOptions('4567')
    await expect((options.queryFn as () => Promise<unknown>)()).resolves.toMatchObject([
      { id: 4, packageNumbers: ['P1'] },
    ])

    expect(orderShipmentsPath('4567')).toBe('/orders/4567/shipments')
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/orders/4567/shipments')
  })
})

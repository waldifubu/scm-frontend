import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { fetchShippable, SHIPPABLE_SORT_KEYS, shippablePath } from './shippablePackages'

describe('shippablePath', () => {
  it('asks the planning side own list - not the packing work one a logistics user may not read', () => {
    expect(shippablePath()).toBe('/shipments/packages')
    expect(shippablePath()).not.toContain('shipment-packages')
  })

  it('names the sort the backend knows, with the direction', () => {
    expect(shippablePath(0, { column: 'type', direction: 'desc' })).toBe(
      '/shipments/packages?sort=shipmentPackageType&order=DESC',
    )
    expect(shippablePath(0, { column: 'packedAt', direction: 'asc' })).toBe(
      '/shipments/packages?sort=packedAt&order=ASC',
    )
  })

  it('adds the page after the sort', () => {
    expect(shippablePath(2, { column: 'id', direction: 'asc' })).toBe(
      '/shipments/packages?sort=id&order=ASC&page=2',
    )
    expect(shippablePath(1)).toBe('/shipments/packages?page=1')
  })

  it('leaves out a column it cannot sort by - the contents are worked out per row', () => {
    expect(shippablePath(0, { column: 'packages', direction: 'asc' })).toBe('/shipments/packages')
    expect(SHIPPABLE_SORT_KEYS.items).toBeUndefined()
  })
})

describe('fetchShippable', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reads the single container the address names', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response('{"id":12,"status":"PACKED","customerId":3}', { status: 200 }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchShippable('12')).resolves.toMatchObject({ id: 12, customerId: 3 })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/shipment-packages/12')
  })

  it('is null for an id nobody has - a 404 is an answer here, not an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"message":"no such package"}', { status: 404 })),
    )

    await expect(fetchShippable('99')).resolves.toBeNull()
  })

  it('lets any other refusal through', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"message":"forbidden"}', { status: 403 })),
    )

    await expect(fetchShippable('12')).rejects.toMatchObject({ status: 403 })
  })
})

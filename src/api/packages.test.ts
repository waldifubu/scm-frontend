import { afterEach, describe, expect, it, vi } from 'vitest'
import { addItemsToContainer, DEFAULT_PACKAGE_STATUS, fetchPackages, lonelyPackagesPath } from './packages'

afterEach(() => vi.unstubAllGlobals())

describe('DEFAULT_PACKAGE_STATUS', () => {
  it('starts the view on the packed lines', () => {
    expect(DEFAULT_PACKAGE_STATUS).toBe('PACKED')
  })
})

describe('fetchPackages', () => {
  it('sends the fulfillment status filter with the other parameters', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"content":[],"total":0,"page":0,"size":25}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchPackages({ fulfillmentStatus: 'PACKED', page: 2 })

    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('/packages?')
    expect(url).toContain('fulfillmentStatus=PACKED')
    expect(url).toContain('page=2')
  })

  it('sends none when every status is wanted', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"content":[],"total":0,"page":0,"size":25}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchPackages({ fulfillmentStatus: undefined })

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('/api/1.0/packages')
  })
})

describe('lonelyPackagesPath', () => {
  it('asks for every loose item on the first page by default', () => {
    expect(lonelyPackagesPath()).toBe('/lonely-packages')
  })

  it('names the status and the page', () => {
    expect(lonelyPackagesPath(0, 'PACKED')).toBe('/lonely-packages?fulfillmentStatus=PACKED')
    expect(lonelyPackagesPath(2, 'PACKED')).toBe('/lonely-packages?fulfillmentStatus=PACKED&page=2')
    expect(lonelyPackagesPath(1)).toBe('/lonely-packages?page=1')
  })
})

describe('addItemsToContainer', () => {
  it('posts the item ids to the container', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":7,"packageNumber":"PK-1","items":[{},{}]}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(addItemsToContainer(7, [101, 102])).resolves.toBe('Container PK-1 now holds 2 items.')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/1.0/packing/shipment/7/items')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ packageItemIds: [101, 102] })
  })

  it('names the container by its id when it has no number, and says item for one', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"id":9,"items":[{}]}', { status: 200 })))

    await expect(addItemsToContainer(9, [1])).resolves.toBe('Container 9 now holds 1 item.')
  })

  it('does not hide a refusal', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"message":"Item 101 is in another package"}', { status: 409 })))

    await expect(addItemsToContainer(7, [101])).rejects.toMatchObject({ status: 409, message: 'Item 101 is in another package' })
  })
})

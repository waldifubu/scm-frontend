import { afterEach, describe, expect, it, vi } from 'vitest'
import { bookDelivery, requestsPath } from './componentRequests'

describe('requestsPath', () => {
  it('sends nothing for the defaults', () => {
    expect(requestsPath(0, '')).toBe('/components/requests')
  })

  it('adds the page from the second on and the status when one is chosen', () => {
    expect(requestsPath(2, '')).toBe('/components/requests?page=2')
    expect(requestsPath(0, 'OPEN')).toBe('/components/requests?status=OPEN')
    expect(requestsPath(1, 'IN_TRANSIT')).toBe('/components/requests?page=1&status=IN_TRANSIT')
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('bookDelivery', () => {
  it('posts the request ids and the storehouse to /stock/book', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('[{"id":4,"requestStatus":"IN_STOCK"}]', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(bookDelivery({ requestIds: [4, 9], storehouseId: 2 })).resolves.toMatchObject([{ requestStatus: 'IN_STOCK' }])

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/stock/book')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' })
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ requestIds: [4, 9], storehouseId: 2 })
  })

  it('lets a refusal through', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"message":"Only DELIVERED requests can be booked in"}', { status: 409 })))

    await expect(bookDelivery({ requestIds: [1], storehouseId: 2 })).rejects.toMatchObject({ status: 409 })
  })
})

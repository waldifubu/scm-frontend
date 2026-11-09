import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { ALL_STATUSES, fetchOrderItems } from './orderItems'

afterEach(() => {
  vi.unstubAllGlobals()
})

const answer = () =>
  vi
    .fn()
    .mockResolvedValue(new Response('{"content":[],"total":0,"page":0,"size":25}', { status: 200 }))

describe('fetchOrderItems', () => {
  it('asks for every status with status=ALL', async () => {
    const fetchMock = answer()
    vi.stubGlobal('fetch', fetchMock)

    await fetchOrderItems({ status: ALL_STATUSES })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/order-items?status=ALL')
  })

  it('asks for one status by name', async () => {
    const fetchMock = answer()
    vi.stubGlobal('fetch', fetchMock)

    await fetchOrderItems({ status: 'WAITING', page: 1 })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/order-items?status=WAITING&page=1')
  })
})

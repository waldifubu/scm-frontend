import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { api } from './client'

afterEach(() => {
  vi.unstubAllGlobals()
})

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })
const unauthorized = () =>
  new Response(JSON.stringify({ message: 'JWT token expired' }), { status: 401 })

describe('api with a refresh token', () => {
  it('renews the session on a 401 and repeats the call once', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(ok({}))
      .mockResolvedValueOnce(ok({ id: 7 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(api<{ id: number }>('/orders/7')).resolves.toEqual({ id: 7 })

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      '/api/1.0/orders/7',
      '/api/1.0/auth/refresh',
      '/api/1.0/orders/7',
    ])
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST', credentials: 'include' })
  })

  it('reports the original 401 when the refresh fails too', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(unauthorized())
    vi.stubGlobal('fetch', fetchMock)

    await expect(api('/orders/7')).rejects.toMatchObject({
      status: 401,
      message: 'JWT token expired',
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not loop when the repeated call is refused again', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(ok({}))
      .mockResolvedValueOnce(unauthorized())
    vi.stubGlobal('fetch', fetchMock)

    await expect(api('/orders/7')).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('shares one refresh between calls that fail together', async () => {
    let refreshCalls = 0
    const seen = new Set<string>()
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1
        return Promise.resolve(ok({}))
      }
      // The first answer for each path is a 401, the repeat succeeds.
      if (!seen.has(url)) {
        seen.add(url)
        return Promise.resolve(unauthorized())
      }
      return Promise.resolve(ok({ url }))
    })
    vi.stubGlobal('fetch', fetchMock)

    await Promise.all([api('/orders'), api('/products'), api('/stock')])

    expect(refreshCalls).toBe(1)
  })

  it('never refreshes for the calls that start, renew or end a session', async () => {
    for (const path of ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/login?x=1']) {
      const fetchMock = vi.fn().mockResolvedValue(unauthorized())
      vi.stubGlobal('fetch', fetchMock)

      await expect(api(path, { method: 'POST' })).rejects.toMatchObject({ status: 401 })
      expect(fetchMock, path).toHaveBeenCalledTimes(1)
    }
  })

  it('does not refresh for other errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(api('/orders')).rejects.toMatchObject({ status: 403 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('treats an unreachable server during the refresh as a failed refresh', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unauthorized())
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(api('/orders')).rejects.toMatchObject({ status: 401 })
  })
})

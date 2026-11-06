import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api', () => {
  it('prefixes the versioned API path and includes the session cookie', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 42 }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(api<{ id: number }>('/products/42', { method: 'POST', body: JSON.stringify({ active: true }) }))
      .resolves.toEqual({ id: 42 })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/1.0/products/42',
      expect.objectContaining({ credentials: 'include', method: 'POST' }),
    )
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = new Headers(request.headers)
    expect(headers.get('Accept')).toBe('application/json')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('maps a structured backend error to ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Product does not exist.' }), {
      status: 404,
      statusText: 'Not Found',
    })))

    await expect(api('/products/404')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Product does not exist.',
      body: { detail: 'Product does not exist.' },
    })
  })

  it('returns a reachable error when fetch itself fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(api('/me')).rejects.toMatchObject({
      status: 0,
      message: 'The server cannot be reached.',
    })
  })
})

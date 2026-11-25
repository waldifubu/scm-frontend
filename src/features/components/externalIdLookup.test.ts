import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { ApiError } from '../../shared/api/client'
import { fetchComponentByExternalId, lookupMessage } from './components'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchComponentByExternalId', () => {
  it('asks the external path with the reference encoded', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"sku":"abc"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchComponentByExternalId('A/B 1')).resolves.toEqual({ sku: 'abc' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/components/external/A%2FB%201')
  })
})

describe('lookupMessage', () => {
  it('says nothing was found for a 404 and passes any other message on', () => {
    expect(lookupMessage(new ApiError(404, 'Component not found'), 'X-1')).toBe(
      'No component with external ID X-1.',
    )
    expect(lookupMessage(new ApiError(403, 'Access denied'), 'X-1')).toBe('Access denied')
    expect(lookupMessage('boom', 'X-1')).toBe('The lookup failed.')
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { DISTRIBUTOR_PAGE_SIZE, distributorQueryBody, fetchDistributors, queryDistributors } from './distributors'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchDistributors', () => {
  it('asks for all carriers at once, by last name', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ content: [], total: 0, page: 0, size: DISTRIBUTOR_PAGE_SIZE }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await fetchDistributors()

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]), 'http://localhost')
    expect(url.pathname).toBe('/api/1.0/users/distributors')
    expect(Object.fromEntries(url.searchParams)).toEqual({ size: String(DISTRIBUTOR_PAGE_SIZE), sort: 'lastName' })
    expect(DISTRIBUTOR_PAGE_SIZE).toBeGreaterThan(25)
  })

  it('returns the rows of the page', async () => {
    const row = { id: 12, firstName: 'Carl', lastName: 'Carrier', username: 'carl', email: 'c@x.de', isActive: true, roles: ['DISTRIBUTOR'] }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ content: [row], total: 1, page: 0, size: 100 }), { status: 200 }),
    ))

    await expect(fetchDistributors()).resolves.toMatchObject({ content: [row], total: 1 })
  })

  it('reads a bare array as one page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[{"id":1}]', { status: 200 })))

    await expect(fetchDistributors()).resolves.toMatchObject({ content: [{ id: 1 }], total: 1 })
  })

  it('does not hide a refusal', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"message":"Access Denied"}', { status: 403 })))

    await expect(fetchDistributors()).rejects.toMatchObject({ status: 403 })
  })
})

describe('queryDistributors', () => {
  const page = (content: unknown[]) => new Response(JSON.stringify({ content, total: content.length, page: 0, size: 100 }), { status: 200 })

  it('asks with the method QUERY and the question in the body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(page([{ id: 319 }]))
    vi.stubGlobal('fetch', fetchMock)

    await expect(queryDistributors({ customerId: 311, weight: 60.5, volume: 250000 })).resolves.toMatchObject({
      content: [{ id: 319 }],
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(String(url)).toContain('/api/1.0/users/distributors/query')
    expect(init.method).toBe('QUERY')
    expect(JSON.parse(String(init.body))).toEqual({ customerId: 311, weight: 60.5, volume: 250000 })
  })

  it('leaves out what is not known', () => {
    expect(distributorQueryBody({ customerId: 311, weight: null, volume: undefined })).toEqual({ customerId: 311 })
    expect(distributorQueryBody({ weight: 0 })).toEqual({ weight: 0 })
  })

  it('offers every active carrier when no rule applies (an empty page)', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(page([])).mockResolvedValueOnce(page([{ id: 1 }, { id: 2 }]))
    vi.stubGlobal('fetch', fetchMock)

    await expect(queryDistributors({ customerId: 9 })).resolves.toMatchObject({ content: [{ id: 1 }, { id: 2 }], fallback: true })
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/api/1.0/users/distributors?')
  })

  it('does not take the fallback for a refusal', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"message":"Access Denied"}', { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(queryDistributors({ customerId: 9 })).rejects.toMatchObject({ status: 403 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

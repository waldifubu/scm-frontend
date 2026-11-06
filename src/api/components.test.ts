import { afterEach, describe, expect, it, vi } from 'vitest'
import { patchComponent, requestComponents } from './components'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('patchComponent', () => {
  it('patches the SKU with only the fields given', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"sku":"abc","name":"Neu"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(patchComponent('abc', { name: 'Neu', qty: 3 })).resolves.toMatchObject({ name: 'Neu' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/components/abc')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'PATCH' })
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ name: 'Neu', qty: 3 })
  })

  it('lets the backend refusal through', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"message":"Article number already exists!"}', { status: 409 })))

    await expect(patchComponent('abc', { externalId: 'EXT-2' })).rejects.toMatchObject({ status: 409 })
  })
})

describe('requestComponents', () => {
  it('posts the lines to /components/request, without a supplier', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('[{"id":1}]', { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(requestComponents({ items: [{ componentId: 'abc', qty: 2 }] })).resolves.toEqual([{ id: 1 }])

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/components/request')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' })
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ items: [{ componentId: 'abc', qty: 2 }] })
  })

  it('lets the missing-rule refusal through', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"message":"No active supplier rule for component: abc"}', { status: 409 })))

    await expect(requestComponents({ items: [{ componentId: 'abc', qty: 2 }] })).rejects.toMatchObject({ status: 409 })
  })
})

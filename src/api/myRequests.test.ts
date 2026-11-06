import { afterEach, describe, expect, it, vi } from 'vitest'
import { answerRequest, fetchMyRequests } from './myRequests'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchMyRequests', () => {
  it('reads the supplier list', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('[{"id":1,"qty":5,"requestStatus":"OPEN"}]', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchMyRequests()).resolves.toMatchObject([{ id: 1, qty: 5 }])
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/supplier/my-requests')
  })

  it('also reads a paged answer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"content":[{"id":2}]}', { status: 200 })))

    await expect(fetchMyRequests()).resolves.toMatchObject([{ id: 2 }])
  })
})

describe('answerRequest', () => {
  it('posts the step to the request, without a body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":7,"requestStatus":"APPROVED"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(answerRequest(7, 'approve')).resolves.toMatchObject({ requestStatus: 'APPROVED' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/supplier/7/approve')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' })
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBeUndefined()
  })

  it('lets a refusal through', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"message":"Request 7 is OPEN"}', { status: 409 })))

    await expect(answerRequest(7, 'delivered')).rejects.toMatchObject({ status: 409 })
  })
})

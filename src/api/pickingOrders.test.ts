import { afterEach, describe, expect, it, vi } from 'vitest'
import { pickingOrdersPath, releasePick, releaseQuestion } from './pickingOrders'

afterEach(() => vi.unstubAllGlobals())

describe('pickingOrdersPath', () => {
  it('asks for nothing special by default - the backend lists what is still to be picked', () => {
    expect(pickingOrdersPath()).toBe('/picking-orders')
    expect(pickingOrdersPath(0, 'ACTIVE')).toBe('/picking-orders')
  })

  it('asks for the picked ones by their reservation status', () => {
    expect(pickingOrdersPath(0, 'CONSUMED')).toBe('/picking-orders?status=CONSUMED')
  })

  it('adds the page after the status', () => {
    expect(pickingOrdersPath(2, 'CONSUMED')).toBe('/picking-orders?status=CONSUMED&page=2')
    expect(pickingOrdersPath(1)).toBe('/picking-orders?page=1')
  })
})

describe('releasePick', () => {
  it('posts to the release step of that reservation and says what happened', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"reservationId":25,"fulfillmentStatus":"WAITING"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(releasePick('25')).resolves.toBe('Pick of reservation 25 taken back.')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/release/25')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' })
  })

  it('lets a refusal through with the words of the backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Order item 11 is PACKED, only a PICKED line can be taken back' }), { status: 409 }),
      ),
    )

    await expect(releasePick('25')).rejects.toMatchObject({ status: 409, message: expect.stringContaining('PACKED') })
  })
})

describe('releaseQuestion', () => {
  it('names the product and the order, and what taking the pick back does', () => {
    const question = releaseQuestion({ productName: 'Regal', articleNo: 1004, orderNo: 91234 })

    expect(question).toContain('Regal (1004)')
    expect(question).toContain('order 91234')
    expect(question).toContain('back onto the shelf')
  })

  it('still asks when the row names neither', () => {
    expect(releaseQuestion({})).toContain('this item')
  })
})

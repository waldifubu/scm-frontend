import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import type { UserDto } from '../../shared/api/types'
import { mayPack, packWholeOrder, wholeOrderHint, wholeOrderLines } from './orderItems'
import { canRecycle, recycleShipmentPackage } from './shipmentPackages'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('who may pack, and what the button says about itself', () => {
  const user = (...roles: string[]) => ({ roles }) as unknown as UserDto

  it('is for the warehouse and the admin only', () => {
    expect(mayPack(user('WAREHOUSE'))).toBe(true)
    expect(mayPack(user('ADMIN'))).toBe(true)
    expect(mayPack(user('MANAGER', 'LOGISTICS'))).toBe(false)
    expect(mayPack(undefined)).toBe(false)
  })

  it('explains both buttons, and why the second cannot be pressed while it cannot', () => {
    expect(wholeOrderHint(null).map((help) => help.title)).toEqual([
      'Create Package',
      'Pack whole order',
    ])
    expect(wholeOrderHint(null)[1]?.text).toContain('into one new package')
    expect(wholeOrderHint(null).some((help) => help.problem !== undefined)).toBe(false)
    expect(wholeOrderHint('Nothing is left to pack for this order.')[1]?.problem).toBe(
      'Nothing is left to pack for this order.',
    )
  })

  it('is plain text - tags in it would be shown as they are', () => {
    for (const help of wholeOrderHint(null)) {
      expect(help.title + help.text).not.toContain('<')
    }
  })
})

describe('wholeOrderLines', () => {
  it('takes all that is left of every line and skips the ones with nothing left', () => {
    expect(
      wholeOrderLines([
        { id: 11, orderItemId: 11, remaining: 4 },
        { id: 12, remaining: 0 },
        { id: 13, remaining: 2 },
        { remaining: 5 },
      ]),
    ).toEqual([
      { orderItemId: 11, qty: 4 },
      { orderItemId: 13, qty: 2 },
    ])
  })
})

describe('packWholeOrder', () => {
  it('posts the lines to the order and reports the package it made', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{"packageNumber":"PKG-1","items":[{},{}]}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const message = await packWholeOrder(4711, [{ orderItemId: 11, qty: 4 }])

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/packing/4711')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: '{"items":[{"orderItemId":11,"qty":4}]}',
    })
    expect(message).toBe('Package PKG-1 created with 2 items of order 4711.')
  })
})

describe('recycling a container', () => {
  it('is offered only for an OPEN container without items', () => {
    expect(canRecycle('OPEN', 0)).toBe(true)
    expect(canRecycle(undefined, 0)).toBe(true)
    expect(canRecycle('OPEN', 2)).toBe(false)
    expect(canRecycle('PACKED', 0)).toBe(false)
  })

  it('sends DELETE to the packing path of the container', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await recycleShipmentPackage('77')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/packing/shipment/77')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'DELETE' })
  })
})

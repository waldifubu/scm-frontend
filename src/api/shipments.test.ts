import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ASSIGNABLE_STATES,
  assignDistributor,
  acceptShipment,
  canAcceptShipment,
  canAssignDistributor,
  canMarkDelivered,
  shipmentDelivered,
  canMarkInTransit,
  shipmentInTransit,
  canSetTrackingNumber,
  setTrackingNumber,
  TRACKING_NUMBER_MAX_LENGTH,
  trackingNumberError,
  canDeclineShipment,
  declineShipment,
  canCancelShipment,
  cancelShipment,
  canEditShipmentData,
  updateShipment,
  CARRIER_HAS_IT_STATES,
  showsAssignButton,
  fetchMyShipments,
  fetchShipment,
  fetchShipments,
  sortParams,
  statusBadgeClass,
  SHIPMENT_STATES,
  addPackagesToShipment,
  createShipment,
  canReportReady,
  reportShipmentReady,
} from './shipments'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchShipments', () => {
  it('lists without a query when nothing is asked', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ content: [], total: 0, page: 0, size: 25 }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await fetchShipments()

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/shipments')
  })

  it('sends the status, page and size it is given and leaves out what it is not', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ content: [], total: 0, page: 2, size: 5 }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await fetchShipments({ status: 'IN_TRANSIT', page: 2, size: 5 })

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]), 'http://localhost')
    expect(url.pathname).toBe('/api/1.0/shipments')
    expect(Object.fromEntries(url.searchParams)).toEqual({ status: 'IN_TRANSIT', page: '2', size: '5' })
  })

  it('still sends page zero', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"content":[],"total":0,"page":0,"size":25}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchShipments({ page: 0 })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/shipments?page=0')
  })

  it('reads a bare array as one page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[{"id":1}]', { status: 200 })))

    await expect(fetchShipments()).resolves.toMatchObject({ content: [{ id: 1 }], total: 1, page: 0, size: 1 })
  })

  it('does not hide a refusal', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"message":"Access Denied"}', { status: 403 })))

    await expect(fetchShipments()).rejects.toMatchObject({ status: 403 })
  })
})

describe('fetchShipment', () => {
  it('asks for one shipment by its id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":7}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchShipment('7')).resolves.toEqual({ id: 7 })
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/shipments/7')
  })
})

describe('statusBadgeClass', () => {
  it('has a colour for every status the backend knows', () => {
    for (const state of SHIPMENT_STATES) {
      expect(statusBadgeClass(state)).toMatch(/^text-bg-/)
    }
  })

  it('tells finished, called off and on its way apart', () => {
    expect(statusBadgeClass('DELIVERED')).toBe('text-bg-success')
    expect(statusBadgeClass('CANCELLED')).toBe('text-bg-danger')
    expect(statusBadgeClass('IN_TRANSIT')).toBe('text-bg-primary')
    expect(statusBadgeClass('CREATED')).toBe('text-bg-secondary')
  })

  it('falls back to grey for a status it has not heard of', () => {
    expect(statusBadgeClass('SOMETHING_NEW')).toBe('text-bg-secondary')
  })
})

describe('canAssignDistributor', () => {
  it('allows exactly the statuses the backend allows', () => {
    expect(ASSIGNABLE_STATES).toEqual(['READY', 'DISPATCH_REQUESTED', 'DECLINED'])
    for (const state of SHIPMENT_STATES) {
      expect(canAssignDistributor(state)).toBe(state === 'READY' || state === 'DISPATCH_REQUESTED' || state === 'DECLINED')
    }
  })

  it('lets the planner hand a declined shipment on, and shows the button to do it', () => {
    expect(canAssignDistributor('DECLINED')).toBe(true)
    expect(showsAssignButton('DECLINED')).toBe(true)
  })

  it('refuses a status it does not know', () => {
    expect(canAssignDistributor('SOMETHING_NEW')).toBe(false)
  })
})

describe('assignDistributor', () => {
  it('puts the shipment and the distributor into the path', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":3,"status":"DISPATCH_REQUESTED"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(assignDistributor(3, 12)).resolves.toMatchObject({ status: 'DISPATCH_REQUESTED' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/shipments/3/distributor/12')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'PUT', credentials: 'include' })
  })

  it('surfaces a refusal with the backend message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Shipment 3 is IN_TRANSIT, a distributor can only be assigned to shipments in READY or DISPATCH_REQUESTED status' }), { status: 409 }),
    ))

    await expect(assignDistributor(3, 12)).rejects.toMatchObject({ status: 409, message: expect.stringContaining('IN_TRANSIT') })
  })
})

describe('sortParams', () => {
  it('sends nothing while the table is not sorted', () => {
    expect(sortParams(null)).toEqual({})
  })

  it('turns a column and a direction into the backend sort and order', () => {
    expect(sortParams({ column: 'createdAt', direction: 'desc' })).toEqual({ sort: 'createdAt', order: 'DESC' })
    expect(sortParams({ column: 'id', direction: 'asc' })).toEqual({ sort: 'id', order: 'ASC' })
  })

  it('sorts the name columns by the last name of the person', () => {
    expect(sortParams({ column: 'customer', direction: 'asc' })).toEqual({ sort: 'customer.lastName', order: 'ASC' })
    expect(sortParams({ column: 'distributor', direction: 'desc' })).toEqual({ sort: 'distributor.lastName', order: 'DESC' })
  })

  it('sends nothing for a column the backend cannot sort by', () => {
    expect(sortParams({ column: 'packages', direction: 'asc' })).toEqual({})
  })
})

describe('fetchShipments with a sort', () => {
  it('puts sort and order into the query', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"content":[],"total":0,"page":0,"size":25}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchShipments({ ...sortParams({ column: 'distributor', direction: 'asc' }), status: 'READY' })

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]), 'http://localhost')
    expect(Object.fromEntries(url.searchParams)).toEqual({ sort: 'distributor.lastName', order: 'ASC', status: 'READY' })
  })
})

describe('fetchMyShipments', () => {
  it('asks the carrier list and not the list of every shipment', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"content":[],"total":0,"page":0,"size":25}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchMyShipments()

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/shipments/distributor')
  })

  it('sends status, paging and sort like the other list', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"content":[],"total":0,"page":1,"size":5}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchMyShipments({ status: 'ACCEPTED', page: 1, size: 5, ...sortParams({ column: 'trackingNumber', direction: 'desc' }) })

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]), 'http://localhost')
    expect(url.pathname).toBe('/api/1.0/shipments/distributor')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      status: 'ACCEPTED', page: '1', size: '5', sort: 'trackingNumber', order: 'DESC',
    })
  })

  it('reads the rows of a carrier list', async () => {
    const row = { shipmentId: 3, status: 'ACCEPTED', customerName: 'Ada Lovelace', packageCount: 2, weight: 31.4, packageNumbers: ['A', 'B'] }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [row], total: 1, page: 0, size: 25 }), { status: 200 })))

    await expect(fetchMyShipments()).resolves.toMatchObject({ content: [row], total: 1 })
  })

  it('does not hide a refusal', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"message":"Access Denied"}', { status: 403 })))

    await expect(fetchMyShipments()).rejects.toMatchObject({ status: 403 })
  })
})

describe('showsAssignButton', () => {
  it('never offers the button once the carrier has the shipment or has finished it', () => {
    expect(CARRIER_HAS_IT_STATES).toEqual(['ACCEPTED', 'IN_TRANSIT', 'DELIVERED'])
    for (const state of ['ACCEPTED', 'IN_TRANSIT', 'DELIVERED']) {
      expect(showsAssignButton(state)).toBe(false)
    }
  })

  it('offers it in every other status', () => {
    for (const state of ['CREATED', 'READY', 'DISPATCH_REQUESTED', 'CANCELLED']) {
      expect(showsAssignButton(state)).toBe(true)
    }
  })

  it('offers it for a status it has not heard of, so a new status does not make the step vanish', () => {
    expect(showsAssignButton('SOMETHING_NEW')).toBe(true)
  })

  it('never shows a button that could be used where the carrier already has the shipment', () => {
    for (const state of SHIPMENT_STATES) {
      if (canAssignDistributor(state)) expect(showsAssignButton(state)).toBe(true)
    }
  })
})

describe('canEditShipmentData', () => {
  it('allows the data to change up to ACCEPTED, as the backend does, and not after', () => {
    for (const state of ['CREATED', 'READY', 'DISPATCH_REQUESTED', 'ACCEPTED']) expect(canEditShipmentData(state)).toBe(true)
    for (const state of ['IN_TRANSIT', 'DELIVERED', 'CANCELLED']) expect(canEditShipmentData(state)).toBe(false)
    expect(canEditShipmentData('SOMETHING_NEW')).toBe(false)
  })

  it('covers every status the app knows', () => {
    expect(SHIPMENT_STATES.filter((state) => canEditShipmentData(state))).toEqual(['CREATED', 'READY', 'DISPATCH_REQUESTED', 'ACCEPTED'])
  })
})

describe('updateShipment', () => {
  const request = { shippingAddress: 'Hafenweg 4', shippingMethod: null, requestedDeliveryDate: '2026-11-02', comment: null }

  it('puts all four fields to the shipment', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":2,"status":"READY"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(updateShipment(2, request)).resolves.toMatchObject({ id: 2 })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/shipments/2')
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.method).toBe('PUT')
    expect(JSON.parse(String(init.body))).toEqual(request)
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
  })

  it('surfaces a refusal with the backend message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Shipment 2 is IN_TRANSIT, its data can only be changed up to ACCEPTED' }), { status: 409 }),
    ))

    await expect(updateShipment(2, request)).rejects.toMatchObject({ status: 409, message: expect.stringContaining('ACCEPTED') })
  })
})

describe('canAcceptShipment and canCancelShipment', () => {
  it('accepts in DISPATCH_REQUESTED only', () => {
    for (const state of SHIPMENT_STATES) expect(canAcceptShipment(state)).toBe(state === 'DISPATCH_REQUESTED')
  })

  it('calls off up to ACCEPTED, as the backend does, and not after', () => {
    for (const state of ['CREATED', 'READY', 'DISPATCH_REQUESTED', 'ACCEPTED']) expect(canCancelShipment(state)).toBe(true)
    for (const state of ['IN_TRANSIT', 'DELIVERED', 'CANCELLED']) expect(canCancelShipment(state)).toBe(false)
    expect(canCancelShipment('SOMETHING_NEW')).toBe(false)
  })
})

describe('acceptShipment', () => {
  it('posts to the accept step of the shipment', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"shipmentId":7,"status":"ACCEPTED"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(acceptShipment(7)).resolves.toMatchObject({ status: 'ACCEPTED' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/shipments/7/accept')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST', credentials: 'include' })
  })

  it('surfaces a refusal with the backend message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Shipment 7 is ACCEPTED' }), { status: 409 }),
    ))

    await expect(acceptShipment(7)).rejects.toMatchObject({ status: 409, message: 'Shipment 7 is ACCEPTED' })
  })
})

describe('cancelShipment', () => {
  it('posts the reason as an object', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":7,"status":"CANCELLED"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(cancelShipment(7, 'no truck')).resolves.toMatchObject({ status: 'CANCELLED' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/shipments/7/cancel')
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ reason: 'no truck' })
  })

  it('surfaces a refusal with the backend message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'it can only be cancelled up to ACCEPTED' }), { status: 409 }),
    ))

    await expect(cancelShipment(7, 'late')).rejects.toMatchObject({ status: 409 })
  })
})

describe('canDeclineShipment', () => {
  it('declines in DISPATCH_REQUESTED only - what was offered, before it was taken on', () => {
    for (const state of SHIPMENT_STATES) expect(canDeclineShipment(state)).toBe(state === 'DISPATCH_REQUESTED')
    expect(canDeclineShipment('SOMETHING_NEW')).toBe(false)
  })

  it('knows DECLINED as a status of its own, shown in red', () => {
    expect(SHIPMENT_STATES).toContain('DECLINED')
    expect(statusBadgeClass('DECLINED')).toBe('text-bg-danger')
  })
})

describe('acceptShipment with a note', () => {
  it('sends what was typed as reason', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"shipmentId":7,"status":"ACCEPTED"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await acceptShipment(7, ' pick-up on Monday ')

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ reason: 'pick-up on Monday' })
  })

  it('sends no body for a blank text, so the call is a plain acceptance', async () => {
    // A fresh Response per call: a body can be read once.
    const fetchMock = vi.fn().mockImplementation(async () => new Response('{"shipmentId":7}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await acceptShipment(7, '   ')
    await acceptShipment(7)

    for (const call of fetchMock.mock.calls) expect((call[1] as RequestInit).body).toBeUndefined()
  })
})

describe('declineShipment', () => {
  it('posts the reason, trimmed, to the decline step', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"shipmentId":7,"status":"DECLINED"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(declineShipment(7, ' no truck free ')).resolves.toMatchObject({ status: 'DECLINED' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/shipments/7/decline')
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ reason: 'no truck free' })
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
  })

  it('surfaces a refusal with the backend message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Shipment 7 is ACCEPTED, only DISPATCH_REQUESTED can be declined' }), { status: 409 }),
    ))

    await expect(declineShipment(7, 'x')).rejects.toMatchObject({ status: 409, message: expect.stringContaining('DISPATCH_REQUESTED') })
  })
})

describe('trackingNumberError', () => {
  it('wants a number that says something', () => {
    expect(trackingNumberError('')).toMatch(/empty/i)
    expect(trackingNumberError('   ')).toMatch(/empty/i)
  })

  it('takes up to 70 characters, as the backend does, and no more', () => {
    expect(TRACKING_NUMBER_MAX_LENGTH).toBe(70)
    expect(trackingNumberError('x'.repeat(70))).toBeNull()
    expect(trackingNumberError('x'.repeat(71))).toMatch(/70/)
  })

  it('does not count the blanks around the number', () => {
    expect(trackingNumberError('  DHL-123  ')).toBeNull()
    expect(trackingNumberError(' ' + 'x'.repeat(70) + ' ')).toBeNull()
  })
})

describe('canSetTrackingNumber', () => {
  it('is there from the handover until the shipment is reported on its way', () => {
    for (const state of ['DISPATCH_REQUESTED', 'ACCEPTED']) expect(canSetTrackingNumber(state)).toBe(true)
  })

  it('is gone once the shipment is on the road - the number is fixed then', () => {
    expect(canSetTrackingNumber('IN_TRANSIT')).toBe(false)
  })

  it('is not there once it is over, turned down or not handed over yet', () => {
    for (const state of ['CREATED', 'READY', 'DECLINED', 'DELIVERED', 'CANCELLED']) expect(canSetTrackingNumber(state)).toBe(false)
    expect(canSetTrackingNumber('SOMETHING_NEW')).toBe(false)
  })
})

describe('setTrackingNumber', () => {
  it('patches the number, trimmed, as an object', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"shipmentId":7,"trackingNumber":"DHL-123"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(setTrackingNumber(7, '  DHL-123 ')).resolves.toMatchObject({ trackingNumber: 'DHL-123' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/shipments/7/trackingnumber')
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(String(init.body))).toEqual({ trackingNumber: 'DHL-123' })
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
  })

  it('surfaces a refusal with the backend message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ trackingNumber: 'trackingNumber is at most 70 characters' }), { status: 400 }),
    ))

    await expect(setTrackingNumber(7, 'x')).rejects.toMatchObject({ status: 400, message: 'trackingNumber is at most 70 characters' })
  })
})

describe('canMarkInTransit', () => {
  it('is there once the carrier has accepted the shipment, and only then - as the backend has it', () => {
    for (const state of SHIPMENT_STATES) expect(canMarkInTransit(state)).toBe(state === 'ACCEPTED')
    expect(canMarkInTransit('SOMETHING_NEW')).toBe(false)
  })
})

describe('shipmentInTransit', () => {
  it('posts to the intransit step of the shipment, with no body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"shipmentId":7,"status":"IN_TRANSIT"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(shipmentInTransit(7)).resolves.toMatchObject({ status: 'IN_TRANSIT' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/shipments/7/intransit')
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.method).toBe('POST')
    expect(init.body).toBeUndefined()
  })

  it('surfaces a refusal with the backend message', async () => {
    vi.stubGlobal('fetch', fetchMockRefusing())

    await expect(shipmentInTransit(7)).rejects.toMatchObject({ status: 409, message: expect.stringContaining('ACCEPTED') })
  })
})

function fetchMockRefusing() {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ message: 'Shipment 7 is DISPATCH_REQUESTED, only [ACCEPTED] can be moved to IN_TRANSIT' }), { status: 409 }),
  )
}

describe('canMarkDelivered', () => {
  it('is there while the shipment is on the road, and only then - as the backend has it', () => {
    for (const state of SHIPMENT_STATES) expect(canMarkDelivered(state)).toBe(state === 'IN_TRANSIT')
    expect(canMarkDelivered('SOMETHING_NEW')).toBe(false)
  })

  it('takes over where reporting it on its way leaves off - never both at once', () => {
    for (const state of SHIPMENT_STATES) expect(canMarkDelivered(state) && canMarkInTransit(state)).toBe(false)
  })
})

describe('shipmentDelivered', () => {
  it('posts to the delivered step of the shipment, with no body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"shipmentId":7,"status":"DELIVERED"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(shipmentDelivered(7)).resolves.toMatchObject({ status: 'DELIVERED' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/shipments/7/delivered')
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.method).toBe('POST')
    expect(init.body).toBeUndefined()
  })

  it('surfaces a refusal with the backend message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Shipment 7 is ACCEPTED, only [IN_TRANSIT] can be moved to DELIVERED' }), { status: 409 }),
    ))

    await expect(shipmentDelivered(7)).rejects.toMatchObject({ status: 409, message: expect.stringContaining('IN_TRANSIT') })
  })
})

describe('createShipment', () => {
  it('posts the packages and the fields to /shipments and answers the new shipment', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":31,"status":"CREATED"}', { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const request = { shipmentPackageIds: [5, 7], shippingAddress: 'Musterstr. 1', shippingMethod: null, requestedDeliveryDate: '2026-11-03' }

    await expect(createShipment(request)).resolves.toMatchObject({ id: 31, status: 'CREATED' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/shipments')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' })
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual(request)
  })

  it('lets the backend refusal through, containers of different customers say', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Shipment package 7 belongs to another customer' }), { status: 400 })),
    )

    await expect(
      createShipment({ shipmentPackageIds: [5, 7], shippingAddress: null, shippingMethod: null, requestedDeliveryDate: null }),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('another customer') })
  })
})

describe('canReportReady', () => {
  it('is for a CREATED shipment only - the backend answers 409 for any other', () => {
    for (const state of SHIPMENT_STATES) expect(canReportReady(state)).toBe(state === 'CREATED')
    expect(canReportReady('SOMETHING_NEW')).toBe(false)
  })
})

describe('reportShipmentReady', () => {
  it('puts to the ready step and answers the shipment as it is now', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":31,"status":"READY"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(reportShipmentReady(31)).resolves.toMatchObject({ status: 'READY' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/shipments/31/ready')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'PUT' })
  })

  it('lets the refusal through - no address, a package not packed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Shipment 31 has no shipping address' }), { status: 409 })),
    )

    await expect(reportShipmentReady(31)).rejects.toMatchObject({ status: 409, message: expect.stringContaining('shipping address') })
  })
})

describe('addPackagesToShipment', () => {
  it('posts the container ids to the shipment and answers the shipment', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":31,"status":"CREATED"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(addPackagesToShipment(31, [5, 7])).resolves.toMatchObject({ id: 31 })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/shipments/31/packages')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' })
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ shipmentPackageIds: [5, 7] })
  })

  it('lets the backend refusal through', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"message":"Shipment 31 is READY"}', { status: 409 })))

    await expect(addPackagesToShipment(31, [5])).rejects.toMatchObject({ status: 409, message: 'Shipment 31 is READY' })
  })
})

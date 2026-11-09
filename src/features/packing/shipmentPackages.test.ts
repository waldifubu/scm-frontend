import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  DEFAULT_SHIPMENT_PACKAGE_STATUS,
  fetchShipmentPackages,
  SHIPMENT_PACKAGE_STATUSES,
} from './shipmentPackages'

afterEach(() => vi.unstubAllGlobals())

function stubbed() {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response('{"content":[],"total":0,"page":0,"size":25}', { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('fetchShipmentPackages', () => {
  it('names the status `status` - the parameter the backend reads', async () => {
    const fetchMock = stubbed()

    await fetchShipmentPackages({ status: 'PACKED' })

    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('status=PACKED')
    // It was sent as `shipmentStatus`, which the backend does not know: it listed OPEN whatever was chosen.
    expect(url).not.toContain('shipmentStatus')
  })

  it('sends the status together with the other parameters', async () => {
    const fetchMock = stubbed()

    await fetchShipmentPackages({ status: 'DISPATCHED', packageNumber: 'PKG-1', page: 1 })

    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('status=DISPATCHED')
    expect(url).toContain('packageNumber=PKG-1')
    expect(url).toContain('page=1')
  })
})

describe('the statuses of a container', () => {
  it('are the three of the backend, and the default is the one it lists unasked', () => {
    expect([...SHIPMENT_PACKAGE_STATUSES]).toEqual(['OPEN', 'PACKED', 'DISPATCHED'])
    expect(DEFAULT_SHIPMENT_PACKAGE_STATUS).toBe('OPEN')
  })
})

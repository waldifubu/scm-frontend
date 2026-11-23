import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  contentCandidates,
  contentsProblem,
  contentsUnchanged,
  createContainer,
  emptyNewContainer,
  newContainerBody,
  newContainerProblem,
  replaceContainerItems,
} from './containerContents'

afterEach(() => {
  vi.unstubAllGlobals()
})

const held = [{ id: 1, orderNo: 4711, sku: 'A', quantity: 2 }]
const loose = [
  { id: 1, orderNo: 4711, sku: 'A', quantity: 2 },
  { id: 2, orderNo: 4711, sku: 'B', quantity: 1 },
  { id: 3, orderNo: 4712, sku: 'C', quantity: 5 },
]

describe('contentCandidates', () => {
  it('offers loose items of the order the container holds, each item once', () => {
    expect(contentCandidates(held, loose).map((c) => [c.id, c.held])).toEqual([
      [1, true],
      [2, false],
    ])
  })

  it('offers every loose item to an empty container', () => {
    expect(contentCandidates([], loose).map((c) => c.id)).toEqual([1, 2, 3])
  })
})

describe('contentsProblem and contentsUnchanged', () => {
  const candidates = contentCandidates([], loose)

  it('refuses items of two orders but accepts none at all', () => {
    expect(contentsProblem(candidates, new Set([1, 3]))).toMatch(/one order/)
    expect(contentsProblem(candidates, new Set([1, 2]))).toBeNull()
    expect(contentsProblem(candidates, new Set())).toBeNull()
  })

  it('knows when the choice is what the container holds already', () => {
    const own = contentCandidates(held, loose)
    expect(contentsUnchanged(own, new Set([1]))).toBe(true)
    expect(contentsUnchanged(own, new Set([1, 2]))).toBe(false)
    expect(contentsUnchanged(own, new Set())).toBe(false)
  })
})

describe('new container', () => {
  it('leaves blank optional fields out and validates the dimensions', () => {
    expect(newContainerBody(emptyNewContainer)).toEqual({ shipmentPackageType: 'CARTON' })
    expect(
      newContainerBody({
        ...emptyNewContainer,
        packageNumber: ' P-1 ',
        length: '30',
        height: '2.5',
      }),
    ).toEqual({ shipmentPackageType: 'CARTON', packageNumber: 'P-1', length: 30, height: 2.5 })
    expect(newContainerProblem({ ...emptyNewContainer, width: '0' })).toMatch(/width/)
    expect(newContainerProblem({ ...emptyNewContainer, length: 'x' })).toMatch(/length/)
    expect(newContainerProblem(emptyNewContainer)).toBeNull()
  })
})

describe('the calls', () => {
  it('PUTs the ids to the items path and POSTs the new container', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(new Response('{"id":9}', { status: 200 })))
    vi.stubGlobal('fetch', fetchMock)

    await replaceContainerItems('9', [1, 2])
    await expect(createContainer(emptyNewContainer)).resolves.toEqual({ id: 9 })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/packing/shipment/9/items')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'PUT',
      body: '{"packageItemIds":[1,2]}',
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/1.0/packing/shipment')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST' })
  })
})

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  fetchStock,
  fetchStockBySku,
  inventoryPath,
  isSoldOut,
  STOCK_PAGE_SIZE,
  stockTotals,
  type StockRow,
} from './stock'

afterEach(() => {
  vi.unstubAllGlobals()
})

const row = (onHand: number, reserved: number): StockRow => ({
  id: 1,
  sku: '706a99c3-944b-11f1-9b51-001e064520d8',
  onHand,
  reserved,
  available: onHand - reserved,
  storehouseId: 1,
  storehouseName: 'Lager Nord',
  updatedAt: null,
})

describe('fetchStockBySku', () => {
  it('asks for the stock of the SKU and returns the rows', async () => {
    const rows = [row(10, 3)]
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(rows), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchStockBySku('abc-123')).resolves.toEqual(rows)

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/stock/abc-123')
  })

  it('returns an empty list when nothing is stored', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[]', { status: 200 })))

    await expect(fetchStockBySku('abc')).resolves.toEqual([])
  })

  it('reads a 404 as no stock, as an older backend answered it', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ message: 'Stock not found' }), { status: 404 }),
        ),
    )

    await expect(fetchStockBySku('abc')).resolves.toEqual([])
  })

  it('does not hide other failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ message: 'Access denied' }), { status: 403 }),
        ),
    )

    await expect(fetchStockBySku('abc')).rejects.toMatchObject({ status: 403 })
  })

  it('escapes the SKU in the path', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('[]', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchStockBySku('a/b')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/stock/a%2Fb')
  })
})

describe('stockTotals', () => {
  it('adds up every storehouse', () => {
    expect(stockTotals([row(10, 3), row(4, 0)])).toEqual({
      onHand: 14,
      reserved: 3,
      available: 11,
    })
  })

  it('is zero without rows', () => {
    expect(stockTotals([])).toEqual({ onHand: 0, reserved: 0, available: 0 })
  })
})

describe('fetchStock', () => {
  it('asks for a page big enough to search the whole storehouse', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ content: [], total: 0, page: 0, size: 500 }), {
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await fetchStock('3')

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/api/1.0/stock/storehouse/3?size=${STOCK_PAGE_SIZE}`)
    expect(STOCK_PAGE_SIZE).toBeGreaterThan(25)
  })
})

describe('inventoryPath', () => {
  it('asks for nothing special by default - the backend sorts by SKU', () => {
    expect(inventoryPath()).toBe('/stock/inventory')
  })

  it('names the sort and its direction', () => {
    expect(inventoryPath(0, { column: 'onHand', direction: 'desc' })).toBe(
      '/stock/inventory?sort=onHand&order=DESC',
    )
    expect(inventoryPath(0, { column: 'updatedAt', direction: 'asc' })).toBe(
      '/stock/inventory?sort=updatedAt&order=ASC',
    )
  })

  it('adds the page after the sort', () => {
    expect(inventoryPath(2, { column: 'sku', direction: 'asc' })).toBe(
      '/stock/inventory?sort=sku&order=ASC&page=2',
    )
    expect(inventoryPath(1)).toBe('/stock/inventory?page=1')
  })

  it('leaves out a column the backend cannot sort by', () => {
    expect(inventoryPath(0, { column: 'storehouse', direction: 'asc' })).toBe('/stock/inventory')
  })
})

describe('isSoldOut', () => {
  it('is true for 0 and false for anything there is', () => {
    expect(isSoldOut(0)).toBe(true)
    expect(isSoldOut(1)).toBe(false)
    expect(isSoldOut(250)).toBe(false)
  })

  it('also marks a negative figure, which is worse than 0', () => {
    expect(isSoldOut(-3)).toBe(true)
  })
})

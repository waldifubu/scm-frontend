import { queryOptions } from '@tanstack/react-query'
import { api, ApiError } from './client'
import type { TableSort } from '../tableSort'
import { withPage } from './pageQuery'

/** A stock line as the backend sends it. Its fields are not typed yet, so the table reads them as they come. */
export type StockDto = Record<string, unknown>

/** `GET /stock/storehouse/<id>`: the stock plus the paging figures. */
export interface StockPage {
  content: StockDto[]
  total: number
  page: number
  size: number
}

/**
 * How many rows of a storehouse one request asks for. The page lets you search its SKUs, so it needs
 * all of them, not the backend's default of 25; `total` in the answer says whether this was enough.
 */
export const STOCK_PAGE_SIZE = 500

export async function fetchStock(storehouseId: string, page = 0): Promise<StockPage> {
  const body = await api<StockPage | StockDto[]>(
    withPage(`/stock/storehouse/${encodeURIComponent(storehouseId)}?size=${STOCK_PAGE_SIZE}`, page),
  )
  if (Array.isArray(body)) return { content: body, total: body.length, page: 0, size: body.length }
  return { ...body, content: body.content ?? [] }
}

export const stockQueryOptions = (storehouseId: string, page = 0) =>
  queryOptions({
    queryKey: ['stock', 'storehouse', storehouseId, page] as const,
    queryFn: () => fetchStock(storehouseId, page),
  })

/** One row of `GET /stock/{sku}`: what one article holds in one storehouse (`StockResponse`). */
export interface StockRow {
  id: number
  sku: string
  onHand: number
  reserved: number
  /** `onHand` minus `reserved`, worked out by the backend. */
  available: number
  storehouseId: number | null
  storehouseName: string | null
  updatedAt: string | null
}

/**
 * Where an article is stored and how much. Nothing stored is an empty list, which the backend answers
 * with a 200; a 404 is read the same way so an older backend that still answered it shows "no stock"
 * and not an error.
 */
export async function fetchStockBySku(sku: string): Promise<StockRow[]> {
  try {
    const rows = await api<StockRow[]>(`/stock/${encodeURIComponent(sku)}`)
    return Array.isArray(rows) ? rows : []
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return []
    throw error
  }
}

export const stockBySkuQueryOptions = (sku: string) =>
  queryOptions({
    queryKey: ['stock', 'sku', sku] as const,
    queryFn: () => fetchStockBySku(sku),
  })

/** `POST /stock/add`: books `qty` of an article onto its row in a storehouse. */
export interface AddStockRequest {
  sku: string
  storehouseId: number
  qty: number
}

/** `POST /stock/transfer`: moves `qty` of an article from one storehouse to another. */
export interface TransferStockRequest {
  sku: string
  storehouseFrom: number
  storehouseTo: number
  qty: number
}

/** Books stock; answers the row it was booked onto. */
export function addStock(request: AddStockRequest): Promise<StockRow> {
  return api<StockRow>('/stock/add', { method: 'POST', body: JSON.stringify(request) })
}

/** Moves stock; answers the row it arrived on. */
export function transferStock(request: TransferStockRequest): Promise<StockRow> {
  return api<StockRow>('/stock/transfer', { method: 'POST', body: JSON.stringify(request) })
}

/** One row of `GET /stock/inventory`: an article with every storehouse added up (`InventoryRow`). */
export interface InventoryRow {
  sku: string
  /** The product behind the SKU, for a tooltip; `null` for stock no product carries. */
  name: string | null
  onHand: number
  reserved: number
  available: number
  updatedAt: string | null
}

export interface InventoryPage {
  content: InventoryRow[]
  total: number
  page: number
  size: number
}

/** Nothing left to promise: the article's available quantity is 0 (or, should it ever be, below). */
export function isSoldOut(available: number): boolean {
  return available <= 0
}

/** The columns of the inventory table the backend can sort by (`StockController.INVENTORY_SORTABLE`). */
export const INVENTORY_SORT_KEYS: readonly string[] = ['sku', 'onHand', 'reserved', 'available', 'updatedAt']

/** `GET /stock/inventory` for a page and a sort; no sort is the backend's own order, by SKU. */
export function inventoryPath(page = 0, sort: TableSort | null = null): string {
  const key = sort !== null && INVENTORY_SORT_KEYS.includes(sort.column) ? sort.column : undefined
  const path = key === undefined ? '/stock/inventory' : `/stock/inventory?sort=${key}&order=${sort?.direction === 'desc' ? 'DESC' : 'ASC'}`
  return withPage(path, page)
}

export async function fetchInventory(page = 0, sort: TableSort | null = null): Promise<InventoryPage> {
  const body = await api<InventoryPage | InventoryRow[]>(inventoryPath(page, sort))
  if (Array.isArray(body)) return { content: body, total: body.length, page: 0, size: body.length }
  return { ...body, content: body.content ?? [] }
}

export const inventoryQueryOptions = (page = 0, sort: TableSort | null = null) =>
  queryOptions({
    queryKey: ['stock', 'inventory', page, sort?.column ?? '', sort?.direction ?? ''] as const,
    queryFn: () => fetchInventory(page, sort),
  })

/** What the table's last row shows: the figures of every storehouse added up. */
export function stockTotals(rows: StockRow[]): Pick<StockRow, 'onHand' | 'reserved' | 'available'> {
  return rows.reduce(
    (total, row) => ({
      onHand: total.onHand + row.onHand,
      reserved: total.reserved + row.reserved,
      available: total.available + row.available,
    }),
    { onHand: 0, reserved: 0, available: 0 },
  )
}

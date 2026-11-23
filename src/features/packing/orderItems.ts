import { queryOptions } from '@tanstack/react-query'
import { api } from '../../shared/api/client'

/** An order item as the backend sends it. Its fields are not typed yet, so the table reads them as they come. */
export type OrderItemDto = Record<string, unknown>

/** `GET /order-items`: the items plus the paging figures. */
export interface OrderItemPage {
  content: OrderItemDto[]
  total: number
  page: number
  size: number
}

export const ORDER_ITEM_STATUSES = [
  'WAITING',
  'RESERVED',
  'PICKING',
  'PICKED',
  'PACKING',
  'PACKED',
  'READY_FOR_DISPATCH',
  'CANCELLED',
] as const

export type OrderItemStatus = (typeof ORDER_ITEM_STATUSES)[number]

/** What `status` takes besides a fulfillment status: every line. Without a status the backend answers PICKED, the packing work list. */
export const ALL_STATUSES = 'ALL'

export interface OrderItemFilter {
  status?: OrderItemStatus | typeof ALL_STATUSES
  page?: number
  size?: number
  order?: 'ASC' | 'DESC'
}

export interface PackableItemFilter {
  orderNo?: string
  page?: number
  sort?: 'id' | 'quantity' | 'updatedAt'
  order?: 'ASC' | 'DESC'
}

export async function fetchOrderItems(filter: OrderItemFilter = {}): Promise<OrderItemPage> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const query = params.size ? `?${params}` : ''
  const body = await api<OrderItemPage | OrderItemDto[]>(`/order-items${query}`)
  if (Array.isArray(body)) return { content: body, total: body.length, page: 0, size: body.length }
  return { ...body, content: body.content ?? [] }
}

export async function fetchPackableItems(filter: PackableItemFilter = {}): Promise<OrderItemPage> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const query = params.size ? `?${params}` : ''
  const body = await api<OrderItemPage | OrderItemDto[]>(`/order-items/packable${query}`)
  if (Array.isArray(body)) return { content: body, total: body.length, page: 0, size: body.length }
  return { ...body, content: body.content ?? [] }
}

export interface PackingLine {
  orderItemId: number
  qty: number
}

/** `POST /packing`: creates a package from the given quantities of order items. */
export async function createPackage(lines: PackingLine[]): Promise<string> {
  const body = await api<{ message?: unknown } | null>('/packing', {
    method: 'POST',
    body: JSON.stringify(lines),
  })
  return typeof body?.message === 'string' ? body.message : 'Package created.'
}

/**
 * What packing a whole order means: every packable line with all that is left of it. A line with nothing
 * remaining (or without a usable id) is left out - `packLine` would only skip it.
 */
export function wholeOrderLines(items: readonly OrderItemDto[]): PackingLine[] {
  return items.flatMap((item) => {
    const orderItemId = Number(item.orderItemId ?? item.id)
    const remaining = Number(item.remaining)
    return Number.isInteger(orderItemId) && remaining > 0 ? [{ orderItemId, qty: remaining }] : []
  })
}

/** `POST /packing/{orderNo}`: one new package holding the given lines of that order; the answer says which. */
export async function packWholeOrder(orderNo: number, lines: PackingLine[]): Promise<string> {
  const body = await api<{ packageNumber?: unknown; items?: unknown } | null>(
    `/packing/${encodeURIComponent(String(orderNo))}`,
    { method: 'POST', body: JSON.stringify({ items: lines }) },
  )
  const count = Array.isArray(body?.items) ? body.items.length : lines.length
  const name = typeof body?.packageNumber === 'string' ? `Package ${body.packageNumber}` : 'Package'
  return `${name} created with ${count} item${count === 1 ? '' : 's'} of order ${orderNo}.`
}

export const orderItemsQueryOptions = (filter: OrderItemFilter = {}) =>
  queryOptions({
    queryKey: ['order-items', filter] as const,
    queryFn: () => fetchOrderItems(filter),
  })

export const packableItemsQueryOptions = (filter: PackableItemFilter = {}) =>
  queryOptions({
    queryKey: ['packable-items', filter] as const,
    queryFn: () => fetchPackableItems(filter),
  })

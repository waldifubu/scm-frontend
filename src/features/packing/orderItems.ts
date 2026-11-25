import { queryOptions } from '@tanstack/react-query'
import { api } from '../../shared/api/client'
import { hasRole, type UserDto } from '../../shared/api/types'

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

/** Every line that still has work ahead of it: all but `READY_FOR_DISPATCH` and `CANCELLED`. */
export const NOT_COMPLETED = 'NOT_COMPLETED'

/** What the order items list can be asked for: one status, or a group of them. */
export type OrderItemChoice = OrderItemStatus | typeof ALL_STATUSES | typeof NOT_COMPLETED

/**
 * The choices of the status filter for this user: the groups first, then each status. `ALL` is the
 * administrator's alone (the backend answers everybody else with a 403).
 */
export function orderItemFiltersFor(user: UserDto | undefined): readonly OrderItemChoice[] {
  const admin = !!user && hasRole(user, 'ADMIN')
  const groups: OrderItemChoice[] = admin ? [ALL_STATUSES, NOT_COMPLETED] : [NOT_COMPLETED]
  return [...groups, ...ORDER_ITEM_STATUSES]
}

/** A choice as a person reads it in the dropdown. */
export function orderItemFilterLabel(choice: OrderItemChoice): string {
  if (choice === NOT_COMPLETED) return 'ALL BUT COMPLETED'
  return choice.replaceAll('_', ' ')
}

/** What the list starts on: an administrator sees every line, everybody else the open ones. */
export function defaultOrderItemFilter(user: UserDto | undefined): OrderItemChoice {
  return user && hasRole(user, 'ADMIN') ? ALL_STATUSES : NOT_COMPLETED
}

export interface OrderItemFilter {
  status?: OrderItemChoice
  /** Only the lines of this order. */
  orderNo?: string
  page?: number
  size?: number
  sort?: string
  order?: 'ASC' | 'DESC'
}

export interface PackableItemFilter {
  orderNo?: string
  page?: number
  size?: number
  sort?: 'id' | 'quantity' | 'updatedAt' | 'fulfillmentStatus'
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

/** Who may pack (`POST /packing/**`): the warehouse and the admin. The manager reads the list only. */
export function mayPack(user: UserDto | null | undefined): boolean {
  return !!user && (hasRole(user, 'ADMIN') || hasRole(user, 'WAREHOUSE'))
}

/** One block of the explanation under the pack buttons. */
export interface PackingHelp {
  /** The button it is about. */
  title: string
  text: string
  /** Why the button cannot be pressed at the moment. */
  problem?: string
}

/**
 * What stands under the buttons: what each of them does and, while "Pack whole order" cannot be pressed, why not.
 * Plain text - the page makes the headings.
 */
export function wholeOrderHint(problem: string | null): PackingHelp[] {
  return [
    {
      title: 'Create Package',
      text:
        'Packs the quantities typed into the "pack qty" column, also of lines from different orders. The packed ' +
        'items are not in a container yet - you find them under "Packages" and put them into one there. The ' +
        'order number above only narrows the table.',
    },
    {
      title: 'Pack whole order',
      text:
        'Packs everything that is left to pack of the order number entered above into one new package, which ' +
        'you find under "Containers". The quantities typed into the table are not used. Lines not picked yet ' +
        'are not included.',
      ...(problem === null ? {} : { problem }),
    },
  ]
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

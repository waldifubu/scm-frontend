import { queryOptions } from '@tanstack/react-query'
import { api } from '../../shared/api/client'
import { withPage } from '../../shared/api/pageQuery'
import { hasRole, type UserDto } from '../../shared/api/types'

/** An order as the backend sends it. Its fields are not typed yet, so the table reads them as they come. */
export type OrderDto = Record<string, unknown>

/** `GET /orders`: the orders plus the paging figures. */
export interface OrderPage {
  content: OrderDto[]
  total: number
  page: number
  size: number
}

async function fetchOrderPage(path: string): Promise<OrderPage> {
  const body = await api<OrderPage | OrderDto[]>(path)
  if (Array.isArray(body)) return { content: body, total: body.length, page: 0, size: body.length }
  return { ...body, content: body.content ?? [] }
}

/** `OrderStatus`: where an order is, from being placed to being closed. */
export const ORDER_STATUSES = [
  'CREATED',
  'ACKNOWLEDGED',
  'REVIEW',
  'APPROVED',
  'REJECTED',
  'WAIT_SUPPLY',
  'IN_FULFILLMENT',
  'READY_FOR_DISPATCH',
  'IN_TRANSIT',
  'PARTIALLY_DELIVERED',
  'DELIVERED',
  'CANCELLED',
  'COMPLETED',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** The status the backend lists when none is asked for. */
export const DEFAULT_ORDER_STATUS: OrderStatus = 'CREATED'

/**
 * Words the backend takes for `status` that are not a status but several: every order, or every order but the
 * completed ones - one page of them, not one request per status.
 */
export const ORDER_GROUPS = ['NOT_COMPLETED', 'ALL'] as const

export type OrderGroup = (typeof ORDER_GROUPS)[number]

/** What the orders list can be asked for: one status, or a group of them. */
export type OrderFilter = OrderStatus | OrderGroup

/** The choices of the status filter: the groups first, then each status. */
export const ORDER_FILTERS: readonly OrderFilter[] = [...ORDER_GROUPS, ...ORDER_STATUSES]

/** A filter as a person reads it in the dropdown. */
export function orderFilterLabel(filter: OrderFilter): string {
  if (filter === 'NOT_COMPLETED') return 'ALL BUT COMPLETED'
  return filter.replaceAll('_', ' ')
}

/**
 * What the list starts on. A manager works from the orders that are still open, so they get those; everybody
 * else starts on the backend's own default, the new orders.
 */
export function defaultOrderFilter(user: UserDto | undefined): OrderFilter {
  return user && hasRole(user, 'MANAGER') ? 'NOT_COMPLETED' : DEFAULT_ORDER_STATUS
}

/** `GET /orders` for one status or group (the backend's own default, `CREATED`, when none is given) and page. */
export const ordersPath = (page = 0, status?: OrderFilter) =>
  withPage(status ? `/orders?status=${encodeURIComponent(status)}` : '/orders', page)

export const fetchOrders = (page = 0, status?: OrderFilter) =>
  fetchOrderPage(ordersPath(page, status))

export const ordersQueryOptions = (page = 0, status?: OrderFilter) =>
  queryOptions({
    queryKey: ['orders', 'page', status ?? DEFAULT_ORDER_STATUS, page] as const,
    queryFn: () => fetchOrders(page, status),
  })

/** `GET /orders/{orderNumber}`. */
export function fetchOrder(orderNumber: string): Promise<OrderDto> {
  return api<OrderDto>(`/orders/${encodeURIComponent(orderNumber)}`)
}

export const orderQueryOptions = (orderNumber: string) =>
  queryOptions({
    queryKey: ['orders', orderNumber] as const,
    queryFn: () => fetchOrder(orderNumber),
  })

/** `GET /orders/new`, open to managers only; paged like the orders list. */
export const newOrderQueryOptions = (page = 0) =>
  queryOptions({
    queryKey: ['orders', 'new', page] as const,
    queryFn: () => fetchOrderPage(withPage('/orders/new', page)),
  })

async function postOrderAction(orderNumber: string, action: string): Promise<string> {
  const body = await api<{ message?: unknown }>(
    `/orders/${encodeURIComponent(orderNumber)}/${action}`,
    {
      method: 'POST',
    },
  )
  return typeof body?.message === 'string' ? body.message : ''
}

/** `POST /orders/{orderNumber}/check`: the answer's `message` says what the check found. */
export const checkOrder = (orderNumber: string) => postOrderAction(orderNumber, 'check')

/**
 * `POST /orders/{orderNumber}/reserve`: a JSON array of what was reserved, or an empty one when there
 * was nothing to reserve.
 */
export async function reserveOrder(orderNumber: string): Promise<string> {
  const body = await api<unknown[]>(`/orders/${encodeURIComponent(orderNumber)}/reserve`, {
    method: 'POST',
  })
  const reserved = Array.isArray(body) ? body : []
  return reserved.length === 0
    ? 'Nothing to reserve. Try again later'
    : `Reserved ${reserved.length} item(s).`
}

export interface NewOrderItem {
  articleNo: string
  qty: number
}

/** `POST /orders`: places an order for the given articles, due on `dueDate` (`YYYY-MM-DD`). */
export function createOrder(dueDate: string, items: NewOrderItem[]): Promise<OrderDto> {
  const orderItems = items.map(({ articleNo, qty }) => ({
    quantity: qty,
    product: { articleNo: Number(articleNo) },
  }))
  return api<OrderDto>('/orders', { method: 'POST', body: JSON.stringify({ dueDate, orderItems }) })
}

/** `POST /orders/{orderNumber}/complete`: closes a delivered order (`COMPLETED`). A refusal arrives as an error whose message `api` already reads. */
export async function completeOrder(orderNumber: string): Promise<OrderDto> {
  return api<OrderDto>(`/orders/${encodeURIComponent(orderNumber)}/complete`, { method: 'POST' })
}

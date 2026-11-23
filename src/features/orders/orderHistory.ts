import { queryOptions } from '@tanstack/react-query'
import { api } from '../../shared/api/client'
import type { Schemas } from '../../shared/api/types'
import type { TableSort } from '../../shared/lib/tableSort'
import { hasRole, type UserDto } from '../../shared/api/types'
import { ORDER_STATUSES, type OrderStatus } from './orders'

/** One status change of some order, as `GET /orders/history` lists it. */
export type HistoryEntry = Schemas['OrderHistoryEntryDto']
export type HistoryPage = Schemas['PageResponseOrderHistoryEntryDto']
/** One step of a single order's timeline, as `GET /orders/history/{orderNo}` answers it. */
export type HistoryStep = Schemas['OrderHistoryResponse']

/**
 * What the table sorts by: the column on the left, the backend's key on the right
 * (`OrderController.ORDER_HISTORY_SORTABLE`). A column that is not here is not sorted.
 */
export const HISTORY_SORT: Readonly<Record<string, string>> = {
  id: 'id',
  order: 'order.orderNo',
  from: 'previousStatus',
  to: 'newStatus',
  changedAt: 'changedAt',
  changedBy: 'userId',
}

/** Who may open the page: the roles that may read any order, which is what the backend asks. */
export function mayReadOrderHistory(user: UserDto | undefined): boolean {
  return (
    !!user &&
    (['ADMIN', 'MANAGER', 'WAREHOUSE', 'LOGISTICS'] as const).some((role) => hasRole(user, role))
  )
}

export interface HistoryFilter {
  /** The text of the order number field; blank is no condition, anything that is not a whole number is ignored. */
  orderNo: string
  /** The status the order went to; empty is any. */
  status: OrderStatus | ''
}

export const NO_FILTER: HistoryFilter = { orderNo: '', status: '' }

/** The order number of the field, or `null` where it is blank or not a positive whole number. */
export function orderNoOf(text: string): number | null {
  const trimmed = text.trim()
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null
}

/**
 * `GET /orders/history` for a page, a filter and a sort. With no sort the backend's own order applies: by order. Parameters that are not asked for are left out, so the URL says exactly what the person chose.
 */
export function historyPath(
  page: number,
  filter: HistoryFilter = NO_FILTER,
  sort: TableSort | null = null,
): string {
  const params: string[] = []
  const orderNo = orderNoOf(filter.orderNo)
  // The table lists the latest step of each order; naming one order asks for all of its steps.
  if (orderNo !== null) params.push(`orderNo=${orderNo}`, 'latestOnly=false')
  if (filter.status !== '') params.push(`status=${encodeURIComponent(filter.status)}`)
  const key = sort === null ? undefined : HISTORY_SORT[sort.column]
  if (key !== undefined) {
    params.push(`sort=${encodeURIComponent(key)}`)
    params.push(`order=${sort?.direction === 'desc' ? 'DESC' : 'ASC'}`)
  }
  if (page > 0) params.push(`page=${page}`)
  return params.length === 0 ? '/orders/history' : `/orders/history?${params.join('&')}`
}

export const historyQueryOptions = (
  page = 0,
  filter: HistoryFilter = NO_FILTER,
  sort: TableSort | null = null,
) =>
  queryOptions({
    queryKey: [
      'order-history',
      'page',
      page,
      orderNoOf(filter.orderNo),
      filter.status,
      sort?.column ?? '',
      sort?.direction ?? '',
    ] as const,
    queryFn: () => api<HistoryPage>(historyPath(page, filter, sort)),
  })

/** `GET /orders/history/{orderNo}`: the whole timeline of one order, newest first. */
export const orderTimelineQueryOptions = (orderNo: number) =>
  queryOptions({
    queryKey: ['order-history', 'order', orderNo] as const,
    queryFn: () => api<HistoryStep[]>(`/orders/history/${orderNo}`),
  })

/** The statuses the filter offers - every one an order can go to. */
export const HISTORY_STATUSES: readonly OrderStatus[] = ORDER_STATUSES

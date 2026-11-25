import { queryOptions } from '@tanstack/react-query'
import { productLabel, cell } from '../../shared/lib/format'
import { api } from '../../shared/api/client'
import { withPage } from '../../shared/api/pageQuery'
import { hasRole, type UserDto } from '../../shared/api/types'

/** A picking order as the backend sends it. Its fields are not typed yet, so the table reads them as they come. */
export type PickingOrderDto = Record<string, unknown>

/** `GET /picking-orders`: the picking orders plus the paging figures. */
export interface PickingOrderPage {
  content: PickingOrderDto[]
  total: number
  page: number
  size: number
}

/** `ACTIVE` is what is still to be picked, `CONSUMED` what has been picked (and can be taken back). */
export type PickingStage = 'ACTIVE' | 'CONSUMED'

/** How the list is cut and ordered; what is left out is the backend's default (25 rows, soonest expiry first). */
export interface PickingListOptions {
  /** One order's rows only. */
  orderNo?: string
  size?: number
  sort?: string
  order?: 'ASC' | 'DESC'
}

/** `GET /picking-orders` for a stage (the backend's default, `ACTIVE`, when none is given) and page. */
export function pickingOrdersPath(
  page = 0,
  stage: PickingStage = 'ACTIVE',
  options: PickingListOptions = {},
) {
  const query = new URLSearchParams()
  if (stage !== 'ACTIVE') query.set('status', stage)
  if (options.orderNo) query.set('orderNo', options.orderNo)
  if (options.size !== undefined) query.set('size', String(options.size))
  if (options.sort) query.set('sort', options.sort)
  if (options.order) query.set('order', options.order)
  const text = query.toString()
  return withPage(text ? `/picking-orders?${text}` : '/picking-orders', page)
}

export async function fetchPickingOrders(
  page = 0,
  stage: PickingStage = 'ACTIVE',
  options: PickingListOptions = {},
): Promise<PickingOrderPage> {
  const body = await api<PickingOrderPage | PickingOrderDto[]>(
    pickingOrdersPath(page, stage, options),
  )
  if (Array.isArray(body)) return { content: body, total: body.length, page: 0, size: body.length }
  return { ...body, content: body.content ?? [] }
}

export const pickingOrdersQueryOptions = (
  page = 0,
  stage: PickingStage = 'ACTIVE',
  options: PickingListOptions = {},
) =>
  queryOptions({
    queryKey: ['picking-orders', 'page', stage, page, options] as const,
    queryFn: () => fetchPickingOrders(page, stage, options),
  })

async function postPicking(path: string): Promise<string> {
  const body = await api<{ message?: unknown } | null>(path, { method: 'POST' })
  return typeof body?.message === 'string' ? body.message : 'Picking started.'
}

/**
 * The order number a search field holds, as the list is asked for it: digits only - the backend answers anything
 * else with 400 - and `undefined`, which lists every order, otherwise.
 */
export function searchedOrderNo(text: string): string | undefined {
  const value = text.trim()
  return /^\d+$/.test(value) ? value : undefined
}

/**
 * Who may pick and take a pick back (`POST /picking/**`, `POST /release/{id}`): the warehouse and the admin. The
 * manager reads the list only.
 */
export function mayPick(user: UserDto | null | undefined): boolean {
  return !!user && (hasRole(user, 'ADMIN') || hasRole(user, 'WAREHOUSE'))
}

/** `POST /picking/{reservationId}`: picks one reservation. */
export const pickReservation = (reservationId: string) =>
  postPicking(`/picking/${encodeURIComponent(reservationId)}`)

/** `POST /picking/order/{orderNo}`: picks a whole order. */
export const pickOrder = (orderNo: string) =>
  postPicking(`/picking/order/${encodeURIComponent(orderNo)}`)

/**
 * `POST /release/{reservationId}`: takes a pick back - the line goes to WAITING, the stock back onto the shelf, the
 * reservation is deleted. The backend answers the picking row, so the message is made here.
 */
export async function releasePick(reservationId: string): Promise<string> {
  await api<unknown>(`/release/${encodeURIComponent(reservationId)}`, { method: 'POST' })
  return `Pick of reservation ${reservationId} taken back.`
}

/** What a person is asked before a pick is taken back - it moves stock, so it is not one click. */
export function releaseQuestion(item: Record<string, unknown>): string {
  const what = productLabel(item.productName, item.articleNo)
  const order = item.orderNo != null ? ` of order ${cell(item.orderNo)}` : ''
  return `Take back the pick of ${what || 'this item'}${order}? The goods go back onto the shelf and the reservation is deleted.`
}

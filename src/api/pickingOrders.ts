import { queryOptions } from '@tanstack/react-query'
import { productLabel } from '../format'
import { api } from './client'
import { withPage } from './pageQuery'

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

/** `GET /picking-orders` for a stage (the backend's default, `ACTIVE`, when none is given) and page. */
export const pickingOrdersPath = (page = 0, stage: PickingStage = 'ACTIVE') =>
  withPage(stage === 'ACTIVE' ? '/picking-orders' : `/picking-orders?status=${stage}`, page)

export async function fetchPickingOrders(page = 0, stage: PickingStage = 'ACTIVE'): Promise<PickingOrderPage> {
  const body = await api<PickingOrderPage | PickingOrderDto[]>(pickingOrdersPath(page, stage))
  if (Array.isArray(body)) return { content: body, total: body.length, page: 0, size: body.length }
  return { ...body, content: body.content ?? [] }
}

export const pickingOrdersQueryOptions = (page = 0, stage: PickingStage = 'ACTIVE') =>
  queryOptions({
    queryKey: ['picking-orders', 'page', stage, page] as const,
    queryFn: () => fetchPickingOrders(page, stage),
  })

async function postPicking(path: string): Promise<string> {
  const body = await api<{ message?: unknown } | null>(path, { method: 'POST' })
  return typeof body?.message === 'string' ? body.message : 'Picking started.'
}

/** `POST /picking/{reservationId}`: picks one reservation. */
export const pickReservation = (reservationId: string) =>
  postPicking(`/picking/${encodeURIComponent(reservationId)}`)

/** `POST /picking/order/{orderNo}`: picks a whole order. */
export const pickOrder = (orderNo: string) => postPicking(`/picking/order/${encodeURIComponent(orderNo)}`)

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
  const order = item.orderNo != null ? ` of order ${String(item.orderNo)}` : ''
  return `Take back the pick of ${what || 'this item'}${order}? The goods go back onto the shelf and the reservation is deleted.`
}

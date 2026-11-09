import { queryOptions } from '@tanstack/react-query'
import { api } from './client'

/** One request as the supplier it was placed with sees it (`RequestComponentResponseDto`): no word on who inside the house moved it. */
export interface MyRequestRow {
  id: number
  comment: string | null
  requestDate: string | null
  requestStatus: string
  updated: string | null
  /** How many were ordered - not the component's own `qty`, which is the bill-of-materials quantity. */
  qty: number
  component: {
    id: number
    manufacturer: string | null
    name: string | null
    sku: string | null
    articleNo: string | null
  } | null
}

/** `GET /supplier/my-requests`: the supplier's own requests, a plain list - not paged. */
export async function fetchMyRequests(): Promise<MyRequestRow[]> {
  const body = await api<MyRequestRow[] | { content?: MyRequestRow[] }>('/supplier/my-requests')
  return Array.isArray(body) ? body : (body.content ?? [])
}

export const myRequestsQueryOptions = queryOptions({
  queryKey: ['my-requests'] as const,
  queryFn: fetchMyRequests,
})

/** What a supplier can answer a request with; each is `POST /supplier/{id}/{action}` without a body. */
export type SupplierAction = 'approve' | 'intransit' | 'delivered' | 'reject' | 'cancel'

/** Answers one request. The backend refuses another supplier's request (403) and a step the status does not allow (409). */
export function answerRequest(
  id: number,
  action: SupplierAction,
): Promise<Record<string, unknown>> {
  return api<Record<string, unknown>>(`/supplier/${id}/${action}`, { method: 'POST' })
}

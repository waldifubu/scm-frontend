import { queryOptions } from '@tanstack/react-query'
import { api } from './client'

/** The statuses a component request goes through, as the backend names them. */
export const REQUEST_STATUSES = ['OPEN', 'APPROVED', 'IN_TRANSIT', 'DELIVERED', 'IN_STOCK', 'REJECTED', 'CANCELLED'] as const

/** One placed component request (`RequestComponentResponse`); the keys the backend leaves out while empty are optional. */
export interface ComponentRequestRow {
  id: number
  componentDbId: number | null
  componentId: string | null
  componentName: string | null
  qty: number
  comment?: string
  requestStatus: string
  requestDate: string | null
  supplierId: number | null
  /** The supplier by name; left out by the backend where there is none. */
  supplierName?: string
  assignedById?: number
  assignedByName?: string
  updated?: string
}

/** `GET /components/requests`: the requests plus the paging figures. */
export interface ComponentRequestPage {
  content: ComponentRequestRow[]
  total: number
  page: number
  size: number
}

/** The query string of the list: only what differs from the backend's defaults is sent. */
export function requestsPath(page: number, status: string): string {
  const query = new URLSearchParams()
  if (page > 0) query.set('page', String(page))
  if (status !== '') query.set('status', status)
  const text = query.toString()
  return text === '' ? '/components/requests' : `/components/requests?${text}`
}

export async function fetchComponentRequests(page = 0, status = ''): Promise<ComponentRequestPage> {
  const body = await api<ComponentRequestPage>(requestsPath(page, status))
  return { ...body, content: body.content ?? [] }
}

export const componentRequestsQueryOptions = (page = 0, status = '') =>
  queryOptions({
    queryKey: ['component-requests', page, status] as const,
    queryFn: () => fetchComponentRequests(page, status),
  })

/** What `POST /stock/book` takes: the delivered requests and the storehouse the goods arrived in. */
export interface BookDeliveryBody {
  requestIds: number[]
  storehouseId: number
}

/** `POST /stock/book`: adds each request's quantity to the stock of its component in the storehouse; the requests end IN_STOCK. All or nothing. */
export function bookDelivery(body: BookDeliveryBody): Promise<ComponentRequestRow[]> {
  return api<ComponentRequestRow[]>('/stock/book', { method: 'POST', body: JSON.stringify(body) })
}

/** Only a request the supplier reported delivered can be booked in; the warehouse has not seen the goods before. */
export const BOOKABLE_STATUS = 'DELIVERED'

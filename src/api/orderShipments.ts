import { queryOptions } from '@tanstack/react-query'
import { api } from './client'

/** One shipment an order travels in, as `GET /orders/{orderNo}/shipments` sends it. The carrier's name is for staff only. */
export interface OrderShipment {
  id: number
  status: string
  trackingNumber?: string
  shippingAddress?: string
  shippedAt: string | null
  deliveredAt: string | null
  distributorName?: string
  packageNumbers: string[]
}

/**
 * The order statuses from which an order is in shipments - or has been: ready to leave, on the road, partly or
 * wholly arrived, or the order closed afterwards. Before that it travels in none, so the page does not ask.
 */
const SHIPPED_STATUSES: readonly string[] = [
  'READY_FOR_DISPATCH',
  'IN_TRANSIT',
  'PARTIALLY_DELIVERED',
  'DELIVERED',
  'COMPLETED',
]

export function showsShipments(orderStatus: unknown): boolean {
  return typeof orderStatus === 'string' && SHIPPED_STATUSES.includes(orderStatus)
}

export const orderShipmentsPath = (orderNumber: string) =>
  `/orders/${encodeURIComponent(orderNumber)}/shipments`

export const orderShipmentsQueryOptions = (orderNumber: string, enabled = true) =>
  queryOptions({
    queryKey: ['orders', orderNumber, 'shipments'] as const,
    queryFn: () => api<OrderShipment[]>(orderShipmentsPath(orderNumber)),
    enabled,
  })

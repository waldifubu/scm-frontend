import type { OrderStatus } from './orders'

/**
 * What each order status means, in the words of the process (see `OrderStatus` in the backend): shown beside the
 * workflow diagram while the pointer rests on a state.
 */
export const STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  CREATED: 'The customer has placed the order. It waits to be acknowledged.',
  ACKNOWLEDGED:
    'The order is accepted and a delivery date is confirmed. Every line can be covered from stock.',
  WAIT_SUPPLY:
    'The order is confirmed, but stock is missing for at least one line. It waits for supply and moves on as soon as stock can be reserved.',
  REVIEW: 'The order is being reviewed before it is approved.',
  APPROVED: 'The order is approved. Stock can now be reserved for its lines.',
  IN_FULFILLMENT:
    'Stock is reserved. The lines are being picked and packed, and the packages put into shipments.',
  READY_FOR_DISPATCH:
    'Every line is in a shipment that has been reported ready. The order waits for a carrier to take it.',
  IN_TRANSIT: 'Every line is on the road with a carrier.',
  PARTIALLY_DELIVERED: 'Part of the order has arrived while the rest is still on its way.',
  DELIVERED: 'Everything has arrived. The order can now be completed.',
  COMPLETED: 'The order is closed: the delivery was confirmed. This is the end of the flow.',
  REJECTED: 'The order was declined. This is an end of the flow.',
  CANCELLED:
    'The order was called off before any goods moved; its reservations went back to stock. This is an end of the flow.',
}

/** The explanation of a status, or `undefined` for anything that is none. */
export function describeStatus(status: unknown): string | undefined {
  return typeof status === 'string' && Object.hasOwn(STATUS_DESCRIPTIONS, status)
    ? STATUS_DESCRIPTIONS[status as OrderStatus]
    : undefined
}

/** The status a Mermaid node belongs to, read from the id Mermaid gives it (`flowchart-IN_TRANSIT-7`). */
export function statusOfNodeId(id: string | null | undefined): string | undefined {
  return id?.match(/flowchart-([A-Z_]+)-\d+/)?.[1]
}

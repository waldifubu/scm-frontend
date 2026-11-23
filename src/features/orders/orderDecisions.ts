import { api } from '../../shared/api/client'
import { hasRole, type UserDto } from '../../shared/api/types'
import type { OrderDto } from './orders'

/** What a manager can decide about an order, each one a `POST /orders/{orderNo}/{action}`. */
export type OrderDecision = 'review' | 'accept' | 'release' | 'reject' | 'cancel'

/** In the order the buttons stand: pick it up, answer yes, give the reserved stock back, answer no, call it off. */
export const ORDER_DECISIONS: readonly OrderDecision[] = [
  'review',
  'accept',
  'release',
  'reject',
  'cancel',
]

/**
 * The statuses each decision is offered in - what the backend takes, so the page does not offer a button that is
 * answered with a 409. `reject` and `cancel` stop where the goods are in a shipment (that is the shipment's
 * business) and where the order has ended.
 */
const OPEN_STATUSES = ['CREATED', 'REVIEW', 'ACKNOWLEDGED', 'WAIT_SUPPLY', 'IN_FULFILLMENT']

const OFFERED_IN: Readonly<Record<OrderDecision, readonly string[]>> = {
  review: ['CREATED'],
  accept: ['CREATED', 'REVIEW'],
  // Stock is held only while the order is being fulfilled; releasing it sends the order back to REVIEW.
  release: ['IN_FULFILLMENT'],
  reject: OPEN_STATUSES,
  cancel: OPEN_STATUSES,
}

/** The decisions to offer this user for an order in this status; none for anybody but ADMIN and MANAGER. */
export function decisionsFor(user: UserDto | null | undefined, status: unknown): OrderDecision[] {
  if (!user || !(hasRole(user, 'ADMIN') || hasRole(user, 'MANAGER'))) return []
  return ORDER_DECISIONS.filter((decision) => OFFERED_IN[decision].includes(String(status)))
}

/** `POST /orders/{orderNo}/{decision}`: the order as it is afterwards - for `release` the list of reservations that were
 * given back instead. A refusal arrives as an error with its message. */
export function decideOrder(
  orderNumber: string,
  decision: OrderDecision,
): Promise<OrderDto | unknown[]> {
  return api<OrderDto | unknown[]>(`/orders/${encodeURIComponent(orderNumber)}/${decision}`, {
    method: 'POST',
  })
}

/** How a decision reads on its button and in its confirmation; a rejection and a cancellation end the order. */
export const DECISION_TEXT: Readonly<
  Record<OrderDecision, { label: string; question: string; danger: boolean; outline: string }>
> = {
  review: {
    label: 'Review',
    question: 'Take this order up for review? Nothing is promised to the customer yet.',
    danger: false,
    outline: 'btn-outline-secondary',
  },
  accept: {
    label: 'Accept',
    question:
      'Accept this order? The customer is given a delivery date, and the status says whether the stock is there (acknowledged) or has to be waited for.',
    danger: false,
    outline: 'btn-outline-success',
  },
  release: {
    label: 'Release reservations',
    question:
      'Release every reservation this order holds? The stock goes back on the shelf and the order returns to review, where it has to be accepted again. Picked goods are not touched.',
    danger: false,
    outline: 'btn-outline-warning',
  },
  reject: {
    label: 'Reject',
    question: 'Reject this order? The customer is turned down and the order ends.',
    danger: true,
    outline: 'btn-outline-danger',
  },
  cancel: {
    label: 'Cancel order',
    question:
      'Cancel this order? Whatever it reserved goes back to stock. Not possible once something is picked.',
    danger: true,
    outline: 'btn-outline-danger',
  },
}

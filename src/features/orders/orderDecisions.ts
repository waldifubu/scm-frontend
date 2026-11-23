import { api } from '../../shared/api/client'
import { hasRole, type UserDto } from '../../shared/api/types'
import type { OrderDto } from './orders'
import type { OrderWorkflow } from './workflow'

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

/** The workflow action behind each decision button. */
const ACTION_OF: Readonly<Record<OrderDecision, string>> = {
  review: 'REVIEW',
  accept: 'ACCEPT',
  release: 'RELEASE',
  reject: 'REJECT',
  cancel: 'CANCEL',
}

/**
 * The decisions to offer this user for an order in this status, read off the backend's workflow table: a manual
 * step from this status whose actors include one of the user's roles. A shortcut is the same action as the step it
 * skips, so it adds no button of its own. Nothing while the table has not arrived.
 */
export function decisionsFor(
  user: UserDto | null | undefined,
  status: unknown,
  workflow: OrderWorkflow | undefined,
): OrderDecision[] {
  if (!user || !workflow) return []
  const offered = new Set(
    workflow.transitions
      .filter(
        (step) =>
          step.trigger === 'MANUAL' &&
          step.from === status &&
          step.actors.some((role) => hasRole(user, role)),
      )
      .map((step) => step.action as string),
  )
  return ORDER_DECISIONS.filter((decision) => offered.has(ACTION_OF[decision]))
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

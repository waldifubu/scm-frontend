import { hasRole, type UserDto } from '../../shared/api/types'
import type { OrderWorkflow } from './workflow'

/**
 * Whether the page offers "Complete Order": the backend's workflow table has a manual COMPLETE step from the
 * order's status that one of the user's roles may take (the customer confirms the goods arrived, a manager or an
 * admin closes it commercially; a customer sees only their own orders anyway). Nothing while the table has not arrived.
 */
export function mayCompleteOrder(
  user: UserDto | null | undefined,
  orderStatus: unknown,
  workflow: OrderWorkflow | undefined,
): boolean {
  if (!user || !workflow) return false
  return workflow.transitions.some(
    (step) =>
      step.action === 'COMPLETE' &&
      step.trigger === 'MANUAL' &&
      step.from === orderStatus &&
      step.actors.some((role) => hasRole(user, role)),
  )
}

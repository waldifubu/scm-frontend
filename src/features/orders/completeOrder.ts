import { hasRole, type UserDto } from '../../shared/api/types'

/**
 * Whether the page offers "Complete Order": the order has been delivered, and the user is the customer, a
 * manager or an admin. The customer confirms the goods arrived, the others close it commercially; a customer
 * sees only their own orders anyway.
 */
export function mayCompleteOrder(user: UserDto | null | undefined, orderStatus: unknown): boolean {
  if (!user || orderStatus !== 'DELIVERED') return false
  return hasRole(user, 'CUSTOMER') || hasRole(user, 'MANAGER') || hasRole(user, 'ADMIN')
}

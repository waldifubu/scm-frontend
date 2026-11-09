import { hasRole, type UserDto } from '../shared/api/types'

export type SidebarLink = {
  to:
    | '/orders'
    | '/products'
    | '/components'
    | '/stock'
    | '/packages'
    | '/shipment-packages'
    | '/shippable-items'
    | '/shipments'
    | '/order-items'
    | '/order-items/packable'
    | '/storehouses'
    | '/requests'
    | '/my-requests'
    | '/picking-orders'
    | '/orders/new'
    | '/orders/create'
  label: string
  icon:
    | 'orders'
    | 'products'
    | 'components'
    | 'stock'
    | 'packages'
    | 'shipment-packages'
    | 'shippable-items'
    | 'shipments'
    | 'items'
    | 'packable-items'
    | 'storehouses'
    | 'requests'
    | 'my-requests'
    | 'picking'
    | 'new-orders'
    | 'create-order'
}

/** Every role there is, as the backend names them. */
const ALL_ROLES = [
  'CUSTOMER',
  'MANAGER',
  'SUPPLIER',
  'WAREHOUSE',
  'LOGISTICS',
  'DISTRIBUTOR',
  'ADMIN',
] as const

/**
 * Whether the user is a carrier and nothing else. Such a user works in one place - their own shipments -
 * and the navigation shows that and nothing more. A carrier who also holds another role is not one of
 * these: the other role's pages are theirs too.
 */
export function isCarrierOnly(user: UserDto): boolean {
  return holdsOnly(user, 'DISTRIBUTOR')
}

/**
 * Whether the user is a customer and nothing else. Their pages are placing an order and reading their own
 * orders; the warehouse's and the planner's are none of their business. With another role next to it,
 * that role's pages are theirs too.
 */
export function isCustomerOnly(user: UserDto): boolean {
  return holdsOnly(user, 'CUSTOMER')
}

/**
 * Whether the user is a supplier and nothing else. Their one page is the requests placed with them; every other
 * page of the navigation is the house's business. With another role next to it, that role's pages are theirs too.
 */
export function isSupplierOnly(user: UserDto): boolean {
  return holdsOnly(user, 'SUPPLIER')
}

function holdsOnly(user: UserDto, role: (typeof ALL_ROLES)[number]): boolean {
  return (
    hasRole(user, role) &&
    ALL_ROLES.filter((other) => other !== role).every((other) => !hasRole(user, other))
  )
}

/** The entries of the navigation, in order, that this user sees. */
export function sidebarLinks(user: UserDto): SidebarLink[] {
  const isWarehouse = hasRole(user, 'WAREHOUSE') || hasRole(user, 'ADMIN')
  // Shipments: the planning side sees them all, a carrier sees their own. The backend answers 403 to anybody else.
  // Shippable Items: the containers logistics may still put into a shipment (`GET /shipments/packages`).
  const seesShippable = hasRole(user, 'LOGISTICS') || hasRole(user, 'ADMIN')
  const seesShipments =
    hasRole(user, 'LOGISTICS') || hasRole(user, 'ADMIN') || hasRole(user, 'DISTRIBUTOR')

  const links: (SidebarLink & { visible: boolean })[] = [
    {
      to: '/orders/create',
      label: 'Create order',
      icon: 'create-order',
      visible: hasRole(user, 'CUSTOMER'),
    },
    { to: '/orders', label: 'Orders', icon: 'orders', visible: true },
    { to: '/orders/new', label: 'New orders', icon: 'new-orders', visible: true },
    { to: '/picking-orders', label: 'Picking orders', icon: 'picking', visible: isWarehouse },
    { to: '/order-items', label: 'Order items', icon: 'items', visible: true },
    { to: '/order-items/packable', label: 'Packable items', icon: 'packable-items', visible: true },
    { to: '/packages', label: 'Packages', icon: 'packages', visible: true },
    { to: '/shipment-packages', label: 'Containers', icon: 'shipment-packages', visible: true },
    {
      to: '/shippable-items',
      label: 'Shippable Items',
      icon: 'shippable-items',
      visible: seesShippable,
    },
    { to: '/shipments', label: 'Shipments', icon: 'shipments', visible: seesShipments },
    { to: '/storehouses', label: 'Storehouses', icon: 'storehouses', visible: isWarehouse },
    { to: '/products', label: 'Products', icon: 'products', visible: true },
    { to: '/components', label: 'Components', icon: 'components', visible: true },
    { to: '/stock', label: 'Stock', icon: 'stock', visible: isWarehouse },
    // The component requests placed with suppliers (`GET /components/requests`): ADMIN and WAREHOUSE.
    { to: '/requests', label: 'Request Components', icon: 'requests', visible: isWarehouse },
    // The supplier's own requests (`GET /supplier/my-requests`). Not for the admin: the list is of the logged-in user, theirs is empty.
    {
      to: '/my-requests',
      label: 'My Requests',
      icon: 'my-requests',
      visible: hasRole(user, 'SUPPLIER'),
    },
  ]

  const carrierOnly = isCarrierOnly(user)
  const customerOnly = isCustomerOnly(user)
  const supplierOnly = isSupplierOnly(user)
  return links
    .filter((link) => link.visible)
    .filter((link) => !carrierOnly || link.to === '/shipments')
    .filter((link) => !customerOnly || link.to === '/orders/create' || link.to === '/orders')
    .filter((link) => !supplierOnly || link.to === '/my-requests')
    .map(({ visible: _visible, ...link }) => link)
}

/** Where somebody lands after the login, when it is not a page they asked for: a carrier's own list, else the start page (a customer's too). */
export function homePathFor(user: UserDto): '/' | '/shipments' {
  if (isCarrierOnly(user)) return '/shipments'
  return '/'
}

/**
 * Whether `pathname` is a page the user's navigation leads to. Only a customer is held to it: they are sent
 * to the start page from anything else, instead of landing on a page the backend answers with a 403. The
 * details of one order (`/orders/1042`) belong to Orders; `/orders/new` is the manager's list, not theirs.
 */
export function mayOpen(user: UserDto, pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/'
  // A supplier alone has the start page and their requests; the rest would answer 403.
  if (isSupplierOnly(user)) return path === '/' || path === '/my-requests'
  if (!isCustomerOnly(user)) return true
  if (path === '/' || path === '/orders' || path === '/orders/create') return true
  return path.startsWith('/orders/') && path !== '/orders/new' && !path.startsWith('/orders/new/')
}

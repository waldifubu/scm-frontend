import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { meQueryOptions } from './features/auth/auth'
import { homePathFor, mayOpen } from './layout/navigation'
import { queryClient } from './queryClient'
import { AuthedLayout } from './layout/AuthedLayout'
import { HomePage } from './features/home/HomePage'
import { LoginPage } from './features/auth/LoginPage'
import { CreateOrderPage } from './features/orders/CreateOrderPage'
import { PickingOrdersPage } from './features/picking/PickingOrdersPage'
import { PackagesPage } from './features/packing/PackagesPage'
import { PackageDetailsPage } from './features/packing/PackageDetailsPage'
import { OrderItemsPage } from './features/packing/OrderItemsPage'
import { PackableItemsPage } from './features/packing/PackableItemsPage'
import { ShipmentPackagesPage } from './features/packing/ShipmentPackagesPage'
import { ShipmentPackageDetailsPage } from './features/packing/ShipmentPackageDetailsPage'
import { ShippableDetailsPage } from './features/shipments/ShippableDetailsPage'
import { ShippableItemsPage } from './features/shipments/ShippableItemsPage'
import { ShipmentsPage } from './features/shipments/ShipmentsPage'
import { ShipmentDetailsPage } from './features/shipments/ShipmentDetailsPage'
import { StockOverviewPage } from './features/stock/StockOverviewPage'
import { StockPage } from './features/stock/StockPage'
import { ComponentRequestsPage } from './features/components/ComponentRequestsPage'
import { MyRequestsPage } from './features/components/MyRequestsPage'
import { StorehousesPage } from './features/stock/StorehousesPage'
import { ComponentsPage } from './features/components/ComponentsPage'
import { ComponentDetailsPage } from './features/components/ComponentDetailsPage'
import { OrdersPage } from './features/orders/OrdersPage'
import { ProductsPage } from './features/products/ProductsPage'
import { ProductEditPage } from './features/products/ProductEditPage'
import { ProductSkuDetailsPage, ProductDetailsPage } from './features/products/ProductDetailsPage'
import { OrderDetailsPage } from './features/orders/OrderDetailsPage'
import { NewOrderDetailsPage } from './features/orders/NewOrderDetailsPage'
import { NewOrderPage } from './features/orders/NewOrderPage'
import { NotFoundPage } from './features/home/NotFoundPage'

/** What every route's `beforeLoad` can reach: the cache the session lives in. */
interface RouterContext {
  queryClient: QueryClient
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  notFoundComponent: NotFoundPage,
})

/**
 * Public. Somebody who is logged in has no business here and goes to the start; `redirect` says where
 * a visitor who was sent here from a protected page is to go once logged in (checked by `safeRedirect`,
 * since it comes from the address bar).
 */
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(meQueryOptions)
    if (user) throw redirect({ to: '/' })
  },
  component: LoginPage,
})

/**
 * Everything behind a login hangs below this route, which has no path of its own. The guard asks who
 * is logged in - from the cache if it knows, else from `/me` - and sends an anonymous visitor to the
 * login, remembering where they wanted to go.
 */
const authedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authed',
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.ensureQueryData(meQueryOptions)
    if (!user) {
      throw redirect({
        to: '/login',
        search: location.href === '/' ? {} : { redirect: location.href },
      })
    }
    // A customer has two pages; any other address, typed or followed, leads to their orders.
    if (!mayOpen(user, location.pathname)) throw redirect({ to: homePathFor(user) })
  },
  component: AuthedLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/',
  // A carrier works in one place, and has no start page worth landing on: straight to their shipments.
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(meQueryOptions)
    const home = user ? homePathFor(user) : '/'
    if (home !== '/') throw redirect({ to: home })
  },
  component: HomePage,
})

const ordersRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/orders',
  component: OrdersPage,
})

// A static segment outranks :orderNumber, so /orders/new never reaches the details.
const createOrderRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/orders/create',
  component: CreateOrderPage,
})

const newOrderRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/orders/new',
  component: NewOrderPage,
})

const newOrderDetailsRoute = createRoute({
  getParentRoute: () => newOrderRoute,
  path: '$orderNumber',
  component: NewOrderDetailsPage,
})

const orderDetailsRoute = createRoute({
  getParentRoute: () => ordersRoute,
  path: '$orderNumber',
  component: OrderDetailsPage,
})

const orderItemsRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/order-items',
  component: OrderItemsPage,
})

const packableItemsRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/order-items/packable',
  component: PackableItemsPage,
})

const shipmentPackagesRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/shipment-packages',
  component: ShipmentPackagesPage,
})

const shipmentPackageDetailsRoute = createRoute({
  getParentRoute: () => shipmentPackagesRoute,
  path: '$shipmentPackageId',
  component: ShipmentPackageDetailsPage,
})

const storehousesRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/storehouses',
  component: StorehousesPage,
})

const requestsRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/requests',
  component: ComponentRequestsPage,
})

const myRequestsRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/my-requests',
  component: MyRequestsPage,
})

const stockOverviewRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/stock',
  component: StockOverviewPage,
})

const stockRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/stock/storehouse/$storehouseId',
  component: StockPage,
})

const pickingOrdersRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/picking-orders',
  component: PickingOrdersPage,
})

const shippableItemsRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/shippable-items',
  component: ShippableItemsPage,
})

const shippableDetailsRoute = createRoute({
  getParentRoute: () => shippableItemsRoute,
  path: '$packageId',
  component: ShippableDetailsPage,
})

const shipmentsRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/shipments',
  component: ShipmentsPage,
})

const shipmentDetailsRoute = createRoute({
  getParentRoute: () => shipmentsRoute,
  path: '$shipmentId',
  component: ShipmentDetailsPage,
})

const packagesRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/packages',
  component: PackagesPage,
})

const packageDetailsRoute = createRoute({
  getParentRoute: () => packagesRoute,
  path: '$packageId',
  component: PackageDetailsPage,
})

const componentsRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/components',
  component: ComponentsPage,
})

const componentDetailsRoute = createRoute({
  getParentRoute: () => componentsRoute,
  path: '$sku',
  component: ComponentDetailsPage,
})

const productsRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/products',
  component: ProductsPage,
})

const productDetailsRoute = createRoute({
  getParentRoute: () => productsRoute,
  path: '$articleNo',
  component: ProductDetailsPage,
})

const productSkuRoute = createRoute({
  getParentRoute: () => productsRoute,
  path: 'sku/$sku',
  component: ProductSkuDetailsPage,
})

const productEditRoute = createRoute({
  getParentRoute: () => productsRoute,
  path: '$articleNo/edit',
  component: ProductEditPage,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  authedRoute.addChildren([
    indexRoute,
    orderItemsRoute,
    packableItemsRoute,
    shipmentPackagesRoute.addChildren([shipmentPackageDetailsRoute]),
    shippableItemsRoute.addChildren([shippableDetailsRoute]),
    shipmentsRoute.addChildren([shipmentDetailsRoute]),
    packagesRoute.addChildren([packageDetailsRoute]),
    pickingOrdersRoute,
    createOrderRoute,
    storehousesRoute,
    requestsRoute,
    myRequestsRoute,
    stockOverviewRoute,
    stockRoute,
    componentsRoute.addChildren([componentDetailsRoute]),
    productsRoute.addChildren([productDetailsRoute, productSkuRoute, productEditRoute]),
    ordersRoute.addChildren([orderDetailsRoute]),
    newOrderRoute.addChildren([newOrderDetailsRoute]),
  ]),
])

export const router = createRouter({
  routeTree,
  context: { queryClient },
  // Loads a route's data when the pointer is over its link, not when it is clicked.
  defaultPreload: 'intent',
})

// Without this the router's hooks and <Link> know no route names: `to="/login"` would be any string.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

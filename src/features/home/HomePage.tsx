import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { meQueryOptions } from '../auth/auth'
import { hasRole } from '../../shared/api/types'
import { CustomerHomePage } from './CustomerHomePage'
import { ManagerHomePage } from './ManagerHomePage'
import { WarehouseHomePage } from './WarehouseHomePage'
import { WelcomeCard } from './WelcomeCard'

// Mermaid is large: the workflow diagram is fetched when the start page is shown, not with the app.
const OrderWorkflow = lazy(() =>
  import('../orders/OrderWorkflow').then((module) => ({ default: module.OrderWorkflow })),
)

/**
 * What a logged-in user lands on: the home page of the role. A manager wins over a customer; roles
 * without a page of their own get the plain welcome. Below it, the whole order workflow.
 */
export function HomePage() {
  const { data: user } = useQuery(meQueryOptions)
  if (!user) return null

  return (
    <>
      {hasRole(user, 'MANAGER') ? (
        <ManagerHomePage />
      ) : hasRole(user, 'WAREHOUSE') ? (
        <WarehouseHomePage />
      ) : hasRole(user, 'CUSTOMER') ? (
        <CustomerHomePage />
      ) : (
        <WelcomeCard />
      )}
      <Suspense fallback={null}>
        <OrderWorkflow tall />
      </Suspense>
    </>
  )
}

import { useQuery } from '@tanstack/react-query'
import { meQueryOptions } from '../api/auth'
import { hasRole } from '../api/types'
import { CustomerHomePage } from './CustomerHomePage'
import { ManagerHomePage } from './ManagerHomePage'
import { WarehouseHomePage } from './WarehouseHomePage'
import { WelcomeCard } from './WelcomeCard'

/**
 * What a logged-in user lands on: the home page of the role. A manager wins over a customer; roles
 * without a page of their own get the plain welcome.
 */
export function HomePage() {
  const { data: user } = useQuery(meQueryOptions)
  if (!user) return null

  if (hasRole(user, 'MANAGER')) return <ManagerHomePage />
  if (hasRole(user, 'WAREHOUSE')) return <WarehouseHomePage />
  if (hasRole(user, 'CUSTOMER')) return <CustomerHomePage />
  return <WelcomeCard />
}
import { queryOptions } from '@tanstack/react-query'
import { api } from '../../shared/api/client'
import type { UserDto } from '../../shared/api/types'

/** `GET /users/distributors`: the carriers plus the paging figures. */
export interface DistributorPage {
  content: UserDto[]
  total: number
  page: number
  size: number
  /** Set when the list is every carrier because no rule names one for the shipment (the query came back empty). */
  fallback?: boolean
}

/**
 * How many carriers one request asks for. The list is for picking one from, so it takes them all at
 * once, not the backend's default of 25; `total` in the answer says whether this was enough.
 */
export const DISTRIBUTOR_PAGE_SIZE = 100

/** The active carriers a shipment can be handed to, by last name. For ADMIN, MANAGER and LOGISTICS. */
export async function fetchDistributors(): Promise<DistributorPage> {
  const body = await api<DistributorPage | UserDto[]>(
    `/users/distributors?size=${DISTRIBUTOR_PAGE_SIZE}&sort=lastName`,
  )
  if (Array.isArray(body)) return { content: body, total: body.length, page: 0, size: body.length }
  return { ...body, content: body.content ?? [] }
}

/** What a carrier is looked up for - every part optional, a missing one matches only rules that leave it open. */
export interface DistributorQuery {
  customerId?: number | null
  /** The weight of the shipment in kg. */
  weight?: number | null
  /** The volume of the shipment in cm³ (what the backend works out for the packages, not the m³ the pages show). */
  volume?: number | null
}

export const DISTRIBUTOR_QUERY_PATH = '/users/distributors/query'

/** The body of the request: a part that is not known is left out rather than sent as `null`. */
export function distributorQueryBody(query: DistributorQuery): Record<string, number> {
  const body: Record<string, number> = {}
  if (query.customerId != null) body.customerId = query.customerId
  if (query.weight != null) body.weight = query.weight
  if (query.volume != null) body.volume = query.volume
  return body
}

/**
 * `QUERY /users/distributors/query`: the carriers the rules name for this customer, weight and volume, best first.
 * The HTTP method QUERY is a safe request with a body. When no rule applies the page is empty, and then every active
 * carrier is offered instead, marked `fallback`. Any refusal is passed on.
 */
export async function queryDistributors(query: DistributorQuery): Promise<DistributorPage> {
  const body = await api<DistributorPage | UserDto[]>(DISTRIBUTOR_QUERY_PATH, {
    method: 'QUERY',
    body: JSON.stringify(distributorQueryBody(query)),
  })
  const page: DistributorPage = Array.isArray(body)
    ? { content: body, total: body.length, page: 0, size: body.length }
    : { ...body, content: body.content ?? [] }
  if (page.content.length > 0) return page
  return { ...(await fetchDistributors()), fallback: true }
}

export const distributorQueryOptions = (query: DistributorQuery) =>
  queryOptions({
    queryKey: ['users', 'distributors', 'query', distributorQueryBody(query)] as readonly unknown[],
    queryFn: () => queryDistributors(query),
  })

export const distributorsQueryOptions = queryOptions({
  queryKey: ['users', 'distributors'] as readonly unknown[],
  queryFn: fetchDistributors,
})

import { queryOptions } from '@tanstack/react-query'
import { api } from './client'
import { withPage } from './pageQuery'
import { cell } from '../format'

/** A package as the backend sends it. Its fields are not typed yet, so the table reads them as they come. */
export type PackageDto = Record<string, unknown>

/** `GET /packages`: the packages plus the paging figures. */
export interface PackagePage {
  content: PackageDto[]
  total: number
  page: number
  size: number
}

async function fetchPackagePage(path: string): Promise<PackagePage> {
  const body = await api<PackagePage | PackageDto[]>(path)
  if (Array.isArray(body)) return { content: body, total: body.length, page: 0, size: body.length }
  return { ...body, content: body.content ?? [] }
}

/** The status the Packages page starts with: the lines that are packed and waiting for a container. */
export const DEFAULT_PACKAGE_STATUS = 'PACKED'

export interface PackageFilter {
  /** The fulfillment status of the item's order line; none lists every item. */
  fulfillmentStatus?: string
  page?: number
  size?: number
  sort?: string
  order?: 'ASC' | 'DESC'
}

export function fetchPackages(filter: PackageFilter = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return fetchPackagePage(params.size ? `/packages?${params}` : '/packages')
}

export const packagesQueryOptions = (filter: PackageFilter = {}) =>
  queryOptions({
    queryKey: ['packages', 'list', filter] as unknown[],
    queryFn: () => fetchPackages(filter),
  })

/** `GET /lonely-packages` for a page and a fulfillment status (none: every loose item). */
export const lonelyPackagesPath = (page = 0, fulfillmentStatus?: string) =>
  withPage(
    fulfillmentStatus
      ? `/lonely-packages?fulfillmentStatus=${encodeURIComponent(fulfillmentStatus)}`
      : '/lonely-packages',
    page,
  )

/** `GET /lonely-packages`: the same package listing, of the packages without siblings. */
export const lonelyPackagesQueryOptions = (page = 0, fulfillmentStatus?: string) =>
  queryOptions({
    queryKey: ['packages', 'lonely', fulfillmentStatus ?? '', page] as unknown[],
    queryFn: () => fetchPackagePage(lonelyPackagesPath(page, fulfillmentStatus)),
  })

/**
 * `POST /packing/shipment/{shipmentPackageId}/items`: puts loose package items into an OPEN container. Items it holds
 * already stay, so a repeated call changes nothing. A refusal (an item in another container, items of two orders, a
 * container that is no longer OPEN) arrives as an error whose message `api` already reads.
 */
export async function addItemsToContainer(
  shipmentPackageId: number,
  packageItemIds: number[],
): Promise<string> {
  const body = await api<{
    message?: unknown
    id?: unknown
    packageNumber?: unknown
    items?: unknown
  } | null>(`/packing/shipment/${encodeURIComponent(String(shipmentPackageId))}/items`, {
    method: 'POST',
    body: JSON.stringify({ packageItemIds }),
  })
  if (typeof body?.message === 'string') return body.message
  const name =
    typeof body?.packageNumber === 'string' && body.packageNumber !== ''
      ? `Container ${body.packageNumber}`
      : `Container ${shipmentPackageId}`
  return Array.isArray(body?.items)
    ? `${name} now holds ${body.items.length} item${body.items.length === 1 ? '' : 's'}.`
    : `${name} updated.`
}

/** `GET /packages/{id}`. */
export const packageQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['packages', id] as const,
    queryFn: () => api<PackageDto>(`/packages/${encodeURIComponent(id)}`),
  })

export interface ShipmentFromItems {
  shipmentPackageType: string
  packageItems: number[]
  packageNumber: string | null
  length: number | null
  width: number | null
  height: number | null
}

/** `POST /packing/shipment/from-items`: creates a shipment package from the given package items. */
export async function createShipmentPackage(request: ShipmentFromItems): Promise<string> {
  const body = await api<{ message?: unknown; id?: unknown } | null>(
    '/packing/shipment/from-items',
    {
      method: 'POST',
      body: JSON.stringify(request),
    },
  )
  if (typeof body?.message === 'string') return body.message
  return body?.id != null ? `Container ${cell(body.id)} created.` : 'Container created.'
}

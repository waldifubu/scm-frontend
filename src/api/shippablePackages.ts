import { queryOptions } from '@tanstack/react-query'
import type { TableSort } from '../tableSort'
import { api, ApiError } from './client'
import { withPage } from './pageQuery'

/** One item inside a package row: what the package holds of which order line (`ShipmentPackageItemDto`). */
export interface ShippableItem {
  id: number
  createdAt: string | null
  orderItemId: number | null
  orderNo: number | null
  sku: string | null
  quantity: number | null
  totalQuantity: number | null
  runNo: string | null
  fulfillmentStatus: string | null
}

/** A package that is `PACKED` and in no shipment yet (`ShipmentPackageListDto`), with its contents. */
export interface ShippablePackage {
  id: number
  packageNumber: string | null
  status: string
  type: string | null
  createdAt: string | null
  packedAt: string | null
  weight: number | null
  packageWeight: number | null
  length: number | null
  width: number | null
  height: number | null
  volume: number | null
  dueDate: string | null
  /** The customer the container goes to - the one of its order. `null` for an empty container. */
  customerId: number | null
  packages: number
  items: ShippableItem[]
}

export interface ShippablePage {
  content: ShippablePackage[]
  total: number
  page: number
  size: number
}

/**
 * What the head of a column sorts by on the server (`PackageController.SHIPMENT_PACKAGE_SORTABLE`). `type` and
 * `status` are called `shipmentPackageType` and `shipmentPackageStatus` there; the contents and the due date are
 * worked out per row and cannot be sorted by.
 */
export const SHIPPABLE_SORT_KEYS: Readonly<Record<string, string>> = {
  id: 'id',
  packageNumber: 'packageNumber',
  type: 'shipmentPackageType',
  packedAt: 'packedAt',
  weight: 'weight',
}

/**
 * `GET /shipments/packages` - the planning side's own list of the packages it may still ship (ADMIN, LOGISTICS).
 * Not `/shipment-packages`: that one is packing work, the logistics user gets a 403 on it, and it lists one status
 * at a time including packages that already travel in a shipment.
 */
export function shippablePath(page = 0, sort: TableSort | null = null): string {
  const key = sort === null ? undefined : SHIPPABLE_SORT_KEYS[sort.column]
  const path =
    key === undefined
      ? '/shipments/packages'
      : `/shipments/packages?sort=${key}&order=${sort?.direction === 'desc' ? 'DESC' : 'ASC'}`
  return withPage(path, page)
}

export async function fetchShippablePackages(
  page = 0,
  sort: TableSort | null = null,
): Promise<ShippablePage> {
  const body = await api<ShippablePage | ShippablePackage[]>(shippablePath(page, sort))
  if (Array.isArray(body)) return { content: body, total: body.length, page: 0, size: body.length }
  return { ...body, content: body.content ?? [] }
}

/**
 * `GET /shipment-packages/{id}`: one container with its contents. Logistics may read it (and the list of them); a
 * container that is in a shipment already is still answered, with the status it has - `null` is only for an id
 * nobody has.
 */
export async function fetchShippable(id: string): Promise<ShippablePackage | null> {
  try {
    return await api<ShippablePackage>(`/shipment-packages/${encodeURIComponent(id)}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export const shippableByIdQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['shipments', 'packages', 'by-id', id] as const,
    queryFn: () => fetchShippable(id),
  })

export const shippablePackagesQueryOptions = (page = 0, sort: TableSort | null = null) =>
  queryOptions({
    // Under 'shipments', so everything that changes a shipment (taking packages in or out) refreshes it.
    queryKey: ['shipments', 'packages', page, sort?.column ?? '', sort?.direction ?? ''] as const,
    queryFn: () => fetchShippablePackages(page, sort),
  })

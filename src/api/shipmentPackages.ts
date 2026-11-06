import { queryOptions } from '@tanstack/react-query'
import { api } from './client'

/** A shipment package as the backend sends it. Its fields are not typed yet, so the table reads them as they come. */
export type ShipmentPackageDto = Record<string, unknown>

/** `GET /shipment-packages`: the shipment packages plus the paging figures. */
export interface ShipmentPackagePage {
  content: ShipmentPackageDto[]
  total: number
  page: number
  size: number
}

/** `ShipmentPackageStatus`: a container is filled while OPEN, closed when PACKED, and DISPATCHED once its shipment left. */
export const SHIPMENT_PACKAGE_STATUSES = ['OPEN', 'PACKED', 'DISPATCHED'] as const

/** The status the backend lists when none is asked for. */
export const DEFAULT_SHIPMENT_PACKAGE_STATUS = 'OPEN'

export const SHIPMENT_PACKAGE_TYPES = [
  'CARTON',
  'WOODEN_BOX',
  'STACKABLE_CONTAINER',
  'PALLET',
  'EURO_PALLET',
  'PALLET_CAGE',
  'PLASTIC_CRATE',
  'METAL_CONTAINER',
  'DRUM',
  'BAG',
  'OTHER',
] as const

/** `DELETE /packing/shipment/{shipmentPackageId}/items/{packageItemId}`: removes one item from a shipment package. */
export async function deleteShipmentItem(shipmentPackageId: string, packageItemId: string): Promise<string> {
  const body = await api<{ message?: unknown } | null>(
    `/packing/shipment/${encodeURIComponent(shipmentPackageId)}/items/${encodeURIComponent(packageItemId)}`,
    { method: 'DELETE' },
  )
  return typeof body?.message === 'string' ? body.message : 'Item removed.'
}

/**
 * `PUT /packing/shipment/{shipmentPackageId}/complete`: marks a shipment package as packed.
 *
 * The answer is the package itself, not a `{ message }` - a refusal (409 for a line that is not PACKED
 * yet, 400 for an empty package) arrives as an error whose message `api` already reads, so what is
 * returned here is the text for the success: the package's number, its new status and when it was
 * packed, all taken from the answer. A `message`, should the backend ever send one, wins.
 */
export async function completeShipmentPackage(shipmentPackageId: string): Promise<string> {
  const body = await api<{ message?: unknown; packageNumber?: unknown; status?: unknown; packedAt?: unknown } | null>(
    `/packing/shipment/${encodeURIComponent(shipmentPackageId)}/complete`,
    { method: 'PUT' },
  )
  if (typeof body?.message === 'string') return body.message

  const name = typeof body?.packageNumber === 'string' ? `Package ${body.packageNumber}` : `Package ${shipmentPackageId}`
  const state = typeof body?.status === 'string' ? `is ${body.status}` : 'was completed'
  const at = typeof body?.packedAt === 'string' ? ` (packed ${body.packedAt})` : ''
  return `${name} ${state}${at}.`
}

export interface ShipmentPackageUpdate {
  shipmentPackageType: string
  packageNumber: string | null
  length: number | null
  width: number | null
  height: number | null
}

/** `PUT /packing/shipment/{id}`: changes type, number and dimensions of a shipment package. */
export async function updateShipmentPackage(id: string, request: ShipmentPackageUpdate): Promise<string> {
  const body = await api<{ message?: unknown } | null>(`/packing/shipment/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  })
  return typeof body?.message === 'string' ? body.message : 'Container updated.'
}

export type ShipmentPackageStatus = (typeof SHIPMENT_PACKAGE_STATUSES)[number]

export interface ShipmentPackageFilter {
  page?: number
  size?: number
  sort?: 'id'
  /** The backend's parameter is `status` (a `ShipmentPackageStatus`); under any other name it is ignored and OPEN is listed. */
  status?: ShipmentPackageStatus
  packageNumber?: string
  order?: 'ASC' | 'DESC'
}

export async function fetchShipmentPackages(filter: ShipmentPackageFilter = {}): Promise<ShipmentPackagePage> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const query = params.size ? `?${params}` : ''
  const body = await api<ShipmentPackagePage | ShipmentPackageDto[]>(`/shipment-packages${query}`)
  if (Array.isArray(body)) return { content: body, total: body.length, page: 0, size: body.length }
  return { ...body, content: body.content ?? [] }
}

/** `GET /shipment-packages/{id}`. */
export const shipmentPackageQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['shipment-packages', 'detail', id] as const,
    queryFn: () => api<ShipmentPackageDto>(`/shipment-packages/${encodeURIComponent(id)}`),
  })

export const shipmentPackagesQueryOptions = (filter: ShipmentPackageFilter = {}) =>
  queryOptions({
    queryKey: ['shipment-packages', filter] as const,
    queryFn: () => fetchShipmentPackages(filter),
  })

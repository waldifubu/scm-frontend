import { queryOptions } from '@tanstack/react-query'
import type { TableSort } from '../tableSort'
import { api } from './client'

/** `ShipmentStatus`: where a shipment is, from being put together to the carrier's last step. */
export const SHIPMENT_STATES = [
  'CREATED',
  'READY',
  'DISPATCH_REQUESTED',
  'ACCEPTED',
  'DECLINED',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
] as const

export type ShipmentState = (typeof SHIPMENT_STATES)[number]

/** `ShipmentListDto`: one row of `GET /shipments`. Keys the backend leaves out when empty are optional. */
export interface ShipmentRow {
  id: number
  customerId?: number | null
  customerName?: string | null
  /** Null until the shipment has been handed to a carrier. */
  distributorId?: number | null
  distributorName?: string | null
  status: ShipmentState
  shippingAddress?: string | null
  shippingMethod?: string | null
  /** A date, `yyyy-MM-dd`. */
  requestedDeliveryDate?: string | null
  createdAt: string
  packageCount: number
  shipmentPackageIds: number[]
}

/**
 * `DeliveryResponse`: one row of `GET /shipments/distributor`, a carrier's own work list. It says where
 * the shipment goes and how much it is, not what is inside - the contents are the customer's business.
 */
export interface DeliveryRow {
  shipmentId: number
  status: ShipmentState
  customerName?: string | null
  shippingAddress?: string | null
  shippingMethod?: string | null
  trackingNumber?: string | null
  requestedDeliveryDate?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  packageCount: number
  weight: number
  packageNumbers: string[]
  /** Whose shipment it is - the number only, the customer's data is the house's. */
  customerId?: number | null
  createdAt?: string | null
  /** When anything on the shipment last changed; missing on a row from before the column existed. */
  updatedAt?: string | null
  /** The planner's note; after a cancellation, the reason. */
  comment?: string | null
  /** The carrier's own note: what they said when they took the shipment on, or why they turned it down. */
  distributorComment?: string | null
}

/** `ShipmentPackageItemDto`: what one package holds of one order line. */
export interface ShipmentItem {
  id: number
  orderItemId: number
  orderNo?: number | null
  sku: string
  quantity: number
  totalQuantity: number
}

/** `ShipmentPackageListDto`: a package of a shipment, with its contents. */
export interface ShipmentPackageRow {
  id: number
  packageNumber?: string | null
  status: string
  type?: string | null
  packedAt?: string | null
  weight?: number | null
  packageWeight?: number | null
  length?: number | null
  width?: number | null
  height?: number | null
  /** length × width × height, worked out by the backend (0 where a dimension is missing). */
  volume?: number | null
  items: ShipmentItem[]
}

/** The volume of all packages added up; `null` for a shipment without packages, which has none to show. */
export function totalVolume(packages: readonly Pick<ShipmentPackageRow, 'volume'>[]): number | null {
  if (packages.length === 0) return null
  return packages.reduce((sum, pack) => sum + (pack.volume ?? 0), 0)
}

/** `ShipmentResponse`: one shipment with its packages - what `GET /shipments/{id}` answers. */
export interface ShipmentDetail {
  id: number
  customerId?: number | null
  customerName?: string | null
  status: ShipmentState
  shippingAddress?: string | null
  shippingMethod?: string | null
  comment?: string | null
  /** The carrier's own note: what they said when they took the shipment on, or why they turned it down. */
  distributorComment?: string | null
  trackingNumber?: string | null
  requestedDeliveryDate?: string | null
  createdAt: string
  /** When anything on the shipment last changed; missing on a row from before the column existed. */
  updatedAt?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  packageCount: number
  /** The gross weight the carrier carries: every package, contents and packaging. */
  weight: number
  distributorId?: number | null
  distributorName?: string | null
  message?: string | null
  packages: ShipmentPackageRow[]
}

/** `GET /shipments`: the shipments plus the paging figures. */
export interface ShipmentPage {
  content: ShipmentRow[]
  total: number
  page: number
  size: number
}

/** `GET /shipments/distributor`: the carrier's own shipments plus the paging figures. */
export interface DeliveryPage {
  content: DeliveryRow[]
  total: number
  page: number
  size: number
}

export interface ShipmentFilter {
  page?: number
  size?: number
  status?: ShipmentState
  /** What the backend sorts by - see `SHIPMENT_SORT_KEYS`. */
  sort?: string
  order?: 'ASC' | 'DESC'
}

/**
 * What a column head sorts by on the server. A name is its person's last name, which is what the
 * backend can order a page by; the others are the shipment's own columns. The packages column has no key:
 * a count over a collection is not something the list is sorted by.
 */
export const SHIPMENT_SORT_KEYS: Readonly<Record<string, string>> = {
  id: 'id',
  customer: 'customer.lastName',
  distributor: 'distributor.lastName',
  status: 'status',
  requestedDeliveryDate: 'requestedDeliveryDate',
  createdAt: 'createdAt',
  trackingNumber: 'trackingNumber',
}

/** The `sort` and `order` parameters for a table sort; none while the table is not sorted (the backend then goes by id). */
export function sortParams(sort: TableSort | null): Pick<ShipmentFilter, 'sort' | 'order'> {
  if (sort === null) return {}
  const key = SHIPMENT_SORT_KEYS[sort.column]
  if (key === undefined) return {}
  return { sort: key, order: sort.direction === 'asc' ? 'ASC' : 'DESC' }
}

export async function fetchShipments(filter: ShipmentFilter = {}): Promise<ShipmentPage> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const query = params.size ? `?${params}` : ''
  const body = await api<ShipmentPage | ShipmentRow[]>(`/shipments${query}`)
  if (Array.isArray(body)) return { content: body, total: body.length, page: 0, size: body.length }
  return { ...body, content: body.content ?? [] }
}

export const shipmentsQueryOptions = (filter: ShipmentFilter = {}) =>
  queryOptions({
    queryKey: ['shipments', 'list', filter] as const,
    queryFn: () => fetchShipments(filter),
  })

/** `GET /shipments/distributor`: what has been handed to the carrier who is logged in. */
export async function fetchMyShipments(filter: ShipmentFilter = {}): Promise<DeliveryPage> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const query = params.size ? `?${params}` : ''
  const body = await api<DeliveryPage | DeliveryRow[]>(`/shipments/distributor${query}`)
  if (Array.isArray(body)) return { content: body, total: body.length, page: 0, size: body.length }
  return { ...body, content: body.content ?? [] }
}

export const myShipmentsQueryOptions = (filter: ShipmentFilter = {}) =>
  queryOptions({
    queryKey: ['shipments', 'mine', filter] as const,
    queryFn: () => fetchMyShipments(filter),
  })

/** `GET /shipments/{id}`. */
export function fetchShipment(id: string): Promise<ShipmentDetail> {
  return api<ShipmentDetail>(`/shipments/${encodeURIComponent(id)}`)
}

export const shipmentQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['shipments', 'detail', id] as const,
    queryFn: () => fetchShipment(id),
  })

/** The statuses the carrier's own steps start from: they take the shipment on in DISPATCH_REQUESTED only. */
export function canAcceptShipment(status: string): boolean {
  return status === 'DISPATCH_REQUESTED'
}

/**
 * The statuses a shipment can be called off in - up to the carrier's acceptance, as the backend has it.
 * A carrier only ever has shipments from DISPATCH_REQUESTED on, so for them it is those two.
 */
export const CANCELLABLE_STATES: readonly ShipmentState[] = ['CREATED', 'READY', 'DISPATCH_REQUESTED', 'ACCEPTED']

export function canCancelShipment(status: string): boolean {
  return (CANCELLABLE_STATES as readonly string[]).includes(status)
}

/** Reporting a shipment ready is from CREATED only; the backend answers 409 for any other status. */
export function canReportReady(status: string): boolean {
  return status === 'CREATED'
}

/**
 * `PUT /shipments/{id}/ready`: the warehouse side is done with it (CREATED to READY). The backend wants a shipping
 * address, at least one package and every package PACKED (409 otherwise), and takes the order lines and the orders
 * behind them to READY_FOR_DISPATCH. Only then can a distributor be assigned.
 */
export function reportShipmentReady(shipmentId: number | string): Promise<ShipmentDetail> {
  return api<ShipmentDetail>(`/shipments/${encodeURIComponent(String(shipmentId))}/ready`, { method: 'PUT' })
}

/** The carrier reports the shipment on its way from ACCEPTED only - the backend answers 409 for any other status. */
export function canMarkInTransit(status: string): boolean {
  return status === 'ACCEPTED'
}

/**
 * `POST /shipments/{id}/intransit`: the shipment has left (ACCEPTED to IN_TRANSIT). The backend stamps
 * `shippedAt`, takes the packages from PACKED to DISPATCHED and the orders along. No body.
 */
export function shipmentInTransit(shipmentId: number | string): Promise<DeliveryRow> {
  return api<DeliveryRow>(`/shipments/${encodeURIComponent(String(shipmentId))}/intransit`, { method: 'POST' })
}

/** The carrier reports the goods arrived from IN_TRANSIT only - the backend answers 409 for any other status. */
export function canMarkDelivered(status: string): boolean {
  return status === 'IN_TRANSIT'
}

/**
 * `POST /shipments/{id}/delivered`: the goods have arrived (IN_TRANSIT to DELIVERED). The backend stamps
 * `deliveredAt` and takes the orders along. No body.
 */
export function shipmentDelivered(shipmentId: number | string): Promise<DeliveryRow> {
  return api<DeliveryRow>(`/shipments/${encodeURIComponent(String(shipmentId))}/delivered`, { method: 'POST' })
}

/** The longest tracking number the backend takes (`TrackingNumberRequest.MAX_LENGTH`). */
export const TRACKING_NUMBER_MAX_LENGTH = 70

/**
 * What is wrong with a tracking number, or `null`: it must say something, and fit. Checked on the page so a
 * mistake is shown at the field, the way the backend would answer it - with a 400 naming `trackingNumber`.
 */
export function trackingNumberError(value: string): string | null {
  const number = value.trim()
  if (number === '') return 'The tracking number cannot be empty.'
  if (number.length > TRACKING_NUMBER_MAX_LENGTH) {
    return `The tracking number is at most ${TRACKING_NUMBER_MAX_LENGTH} characters.`
  }
  return null
}

/**
 * The statuses a carrier sets or changes the tracking number in: from the handover until the shipment is
 * reported on its way. From IN_TRANSIT on the number is fixed - the field is not offered any more, and the
 * backend answers 409 - and a declined, delivered or cancelled shipment has no business with one either.
 */
export const TRACKING_NUMBER_STATES: readonly ShipmentState[] = ['DISPATCH_REQUESTED', 'ACCEPTED']

export function canSetTrackingNumber(status: string): boolean {
  return (TRACKING_NUMBER_STATES as readonly string[]).includes(status)
}

/**
 * `PATCH /shipments/{id}/trackingnumber`: the carrier's own reference for the shipment, at most 70 characters.
 * Moves no status. The answer is the shipment as the carrier sees it.
 */
export function setTrackingNumber(shipmentId: number | string, trackingNumber: string): Promise<DeliveryRow> {
  return api<DeliveryRow>(`/shipments/${encodeURIComponent(String(shipmentId))}/trackingnumber`, {
    method: 'PATCH',
    body: JSON.stringify({ trackingNumber: trackingNumber.trim() }),
  })
}

/** The statuses a carrier can turn a shipment down in - the same as accepting it: what was offered, before it was taken on. */
export function canDeclineShipment(status: string): boolean {
  return status === 'DISPATCH_REQUESTED'
}

/**
 * `POST /shipments/{id}/accept`: the carrier takes the shipment on (DISPATCH_REQUESTED to ACCEPTED). What they
 * typed goes along as `reason` and is kept in the shipment's `distributorComment`; it is optional, so a blank
 * text is left out and the call is a plain acceptance.
 */
export function acceptShipment(shipmentId: number | string, reason = ''): Promise<DeliveryRow> {
  const note = reason.trim()
  return api<DeliveryRow>(`/shipments/${encodeURIComponent(String(shipmentId))}/accept`, {
    method: 'POST',
    ...(note === '' ? {} : { body: JSON.stringify({ reason: note }) }),
  })
}

/**
 * `POST /shipments/{id}/decline`: the carrier turns the shipment down (DISPATCH_REQUESTED to DECLINED). The reason
 * is required - the backend answers 400 without one - and is kept in the shipment's `distributorComment`.
 * Nothing else happens to the shipment: its packages stay in it.
 */
export function declineShipment(shipmentId: number | string, reason: string): Promise<DeliveryRow> {
  return api<DeliveryRow>(`/shipments/${encodeURIComponent(String(shipmentId))}/decline`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason.trim() }),
  })
}

/**
 * `POST /shipments/{id}/cancel`: calls the shipment off. The reason is required - the backend answers 400
 * without one - and is kept in the shipment's comment. Up to ACCEPTED only, 409 after.
 */
export function cancelShipment(shipmentId: number | string, reason: string): Promise<ShipmentDetail> {
  return api<ShipmentDetail>(`/shipments/${encodeURIComponent(String(shipmentId))}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

/** The statuses in which the shipment's own data can still be changed - up to the carrier's acceptance. */
export const DATA_CHANGEABLE_STATES: readonly ShipmentState[] = ['CREATED', 'READY', 'DISPATCH_REQUESTED', 'ACCEPTED']

export function canEditShipmentData(status: string): boolean {
  return (DATA_CHANGEABLE_STATES as readonly string[]).includes(status)
}

/** `UpdateShipmentRequest`: the shipment's own data. The backend replaces every field, so all four are sent. */
export interface UpdateShipmentRequest {
  shippingAddress: string
  shippingMethod: string | null
  /** `yyyy-MM-dd`, or null for none. */
  requestedDeliveryDate: string | null
  comment: string | null
}

/** `POST /shipments`: what a new shipment is made of. The customer is not sent - the backend reads it off the packages. */
export interface CreateShipmentRequest {
  shipmentPackageIds: number[]
  shippingAddress: string | null
  shippingMethod: string | null
  /** `yyyy-MM-dd`. */
  requestedDeliveryDate: string | null
}

/** `POST /shipments`: puts PACKED packages of one customer into a new shipment (CREATED); the answer is the shipment. */
export function createShipment(request: CreateShipmentRequest): Promise<ShipmentDetail> {
  return api<ShipmentDetail>('/shipments', { method: 'POST', body: JSON.stringify(request) })
}

/**
 * `POST /shipments/{shipmentId}/packages`: puts PACKED containers into a shipment that is still CREATED. The backend
 * refuses (409/400) containers of another customer, ones already in a shipment and a shipment that has moved on;
 * the answer is the shipment as it is now.
 */
export function addPackagesToShipment(shipmentId: number | string, shipmentPackageIds: number[]): Promise<ShipmentDetail> {
  return api<ShipmentDetail>(`/shipments/${encodeURIComponent(String(shipmentId))}/packages`, {
    method: 'POST',
    body: JSON.stringify({ shipmentPackageIds }),
  })
}

/** `PUT /shipments/{id}`: changes address, method, requested delivery date and comment; the answer is the shipment as it is now. */
export function updateShipment(shipmentId: number | string, request: UpdateShipmentRequest): Promise<ShipmentDetail> {
  return api<ShipmentDetail>(`/shipments/${encodeURIComponent(String(shipmentId))}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  })
}

/**
 * The statuses a distributor can be assigned in - the backend answers 409 for any other. DECLINED is one: the
 * carrier turned the shipment down, and the planner hands it to somebody else.
 */
export const ASSIGNABLE_STATES: readonly ShipmentState[] = ['READY', 'DISPATCH_REQUESTED', 'DECLINED']

export function canAssignDistributor(status: string): boolean {
  return (ASSIGNABLE_STATES as readonly string[]).includes(status)
}

/**
 * The statuses in which the carrier has taken the shipment on or has finished with it. The button to hand
 * the shipment to somebody does not appear at all there - it is not a step that is merely not allowed
 * for now, it is behind the shipment.
 */
export const CARRIER_HAS_IT_STATES: readonly ShipmentState[] = ['ACCEPTED', 'IN_TRANSIT', 'DELIVERED']

/**
 * Whether the page offers "Assign distributor" at all: everywhere except once the carrier has the
 * shipment. In CREATED and CANCELLED it is offered but not usable (`canAssignDistributor`), with the
 * reason in its tooltip.
 */
export function showsAssignButton(status: string): boolean {
  return !(CARRIER_HAS_IT_STATES as readonly string[]).includes(status)
}

/**
 * `PUT /shipments/{id}/distributor/{distributorId}`: hands the shipment to a carrier. It moves to
 * DISPATCH_REQUESTED, and the answer is the shipment as it is now.
 */
export function assignDistributor(shipmentId: number | string, distributorId: number | string): Promise<ShipmentDetail> {
  return api<ShipmentDetail>(
    `/shipments/${encodeURIComponent(String(shipmentId))}/distributor/${encodeURIComponent(String(distributorId))}`,
    { method: 'PUT' },
  )
}

/** Who sees every shipment and may open one: the planning side, which is LOGISTICS, and ADMIN. */
export const SHIPMENT_ROLES = ['ADMIN', 'LOGISTICS'] as const

/** Who sees only what was handed to them: the carrier. Everybody else has no business with shipments. */
export const CARRIER_ROLE = 'DISTRIBUTOR'

/** The bootstrap colour a status is shown in: finished is green, called off is red, on its way is blue, the rest grey. */
export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'DELIVERED':
      return 'text-bg-success'
    case 'CANCELLED':
    case 'DECLINED':
      return 'text-bg-danger'
    case 'ACCEPTED':
    case 'IN_TRANSIT':
      return 'text-bg-primary'
    case 'READY':
    case 'DISPATCH_REQUESTED':
      return 'text-bg-info'
    default:
      return 'text-bg-secondary'
  }
}

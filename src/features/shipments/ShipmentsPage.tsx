import { useQuery } from '@tanstack/react-query'
import { Link, Outlet } from '@tanstack/react-router'
import { useState } from 'react'
import { meQueryOptions } from '../auth/auth'
import {
  CARRIER_ROLE,
  myShipmentsQueryOptions,
  SHIPMENT_ROLES,
  SHIPMENT_STATES,
  shipmentsQueryOptions,
  sortParams,
  statusBadgeClass,
  type ShipmentFilter,
  type ShipmentState,
} from './shipments'
import { hasRole } from '../../shared/api/types'
import { formatDate, formatMoment, formatNumber } from '../../shared/lib/format'
import { nextSort, type TableSort } from '../../shared/lib/tableSort'
import { DeliveryDetails } from './DeliveryDetails'
import { Pager } from '../../shared/ui/Pager'
import { SortableHeader } from '../../shared/ui/SortableHeader'
import { PageTitle } from '../../layout/PageTitle'

function ShipmentLink({ id, children }: { id: number; children: React.ReactNode }) {
  return (
    <Link
      to="/shipments/$shipmentId"
      params={{ shipmentId: String(id) }}
      className="text-decoration-none text-reset"
    >
      {children}
    </Link>
  )
}

function PagingFigures({
  total,
  page,
  size,
  onPage,
}: {
  total: number
  page: number
  size: number
  onPage: (page: number) => void
}) {
  return (
    <dl className="row justify-content-end small text-body-secondary px-2 mt-2 mb-2">
      <dd className="col-auto mb-0 me-auto">
        <Pager page={page} size={size} total={total} onPage={onPage} />
      </dd>
      <dt className="col-auto">total</dt>
      <dd className="col-auto">{total}</dd>
      <dt className="col-auto">page</dt>
      <dd className="col-auto">{page}</dd>
      <dt className="col-auto">size</dt>
      <dd className="col-auto">{size}</dd>
    </dl>
  )
}

/** What the two views let you narrow the list by - the status and the paging - and the title above them. */
function FilterBar({
  title,
  status,
  setStatus,
  page,
  setPage,
  size,
  setSize,
}: {
  title: string
  status: ShipmentState | ''
  setStatus: (status: ShipmentState | '') => void
  page: string
  setPage: (page: string) => void
  size: string
  setSize: (size: string) => void
}) {
  return (
    <div className="card-body d-flex flex-wrap gap-2 align-items-center">
      <PageTitle icon="shipments" className="me-auto">
        {title}
      </PageTitle>
      <select
        className="form-select form-select-sm w-auto"
        aria-label="Shipment status"
        value={status}
        onChange={(e) => setStatus(e.target.value as ShipmentState | '')}
      >
        <option value="">All statuses</option>
        {SHIPMENT_STATES.map((state) => (
          <option key={state} value={state}>
            {state}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={0}
        className="form-control form-control-sm"
        style={{ width: '6rem' }}
        placeholder="page"
        aria-label="Page"
        value={page}
        onChange={(e) => setPage(e.target.value)}
      />
      <input
        type="number"
        min={1}
        className="form-control form-control-sm"
        style={{ width: '6rem' }}
        placeholder="size"
        aria-label="Size"
        value={size}
        onChange={(e) => setSize(e.target.value)}
      />
    </div>
  )
}

/** The filter state both views share: status, page and size as typed, the sort as clicked, and the request they make. */
function useShipmentFilter() {
  const [status, setStatus] = useState<ShipmentState | ''>('')
  const [page, setPage] = useState('')
  const [size, setSize] = useState('')
  const [sort, setSort] = useState<TableSort | null>(null)

  const filter: ShipmentFilter = {
    status: status || undefined,
    page: page === '' ? undefined : Number(page),
    size: size === '' ? undefined : Number(size),
    ...sortParams(sort),
  }
  return {
    filter,
    sort,
    onSort: (column: string) => {
      setSort(nextSort(sort, column))
      setPage('')
    },
    onPage: (next: number) => setPage(String(next)),
    bar: { status, setStatus, page, setPage, size, setSize },
  }
}

// ------------------------------------------------------------------ every shipment: ADMIN and LOGISTICS

function ShipmentsTable({
  filter,
  sort,
  onSort,
  onPage,
}: {
  filter: ShipmentFilter
  sort: TableSort | null
  onSort: (column: string) => void
  onPage: (page: number) => void
}) {
  const { data, isPending, error } = useQuery(shipmentsQueryOptions(filter))

  if (isPending) return <p className="p-3 mb-0">Loading shipments…</p>
  if (error) return <p className="p-3 mb-0 text-danger">{error.message}</p>
  if (data.content.length === 0)
    return <p className="p-3 mb-0 text-body-secondary">No shipments.</p>

  return (
    <>
      <div className="table-responsive">
        <table className="table table-striped table-sm mb-0">
          <thead>
            <tr>
              <SortableHeader label="id" column="id" sort={sort} onSort={onSort} />
              <SortableHeader label="customer" column="customer" sort={sort} onSort={onSort} />
              <SortableHeader
                label="distributor"
                column="distributor"
                sort={sort}
                onSort={onSort}
              />
              <SortableHeader label="status" column="status" sort={sort} onSort={onSort} />
              <SortableHeader
                label="requestedDeliveryDate"
                column="requestedDeliveryDate"
                sort={sort}
                onSort={onSort}
              />
              <SortableHeader label="createdAt" column="createdAt" sort={sort} onSort={onSort} />
              <th className="text-end">packages</th>
            </tr>
          </thead>
          <tbody>
            {data.content.map((shipment) => (
              <tr key={shipment.id}>
                <td>
                  <ShipmentLink id={shipment.id}>{shipment.id}</ShipmentLink>
                </td>
                <td>
                  <ShipmentLink id={shipment.id}>{shipment.customerName ?? ''}</ShipmentLink>
                </td>
                <td>
                  <ShipmentLink id={shipment.id}>{shipment.distributorName ?? ''}</ShipmentLink>
                </td>
                <td>
                  <ShipmentLink id={shipment.id}>
                    <span className={`badge ${statusBadgeClass(shipment.status)}`}>
                      {shipment.status}
                    </span>
                  </ShipmentLink>
                </td>
                <td className="text-nowrap">
                  <ShipmentLink id={shipment.id}>
                    {formatDate(shipment.requestedDeliveryDate)}
                  </ShipmentLink>
                </td>
                <td className="text-nowrap">
                  <ShipmentLink id={shipment.id}>{formatMoment(shipment.createdAt)}</ShipmentLink>
                </td>
                <td className="text-end">
                  <ShipmentLink id={shipment.id}>{shipment.packageCount}</ShipmentLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PagingFigures total={data.total} page={data.page} size={data.size} onPage={onPage} />
    </>
  )
}

/** All shipments, as the backend lists them; the details of the chosen one render below. */
function AllShipmentsView() {
  const { filter, sort, onSort, onPage, bar } = useShipmentFilter()

  return (
    <>
      <div className="card shadow-sm">
        <FilterBar title="Shipments" {...bar} />
        <ShipmentsTable filter={filter} sort={sort} onSort={onSort} onPage={onPage} />
      </div>
      <Outlet />
    </>
  )
}

// ------------------------------------------------------------------ the carrier's own shipments: DISTRIBUTOR

function MyShipmentsTable({
  filter,
  sort,
  onSort,
  onPage,
  openId,
  onOpen,
}: {
  filter: ShipmentFilter
  sort: TableSort | null
  onSort: (column: string) => void
  onPage: (page: number) => void
  /** The shipment whose details are open, if any. */
  openId: number | null
  onOpen: (id: number) => void
}) {
  const { data, isPending, error } = useQuery(myShipmentsQueryOptions(filter))

  if (isPending) return <p className="p-3 mb-0">Loading your shipments…</p>
  if (error) return <p className="p-3 mb-0 text-danger">{error.message}</p>
  if (data.content.length === 0)
    return <p className="p-3 mb-0 text-body-secondary">No shipments have been handed to you.</p>

  return (
    <>
      <div className="table-responsive">
        <table className="table table-striped table-sm mb-0">
          <thead>
            <tr>
              <SortableHeader label="id" column="id" sort={sort} onSort={onSort} />
              <SortableHeader label="customer" column="customer" sort={sort} onSort={onSort} />
              <th>shippingAddress</th>
              <SortableHeader label="status" column="status" sort={sort} onSort={onSort} />
              <SortableHeader
                label="requestedDeliveryDate"
                column="requestedDeliveryDate"
                sort={sort}
                onSort={onSort}
              />
              <SortableHeader
                label="trackingNumber"
                column="trackingNumber"
                sort={sort}
                onSort={onSort}
              />
              <th className="text-end">packages</th>
              <th className="text-end">weight (kg)</th>
            </tr>
          </thead>
          <tbody>
            {data.content.map((shipment) => (
              <tr
                key={shipment.shipmentId}
                className={shipment.shipmentId === openId ? 'table-active' : undefined}
                style={{ cursor: 'pointer' }}
                onClick={() => onOpen(shipment.shipmentId)}
              >
                <td>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none"
                    aria-expanded={shipment.shipmentId === openId}
                    title={`Details of shipment ${shipment.shipmentId}`}
                  >
                    {shipment.shipmentId}
                  </button>
                </td>
                <td>{shipment.customerName ?? ''}</td>
                <td>{shipment.shippingAddress ?? ''}</td>
                <td>
                  <span className={`badge ${statusBadgeClass(shipment.status)}`}>
                    {shipment.status}
                  </span>
                </td>
                <td className="text-nowrap">{formatDate(shipment.requestedDeliveryDate)}</td>
                <td>{shipment.trackingNumber ?? ''}</td>
                <td className="text-end">{shipment.packageCount}</td>
                <td className="text-end">{formatNumber(shipment.weight)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PagingFigures total={data.total} page={data.page} size={data.size} onPage={onPage} />
    </>
  )
}

/**
 * What a carrier sees: only the shipments handed to them (`GET /shipments/distributor`), not every
 * shipment of the house. A click on a row opens its details below, from the row itself: the
 * single-shipment endpoint is the planning side's, and its packages carry the customer's SKUs and
 * quantities, so the carrier's list says what they need to read the shipment and nothing more.
 */
function MyShipmentsView() {
  const { filter, sort, onSort, onPage, bar } = useShipmentFilter()
  const [openId, setOpenId] = useState<number | null>(null)
  // The same query as the table's, so one request: the open shipment is read off the current page and
  // follows it when a step changes the shipment's status.
  const { data } = useQuery(myShipmentsQueryOptions(filter))
  const open = data?.content.find((row) => row.shipmentId === openId)

  return (
    <>
      <div className="card shadow-sm">
        <FilterBar title="My shipments" {...bar} />
        <MyShipmentsTable
          filter={filter}
          sort={sort}
          onSort={onSort}
          onPage={onPage}
          openId={openId}
          onOpen={(id) => setOpenId((current) => (current === id ? null : id))}
        />
      </div>
      {open && <DeliveryDetails key={open.shipmentId} row={open} onClose={() => setOpenId(null)} />}
    </>
  )
}

// ------------------------------------------------------------------ the page

/**
 * Shipments. The planning side (LOGISTICS) and admins see every shipment and can open one; a
 * distributor sees only their own, as a plain list. Anybody else has no business here.
 */
export function ShipmentsPage() {
  const { data: user } = useQuery(meQueryOptions)

  if (!user) return null
  if (SHIPMENT_ROLES.some((role) => hasRole(user, role))) return <AllShipmentsView />
  if (hasRole(user, CARRIER_ROLE)) return <MyShipmentsView />
  return (
    <p className="text-danger">Only logistics, distributors and admins may see the shipments.</p>
  )
}

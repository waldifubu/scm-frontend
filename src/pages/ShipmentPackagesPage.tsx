import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Outlet } from '@tanstack/react-router'
import {
  DEFAULT_SHIPMENT_PACKAGE_STATUS,
  SHIPMENT_PACKAGE_STATUSES,
  shipmentPackagesQueryOptions,
  type ShipmentPackageFilter,
  type ShipmentPackageStatus,
} from '../api/shipmentPackages'
import { PageTitle } from './PageTitle'
import { Pager } from './Pager'

function cell(value: unknown): string {
  if (value === null || value === undefined) return ''
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

const DATE_COLUMNS = new Set(['updatedAt', 'createdAt', 'dispatchedAt', 'packedAt', 'dueDate'])
const HIDDEN_COLUMNS = new Set(['items', 'weight', 'packageWeight', 'length', 'width', 'height'])

function renderCell(column: string, value: unknown) {
  if (DATE_COLUMNS.has(column) && typeof value === 'string') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      // A plain date (no time part) is shown without a time.
      const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
      return (
        <small className="text-body-secondary text-nowrap">
          {date.toLocaleString('de-DE', dateOnly ? { dateStyle: 'medium' } : { dateStyle: 'medium', timeStyle: 'short' })}
        </small>
      )
    }
  }
  return cell(value)
}

/** All containers (the backend calls them shipment packages), as it lists them. */
export function ShipmentPackagesPage() {
  // The backend lists one status at a time, OPEN when none is named - so the page names the one it shows.
  const [status, setStatus] = useState<ShipmentPackageStatus>(DEFAULT_SHIPMENT_PACKAGE_STATUS)
  const [packageNumber, setPackageNumber] = useState('')
  const [page, setPage] = useState('')
  const [size, setSize] = useState('')
  const [sort, setSort] = useState<'id'>('id')
  const [order, setOrder] = useState<'ASC' | 'DESC' | ''>('')

  const filter: ShipmentPackageFilter = {
    status,
    packageNumber: packageNumber.trim() || undefined,
    page: page === '' ? undefined : Number(page),
    size: size === '' ? undefined : Number(size),
    sort,
    order: order || undefined,
  }
  const { data, isPending, error } = useQuery(shipmentPackagesQueryOptions(filter))
  const items = data?.content ?? []
  const columns = [...new Set(items.flatMap((item) => Object.keys(item)))].filter((c) => !HIDDEN_COLUMNS.has(c))

  return (
    <>
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <PageTitle icon="shipment-packages" className="me-auto">Containers</PageTitle>
          <select
            className="form-select form-select-sm w-auto"
            aria-label="Container status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ShipmentPackageStatus)
              // Page 3 of one status says nothing about another.
              setPage('')
            }}
          >
            {SHIPMENT_PACKAGE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            className="form-control form-control-sm w-auto"
            placeholder="packageNumber"
            aria-label="Package number"
            value={packageNumber}
            onChange={(e) => setPackageNumber(e.target.value)}
          />
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
          <select
            className="form-select form-select-sm w-auto"
            aria-label="Sort field"
            value={sort}
            onChange={(e) => setSort(e.target.value as 'id')}
          >
            <option value="id">id</option>
          </select>
          <select
            className="form-select form-select-sm w-auto"
            aria-label="Order"
            value={order}
            onChange={(e) => setOrder(e.target.value as 'ASC' | 'DESC' | '')}
          >
            <option value="">Order</option>
            <option value="ASC">ASC</option>
            <option value="DESC">DESC</option>
          </select>
        </div>
      </div>

      {isPending && <p className="p-3 mb-0">Loading containers…</p>}
      {error && <p className="p-3 mb-0 text-danger">{error.message}</p>}
      {data && items.length === 0 && <p className="p-3 mb-0 text-body-secondary">No containers.</p>}
      {data && items.length > 0 && (
        <>
          <div className="table-responsive">
            <table className="table table-striped table-sm mb-0">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={cell(item.id) || index}>
                    {columns.map((column) => (
                      <td key={column}>
                        <Link
                          to="/shipment-packages/$shipmentPackageId"
                          params={{ shipmentPackageId: cell(item.id) }}
                          className="text-decoration-none text-reset"
                        >
                          {renderCell(column, item[column])}
                        </Link>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="row justify-content-end small text-body-secondary px-2 mt-2 mb-2">
            <dd className="col-auto mb-0 me-auto">
              <Pager page={data.page} size={data.size} total={data.total} onPage={(next) => setPage(String(next))} />
            </dd>
            <dt className="col-auto">total</dt>
            <dd className="col-auto">{data.total}</dd>
            <dt className="col-auto">page</dt>
            <dd className="col-auto">{data.page}</dd>
            <dt className="col-auto">size</dt>
            <dd className="col-auto">{data.size}</dd>
          </dl>
        </>
      )}
    </div>
    <Outlet />
    </>
  )
}

import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Fragment, useState } from 'react'
import { meQueryOptions } from '../auth/auth'
import { OrderStatusBadge } from './OrderStatusBadge'
import {
  HISTORY_STATUSES,
  NO_FILTER,
  historyQueryOptions,
  mayReadOrderHistory,
  orderNoOf,
  orderTimelineQueryOptions,
  type HistoryEntry,
  type HistoryFilter,
} from './orderHistory'
import type { OrderStatus } from './orders'
import { PageTitle } from '../../layout/PageTitle'
import { Pager } from '../../shared/ui/Pager'
import { SortableHeader } from '../../shared/ui/SortableHeader'
import { formatMoment } from '../../shared/lib/format'
import { nextSort, type TableSort } from '../../shared/lib/tableSort'

/** `from → to`; the creation of an order comes from nowhere, which the table says as a dash. */
function Transition({ from, to }: { from: string | null; to: string }) {
  return (
    <span className="d-inline-flex align-items-center gap-1">
      {from ? <OrderStatusBadge status={from} /> : <span className="text-body-secondary">–</span>}
      <span aria-hidden="true">→</span>
      <OrderStatusBadge status={to} />
    </span>
  )
}

/** Who did it; an automatic step (a sweep, a recompute) has nobody to name. */
function Actor({ entry }: { entry: HistoryEntry }) {
  return entry.changedByName ? (
    <>{entry.changedByName}</>
  ) : (
    <span className="text-body-secondary">automatic</span>
  )
}

/** The whole timeline of the order of the selected step, the selected step marked. */
function Timeline({ orderNo, selectedId }: { orderNo: number; selectedId: number }) {
  const { data, isPending, error } = useQuery(orderTimelineQueryOptions(orderNo))
  if (isPending) return <p className="mb-0">Loading the timeline…</p>
  if (error) return <p className="mb-0 text-danger">{error.message}</p>
  return (
    <ol className="list-group list-group-flush">
      {data.map((step) => (
        <li
          key={step.id}
          className={`list-group-item d-flex flex-wrap align-items-center gap-3 px-0${
            step.id === selectedId ? ' fw-semibold' : ''
          }`}
          aria-current={step.id === selectedId ? 'true' : undefined}
        >
          <span className="text-body-secondary small" style={{ minWidth: '9.5rem' }}>
            {formatMoment(step.changedAt)}
          </span>
          <Transition from={step.previousStatus} to={step.newStatus} />
          <span className="small text-body-secondary">{step.changedByName ?? 'automatic'}</span>
        </li>
      ))}
    </ol>
  )
}

/** The details of one step: what changed, when and by whom, whose order it is - and the order's whole timeline. */
function EntryDetails({
  entry,
  onlyThisOrder,
}: {
  entry: HistoryEntry
  onlyThisOrder: () => void
}) {
  return (
    <div className="card shadow-sm mt-4">
      <div className="card-body">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <h3 className="h5 mb-0 me-auto">
            Step {entry.id} of order {entry.orderNo}
          </h3>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={onlyThisOrder}
          >
            Show only this order
          </button>
          <Link
            to="/orders/$orderNumber"
            params={{ orderNumber: String(entry.orderNo) }}
            className="btn btn-sm btn-outline-primary"
          >
            Open order
          </Link>
        </div>
        <dl className="row mb-4">
          <dt className="col-sm-3">Change</dt>
          <dd className="col-sm-9">
            <Transition from={entry.previousStatus} to={entry.newStatus} />
          </dd>
          <dt className="col-sm-3">When</dt>
          <dd className="col-sm-9">{formatMoment(entry.changedAt)}</dd>
          <dt className="col-sm-3">Changed by</dt>
          <dd className="col-sm-9">
            <Actor entry={entry} />
            {entry.changedById !== null && (
              <span className="text-body-secondary"> (user {entry.changedById})</span>
            )}
          </dd>
          <dt className="col-sm-3">Customer</dt>
          <dd className="col-sm-9">
            {entry.customerName ?? <span className="text-body-secondary">unknown</span>}
            {entry.customerId !== null && (
              <span className="text-body-secondary"> (user {entry.customerId})</span>
            )}
          </dd>
          <dt className="col-sm-3">Order</dt>
          <dd className="col-sm-9">{entry.orderNo}</dd>
        </dl>
        <h4 className="h6">Everything that happened to this order</h4>
        <Timeline orderNo={entry.orderNo} selectedId={entry.id} />
      </div>
    </div>
  )
}

/**
 * The latest status change of every order (`GET /orders/history`) - where each order stands and how it got there. It can be
 * narrowed to one order and to the status an order went to; a click on a row opens that step below, with the whole
 * timeline of its order.
 */
export function OrderHistoryPage() {
  const { data: me } = useQuery(meQueryOptions)
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<TableSort | null>(null)
  const [filter, setFilter] = useState<HistoryFilter>(NO_FILTER)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const allowed = mayReadOrderHistory(me ?? undefined)
  const { data, isPending, error } = useQuery({
    ...historyQueryOptions(page, filter, sort),
    enabled: allowed,
  })
  const change = (next: Partial<HistoryFilter>) => {
    setFilter((current) => ({ ...current, ...next }))
    // Page 3 of one filter says nothing about another.
    setPage(0)
  }
  const onSort = (column: string) => {
    setSort((current) => nextSort(current, column))
    setPage(0)
  }
  if (!me) return null
  if (!allowed) return <p className="text-danger">You may not read the order history.</p>

  const selected = data?.content.find((entry) => entry.id === selectedId)
  // With one order named the table lists all of its steps; only then a heading per order reads right (and only while sorted by order).
  const grouped = orderNoOf(filter.orderNo) !== null && (sort === null || sort.column === 'order')
  const badOrderNo = filter.orderNo.trim() !== '' && orderNoOf(filter.orderNo) === null

  return (
    <>
      <div className="card shadow-sm">
        <div className="card-body d-flex flex-wrap gap-2 align-items-center">
          <PageTitle icon="order-history" className="me-auto">
            Order History
          </PageTitle>
          <input
            type="text"
            inputMode="numeric"
            className={`form-control form-control-sm w-auto${badOrderNo ? ' is-invalid' : ''}`}
            style={{ maxWidth: '9rem' }}
            placeholder="Order no."
            aria-label="Order number"
            value={filter.orderNo}
            onChange={(event) => change({ orderNo: event.target.value })}
          />
          <select
            className="form-select form-select-sm w-auto"
            aria-label="Went to status"
            value={filter.status}
            onChange={(event) => change({ status: event.target.value as OrderStatus | '' })}
          >
            <option value="">any new status</option>
            {HISTORY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
          {(filter.orderNo !== '' || filter.status !== '') && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => change(NO_FILTER)}
            >
              Clear
            </button>
          )}
        </div>
        {isPending && <p className="p-3 mb-0">Loading the history…</p>}
        {error && <p className="p-3 mb-0 text-danger">{error.message}</p>}
        {data && data.content.length === 0 && (
          <p className="p-3 mb-0 text-body-secondary">No status changes.</p>
        )}
        {data && data.content.length > 0 && (
          <>
            <div className="table-responsive">
              <table className="table table-striped table-sm mb-0">
                <thead>
                  <tr>
                    <SortableHeader label="id" column="id" sort={sort} onSort={onSort} />
                    <SortableHeader label="order" column="order" sort={sort} onSort={onSort} />
                    <th>customer</th>
                    <SortableHeader label="from" column="from" sort={sort} onSort={onSort} />
                    <SortableHeader label="to" column="to" sort={sort} onSort={onSort} />
                    <SortableHeader
                      label="changedAt"
                      column="changedAt"
                      sort={sort}
                      onSort={onSort}
                    />
                    <SortableHeader
                      label="changedBy"
                      column="changedBy"
                      sort={sort}
                      onSort={onSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((entry, index) => (
                    <Fragment key={entry.id}>
                      {grouped && data.content[index - 1]?.orderNo !== entry.orderNo && (
                        <tr className="table-secondary">
                          <th colSpan={7} className="small">
                            Order {entry.orderNo}
                            {entry.customerName ? ` · ${entry.customerName}` : ''}
                            <span className="fw-normal text-body-secondary">
                              {' '}
                              · {
                                data.content.filter((e) => e.orderNo === entry.orderNo).length
                              }{' '}
                              step(s) on this page
                            </span>
                          </th>
                        </tr>
                      )}
                      <tr
                        key={entry.id}
                        className={entry.id === selectedId ? 'table-active' : undefined}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedId(entry.id)}
                      >
                        <td>{entry.id}</td>
                        <td>{entry.orderNo}</td>
                        <td>{entry.customerName}</td>
                        <td>
                          {entry.previousStatus ? (
                            <OrderStatusBadge status={entry.previousStatus} />
                          ) : (
                            <span className="text-body-secondary">–</span>
                          )}
                        </td>
                        <td>
                          <OrderStatusBadge status={entry.newStatus} />
                        </td>
                        <td>{formatMoment(entry.changedAt)}</td>
                        <td>
                          <Actor entry={entry} />
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="row justify-content-end small text-body-secondary px-2 mt-2 mb-2">
              <dd className="col-auto mb-0 me-auto">
                <Pager page={data.page} size={data.size} total={data.total} onPage={setPage} />
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
      {selected && (
        <EntryDetails
          entry={selected}
          onlyThisOrder={() => change({ orderNo: String(selected.orderNo) })}
        />
      )}
    </>
  )
}

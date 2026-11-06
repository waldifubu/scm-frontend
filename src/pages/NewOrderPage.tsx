import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, Outlet } from '@tanstack/react-router'
import { checkOrder, newOrderQueryOptions, reserveOrder } from '../api/orders'
import { PageTitle } from './PageTitle'
import { Pager } from './Pager'

function cell(value: unknown): string {
  if (value === null || value === undefined) return ''
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

const MESSAGE_SECONDS = 5

function NewOrdersTable({ page, onPage }: { page: number; onPage: (page: number) => void }) {
  const { data, isPending, error } = useQuery(newOrderQueryOptions(page))
  const [notice, setNotice] = useState<{ text: string; failed: boolean } | null>(null)

  const action = (mutationFn: (orderNo: string) => Promise<string>) => ({
    mutationFn,
    onSuccess: (message: string) => setNotice({ text: message, failed: false }),
    onError: (failure: Error) => setNotice({ text: failure.message, failed: true }),
  })
  const check = useMutation(action(checkOrder))
  const reserve = useMutation(action(reserveOrder))

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), MESSAGE_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [notice])

  if (isPending) return <p className="p-3 mb-0">Loading…</p>
  if (error) return <p className="p-3 mb-0 text-danger">{error.message}</p>
  const orders = data.content
  if (orders.length === 0) return <p className="p-3 mb-0 text-body-secondary">No orders.</p>

  const columns = [...new Set(orders.flatMap((order) => Object.keys(order)))]

  return (
    <>
      <div className="table-responsive">
        <table className="table table-striped table-sm mb-0">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => (
              <tr key={cell(order.id) || index}>
                {columns.map((column) => (
                  <td key={column}>
                    <Link
                      to="/orders/new/$orderNumber"
                      params={{ orderNumber: cell(order.orderNo) }}
                      className="text-decoration-none text-reset"
                    >
                      {cell(order[column])}
                    </Link>
                  </td>
                ))}
                <td className="text-end">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success py-0"
                    title="Check"
                    aria-label={`Check order ${cell(order.orderNo)}`}
                    disabled={check.isPending || reserve.isPending}
                    onClick={() => check.mutate(cell(order.orderNo))}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary py-0 ms-1"
                    title="Reserve"
                    aria-label={`Reserve order ${cell(order.orderNo)}`}
                    disabled={check.isPending || reserve.isPending}
                    onClick={() => reserve.mutate(cell(order.orderNo))}
                  >
                    ⛁
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="row justify-content-end small text-body-secondary px-2 mt-2 mb-2">
        <dd className="col-auto mb-0 me-auto">
          <Pager page={data.page} size={data.size} total={data.total} onPage={onPage} />
        </dd>
        <dt className="col-auto">total</dt>
        <dd className="col-auto">{data.total}</dd>
        <dt className="col-auto">page</dt>
        <dd className="col-auto">{data.page}</dd>
        <dt className="col-auto">size</dt>
        <dd className="col-auto">{data.size}</dd>
      </dl>
      {notice && (
        <p className={`px-3 pb-2 mb-0 text-md-start ${notice.failed ? 'text-danger' : 'text-success'}`} role="status">
          {notice.text}
        </p>
      )}
    </>
  )
}

/** The new orders of a manager; the details of the chosen one render below. */
export function NewOrderPage() {
  const [page, setPage] = useState(0)
  return (
    <>
      <div className="card shadow-sm">
        <div className="card-body">
          <PageTitle icon="new-orders">New orders</PageTitle>
        </div>
        <NewOrdersTable page={page} onPage={setPage} />
      </div>
      <Outlet />
    </>
  )
}

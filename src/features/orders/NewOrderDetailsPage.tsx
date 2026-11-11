import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { orderQueryOptions, type OrderDto } from './orders'
import { OrderLinesTable } from './OrderLinesTable'
import { cell } from '../../shared/lib/format'
import { OrderStatusBadge } from './OrderStatusBadge'

// Mermaid is large: the workflow diagram is fetched when the first order is opened, not with the page.
const OrderWorkflow = lazy(() =>
  import('./OrderWorkflow').then((module) => ({ default: module.OrderWorkflow })),
)

const route = getRouteApi('/authed/orders/new/$orderNumber')

function isRowList(value: unknown): value is OrderDto[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((row) => typeof row === 'object' && row !== null)
  )
}

/**
 * The details of a new order, shown below the new-orders table. Its answer carries lists (`items`,
 * and whatever else arrives as an array of objects); each of them is listed in a table of its own,
 * everything else as a field.
 */
export function NewOrderDetailsPage() {
  const { orderNumber } = route.useParams()
  const { data: order, isPending, error } = useQuery(orderQueryOptions(orderNumber))

  const entries = order ? Object.entries(order) : []
  const lists = entries.filter(([, value]) => Array.isArray(value))
  const fields = entries.filter(([, value]) => !Array.isArray(value))

  return (
    <>
      {order && (
        <Suspense fallback={null}>
          <OrderWorkflow status={order.status} />
        </Suspense>
      )}
      <div className="card shadow-sm mt-4">
        <div className="card-body">
          <h3 className="h5">Order {orderNumber}</h3>
          {isPending && <p className="mb-0">Loading details…</p>}
          {error && <p className="mb-0 text-danger">{error.message}</p>}
          {order && (
            <>
              <dl className="row mb-0">
                {fields.map(([key, value]) => (
                  <div key={key} className="row">
                    <dt className="col-sm-3">{key}</dt>
                    <dd className="col-sm-9">
                      {key === 'status' ? <OrderStatusBadge status={value} /> : cell(value)}
                    </dd>
                  </div>
                ))}
              </dl>
              {lists.map(([key, value]) => (
                <section key={key}>
                  <h4 className="h6 mt-4">{key}</h4>
                  {isRowList(value) ? (
                    <OrderLinesTable rows={value} />
                  ) : (
                    <p className="text-body-secondary mb-0">
                      {Array.isArray(value) && value.length === 0 ? 'None.' : cell(value)}
                    </p>
                  )}
                </section>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  )
}

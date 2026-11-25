import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { meQueryOptions } from '../auth/auth'
import { orderQueryOptions, type OrderDto } from './orders'
import { mayCompleteOrder } from './completeOrder'
import { orderWorkflowQueryOptions } from './workflow'
import { showsShipments } from './shipmentsOfOrder'
import { CompleteOrderButton } from './CompleteOrderButton'
import { OrderDecisions } from './OrderDecisionButtons'
import { decisionsFor } from './orderDecisions'
import { OrderLinesTable } from './OrderLinesTable'
import { OrderShipments } from './OrderShipments'
import { OrderStatusBadge } from './OrderStatusBadge'
import { cell } from '../../shared/lib/format'
import { LoadingBar } from '../../shared/ui/LoadingBar'

// Mermaid is large: the workflow diagram is fetched when the first order is opened, not with the page.
const OrderWorkflow = lazy(() =>
  import('./OrderWorkflow').then((module) => ({ default: module.OrderWorkflow })),
)

const route = getRouteApi('/authed/orders/$orderNumber')

/** The details of one order, shown below the orders table. */
export function OrderDetailsPage() {
  const { orderNumber } = route.useParams()
  const { data: order, isPending, error } = useQuery(orderQueryOptions(orderNumber))
  const { data: user } = useQuery(meQueryOptions)
  const { data: workflow } = useQuery(orderWorkflowQueryOptions())

  return (
    <>
      {order && (
        <Suspense fallback={null}>
          <OrderWorkflow status={order.status} />
        </Suspense>
      )}
      <div className="card shadow-sm mt-4">
        <div className="card-body">
          <h3 className="h5 d-flex align-items-center gap-2">
            Order {orderNumber}
            {order && <OrderStatusBadge status={order.status} />}
          </h3>
          {isPending && <LoadingBar label="Loading details…" className="" />}
          {error && <p className="mb-0 text-danger">{error.message}</p>}
          {order && <OrderFields order={order} orderNumber={orderNumber} />}
        </div>
      </div>
      {order && (
        <OrderDecisions
          orderNumber={orderNumber}
          decisions={decisionsFor(user, order.status, workflow)}
        />
      )}
      {order && mayCompleteOrder(user, order.status, workflow) && (
        <CompleteOrderButton orderNumber={orderNumber} />
      )}
    </>
  )
}

function OrderFields({ order, orderNumber }: { order: OrderDto; orderNumber: string }) {
  // The status is the badge beside the heading, not a field of this list.
  const { items, status, ...fields } = order
  const rows = Array.isArray(items) ? (items as OrderDto[]) : []

  return (
    <>
      <dl className="row mb-0">
        {Object.entries(fields).map(([key, value]) => (
          <div key={key} className="row">
            <dt className="col-sm-3">{key}</dt>
            <dd className="col-sm-9">{cell(value)}</dd>
          </div>
        ))}
      </dl>
      <h4 className="h6 mt-4">Items</h4>
      {rows.length === 0 ? (
        <p className="text-body-secondary mb-0">No items.</p>
      ) : (
        <OrderLinesTable rows={rows} />
      )}
      {showsShipments(status) && <OrderShipments orderNumber={orderNumber} />}
    </>
  )
}

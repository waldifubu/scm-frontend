import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  ALL_STATUSES,
  ORDER_ITEM_STATUSES,
  orderItemsQueryOptions,
  type OrderItemFilter,
  type OrderItemStatus,
} from './orderItems'
import { OrderItemsTable } from './OrderItemsTable'
import { PageTitle } from '../../layout/PageTitle'

/** All order items, as the backend lists them. */
export function OrderItemsPage() {
  const [status, setStatus] = useState<OrderItemStatus | ''>('')
  const [page, setPage] = useState('')
  const [size, setSize] = useState('')
  const [order, setOrder] = useState<'ASC' | 'DESC' | ''>('')
  const filter: OrderItemFilter = {
    // "All statuses" has to say so: sent without a status, the backend lists the PICKED lines only.
    status: status || ALL_STATUSES,
    page: page === '' ? undefined : Number(page),
    size: size === '' ? undefined : Number(size),
    order: order || undefined,
  }
  const { data, isPending, error } = useQuery(orderItemsQueryOptions(filter))
  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <PageTitle icon="items">Order items</PageTitle>
          <select
            className="form-select form-select-sm w-auto ms-auto"
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderItemStatus | '')}
          >
            <option value="">All statuses</option>
            {ORDER_ITEM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            className="form-control form-control-sm w-auto"
            style={{ width: '6rem' }}
            placeholder="page"
            aria-label="Page"
            value={page}
            onChange={(e) => setPage(e.target.value)}
          />
          <input
            type="number"
            min={1}
            className="form-control form-control-sm w-auto"
            style={{ width: '6rem' }}
            placeholder="size"
            aria-label="Size"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          />
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
      <OrderItemsTable
        data={data}
        isPending={isPending}
        error={error}
        itemType="order items"
        onPage={(next) => setPage(String(next))}
      />
    </div>
  )
}

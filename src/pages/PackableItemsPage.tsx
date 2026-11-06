import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { createPackage, packableItemsQueryOptions, type PackableItemFilter, type PackingLine } from '../api/orderItems'
import { ordersQueryOptions } from '../api/orders'
import { OrderItemsTable } from './OrderItemsTable'
import { PageTitle } from './PageTitle'

/** The order number of an order or of an item, whether it sits on the item itself or on a nested `order`. */
function orderNoOf(row: Record<string, unknown>): string | undefined {
  const nested = row.order
  const value =
    row.orderNo ??
    row.orderNumber ??
    (nested && typeof nested === 'object' ? (nested as Record<string, unknown>).orderNo : undefined)
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined
}

export function PackableItemsPage() {
  const [orderNo, setOrderNo] = useState('')
  const [page, setPage] = useState('')
  const [sort, setSort] = useState<PackableItemFilter['sort']>('id')
  const [order, setOrder] = useState<PackableItemFilter['order'] | ''>('')

  const { data: orders } = useQuery(ordersQueryOptions())
  const { data: allPackable } = useQuery(packableItemsQueryOptions({ sort: 'id' }))
  const orderNumbers = [...new Set(
    [...(orders?.content ?? []), ...(allPackable?.content ?? [])]
      .map(orderNoOf)
      .filter((number): number is string => number !== undefined),
  )].sort()

  const filter: PackableItemFilter = {
    orderNo: orderNo.trim() || undefined,
    page: page === '' ? undefined : Number(page),
    sort,
    order: order || undefined,
  }
  const { data, isPending, error } = useQuery(packableItemsQueryOptions(filter))

  const queryClient = useQueryClient()

  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [packageNotice, setPackageNotice] = useState<{ text: string; failed: boolean } | null>(null)
  const lines: PackingLine[] = Object.entries(quantities)
    .map(([id, qty]) => ({ orderItemId: Number(id), qty: Number(qty) }))
    .filter((line) => line.qty > 0)
  const create = useMutation({
    mutationFn: createPackage,
    onSuccess: async (message) => {
      setPackageNotice({ text: message, failed: false })
      setQuantities({})
      await queryClient.invalidateQueries({ queryKey: ['packable-items'] })
      await queryClient.invalidateQueries({ queryKey: ['packages'] })
    },
    onError: (failure: Error) => setPackageNotice({ text: failure.message, failed: true }),
  })

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <PageTitle icon="packable-items" className="me-auto">Packable Items</PageTitle>
          <input
            className="form-control form-control-sm w-auto"
            aria-label="Order number"
            placeholder="Order number"
            list="packable-order-numbers"
            value={orderNo}
            onChange={(event) => setOrderNo(event.target.value)}
          />
          <datalist id="packable-order-numbers">
            {orderNumbers.map((number) => (
              <option key={number} value={number} />
            ))}
          </datalist>
          <input
            type="number"
            min={0}
            className="form-control form-control-sm w-auto"
            style={{ width: '6rem' }}
            placeholder="page"
            aria-label="Page"
            value={page}
            onChange={(event) => setPage(event.target.value)}
          />
          <select
            className="form-select form-select-sm w-auto"
            aria-label="Sort field"
            value={sort}
            onChange={(event) => setSort(event.target.value as PackableItemFilter['sort'])}
          >
            <option value="id">id</option>
            <option value="quantity">quantity</option>
            <option value="updatedAt">updatedAt</option>
          </select>
          <select
            className="form-select form-select-sm w-auto"
            aria-label="Sort direction"
            value={order}
            onChange={(event) => setOrder(event.target.value as PackableItemFilter['order'] | '')}
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
        itemType="packable Items"
        onPage={(next) => setPage(String(next))}
        extraColumn={{
          header: 'pack qty',
          render: (item) => {
            const rawId = item.orderItemId ?? item.id
            if (rawId === undefined || rawId === null) return null
            const id = String(rawId)
            const remaining = Number(item.remaining)
            return (
              <input
                type="number"
                min={0}
                max={Number.isFinite(remaining) ? remaining : undefined}
                className="form-control form-control-sm"
                style={{ width: '4.5rem' }}
                title="Only packages with same order number are valid"
                aria-label={`Quantity to pack for item ${id}`}
                value={quantities[id] ?? ''}
                onChange={(event) => setQuantities({ ...quantities, [id]: event.target.value })}
              />
            )
          },
        }}
      />
      <div className="card-body d-flex flex-wrap gap-3 align-items-center">
        <button
          type="button"
          className="btn btn-success"
          disabled={lines.length === 0 || create.isPending}
          onClick={() => create.mutate(lines)}
        >
          create package
        </button>
        <span
          className={packageNotice ? (packageNotice.failed ? 'text-danger' : 'text-success') : undefined}
          style={{ minHeight: '1.5rem' }}
          role="status"
        >
          {packageNotice?.text}
        </span>
      </div>
    </div>
  )
}

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  createPackage,
  mayPack,
  packableItemsQueryOptions,
  packWholeOrder,
  wholeOrderHint,
  wholeOrderLines,
  type PackableItemFilter,
  type PackingLine,
} from './orderItems'
import { ordersQueryOptions } from '../orders/orders'
import { meQueryOptions } from '../auth/auth'
import { PackableItemsTable } from './PackableItemsTable'
import { PACKABLE_SORT_KEYS } from './packableColumns'
import { listSort, useServerTableState } from '../../shared/lib/serverTable'
import { PageTitle } from '../../layout/PageTitle'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'

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
  // The list starts by the item id, as it did before the heads could be clicked.
  const { pagination, sorting, setPagination, setSorting, firstPage } = useServerTableState([
    { id: 'orderItemId', desc: false },
  ])
  const sorted = listSort(sorting, PACKABLE_SORT_KEYS)

  const { data: orders } = useQuery(ordersQueryOptions())
  const { data: user } = useQuery(meQueryOptions)
  const packs = mayPack(user)
  const { data: allPackable } = useQuery(packableItemsQueryOptions({ sort: 'id' }))
  const orderNumbers = [
    ...new Set(
      [...(orders?.content ?? []), ...(allPackable?.content ?? [])]
        .map(orderNoOf)
        .filter((number): number is string => number !== undefined),
    ),
  ].sort()

  const filter: PackableItemFilter = {
    orderNo: orderNo.trim() || undefined,
    page: pagination.pageIndex,
    size: pagination.pageSize,
    sort: sorted && PACKABLE_SORT_KEYS[sorting[0]!.id],
    order: sorted?.order,
  }
  const { data, isPending, isFetching, error, isPlaceholderData } = useQuery({
    ...packableItemsQueryOptions(filter),
    // The old page stays while the next one loads, so a click on a head does not empty the table.
    placeholderData: keepPreviousData,
  })

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

  // The whole order is the lines the list shows for its number - only trustworthy when they are all on this page.
  const [askingWhole, setAskingWhole] = useState(false)
  const wholeNo = /^\d+$/.test(orderNo.trim()) ? Number(orderNo.trim()) : null
  // While the next list loads the rows shown are the previous one's - they are not this order's lines.
  const loaded = isPlaceholderData ? undefined : data
  const wholeLines = wholeNo === null || !loaded ? [] : wholeOrderLines(loaded.content)
  const wholeProblem =
    wholeNo === null
      ? 'Enter an order number to pack that whole order.'
      : !loaded
        ? 'Loading the lines of the order…'
        : loaded.total > loaded.content.length
          ? 'The order has more packable lines than one page shows - raise the rows per page or pack by quantity.'
          : wholeLines.length === 0
            ? 'Nothing is left to pack for this order.'
            : null
  const packWhole = useMutation({
    mutationFn: () => packWholeOrder(wholeNo as number, wholeLines),
    onSuccess: async (message) => {
      setPackageNotice({ text: message, failed: false })
      setQuantities({})
      for (const key of ['packable-items', 'packages', 'shipment-packages', 'order-items']) {
        await queryClient.invalidateQueries({ queryKey: [key] })
      }
    },
    onError: (failure: Error) => setPackageNotice({ text: failure.message, failed: true }),
  })

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <PageTitle icon="packable-items" className="me-auto">
            Packable Items
          </PageTitle>
          <input
            className="form-control form-control-sm w-auto"
            aria-label="Order number"
            placeholder="Order number"
            list="packable-order-numbers"
            value={orderNo}
            onChange={(event) => {
              setOrderNo(event.target.value)
              // The matches start at their first page.
              firstPage()
            }}
          />
          <datalist id="packable-order-numbers">
            {orderNumbers.map((number) => (
              <option key={number} value={number} />
            ))}
          </datalist>
          <select
            className="form-select form-select-sm w-auto"
            aria-label="Sort field"
            // The same sorting the heads of the table set; empty is the backend's own order.
            value={sorted?.sort ?? ''}
            onChange={(event) => {
              const column = Object.keys(PACKABLE_SORT_KEYS).find(
                (key) => PACKABLE_SORT_KEYS[key] === event.target.value,
              )
              setSorting(column ? [{ id: column, desc: sorting[0]?.desc ?? false }] : [])
            }}
          >
            <option value="">Sort</option>
            {Object.values(PACKABLE_SORT_KEYS).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
          <select
            className="form-select form-select-sm w-auto"
            aria-label="Sort direction"
            value={sorted?.order ?? ''}
            onChange={(event) =>
              setSorting(
                event.target.value === ''
                  ? []
                  : [{ id: sorting[0]?.id ?? 'orderItemId', desc: event.target.value === 'DESC' }],
              )
            }
          >
            <option value="">Order</option>
            <option value="ASC">ASC</option>
            <option value="DESC">DESC</option>
          </select>
        </div>
      </div>
      <PackableItemsTable
        data={data}
        isPending={isPending}
        isFetching={isFetching}
        error={error}
        pagination={pagination}
        sorting={sorting}
        onPagination={setPagination}
        onSorting={setSorting}
        quantities={quantities}
        // A click on a row searches for its order, as if its number had been typed.
        onRow={(item) => {
          const number = orderNoOf(item)
          if (number === undefined || number === orderNo) return
          setOrderNo(number)
          firstPage()
        }}
        onQuantity={
          packs ? (id, quantity) => setQuantities({ ...quantities, [id]: quantity }) : undefined
        }
      />
      {/* Packing is for the warehouse and the admin; anybody else reads the list. */}
      {packs && (
        <div className="card-body d-flex flex-wrap gap-3 align-items-center">
          <button
            type="button"
            className="btn btn-success"
            disabled={lines.length === 0 || create.isPending}
            onClick={() => create.mutate(lines)}
          >
            Create Package
          </button>
          <button
            type="button"
            className="btn btn-outline-success"
            disabled={wholeProblem !== null || wholeNo === null || packWhole.isPending}
            onClick={() => setAskingWhole(true)}
          >
            Pack whole order
          </button>
          {askingWhole && (
            <ConfirmModal
              title="Pack whole order"
              confirmLabel="Pack whole order"
              busy={packWhole.isPending}
              onCancel={() => setAskingWhole(false)}
              onConfirm={() => {
                setPackageNotice(null)
                packWhole.mutate(undefined, { onSettled: () => setAskingWhole(false) })
              }}
            >
              Pack everything that is left of order {wholeNo} - {wholeLines.length} line
              {wholeLines.length === 1 ? '' : 's'} - into one new package?
            </ConfirmModal>
          )}
          <span
            className={
              packageNotice ? (packageNotice.failed ? 'text-danger' : 'text-success') : undefined
            }
            style={{ minHeight: '1.5rem' }}
            role="status"
          >
            {packageNotice?.text}
          </span>
          {/* Under the buttons, in a line of its own. */}
          <div className="w-100 small text-body-secondary">
            {wholeOrderHint(wholeProblem).map((help) => (
              <section key={help.title}>
                <h4 className="h6 fw-bold mb-1">{help.title}</h4>
                <p className="mb-2">{help.text}</p>
                {help.problem && <p className="mb-0 text-body-emphasis">{help.problem}</p>}
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

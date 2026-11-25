import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTable, type PaginationState, type SortingState } from '@tanstack/react-table'
import { useEffect, useState } from 'react'
import {
  pickingOrdersQueryOptions,
  pickOrder,
  pickReservation,
  releasePick,
  mayPick,
  releaseQuestion,
  searchedOrderNo,
  type PickingOrderDto,
  type PickingStage,
} from './pickingOrders'
import { PICKING_SORT_KEYS, pickingColumns } from './pickingColumns'
import { ordersQueryOptions } from '../orders/orders'
import { meQueryOptions } from '../auth/auth'
import { FulfillmentStatusBadge } from '../packing/FulfillmentStatusBadge'
import { productLabel, cell } from '../../shared/lib/format'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'
import { entityLinkOf } from '../../shared/lib/entityLinks'
import { EntityLinkAnchor } from '../../shared/ui/EntityLinkAnchor'
import { PageTitle } from '../../layout/PageTitle'
import { ServerTableFooter } from '../../shared/ui/ServerTableFooter'
import { SortableHeader } from '../../shared/ui/SortableHeader'
import {
  cycleSort,
  listSort,
  serverTableFeatures,
  toTableSort,
  useServerTableState,
} from '../../shared/lib/serverTable'
import { LoadingBar, ReloadBar } from '../../shared/ui/LoadingBar'

const MESSAGE_SECONDS = 5

/** An arrow turning back: the pick is undone. */
function ReleaseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  )
}

/** A box with a tick: the goods are taken off the shelf. */
function PickIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7 12 3l9 4-9 4-9-4Zm0 0v10l9 4 9-4V7M8.5 14l2.5 2.5 4.5-5" />
    </svg>
  )
}

const DATE_COLUMNS = new Set(['pickedAt', 'expiresAt'])

const NO_ITEMS: PickingOrderDto[] = []

function renderCell(column: string, item: Record<string, unknown>) {
  const value = item[column]
  // The order number leads to the order.
  const link = entityLinkOf(column, value)
  if (link) return <EntityLinkAnchor link={link} />
  if (column === 'storehouseName' && item.storehouseId != null) {
    return `${cell(value)} (${cell(item.storehouseId)})`
  }
  if (column === 'fulfillmentStatus') return <FulfillmentStatusBadge status={value} />
  if (column === 'articleNo') return productLabel(item.productName, value)
  if (DATE_COLUMNS.has(column) && typeof value === 'string') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return (
        <small className="text-body-secondary text-nowrap">
          {date.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
        </small>
      )
    }
  }
  return cell(value)
}

/** Picking orders are keyed by their reservation: `reservationId`, or `id` when that is all there is. */
function reservationId(item: Record<string, unknown>): string {
  return cell(item.reservationId ?? item.id)
}

/** The rows of one stage, sorted and paged by the backend, each with the button of that stage. */
function PickingTable({
  stage,
  orderNo,
  pagination,
  sorting,
  onPagination,
  onSorting,
  busy,
  actions,
  onPick,
  onRelease,
  onRow,
}: {
  stage: PickingStage
  orderNo: string | undefined
  pagination: PaginationState
  sorting: SortingState
  onPagination: (next: PaginationState) => void
  onSorting: (next: SortingState) => void
  busy: boolean
  /** Whether the rows carry their button; without it the column is not there at all. */
  actions: boolean
  onPick: (item: PickingOrderDto) => void
  onRelease: (item: PickingOrderDto) => void
  /** A click on a row beside its link and button; left out, the rows are not clickable. */
  onRow?: (item: PickingOrderDto) => void
}) {
  const { data, isPending, isFetching, error } = useQuery({
    ...pickingOrdersQueryOptions(pagination.pageIndex, stage, {
      size: pagination.pageSize,
      orderNo,
      ...listSort(sorting, PICKING_SORT_KEYS),
    }),
    // The old page stays while the next one loads, so a click on a head does not empty the table.
    placeholderData: keepPreviousData,
  })

  const table = useTable({
    features: serverTableFeatures,
    columns: pickingColumns,
    data: data?.content ?? NO_ITEMS,
    rowCount: data?.total ?? 0,
    state: { pagination, sorting },
    manualPagination: true,
    manualSorting: true,
    // The backend sorts by one column.
    enableMultiSort: false,
    sortDescFirst: false,
    getRowId: (item, index) => reservationId(item) || String(index),
    onPaginationChange: (updater) =>
      onPagination(typeof updater === 'function' ? updater(pagination) : updater),
    onSortingChange: (updater) =>
      onSorting(typeof updater === 'function' ? updater(sorting) : updater),
  })

  if (isPending) return <LoadingBar label="Loading picking orders…" />
  if (error) return <p className="p-3 mb-0 text-danger">{error.message}</p>
  const rows = table.getRowModel().rows
  // A page can run empty while others still hold rows (the last one was just picked): then the footer stays.
  if (rows.length === 0 && table.getRowCount() === 0) {
    return (
      <p className="p-3 mb-0 text-body-secondary">
        {stage === 'ACTIVE' ? 'No picking orders' : 'Nothing has been picked'}
        {orderNo ? ` for order ${orderNo}.` : '.'}
      </p>
    )
  }

  const tableSort = toTableSort(sorting)

  return (
    <>
      <ReloadBar active={isFetching} />
      <div className="table-responsive">
        <table className="table table-striped table-sm align-middle mb-0">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) =>
                  header.column.getCanSort() ? (
                    <SortableHeader
                      key={header.id}
                      label={String(header.column.columnDef.header)}
                      column={header.column.id}
                      sort={tableSort}
                      onSort={() => cycleSort(header.column)}
                    />
                  ) : (
                    <th key={header.id}>
                      <table.FlexRender header={header} />
                    </th>
                  ),
                )}
                {actions && <th />}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                style={onRow && { cursor: 'pointer' }}
                onClick={(event) => {
                  // The order link and the buttons do their own thing.
                  if ((event.target as HTMLElement).closest('a, button')) return
                  onRow?.(row.original)
                }}
              >
                {row.getAllCells().map((tableCell) => (
                  <td key={tableCell.id}>{renderCell(tableCell.column.id, row.original)}</td>
                ))}
                {actions && (
                  <td className="text-end">
                    {stage === 'ACTIVE' ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary py-0 d-inline-flex align-items-center gap-1"
                        disabled={busy}
                        onClick={() => onPick(row.original)}
                      >
                        <PickIcon />
                        Pick
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-danger py-0 d-inline-flex align-items-center gap-1"
                        disabled={busy}
                        onClick={() => onRelease(row.original)}
                      >
                        <ReleaseIcon />
                        Release
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ServerTableFooter
        pagination={pagination}
        total={table.getRowCount()}
        onPagination={onPagination}
      />
    </>
  )
}

/** The page: the table, one "pick" button per row, and below it a field to pick a whole order. */
export function PickingOrdersPage() {
  const queryClient = useQueryClient()
  const { pagination, sorting, setPagination, setSorting, firstPage } = useServerTableState()
  const [stage, setStage] = useState<PickingStage>('ACTIVE')
  const { data: user } = useQuery(meQueryOptions)
  const picks = mayPick(user)
  const [orderNo, setOrderNo] = useState('')
  // The search above the table; the field below it names the order to pick.
  const [search, setSearch] = useState('')
  // Suggestions for the search: the orders there are, and those the listed stage has rows for.
  const { data: orders } = useQuery(ordersQueryOptions())
  const { data: listed } = useQuery(pickingOrdersQueryOptions(0, stage, { size: 100 }))
  const orderNumbers = [
    ...new Set(
      [...(listed?.content ?? []), ...(orders?.content ?? [])]
        .map((row) => cell(row.orderNo))
        .filter((number) => number !== ''),
    ),
  ].sort()
  const [notice, setNotice] = useState<{ text: string; failed: boolean } | null>(null)

  const action = <T,>(mutationFn: (value: T) => Promise<string>) => ({
    mutationFn,
    onSuccess: async (message: string) => {
      setNotice({ text: message, failed: false })
      await queryClient.invalidateQueries({ queryKey: ['picking-orders'] })
      // A pick moves the stock and the lines that can be packed; taking it back moves them again.
      await queryClient.invalidateQueries({ queryKey: ['stock'] })
      await queryClient.invalidateQueries({ queryKey: ['packable-items'] })
      await queryClient.invalidateQueries({ queryKey: ['order-items'] })
    },
    onError: (failure: Error) => setNotice({ text: failure.message, failed: true }),
  })
  const pick = useMutation(action(pickReservation))
  const pickByOrder = useMutation(action(pickOrder))
  const release = useMutation(action(releasePick))
  // The row whose pick a person is asked about; nothing is taken back before they say yes.
  const [releasing, setReleasing] = useState<Record<string, unknown> | null>(null)
  const busy = pick.isPending || pickByOrder.isPending || release.isPending

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), MESSAGE_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [notice])

  return (
    <div className="card shadow-sm">
      <div className="card-body d-flex flex-wrap gap-2 align-items-center">
        <PageTitle icon="picking" className="me-auto">
          Picking Orders
        </PageTitle>
        {/* One group, so the search stays beside the stage when the title needs the room. */}
        <div className="d-flex gap-2">
          <input
            className="form-control form-control-sm w-auto"
            aria-label="Search by order number"
            placeholder="Order number"
            inputMode="numeric"
            list="picking-search-numbers"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              // The matches start at their first page.
              firstPage()
            }}
          />
          <datalist id="picking-search-numbers">
            {orderNumbers.map((number) => (
              <option key={number} value={number} />
            ))}
          </datalist>
          <select
            className="form-select form-select-sm w-auto"
            aria-label="Stage"
            value={stage}
            onChange={(e) => {
              setStage(e.target.value as PickingStage)
              // Page 3 of what is still to be picked says nothing about what has been picked.
              firstPage()
            }}
          >
            <option value="ACTIVE">To pick</option>
            <option value="CONSUMED">Picked</option>
          </select>
        </div>
      </div>

      <PickingTable
        stage={stage}
        orderNo={searchedOrderNo(search)}
        pagination={pagination}
        sorting={sorting}
        onPagination={setPagination}
        onSorting={setSorting}
        busy={busy}
        actions={picks}
        onPick={(item) => pick.mutate(reservationId(item))}
        onRelease={setReleasing}
        // Only while the field below is there to take the number.
        onRow={picks && stage === 'ACTIVE' ? (item) => setOrderNo(cell(item.orderNo)) : undefined}
      />

      {releasing && (
        <ConfirmModal
          title="Take back the pick"
          confirmLabel="Release"
          danger
          busy={release.isPending}
          onCancel={() => setReleasing(null)}
          onConfirm={() => {
            release.mutate(reservationId(releasing), { onSettled: () => setReleasing(null) })
          }}
        >
          {releaseQuestion(releasing)}
        </ConfirmModal>
      )}
      {picks && stage === 'ACTIVE' && (
        <form
          className="card-body d-flex flex-wrap gap-2 align-items-center"
          onSubmit={(e) => {
            e.preventDefault()
            if (orderNo.trim()) pickByOrder.mutate(orderNo.trim())
          }}
        >
          <label htmlFor="picking-order-no">Try to pick via order no:</label>
          <input
            id="picking-order-no"
            className="form-control form-control-sm w-auto"
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
            disabled={busy || !orderNo.trim()}
          >
            <PickIcon />
            Pick
          </button>
        </form>
      )}
      {notice && (
        <p
          className={`px-3 pb-2 mb-0 ${notice.failed ? 'text-danger' : 'text-success'}`}
          role="status"
        >
          {notice.text}
        </p>
      )}
    </div>
  )
}

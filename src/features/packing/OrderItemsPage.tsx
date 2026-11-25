import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useTable, type PaginationState, type SortingState } from '@tanstack/react-table'
import { Fragment, useState, type CSSProperties } from 'react'
import {
  defaultOrderItemFilter,
  orderItemFilterLabel,
  orderItemFiltersFor,
  orderItemsQueryOptions,
  type OrderItemChoice,
  type OrderItemDto,
} from './orderItems'
import { ORDER_ITEM_SORT_KEYS, orderItemColumns } from './orderItemColumns'
import { renderOrderItemCell } from './orderItemCells'
import { groupColors } from './rowColors'
import { meQueryOptions } from '../auth/auth'
import { ordersQueryOptions } from '../orders/orders'
import { searchedOrderNo } from '../picking/pickingOrders'
import { PageTitle } from '../../layout/PageTitle'
import { LinkedValue } from '../../shared/ui/EntityLinkAnchor'
import { ServerTableFooter } from '../../shared/ui/ServerTableFooter'
import { SortableHeader } from '../../shared/ui/SortableHeader'
import {
  cycleSort,
  listSort,
  serverTableFeatures,
  toTableSort,
  useServerTableState,
} from '../../shared/lib/serverTable'
import { cell } from '../../shared/lib/format'
import { LoadingBar, ReloadBar } from '../../shared/ui/LoadingBar'

const NO_ITEMS: OrderItemDto[] = []

function ItemsTable({
  status,
  orderNo,
  pagination,
  sorting,
  onPagination,
  onSorting,
  onRow,
}: {
  status: OrderItemChoice
  orderNo: string | undefined
  pagination: PaginationState
  sorting: SortingState
  onPagination: (next: PaginationState) => void
  onSorting: (next: SortingState) => void
  /** A click on a row beside its link. */
  onRow: (item: OrderItemDto) => void
}) {
  const { data, isPending, isFetching, error } = useQuery({
    ...orderItemsQueryOptions({
      status,
      orderNo,
      page: pagination.pageIndex,
      size: pagination.pageSize,
      ...listSort(sorting, ORDER_ITEM_SORT_KEYS),
    }),
    // The old page stays while the next one loads, so a click on a head does not empty the table.
    placeholderData: keepPreviousData,
  })

  const table = useTable({
    features: serverTableFeatures,
    columns: orderItemColumns,
    data: data?.content ?? NO_ITEMS,
    rowCount: data?.total ?? 0,
    state: { pagination, sorting },
    manualPagination: true,
    manualSorting: true,
    // The backend sorts by one column.
    enableMultiSort: false,
    sortDescFirst: false,
    getRowId: (item, index) => cell(item.orderItemId) || String(index),
    onPaginationChange: (updater) =>
      onPagination(typeof updater === 'function' ? updater(pagination) : updater),
    onSortingChange: (updater) =>
      onSorting(typeof updater === 'function' ? updater(sorting) : updater),
  })

  if (isPending) return <LoadingBar label="Loading order items…" />
  if (error) return <p className="p-3 mb-0 text-danger">{error.message}</p>
  const rows = table.getRowModel().rows
  if (rows.length === 0) {
    return (
      <p className="p-3 mb-0 text-body-secondary">
        {orderNo ? `No order items for order ${orderNo}.` : 'No order items.'}
      </p>
    )
  }

  const tableSort = toTableSort(sorting)
  // As on the packages page: the lines of one order share a colour.
  const colors = groupColors(
    rows.map((row) => row.original.orderNo as string | number | null | undefined),
  )

  return (
    <>
      <ReloadBar active={isFetching} />
      <div className="table-responsive">
        {/* No table-striped: the colour of a row is its order's, a stripe on top of it would read as a second group. */}
        <table className="table table-sm align-middle mb-0">
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
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id}
                // Bootstrap paints a cell from --bs-table-bg; set on the row it reaches every cell of it.
                style={
                  {
                    cursor: 'pointer',
                    ...(colors[index] && { '--bs-table-bg': colors[index] }),
                  } as CSSProperties
                }
                onClick={(event) => {
                  // The links do their own thing.
                  if ((event.target as HTMLElement).closest('a, button')) return
                  onRow(row.original)
                }}
              >
                {row.getAllCells().map((tableCell) => (
                  <td key={tableCell.id}>
                    <LinkedValue column={tableCell.column.id} value={tableCell.getValue()}>
                      {renderOrderItemCell(tableCell.column.id, row.original)}
                    </LinkedValue>
                  </td>
                ))}
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

/** All order items, as the backend lists them. */
export function OrderItemsPage() {
  const { pagination, sorting, setPagination, setSorting, firstPage } = useServerTableState()
  const { data: user } = useQuery(meQueryOptions)
  // Where the list starts depends on who is looking; after that the choice is the user's.
  const [status, setStatus] = useState<OrderItemChoice>(() =>
    defaultOrderItemFilter(user ?? undefined),
  )
  const [search, setSearch] = useState('')
  // Suggestions for the search: the orders there are.
  const { data: orders } = useQuery(ordersQueryOptions())
  const orderNumbers = [
    ...new Set(
      (orders?.content ?? []).map((order) => cell(order.orderNo)).filter((number) => number !== ''),
    ),
  ].sort()
  const searchFor = (next: string) => {
    setSearch(next)
    // The matches start at their first page.
    firstPage()
  }
  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <PageTitle icon="items" className="me-auto">
            Order items
          </PageTitle>
          <input
            className="form-control form-control-sm w-auto"
            aria-label="Search by order number"
            placeholder="Order number"
            inputMode="numeric"
            list="order-items-search-numbers"
            value={search}
            onChange={(e) => searchFor(e.target.value)}
          />
          <datalist id="order-items-search-numbers">
            {orderNumbers.map((number) => (
              <option key={number} value={number} />
            ))}
          </datalist>
          <select
            className="form-select form-select-sm w-auto"
            aria-label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as OrderItemChoice)
              // Page 3 of one status says nothing about another.
              firstPage()
            }}
          >
            {orderItemFiltersFor(user ?? undefined).map((choice) => (
              <Fragment key={choice}>
                {/* The line sets apart what "ALL BUT COMPLETED" leaves out. */}
                {choice === 'READY_FOR_DISPATCH' && <hr />}
                <option value={choice}>{orderItemFilterLabel(choice)}</option>
              </Fragment>
            ))}
          </select>
          <select
            className="form-select form-select-sm w-auto"
            aria-label="Order"
            // The direction of the table's sorting; without a column picked, of the date (the backend's default).
            value={sorting[0] ? (sorting[0].desc ? 'DESC' : 'ASC') : ''}
            onChange={(e) =>
              setSorting(
                e.target.value === ''
                  ? []
                  : [{ id: sorting[0]?.id ?? 'updatedAt', desc: e.target.value === 'DESC' }],
              )
            }
          >
            <option value="">Order</option>
            <option value="ASC">ASC</option>
            <option value="DESC">DESC</option>
          </select>
        </div>
      </div>
      <ItemsTable
        status={status}
        orderNo={searchedOrderNo(search)}
        onRow={(item) => {
          const number = cell(item.orderNo)
          if (number !== '' && number !== search) searchFor(number)
        }}
        pagination={pagination}
        sorting={sorting}
        onPagination={setPagination}
        onSorting={setSorting}
      />
    </div>
  )
}

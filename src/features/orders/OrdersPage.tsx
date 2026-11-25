import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useTable, type PaginationState, type SortingState } from '@tanstack/react-table'
import {
  defaultOrderFilter,
  orderFiltersFor,
  orderFilterLabel,
  ordersQueryOptions,
  type OrderDto,
  type OrderFilter,
} from './orders'
import { orderColumns, orderTableFeatures, sortOf } from './ordersTable'
import { meQueryOptions } from '../auth/auth'
import { OrderStatusBadge } from './OrderStatusBadge'
import { Link, Outlet } from '@tanstack/react-router'
import { PageTitle } from '../../layout/PageTitle'
import { isLogisticsOnly } from '../../layout/navigation'
import { ServerTableFooter } from '../../shared/ui/ServerTableFooter'
import { cycleSort, toTableSort, useServerTableState } from '../../shared/lib/serverTable'
import { SortableHeader } from '../../shared/ui/SortableHeader'
import { useState } from 'react'
import { cell } from '../../shared/lib/format'
import { LoadingBar, ReloadBar } from '../../shared/ui/LoadingBar'

const NO_ORDERS: OrderDto[] = []

function OrdersTable({
  status,
  pagination,
  sorting,
  onPagination,
  onSorting,
}: {
  status: OrderFilter
  pagination: PaginationState
  sorting: SortingState
  onPagination: (next: PaginationState) => void
  onSorting: (next: SortingState) => void
}) {
  const { data, isPending, isFetching, error } = useQuery({
    ...ordersQueryOptions(pagination.pageIndex, status, {
      size: pagination.pageSize,
      sort: sortOf(sorting),
    }),
    // The old page stays while the next one loads, so a click on a head does not empty the table.
    placeholderData: keepPreviousData,
  })

  const table = useTable({
    features: orderTableFeatures,
    columns: orderColumns,
    data: data?.content ?? NO_ORDERS,
    rowCount: data?.total ?? 0,
    state: { pagination, sorting },
    manualPagination: true,
    manualSorting: true,
    // The backend sorts by one column.
    enableMultiSort: false,
    sortDescFirst: false,
    getRowId: (order, index) => cell(order.orderNo) || String(index),
    onPaginationChange: (updater) =>
      onPagination(typeof updater === 'function' ? updater(pagination) : updater),
    onSortingChange: (updater) =>
      onSorting(typeof updater === 'function' ? updater(sorting) : updater),
  })

  if (isPending) return <LoadingBar label="Loading orders…" />
  if (error) return <p className="p-3 mb-0 text-danger">{error.message}</p>
  const rows = table.getRowModel().rows
  if (rows.length === 0)
    return <p className="p-3 mb-0 text-body-secondary">No orders in {orderFilterLabel(status)}.</p>

  const tableSort = toTableSort(sorting)

  return (
    <>
      <ReloadBar active={isFetching} />
      <div className="table-responsive">
        <table className="table table-striped table-responsive-md mb-0">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) =>
                  header.column.getCanSort() ? (
                    <SortableHeader
                      key={header.id}
                      label={header.column.id}
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
            {rows.map((row) => (
              <tr key={row.id}>
                {row.getAllCells().map((tableCell) => (
                  <td key={tableCell.id}>
                    <Link
                      to="/orders/$orderNumber"
                      params={{ orderNumber: cell(row.original.orderNo) }}
                      className="text-decoration-none text-reset"
                    >
                      {tableCell.column.id === 'status' ? (
                        <OrderStatusBadge status={tableCell.getValue()} />
                      ) : (
                        cell(tableCell.getValue())
                      )}
                    </Link>
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

/** All orders, as the backend lists them; the details of the chosen one render below. */
export function OrdersPage() {
  const { pagination, sorting, setPagination, setSorting, firstPage } = useServerTableState()
  const { data: user } = useQuery(meQueryOptions)
  // Where the list starts depends on who is looking; after that the choice is the user's.
  const [status, setStatus] = useState<OrderFilter>(() => defaultOrderFilter(user ?? undefined))
  // A planner of shipments may read one order but not the list: only the chosen order's details stand here.
  if (user && isLogisticsOnly(user)) return <Outlet />
  return (
    <>
      <div className="card shadow-sm">
        <div className="card-body d-flex flex-wrap gap-2 align-items-center">
          <PageTitle icon="orders" className="me-auto">
            Orders
          </PageTitle>
          <select
            className="form-select form-select-sm w-auto"
            aria-label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as OrderFilter)
              // Page 3 of one status says nothing about another.
              firstPage()
            }}
          >
            {orderFiltersFor(user ?? undefined).map((s) => (
              <option key={s} value={s}>
                {orderFilterLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <OrdersTable
          status={status}
          pagination={pagination}
          sorting={sorting}
          onPagination={setPagination}
          onSorting={setSorting}
        />
      </div>
      <Outlet />
    </>
  )
}

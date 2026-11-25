import {
  useTable,
  type ColumnDef,
  type PaginationState,
  type RowData,
  type SortingState,
} from '@tanstack/react-table'
import type { CSSProperties, ReactNode } from 'react'
import { cycleSort, serverTableFeatures, toTableSort } from '../lib/serverTable'
import { LoadingBar, ReloadBar } from './LoadingBar'
import { ServerTableFooter } from './ServerTableFooter'
import { SortableHeader } from './SortableHeader'

/** A column of its own before or after the data columns: a checkbox, a button. */
export interface SideColumn<T> {
  head?: ReactNode
  render: (row: T) => ReactNode
  className?: string
}

const NO_ROWS: never[] = []

/**
 * A list the backend sorts and cuts into pages, as a TanStack table: sortable heads for the columns that allow it,
 * the loading bar, the text for an empty list and the footer. The page keeps the state and asks for the data.
 */
export function ServerTable<T extends RowData>({
  columns,
  data,
  isPending,
  isFetching,
  error,
  loading,
  empty,
  rowId,
  renderCell,
  leading,
  trailing,
  rowStyle,
  striped = true,
  pagination,
  sorting,
  onPagination,
  onSorting,
}: {
  columns: ColumnDef<typeof serverTableFeatures, T, unknown>[]
  data: { content: T[]; total: number } | undefined
  isPending: boolean
  isFetching: boolean
  error: Error | null
  /** What stands under the loading bar. */
  loading: string
  /** What stands there when there is nothing. */
  empty: string
  rowId: (row: T, index: number) => string
  renderCell: (column: string, row: T) => ReactNode
  leading?: SideColumn<T>
  trailing?: SideColumn<T>
  /** A look of its own for a row, by its place in `data.content`. */
  rowStyle?: (row: T, index: number) => CSSProperties | undefined
  /** Off where the rows carry colours that mean something: a stripe on top would read as a second group. */
  striped?: boolean
  pagination: PaginationState
  sorting: SortingState
  onPagination: (next: PaginationState) => void
  onSorting: (next: SortingState) => void
}) {
  const table = useTable({
    features: serverTableFeatures,
    columns,
    data: data?.content ?? (NO_ROWS as T[]),
    rowCount: data?.total ?? 0,
    state: { pagination, sorting },
    manualPagination: true,
    manualSorting: true,
    // The backend sorts by one column.
    enableMultiSort: false,
    sortDescFirst: false,
    getRowId: rowId,
    onPaginationChange: (updater) =>
      onPagination(typeof updater === 'function' ? updater(pagination) : updater),
    onSortingChange: (updater) =>
      onSorting(typeof updater === 'function' ? updater(sorting) : updater),
  })

  if (isPending) return <LoadingBar label={loading} />
  if (error) return <p className="p-3 mb-0 text-danger">{error.message}</p>
  const rows = table.getRowModel().rows
  // A page can run empty while others still hold rows: then the footer stays, to page back.
  if (rows.length === 0 && table.getRowCount() === 0) {
    return <p className="p-3 mb-0 text-body-secondary">{empty}</p>
  }

  const tableSort = toTableSort(sorting)

  return (
    <>
      <ReloadBar active={isFetching} />
      <div className="table-responsive">
        <table className={`table ${striped ? 'table-striped ' : ''}table-sm align-middle mb-0`}>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {leading && <th>{leading.head}</th>}
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
                {trailing && <th>{trailing.head}</th>}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} style={rowStyle?.(row.original, index)}>
                {leading && <td className={leading.className}>{leading.render(row.original)}</td>}
                {row.getAllCells().map((tableCell) => (
                  <td key={tableCell.id}>{renderCell(tableCell.column.id, row.original)}</td>
                ))}
                {trailing && (
                  <td className={trailing.className}>{trailing.render(row.original)}</td>
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

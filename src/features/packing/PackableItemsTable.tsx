import { useTable, type PaginationState, type SortingState } from '@tanstack/react-table'
import type { OrderItemDto, OrderItemPage } from './orderItems'
import { packableColumns } from './packableColumns'
import { renderOrderItemCell } from './orderItemCells'
import { cycleSort, serverTableFeatures, toTableSort } from '../../shared/lib/serverTable'
import { cell } from '../../shared/lib/format'
import { entityLinkOf } from '../../shared/lib/entityLinks'
import { EntityLinkAnchor } from '../../shared/ui/EntityLinkAnchor'
import { ServerTableFooter } from '../../shared/ui/ServerTableFooter'
import { SortableHeader } from '../../shared/ui/SortableHeader'
import { LoadingBar, ReloadBar } from '../../shared/ui/LoadingBar'

const NO_ITEMS: OrderItemDto[] = []

/** As on every order item table, but the order number leads to the order. */
function renderCell(column: string, item: OrderItemDto) {
  const link = entityLinkOf(column, item[column])
  return link ? <EntityLinkAnchor link={link} /> : renderOrderItemCell(column, item)
}

/** The packable lines, sorted and paged by the backend; whoever may pack gets a field for the quantity. */
export function PackableItemsTable({
  data,
  isPending,
  isFetching,
  error,
  pagination,
  sorting,
  onPagination,
  onSorting,
  quantities,
  onQuantity,
  onRow,
}: {
  data: OrderItemPage | undefined
  isPending: boolean
  isFetching: boolean
  error: Error | null
  pagination: PaginationState
  sorting: SortingState
  onPagination: (next: PaginationState) => void
  onSorting: (next: SortingState) => void
  quantities: Record<string, string>
  /** With it, there is a "pack qty" column. */
  onQuantity?: (id: string, quantity: string) => void
  /** A click on a row beside its link and quantity field. */
  onRow: (item: OrderItemDto) => void
}) {
  const table = useTable({
    features: serverTableFeatures,
    columns: packableColumns,
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

  if (isPending) return <LoadingBar label="Loading packable Items…" />
  if (error) return <p className="p-3 mb-0 text-danger">{error.message}</p>
  const rows = table.getRowModel().rows
  // A page can run empty while others still hold rows (its last line was just packed): then the footer stays.
  if (rows.length === 0 && table.getRowCount() === 0) {
    return <p className="p-3 mb-0 text-body-secondary">No packable Items.</p>
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
                {onQuantity && <th>pack qty</th>}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row) => {
              const id = cell(row.original.orderItemId)
              const remaining = Number(row.original.remaining)
              return (
                <tr
                  key={row.id}
                  style={{ cursor: 'pointer' }}
                  onClick={(event) => {
                    // The order link and the quantity field do their own thing.
                    if ((event.target as HTMLElement).closest('a, button, input')) return
                    onRow(row.original)
                  }}
                >
                  {row.getAllCells().map((tableCell) => (
                    <td key={tableCell.id}>{renderCell(tableCell.column.id, row.original)}</td>
                  ))}
                  {onQuantity && (
                    <td>
                      {id !== '' && (
                        <input
                          type="number"
                          min={0}
                          max={Number.isFinite(remaining) ? remaining : undefined}
                          className="form-control form-control-sm"
                          style={{ width: '4.5rem' }}
                          title="Only packages with same order number are valid"
                          aria-label={`Quantity to pack for item ${id}`}
                          value={quantities[id] ?? ''}
                          onChange={(event) => onQuantity(id, event.target.value)}
                        />
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
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

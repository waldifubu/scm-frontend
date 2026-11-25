import type { PaginationState } from '@tanstack/react-table'
import { PAGE_SIZES } from '../lib/serverTable'
import { Pager } from './Pager'

/** Under a server table: the page buttons, the rows per page and how many rows there are in all. */
export function ServerTableFooter({
  pagination,
  total,
  onPagination,
}: {
  pagination: PaginationState
  total: number
  onPagination: (next: PaginationState) => void
}) {
  return (
    <div className="d-flex flex-wrap gap-3 align-items-center small text-body-secondary px-2 my-2">
      <div className="me-auto">
        <Pager
          page={pagination.pageIndex}
          size={pagination.pageSize}
          total={total}
          onPage={(pageIndex) => onPagination({ ...pagination, pageIndex })}
        />
      </div>
      <label className="d-flex align-items-center gap-2">
        Rows per page
        <select
          className="form-select form-select-sm w-auto"
          value={pagination.pageSize}
          // Another size, another cut of the list: start at its beginning.
          onChange={(e) => onPagination({ pageIndex: 0, pageSize: Number(e.target.value) })}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      <span>total {total}</span>
    </div>
  )
}

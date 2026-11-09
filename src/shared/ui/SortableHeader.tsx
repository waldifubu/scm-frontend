import type { TableSort } from '../lib/tableSort'

interface Props {
  /** What the head says. */
  label: string
  /** The column this head sorts by - what `sort.column` holds while it is the sorted one. */
  column: string
  sort: TableSort | null
  onSort: (column: string) => void
  className?: string
}

/**
 * A table head that sorts: a click makes its column the sort, ascending, a second click descending, a
 * third takes the sort away (see `nextSort`). The arrow shows the direction, `aria-sort` tells a screen
 * reader. The head stays on one line - an arrow that wraps under its label reads as a second column.
 */
export function SortableHeader({ label, column, sort, onSort, className }: Props) {
  const active = sort?.column === column
  return (
    <th
      className={`text-nowrap${className ? ` ${className}` : ''}`}
      aria-sort={!active ? undefined : sort.direction === 'asc' ? 'ascending' : 'descending'}
    >
      <button
        type="button"
        className="btn btn-link p-0 fw-bold text-body text-decoration-none"
        onClick={() => onSort(column)}
        title={`Sort by ${label}`}
      >
        {label}
        {active && <span aria-hidden="true">{sort.direction === 'asc' ? ' ▲' : ' ▼'}</span>}
      </button>
    </th>
  )
}

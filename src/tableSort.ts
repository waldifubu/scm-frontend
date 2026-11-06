/** How a column is ordered: smallest first, or largest first. */
export type SortDirection = 'asc' | 'desc'

/** The column a table is sorted by, or `null` while it shows its rows in the order they arrived. */
export interface TableSort {
  column: string
  direction: SortDirection
}

/**
 * What a click on a column head does: a column that is not sorted by yet becomes the sort, ascending;
 * the same column again flips it to descending; a third click takes the sort away, back to the
 * order the rows came in.
 */
export function nextSort(current: TableSort | null, column: string): TableSort | null {
  if (current === null || current.column !== column) return { column, direction: 'asc' }
  if (current.direction === 'asc') return { column, direction: 'desc' }
  return null
}

function isMissing(value: unknown): boolean {
  return value === null || value === undefined || value === ''
}

/** Numbers by size, anything else as text in which digits count as numbers (`id-2` before `id-10`), case ignored. */
function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

/**
 * The rows ordered by one column, without touching the list that was passed in. A row with nothing in
 * that column goes last whichever way the sort runs - an empty cell is not the smallest or the largest
 * value, it is no value. Rows that compare equal keep the order they had.
 */
export function sortRows<T extends Record<string, unknown>>(rows: readonly T[], sort: TableSort | null): T[] {
  if (sort === null) return [...rows]

  const sign = sort.direction === 'asc' ? 1 : -1
  return [...rows].sort((left, right) => {
    const a = left[sort.column]
    const b = right[sort.column]
    if (isMissing(a) || isMissing(b)) return Number(isMissing(a)) - Number(isMissing(b))
    return sign * compareValues(a, b)
  })
}

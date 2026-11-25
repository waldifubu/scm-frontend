import {
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table'
import { useState } from 'react'
import type { TableSort } from './tableSort'

/**
 * A table whose rows the server sorts and cuts into pages (`manualSorting`, `manualPagination`): there is no row
 * model for either, the table keeps the state and the page asks the backend.
 */
export const serverTableFeatures = tableFeatures({ rowSortingFeature, rowPaginationFeature })

/** The rows per page to choose from; a table starts with the backend's own default. */
export const PAGE_SIZES = [10, 25, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 25

/** What a list endpoint is asked to sort by. */
export interface ListSort {
  sort: string
  order: 'ASC' | 'DESC'
}

/**
 * The backend's sort for the table's sorting. `keys` maps a column to the name the endpoint knows it by; a column
 * that is not in it cannot be sorted (the backend would answer 400). `undefined` leaves the order to the backend.
 */
export function listSort(
  sorting: SortingState,
  keys: Readonly<Record<string, string>>,
): ListSort | undefined {
  const first = sorting[0]
  const key = first && keys[first.id]
  return key ? { sort: key, order: first.desc ? 'DESC' : 'ASC' } : undefined
}

/** The table's sorting as `SortableHeader` reads it. */
export function toTableSort(sorting: SortingState): TableSort | null {
  const first = sorting[0]
  return first ? { column: first.id, direction: first.desc ? 'desc' : 'asc' } : null
}

/** A click on a head: ascending, descending, then back to the backend's own order. */
export function cycleSort(column: {
  getNextSortingOrder: () => false | 'asc' | 'desc'
  toggleSorting: (desc: boolean) => void
  clearSorting: () => void
}): void {
  const next = column.getNextSortingOrder()
  if (next) column.toggleSorting(next === 'desc')
  else column.clearSorting()
}

/** Page and sorting of a server table. A new order or size starts at the first page: the old one holds other rows. */
export function useServerTableState(initialSorting: SortingState = []) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  })
  const [sorting, setSorting] = useState<SortingState>(initialSorting)
  const firstPage = () => setPagination((current) => ({ ...current, pageIndex: 0 }))
  return {
    pagination,
    sorting,
    setPagination,
    setSorting: (next: SortingState) => {
      setSorting(next)
      firstPage()
    },
    firstPage,
  }
}

import { createColumnHelper, type SortingState } from '@tanstack/react-table'
import { listSort, serverTableFeatures } from '../../shared/lib/serverTable'
import type { OrderDto, OrderListSort } from './orders'

export const orderTableFeatures = serverTableFeatures

/**
 * The name `GET /orders` sorts a column by (`OrderController.ORDER_SORTABLE`: the entity's names). A column that
 * is not here cannot be sorted - the backend would answer 400. `amountOfProducts` is worked out from the lines.
 */
const SORT_KEYS: Readonly<Record<string, string>> = {
  orderNo: 'orderNo',
  totalPrice: 'total',
  dueDate: 'dueDate',
  created: 'created',
  status: 'status',
}

/** What to ask the backend for, from the table's sorting; `undefined` leaves the order to the backend (by id). */
export function sortOf(sorting: SortingState): OrderListSort | undefined {
  return listSort(sorting, SORT_KEYS)
}

const helper = createColumnHelper<typeof orderTableFeatures, OrderDto>()

/** One column per field of `OrderSummaryDto`, headed by the field's name like every table here. */
export const orderColumns = helper.columns(
  ['orderNo', 'amountOfProducts', 'totalPrice', 'dueDate', 'created', 'status'].map((field) =>
    helper.accessor((order: OrderDto) => order[field], {
      id: field,
      header: field,
      enableSorting: field in SORT_KEYS,
    }),
  ),
)

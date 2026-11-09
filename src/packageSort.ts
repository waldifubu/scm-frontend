import type { TableSort } from './tableSort'

/**
 * What a column head of the package list sorts by on the server: the item's own columns under the entity's
 * names (`createdAt` is `created`), and the ones it shows from its order line, its order and its package by
 * their path. `siblings` has no key - it is worked out per row, not a column. The same set the backend names
 * as sortable (`PackageController.PACKAGE_ITEM_SORTABLE`); anything else it answers with a 400.
 */
export const PACKAGE_SORT_KEYS: Readonly<Record<string, string>> = {
  id: 'id',
  createdAt: 'created',
  orderItemId: 'orderItem.id',
  orderNo: 'orderItem.order.orderNo',
  quantity: 'quantity',
  totalQuantity: 'orderItem.quantity',
  shipmentPackageId: 'shipmentPackage.id',
  fulfillmentStatus: 'orderItem.fulfillmentStatus',
}

export type PackageOrder = 'ASC' | 'DESC' | ''

/**
 * What the page keeps - the backend's `sort` and `order` - as the sort of the table: the column that key belongs
 * to, and which way. No `sort` at all is the backend's own order, by when the item was made and then by its
 * order number, so it is `createdAt` that is marked.
 */
export function tableSortOf(sort: string, order: PackageOrder): TableSort | null {
  const direction = order === 'DESC' ? 'desc' : 'asc'
  if (sort.trim() === '') return { column: 'createdAt', direction }
  const column = Object.keys(PACKAGE_SORT_KEYS).find(
    (name) => PACKAGE_SORT_KEYS[name] === sort.trim(),
  )
  if (column === undefined) return null
  return { column, direction }
}

/**
 * The other way round: the `sort` and `order` to ask for. No sort at all asks for none, which is the backend's
 * own order (created, then order number) - the parameter is left out, not sent as a key.
 */
export function sortStateOf(sort: TableSort | null): { sort: string; order: PackageOrder } {
  const key = sort === null ? undefined : PACKAGE_SORT_KEYS[sort.column]
  if (sort === null || key === undefined) return { sort: '', order: '' }
  return { sort: key, order: sort.direction === 'asc' ? 'ASC' : 'DESC' }
}

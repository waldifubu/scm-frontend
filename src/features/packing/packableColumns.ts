import { createColumnHelper } from '@tanstack/react-table'
import { serverTableFeatures } from '../../shared/lib/serverTable'
import type { OrderItemDto, PackableItemFilter } from './orderItems'
import { ORDER_ITEM_HEADS } from './orderItemColumns'

type PackableSort = NonNullable<PackableItemFilter['sort']>

/**
 * The name `GET /order-items/packable` sorts a column by (the order line's own columns, as for `/order-items`).
 * What is worked out or joined in - order number, product, packed, remaining, the pick - cannot be sorted.
 */
export const PACKABLE_SORT_KEYS: Readonly<Record<string, PackableSort>> = {
  orderItemId: 'id',
  quantity: 'quantity',
  fulfillmentStatus: 'fulfillmentStatus',
}

const helper = createColumnHelper<typeof serverTableFeatures, OrderItemDto>()

/**
 * One column per field of `PackableItemDto` that is shown: the product's name stands with the article number, the
 * storehouse's id with its name, and the reservation id is not for reading.
 */
export const packableColumns = helper.columns(
  [
    'orderItemId',
    'orderNo',
    'articleNo',
    'quantity',
    'packed',
    'remaining',
    'fulfillmentStatus',
    'storehouseName',
    'pickedAt',
  ].map((field) =>
    helper.accessor((item: OrderItemDto) => item[field], {
      id: field,
      header: ORDER_ITEM_HEADS[field] ?? field,
      enableSorting: field in PACKABLE_SORT_KEYS,
    }),
  ),
)

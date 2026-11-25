import { createColumnHelper } from '@tanstack/react-table'
import { serverTableFeatures } from '../../shared/lib/serverTable'
import type { OrderItemDto } from './orderItems'

/**
 * The name `GET /order-items` sorts a column by (`PackingController.ORDER_ITEM_SORTABLE`: the order line's own
 * columns). The order number and the product are joined in and cannot be sorted.
 */
export const ORDER_ITEM_SORT_KEYS: Readonly<Record<string, string>> = {
  orderItemId: 'id',
  quantity: 'quantity',
  fulfillmentStatus: 'fulfillmentStatus',
  updatedAt: 'updatedAt',
}

/** What a head says where it is not the field's name. */
export const ORDER_ITEM_HEADS: Readonly<Record<string, string>> = { articleNo: 'product' }

const helper = createColumnHelper<typeof serverTableFeatures, OrderItemDto>()

/**
 * One column per field of `OrderItemListDto` that is shown: the product's name stands with the article number,
 * and the reservation id is not for reading.
 */
export const orderItemColumns = helper.columns(
  ['orderItemId', 'orderNo', 'articleNo', 'quantity', 'fulfillmentStatus', 'updatedAt'].map(
    (field) =>
      helper.accessor((item: OrderItemDto) => item[field], {
        id: field,
        header: ORDER_ITEM_HEADS[field] ?? field,
        enableSorting: field in ORDER_ITEM_SORT_KEYS,
      }),
  ),
)

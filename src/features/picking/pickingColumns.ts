import { createColumnHelper } from '@tanstack/react-table'
import { serverTableFeatures } from '../../shared/lib/serverTable'
import type { PickingOrderDto } from './pickingOrders'

/**
 * The name `GET /picking-orders` sorts a column by (`PickingController.PICKING_SORTABLE`: the reservation's own
 * columns). What is joined in - order, line, product, storehouse - cannot be sorted.
 */
export const PICKING_SORT_KEYS: Readonly<Record<string, string>> = {
  reservationId: 'id',
  quantity: 'quantity',
  expiresAt: 'expiresAt',
}

/** What a head says where it is not the field's name. */
export const PICKING_HEADS: Readonly<Record<string, string>> = { articleNo: 'product' }

const helper = createColumnHelper<typeof serverTableFeatures, PickingOrderDto>()

/**
 * One column per field of `PickingOrderDto` that is shown: the product's name stands with the article number, the
 * storehouse's id with its name, and the SKU is not shown.
 */
export const pickingColumns = helper.columns(
  [
    'reservationId',
    'orderNo',
    'orderItemId',
    'articleNo',
    'quantity',
    'storehouseName',
    'fulfillmentStatus',
    'expiresAt',
  ].map((field) =>
    helper.accessor((item: PickingOrderDto) => item[field], {
      id: field,
      header: PICKING_HEADS[field] ?? field,
      enableSorting: field in PICKING_SORT_KEYS,
    }),
  ),
)

import { createColumnHelper } from '@tanstack/react-table'
import { serverTableFeatures } from '../../shared/lib/serverTable'
import type { PackageDto } from './packages'
import { PACKAGE_SORT_KEYS } from './packageSort'

const helper = createColumnHelper<typeof serverTableFeatures, PackageDto>()

/** The fields of `PackageItemResponse` that are shown: all but the SKU and the run number. */
const FIELDS = [
  'id',
  'createdAt',
  'orderItemId',
  'orderNo',
  'quantity',
  'totalQuantity',
  'siblings',
  'shipmentPackageId',
  'fulfillmentStatus',
]

const columns = (sortable: boolean) =>
  helper.columns(
    FIELDS.map((field) =>
      helper.accessor((item: PackageDto) => item[field], {
        id: field,
        header: field,
        enableSorting: sortable && field in PACKAGE_SORT_KEYS,
      }),
    ),
  )

/** The package list: sortable where the backend can sort (`PACKAGE_SORT_KEYS`). */
export const packageColumns = columns(true)

/** The lonely packages: the same columns, in the backend's own order only. */
export const lonelyPackageColumns = columns(false)

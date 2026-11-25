import { createColumnHelper } from '@tanstack/react-table'
import { serverTableFeatures } from '../../shared/lib/serverTable'
import type { ProductDto } from './products'

/** The name `GET /products` sorts a column by (`ProductController.PRODUCT_SORTABLE`). */
export const PRODUCT_SORT_KEYS: Readonly<Record<string, string>> = {
  articleNo: 'articleNo',
  name: 'name',
  unitPrice: 'unitPrice',
  weight: 'weight',
}

const HEADS: Record<string, string> = { weight: 'weight (kg)' }

const helper = createColumnHelper<typeof serverTableFeatures, ProductDto>()

export const productColumns = helper.columns(
  ['articleNo', 'name', 'unitPrice', 'weight'].map((field) =>
    helper.accessor((product: ProductDto) => product[field], {
      id: field,
      header: HEADS[field] ?? field,
      enableSorting: field in PRODUCT_SORT_KEYS,
    }),
  ),
)

import { createColumnHelper } from '@tanstack/react-table'
import { serverTableFeatures } from '../../shared/lib/serverTable'
import type { ComponentDto } from './components'

/**
 * The name `GET /components` sorts a column by (`ComponentController.COMPONENT_SORTABLE`); the product column by
 * the product's name.
 */
export const COMPONENT_SORT_KEYS: Readonly<Record<string, string>> = {
  manufacturer: 'manufacturer',
  name: 'name',
  externalId: 'externalId',
  qty: 'qty',
  product: 'product.name',
}

const helper = createColumnHelper<typeof serverTableFeatures, ComponentDto>()

/** One column per field of `ComponentResponseDto` that is shown: not the id and not the SKU. */
export const componentColumns = helper.columns(
  ['manufacturer', 'name', 'externalId', 'qty', 'product'].map((field) =>
    helper.accessor((component: ComponentDto) => component[field], {
      id: field,
      header: field,
      enableSorting: field in COMPONENT_SORT_KEYS,
    }),
  ),
)

import { createColumnHelper } from '@tanstack/react-table'
import { serverTableFeatures } from '../../shared/lib/serverTable'
import type { CategoryDto } from './categories'

/** The backend's name for each column it can sort by. */
export const CATEGORY_SORT_KEYS: Readonly<Record<string, string>> = {
  id: 'id',
  name: 'name',
  description: 'description',
}

const helper = createColumnHelper<typeof serverTableFeatures, CategoryDto>()

export const categoryColumns = helper.columns(
  (['id', 'name', 'description'] as const).map((field) =>
    helper.accessor((category: CategoryDto) => category[field], {
      id: field,
      header: field,
      enableSorting: field in CATEGORY_SORT_KEYS,
    }),
  ),
)

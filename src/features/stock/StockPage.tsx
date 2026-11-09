import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { meQueryOptions } from '../auth/auth'
import { productsQueryOptions } from '../products/products'
import { isSoldOut, stockQueryOptions, type StockDto } from './stock'
import { hasRole } from '../../shared/api/types'
import { filterBySku, skuOptions } from './skuSearch'
import { nextSort, sortRows, type TableSort } from '../../shared/lib/tableSort'
import { SkuAutocomplete } from './SkuAutocomplete'
import { SortableHeader } from '../../shared/ui/SortableHeader'
import { PageTitle } from '../../layout/PageTitle'
import { Pager } from '../../shared/ui/Pager'
import { cell } from '../../shared/lib/format'

const route = getRouteApi('/authed/stock/storehouse/$storehouseId')

const HIDDEN_COLUMNS = new Set(['storehouseId', 'storehouseName'])

function StockTable({
  items,
  total,
  page,
  size,
  filtered,
  sort,
  onSort,
  onPage,
}: {
  items: StockDto[]
  total: number
  page: number
  size: number
  /** Whether `items` was narrowed to one SKU: the paging figures then describe something else. */
  filtered: boolean
  sort: TableSort | null
  onSort: (column: string) => void
  onPage: (page: number) => void
}) {
  const columns = [...new Set(items.flatMap((item) => Object.keys(item)))].filter(
    (c) => !HIDDEN_COLUMNS.has(c),
  )

  return (
    <>
      <div className="table-responsive">
        <table className="table table-striped table-sm mb-0">
          <thead>
            <tr>
              {columns.map((column) => (
                <SortableHeader
                  key={column}
                  label={column}
                  column={column}
                  sort={sort}
                  onSort={onSort}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={cell(item.id) || index}>
                {columns.map((column) => (
                  <td
                    key={column}
                    className={
                      column === 'available' &&
                      typeof item[column] === 'number' &&
                      isSoldOut(item[column])
                        ? 'text-danger'
                        : undefined
                    }
                  >
                    {column === 'sku' && item.sku != null ? (
                      <small>
                        <Link to="/products/sku/$sku" params={{ sku: cell(item.sku) }}>
                          {cell(item.sku)}
                        </Link>
                      </small>
                    ) : (
                      cell(item[column])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered ? (
        <p className="small text-body-secondary text-end px-3 pt-2 mb-0">
          {items.length} of {total} rows
        </p>
      ) : (
        <dl className="row justify-content-end small text-body-secondary px-2 mt-2 mb-2">
          <dd className="col-auto mb-0 me-auto">
            <Pager page={page} size={size} total={total} onPage={onPage} />
          </dd>
          <dt className="col-auto">total</dt>
          <dd className="col-auto">{total}</dd>
          <dt className="col-auto">page</dt>
          <dd className="col-auto">{page}</dd>
          <dt className="col-auto">size</dt>
          <dd className="col-auto">{size}</dd>
        </dl>
      )}
    </>
  )
}

/** The stock of one storehouse; for warehouse staff and admins only. */
export function StockPage() {
  const { storehouseId } = route.useParams()
  const { data: user } = useQuery(meQueryOptions)
  if (!user) return null
  if (!hasRole(user, 'WAREHOUSE') && !hasRole(user, 'ADMIN')) {
    return <p className="text-danger">Only warehouse staff and admins may see the stock.</p>
  }

  // Keyed by the storehouse, so the SKU chosen in one storehouse does not follow to the next.
  return <StockView key={storehouseId} storehouseId={storehouseId} />
}

function StockView({ storehouseId }: { storehouseId: string }) {
  const [page, setPage] = useState(0)
  const { data, isPending, error } = useQuery(stockQueryOptions(storehouseId, page))
  // The product names only help to read the SKUs; without them the search still works. The list is paged now
  // (25 by default), so it asks for enough to cover the catalogue - the same request as the order form makes.
  const { data: products } = useQuery(productsQueryOptions({ size: 1000 }))
  const [sku, setSku] = useState<string | null>(null)
  const [sort, setSort] = useState<TableSort | null>(null)

  const names = new Map<string, string>()
  for (const product of products?.content ?? []) {
    if (typeof product.sku === 'string' && typeof product.name === 'string')
      names.set(product.sku, product.name)
  }

  const items = data?.content ?? []
  const visible = sortRows(filterBySku(items, sku), sort)
  const name = items.map((item) => item.storehouseName).find((value) => value != null)
  const title = name ? cell(name) : `storehouse ${storehouseId}`

  return (
    <>
      {items.length > 0 && (
        <div className="mb-3">
          <SkuAutocomplete options={skuOptions(items, names)} value={sku} onChange={setSku} />
        </div>
      )}
      <div className="card shadow-sm">
        <div className="card-body">
          <PageTitle icon="storehouses">Stock of {title}</PageTitle>
        </div>
        {isPending ? (
          <p className="p-3 mb-0">Loading stock…</p>
        ) : error ? (
          <p className="p-3 mb-0 text-danger">{error.message}</p>
        ) : items.length === 0 ? (
          <p className="p-3 mb-0 text-body-secondary">No stock.</p>
        ) : (
          <StockTable
            items={visible}
            total={data.total}
            page={data.page}
            size={data.size}
            filtered={sku !== null}
            sort={sort}
            onSort={(column) => setSort(nextSort(sort, column))}
            onPage={setPage}
          />
        )}
      </div>
    </>
  )
}

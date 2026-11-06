import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { inventoryQueryOptions, isSoldOut } from '../api/stock'
import { formatMoment } from '../format'
import { nextSort, type TableSort } from '../tableSort'
import { PageTitle } from './PageTitle'
import { Pager } from './Pager'
import { SortableHeader } from './SortableHeader'

/**
 * What the warehouse holds, an article to a row with every storehouse added up (`GET /stock/inventory`).
 * The SKU leads to the product and shows the product's name on hover; the heads sort, the buttons below
 * page through.
 */
export function StockInventoryCard() {
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<TableSort | null>(null)
  const { data, isPending, error } = useQuery(inventoryQueryOptions(page, sort))

  return (
    <div className="card shadow-sm mb-3">
      <div className="card-body">
        <PageTitle icon="stock">Stock</PageTitle>
      </div>
      {isPending && <p className="p-3 mb-0">Loading stock…</p>}
      {error && <p className="p-3 mb-0 text-danger">{error.message}</p>}
      {data && data.content.length === 0 && <p className="p-3 mb-0 text-body-secondary">Nothing in stock.</p>}
      {data && data.content.length > 0 && (
        <>
          <div className="table-responsive">
            <table className="table table-striped table-sm mb-0">
              <thead>
                <tr>
                  <SortableHeader label="SKU" column="sku" sort={sort} onSort={sortBy} />
                  <SortableHeader label="On hand" column="onHand" sort={sort} onSort={sortBy} className="text-end" />
                  <SortableHeader label="Reserved" column="reserved" sort={sort} onSort={sortBy} className="text-end" />
                  <SortableHeader label="Available" column="available" sort={sort} onSort={sortBy} className="text-end" />
                  <SortableHeader label="Updated" column="updatedAt" sort={sort} onSort={sortBy} className="ps-4" />
                </tr>
              </thead>
              <tbody>
                {data.content.map((row) => (
                  <tr key={row.sku}>
                    <td>
                      <Link to="/products/sku/$sku" params={{ sku: row.sku }} title={row.name ?? undefined}>
                        {row.sku}
                      </Link>
                    </td>
                    <td className="text-end">{row.onHand}</td>
                    <td className="text-end">{row.reserved}</td>
                    <td className={isSoldOut(row.available) ? 'text-end text-danger' : 'text-end'}>{row.available}</td>
                    <td className="ps-4">{formatMoment(row.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="row justify-content-end small text-body-secondary px-2 mt-2 mb-2">
            <dd className="col-auto mb-0 me-auto">
              <Pager page={data.page} size={data.size} total={data.total} onPage={setPage} />
            </dd>
            <dt className="col-auto">total</dt>
            <dd className="col-auto">{data.total}</dd>
            <dt className="col-auto">page</dt>
            <dd className="col-auto">{data.page}</dd>
            <dt className="col-auto">size</dt>
            <dd className="col-auto">{data.size}</dd>
          </dl>
        </>
      )}
    </div>
  )

  function sortBy(column: string) {
    setSort(nextSort(sort, column))
    // Page 3 of one order says nothing about another.
    setPage(0)
  }
}

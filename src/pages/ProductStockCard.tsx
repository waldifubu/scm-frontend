import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { isSoldOut, stockBySkuQueryOptions, stockTotals } from '../api/stock'
import { formatMoment } from '../format'

/**
 * Where one article is stored and how much of it, a row per storehouse. Only the warehouse and the
 * admin may read stock, so the page shows this card to nobody else (the backend would answer 403).
 */
export function ProductStockCard({ sku }: { sku: string }) {
  const { data: rows, isPending, error } = useQuery(stockBySkuQueryOptions(sku))

  return (
    <div className="card shadow-sm mt-4">
      <div className="card-body">
        <h3 className="h5">Stock</h3>
        {isPending && <p className="mb-0">Loading stock…</p>}
        {error && <p className="mb-0 text-danger">{error.message}</p>}
        {rows && rows.length === 0 && (
          <p className="mb-0 text-body-secondary">Not in stock in any storehouse.</p>
        )}
        {rows && rows.length > 0 && (
          <div className="table-responsive">
            <table className="table table-striped table-sm mb-0">
              <thead>
                <tr>
                  <th>Storehouse</th>
                  <th className="text-end">On hand</th>
                  <th className="text-end">Reserved</th>
                  <th className="text-end">Available</th>
                  <th className="ps-4">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.storehouseId === null ? (
                        ''
                      ) : (
                        <Link
                          to="/stock/storehouse/$storehouseId"
                          params={{ storehouseId: String(row.storehouseId) }}
                          className="text-decoration-none text-reset"
                        >
                          {row.storehouseName ?? `Storehouse ${row.storehouseId}`}
                        </Link>
                      )}
                    </td>
                    <td className="text-end">{row.onHand}</td>
                    <td className="text-end">{row.reserved}</td>
                    <td className={isSoldOut(row.available) ? 'text-end text-danger' : 'text-end'}>
                      {row.available}
                    </td>
                    <td className="ps-4">{formatMoment(row.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 1 && (
                <tfoot>
                  <tr className="fw-semibold">
                    <td>Total</td>
                    <td className="text-end">{stockTotals(rows).onHand}</td>
                    <td className="text-end">{stockTotals(rows).reserved}</td>
                    <td
                      className={
                        isSoldOut(stockTotals(rows).available) ? 'text-end text-danger' : 'text-end'
                      }
                    >
                      {stockTotals(rows).available}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

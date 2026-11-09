import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { meQueryOptions } from '../api/auth'
import { productQueryOptions, productBySkuQueryOptions } from '../api/products'
import { hasRole } from '../api/types'
import { ProductStockCard } from './ProductStockCard'
import { cell } from '../format'

const route = getRouteApi('/authed/products/$articleNo')
const skuRoute = getRouteApi('/authed/products/sku/$sku')

function RowTable({
  rows,
  linkToComponents = false,
}: {
  rows: Record<string, unknown>[]
  linkToComponents?: boolean
}) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]

  return (
    <div className="table-responsive">
      <table className="table table-striped table-sm mb-0">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={cell(row.id) || index}>
              {columns.map((column) => (
                <td key={column}>
                  {linkToComponents && cell(row.sku) !== '' ? (
                    <Link
                      to="/components/$sku"
                      params={{ sku: cell(row.sku) }}
                      className="text-decoration-none text-reset"
                    >
                      {cell(row[column])}
                    </Link>
                  ) : (
                    cell(row[column])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Every field of one product, shown below the products table; each list (categories, components, ...) gets a table of its own. */
function ProductDetails({
  title,
  query,
}: {
  title: string
  query: UseQueryResult<Record<string, unknown>, Error>
}) {
  const { data: product, isPending, error } = query
  const { data: user } = useQuery(meQueryOptions)
  // Only these two roles may read stock; for anybody else the card would be a 403.
  const canSeeStock = user ? hasRole(user, 'WAREHOUSE') || hasRole(user, 'ADMIN') : false
  const sku = typeof product?.sku === 'string' ? product.sku : null

  const entries = product ? Object.entries(product) : []
  const lists = entries.filter(([, value]) => Array.isArray(value))
  const fields = entries.filter(([, value]) => !Array.isArray(value))

  return (
    <>
      <div className="card shadow-sm mt-4">
        <div className="card-body">
          <h3 className="h5">{title}</h3>
          {isPending && <p className="mb-0">Loading details…</p>}
          {error && <p className="mb-0 text-danger">{error.message}</p>}
          {product && (
            <>
              <dl className="row mb-0">
                {fields.map(([key, value]) => (
                  <div key={key} className="row">
                    <dt className="col-sm-3">{key}</dt>
                    <dd className="col-sm-9">{cell(value)}</dd>
                  </div>
                ))}
              </dl>
              {lists.map(([key, value]) => {
                const rows = (value as unknown[]).filter(
                  (row): row is Record<string, unknown> => typeof row === 'object' && row !== null,
                )
                return (
                  <section key={key}>
                    <h4 className="h6 mt-4">{key}</h4>
                    {rows.length === 0 ? (
                      <p className="text-body-secondary mb-0">None.</p>
                    ) : (
                      <RowTable rows={rows} linkToComponents={key === 'components'} />
                    )}
                  </section>
                )
              })}
            </>
          )}
        </div>
      </div>
      {canSeeStock && sku && <ProductStockCard sku={sku} />}
    </>
  )
}

export function ProductDetailsPage() {
  const { articleNo } = route.useParams()
  const query = useQuery(productQueryOptions(articleNo))
  return <ProductDetails title={`Product ${articleNo}`} query={query} />
}

/** The same details, found by the SKU. */
export function ProductSkuDetailsPage() {
  const { sku } = skuRoute.useParams()
  const query = useQuery(productBySkuQueryOptions(sku))
  return <ProductDetails title={`Product ${cell(query.data?.name ?? sku)}`} query={query} />
}

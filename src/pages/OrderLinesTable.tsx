import { Link } from '@tanstack/react-router'
import { productLinkOf } from '../entityLinks'

type Line = Record<string, unknown>

function cell(value: unknown): string {
  if (value === null || value === undefined) return ''
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

/** The SKU has no column of its own: it shows on hover over the article number. */
const HIDDEN_COLUMNS = new Set(['sku'])

/**
 * The lines of an order. The article number leads to the product (`/products/{articleNo}`) and carries the
 * product's SKU as its tooltip; every other cell is plain text.
 */
export function OrderLinesTable({ rows }: { rows: Line[] }) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))].filter((column) => !HIDDEN_COLUMNS.has(column))

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
          {rows.map((row, index) => {
            const product = productLinkOf(row)
            return (
              <tr key={cell(row.id) || index}>
                {columns.map((column) => (
                  <td key={column}>
                    {column === 'articleNo' && product ? (
                      <Link to="/products/$articleNo" params={{ articleNo: product.articleNo }} title={product.sku ? `SKU ${product.sku}` : undefined}>
                        {product.articleNo}
                      </Link>
                    ) : (
                      cell(row[column])
                    )}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

import type { ReactNode } from 'react'
import type { OrderItemDto, OrderItemPage } from './orderItems'
import { productLabel, cell } from '../../shared/lib/format'
import { Pager } from '../../shared/ui/Pager'

// The name is shown with the article number, in that one column.
const HIDDEN_COLUMNS = new Set(['productName', 'storehouseId', 'reservationId'])

const HEADS: Record<string, string> = { articleNo: 'product' }
const DATE_COLUMNS = new Set(['updatedAt', 'createdAt', 'pickedAt'])

function renderCell(column: string, item: OrderItemDto) {
  const value = item[column]
  if (column === 'storehouseName' && item.storehouseId != null) {
    return `${cell(value)} (${cell(item.storehouseId)})`
  }
  if (DATE_COLUMNS.has(column) && typeof value === 'string') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return (
        <small className="text-body-secondary text-nowrap">
          {date.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
        </small>
      )
    }
  }
  if (column === 'articleNo') return productLabel(item.productName, value)
  if (column === 'product' && value && typeof value === 'object' && 'articleNo' in value) {
    return String((value as { articleNo: unknown }).articleNo)
  }
  return cell(value)
}

export function OrderItemsTable({
  data,
  isPending,
  error,
  itemType,
  extraColumn,
  onPage,
}: {
  data: OrderItemPage | undefined
  isPending: boolean
  error: Error | null
  itemType: string
  extraColumn?: { header: string; render: (item: OrderItemDto) => ReactNode }
  /** With it, the footer has buttons to the page before and after. */
  onPage?: (page: number) => void
}) {
  if (isPending) return <p className="p-3 mb-0">Loading {itemType}…</p>
  if (error) return <p className="p-3 mb-0 text-danger">{error.message}</p>
  const items: OrderItemDto[] = data?.content ?? []
  if (items.length === 0) return <p className="p-3 mb-0 text-body-secondary">No {itemType}.</p>

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
                <th key={column}>{HEADS[column] ?? column}</th>
              ))}
              {extraColumn && <th>{extraColumn.header}</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={cell(item.id) || index}>
                {columns.map((column) => (
                  <td key={column}>{renderCell(column, item)}</td>
                ))}
                {extraColumn && <td>{extraColumn.render(item)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="row justify-content-end small text-body-secondary px-2 mt-2 mb-2">
        {data && onPage && (
          <dd className="col-auto mb-0 me-auto">
            <Pager page={data.page} size={data.size} total={data.total} onPage={onPage} />
          </dd>
        )}
        <dt className="col-auto">total</dt>
        <dd className="col-auto">{data?.total}</dd>
        <dt className="col-auto">page</dt>
        <dd className="col-auto">{data?.page}</dd>
        <dt className="col-auto">size</dt>
        <dd className="col-auto">{data?.size}</dd>
      </dl>
    </>
  )
}
